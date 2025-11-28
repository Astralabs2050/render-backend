import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class PolygonNFTService {
  private readonly logger = new Logger(PolygonNFTService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private astraNFTContract: ethers.Contract;
  private usdcTokenContract: ethers.Contract;

  constructor(private configService: ConfigService) {
    const privateKey = this.configService.get('POLYGON_AMOY_PRIVATE_KEY');
    const rpcUrl = this.configService.get('POLYGON_AMOY_RPC_URL');

    if (!privateKey || !rpcUrl) {
      this.logger.warn('Polygon Amoy credentials not configured. Service will be unavailable.');
      return;
    }

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.astraNFTContract = new ethers.Contract(
      this.configService.get('POLYGON_AMOY_ASTRA_NFT_COLLECTIBLE_CONTRACT_ADDRESS'),
      [
        // Functions
        'function mintNFTs(address to, string memory designId, string memory designName, string memory designImage, string memory prompt, uint256 count) external',
        'function getBaseMintFee() external view returns (uint256)',
        'function isDesignIdUsed(string memory designId) external view returns (bool)',
        'function MAX_PER_MINT() external view returns (uint256)',
        'function setBaseURI(string memory _baseTokenURI) external',
        'function tokenURI(uint256 tokenId) external view returns (string)',
        'function listNFT(uint256 tokenId, uint256 price) external',
        'function listOwnedNFTsByQuantity(uint256 quantity, uint256 price) external',
        'function isNFTListed(uint256 tokenId) external view returns (bool)',
        'function getSellerListings(address seller) external view returns (uint256[] memory)',
        'function getActiveListings() external view returns (uint256[] memory)',
        'function getListing(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listingTime))',

        // Events
        'event NFTMinted(address indexed to, uint256 indexed tokenId, string designId, string designName)',
        'event TokenMinted(address indexed to, uint256 indexed tokenId, string designId)',
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
      ],
      this.wallet
    );

    this.usdcTokenContract = new ethers.Contract(
      this.configService.get('POLYGON_AMOY_USDC_TOKEN_ADDRESS'),
      [
        'function balanceOf(address account) external view returns (uint256)',
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function transfer(address to, uint256 amount) external returns (bool)',
      ],
      this.wallet
    );
  }

  /**
   * Get optimal gas price for Polygon transactions
   * Fetches current network gas price and ensures it meets Polygon's minimum requirements
   */
  private async getGasPrice(): Promise<ethers.BigNumber> {
    const feeData = await this.provider.getFeeData();
    const networkGasPrice = feeData.gasPrice || ethers.utils.parseUnits('50', 'gwei');

    // Polygon minimum gas price (adjust if needed based on network conditions)
    const minGasPrice = ethers.utils.parseUnits('30', 'gwei');

    const finalGasPrice = networkGasPrice.gt(minGasPrice) ? networkGasPrice : minGasPrice;

    this.logger.log(`Gas price: ${ethers.utils.formatUnits(finalGasPrice, 'gwei')} Gwei`);
    return finalGasPrice;
  }

  /**
   * Wait for allowance to be updated after approval transaction
   * Polls the blockchain until allowance matches expected amount or timeout
   * More reliable than fixed delays for handling network latency
   */
  private async waitForAllowanceUpdate(
    spender: string,
    requiredAmount: bigint,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds
    let attempt = 0;

    while (Date.now() - startTime < timeoutMs) {
      attempt++;

      try {
        const allowance = await this.usdcTokenContract.allowance(this.wallet.address, spender);
        const allowanceBigInt = BigInt(allowance.toString());

        this.logger.log(
          `[Attempt ${attempt}] Allowance: ${ethers.utils.formatUnits(allowance, 6)} USDC ` +
          `(Required: ${ethers.utils.formatUnits(requiredAmount, 6)} USDC)`
        );

        if (allowanceBigInt >= requiredAmount) {
          this.logger.log('✓ Allowance verified successfully');
          return true;
        }

        // Wait before next check
        const elapsed = Date.now() - startTime;
        const remaining = timeoutMs - elapsed;

        if (remaining > pollInterval) {
          this.logger.log(`Waiting ${pollInterval / 1000}s before next check...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        this.logger.warn(`Allowance check failed:`, error.message);
        // Continue polling even if one check fails
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    this.logger.error(`Allowance verification timed out after ${timeoutMs / 1000}s`);
    return false;
  }

  async mintCollectibles(data: {
    recipientAddress: string;
    designId: string;
    designName: string;
    designImage: string;
    prompt: string;
    count: number;
  }): Promise<{ success: boolean; tokenIds?: bigint[]; txHash?: string; error?: string }> {
    if (!this.astraNFTContract) {
      return { success: false, error: 'Polygon Amoy service not configured. Please set POLYGON_AMOY_PRIVATE_KEY and POLYGON_AMOY_RPC_URL' };
    }
    try {
      if (!data.recipientAddress || !ethers.utils.isAddress(data.recipientAddress)) {
        return { success: false, error: `Invalid recipient address: ${data.recipientAddress}` };
      }

      this.logger.log(`Starting minting process on Polygon Amoy for ${data.count} NFTs to ${data.recipientAddress}`);

      const isUsed = await this.astraNFTContract.isDesignIdUsed(data.designId);
      if (isUsed) {
        return { success: false, error: 'Design ID already exists' };
      }

      const maxPerMint = await this.astraNFTContract.MAX_PER_MINT();

      if (data.count > Number(maxPerMint)) {
        return { success: false, error: `Exceeds max per mint. Max: ${maxPerMint}` };
      }

      const baseMintFee = await this.astraNFTContract.getBaseMintFee();
      const totalFee = BigInt(baseMintFee) * BigInt(data.count);

      this.logger.log(`Mint fee: ${totalFee.toString()} (${ethers.utils.formatUnits(totalFee, 6)} USDC)`);

      const balance = await this.usdcTokenContract.balanceOf(this.wallet.address);
      this.logger.log(`Wallet USDC balance: ${balance.toString()} (${ethers.utils.formatUnits(balance, 6)} USDC)`);

      if (BigInt(balance.toString()) < totalFee) {
        return {
          success: false,
          error: `Insufficient USDC balance. Required: ${ethers.utils.formatUnits(totalFee, 6)} USDC, Available: ${ethers.utils.formatUnits(balance, 6)} USDC`
        };
      }

      const currentAllowance = await this.usdcTokenContract.allowance(this.wallet.address, this.astraNFTContract.address);
      this.logger.log(`Current USDC allowance: ${currentAllowance.toString()} (${ethers.utils.formatUnits(currentAllowance, 6)} USDC)`);

      if (BigInt(currentAllowance.toString()) < totalFee) {
        this.logger.log(`Approving ${ethers.utils.formatUnits(totalFee, 6)} USDC for minting`);
        await this.approveUSDC(this.astraNFTContract.address, totalFee);
        this.logger.log('✓ USDC approval transaction confirmed on-chain');

        // Wait for allowance to be readable from blockchain with polling
        this.logger.log('Waiting for allowance update to propagate...');
        const isVerified = await this.waitForAllowanceUpdate(
          this.astraNFTContract.address,
          totalFee,
          30000 // 30 second timeout
        );

        if (!isVerified) {
          throw new Error(
            `Allowance verification timed out. Required: ${ethers.utils.formatUnits(totalFee, 6)} USDC. ` +
            `The approval transaction was confirmed but the updated allowance is not yet visible. ` +
            `Please wait a moment and try minting again.`
          );
        }
      } else {
        this.logger.log('✓ Sufficient allowance already exists, skipping approval');
      }

      // Log all parameters before minting
      this.logger.log('=== Mint Parameters ===');
      this.logger.log(`Recipient: ${data.recipientAddress}`);
      this.logger.log(`Design ID: ${data.designId}`);
      this.logger.log(`Design Name: ${data.designName}`);
      this.logger.log(`Count: ${data.count}`);
      this.logger.log(`Wallet: ${this.wallet.address}`);
      this.logger.log(`NFT Contract: ${this.astraNFTContract.address}`);
      this.logger.log(`USDC Contract: ${this.usdcTokenContract.address}`);
      this.logger.log('=====================');

      this.logger.log('Calling mintNFTs on contract...');

      const gasPrice = await this.getGasPrice();

      // Try to estimate gas first - this will fail with a revert reason if the transaction would fail
      let estimatedGas: ethers.BigNumber;
      try {
        estimatedGas = await this.astraNFTContract.estimateGas.mintNFTs(
          data.recipientAddress,
          data.designId,
          data.designName,
          data.designImage,
          data.prompt,
          data.count
        );
        this.logger.log(`Estimated gas: ${estimatedGas.toString()}`);
      } catch (estimateError: any) {
        this.logger.error('========= Gas estimation failed - transaction would revert =========');
        this.logger.error('Full error object:', JSON.stringify(estimateError, null, 2));

        // Try to extract revert reason
        let revertReason = 'Unknown reason';
        if (estimateError.error?.data?.message) {
          revertReason = estimateError.error.data.message;
        } else if (estimateError.error?.message) {
          revertReason = estimateError.error.message;
        } else if (estimateError.reason) {
          revertReason = estimateError.reason;
        } else if (estimateError.message) {
          revertReason = estimateError.message;
        }

        // Check if it's a contract revert with data
        if (estimateError.error?.data) {
          this.logger.error('Contract revert data:', estimateError.error.data);
        }

        this.logger.error('===================================================================');
        throw new Error(`Transaction would revert: ${revertReason}`);
      }

      // Use 1.5x the estimated gas, with a minimum of 600k
      const gasLimit = estimatedGas.mul(150).div(100).lt(600000) ? 600000 : estimatedGas.mul(150).div(100).toNumber();
      this.logger.log(`Using gas limit: ${gasLimit} (1.5x estimated)`);

      const mintTx = await this.astraNFTContract.mintNFTs(
        data.recipientAddress,
        data.designId,
        data.designName,
        data.designImage,
        data.prompt,
        data.count,
        {
          gasPrice,
          gasLimit
        }
      );

      this.logger.log(`Mint transaction submitted: ${mintTx.hash}. Waiting for confirmation...`);

      let receipt: any;
      try {
        receipt = await mintTx.wait();
      } catch (receiptError: any) {
        this.logger.error('Transaction receipt error:', receiptError);

        // Try to get more details about why it failed
        if (receiptError.receipt) {
          this.logger.error(`Receipt status: ${receiptError.receipt.status}`);
          this.logger.error(`Gas used: ${receiptError.receipt.gasUsed?.toString()}`);
        }

        throw new Error(`Transaction reverted: ${receiptError.message}`);
      }

      this.logger.log(`Transaction confirmed. Receipt status: ${receipt.status}`);
      this.logger.log(`Transaction hash: ${mintTx.hash}`);
      this.logger.log(`Gas used: ${receipt.gasUsed?.toString()}`);

      if (receipt.status === 1) {
        const tokenIds = this.extractTokenIds(receipt, data.count);
        this.logger.log(`Minting successful! Token IDs: ${tokenIds.join(', ')}`);

        const txHash = receipt.transactionHash || mintTx.hash;

        if (!txHash) {
          this.logger.error('CRITICAL: Transaction succeeded but no hash available!');
          this.logger.error(`mintTx.hash: ${mintTx.hash}, receipt.transactionHash: ${receipt.transactionHash}`);
          throw new Error('Transaction hash missing from both mintTx and receipt');
        }

        this.logger.log(`Returning txHash: ${txHash}`);
        return { success: true, tokenIds, txHash };
      }

      return { success: false, error: 'Transaction failed' };
    } catch (error) {
      this.logger.error('Minting failed:');
      this.logger.error(error);

      let errorMessage = error.message;
      if (error.error?.code && error.error?.data) {
        const errorCode = error.error.data;
        errorMessage = `Polygon error: ${errorCode}. This may indicate insufficient balance or gas issues.`;
      }

      return { success: false, error: errorMessage };
    }
  }

  async setBaseTokenURI(folderHash: string): Promise<void> {
    const baseTokenURI = `ipfs://${folderHash}/`;
    const gasPrice = await this.getGasPrice();

    const tx = await this.astraNFTContract.setBaseURI(baseTokenURI, {
      gasPrice,
      gasLimit: 100000
    });
    await tx.wait();
    this.logger.log(`Base token URI set to: ${baseTokenURI}`);
  }

  async getTokenURI(tokenId: number): Promise<string> {
    return await this.astraNFTContract.tokenURI(tokenId);
  }

  async listNFT(tokenId: number, price: bigint): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.astraNFTContract) {
      return { success: false, error: 'Polygon Amoy service not configured' };
    }
    try {
      const gasPrice = await this.getGasPrice();

      const tx = await this.astraNFTContract.listNFT(tokenId, price, {
        gasPrice,
        gasLimit: 200000
      });
      const receipt = await tx.wait();
      return { success: receipt.status === 1, txHash: receipt.hash };
    } catch (error) {
      this.logger.error('Listing NFT failed:', error);
      return { success: false, error: error.message };
    }
  }

  async listOwnedNFTsByQuantity(quantity: number, price: bigint): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.astraNFTContract) {
      return { success: false, error: 'Polygon Amoy service not configured' };
    }
    try {
      const gasPrice = await this.getGasPrice();

      const tx = await this.astraNFTContract.listOwnedNFTsByQuantity(quantity, price, {
        gasPrice,
        gasLimit: 300000
      });
      const receipt = await tx.wait();
      return { success: receipt.status === 1, txHash: receipt.hash };
    } catch (error) {
      this.logger.error('Listing NFTs by quantity failed:', error);
      return { success: false, error: error.message };
    }
  }

  async isNFTListed(tokenId: number): Promise<boolean> {
    if (!this.astraNFTContract) return false;
    return await this.astraNFTContract.isNFTListed(tokenId);
  }

  async getSellerListings(seller: string): Promise<bigint[]> {
    if (!this.astraNFTContract) return [];
    return await this.astraNFTContract.getSellerListings(seller);
  }

  async getActiveListings(): Promise<bigint[]> {
    if (!this.astraNFTContract) return [];
    return await this.astraNFTContract.getActiveListings();
  }

  async getListing(tokenId: number): Promise<any> {
    if (!this.astraNFTContract) return null;
    return await this.astraNFTContract.getListing(tokenId);
  }

  private async approveUSDC(spender: string, amount: bigint): Promise<void> {
    try {
      this.logger.log(`Approving ${spender} to spend ${amount.toString()} USDC tokens`);

      const gasPrice = await this.getGasPrice();

      const tx = await this.usdcTokenContract.approve(spender, amount, {
        gasPrice,
        gasLimit: 100000
      });

      this.logger.log(`Approval transaction submitted: ${tx.hash}`);

      // Wait for 2 confirmations on testnet for better reliability
      this.logger.log('Waiting for 2 block confirmations...');
      const receipt = await tx.wait(2);

      if (receipt.status !== 1) {
        throw new Error('USDC approval transaction failed');
      }

      this.logger.log(`✓ Approval confirmed after ${receipt.confirmations} blocks (tx: ${tx.hash})`);
    } catch (error) {
      this.logger.error('USDC approval failed:', error);
      throw new Error(`Failed to approve USDC: ${error.message}`);
    }
  }

  private extractTokenIds(receipt: any, expectedCount: number): bigint[] {
    const tokenIds: bigint[] = [];

    this.logger.log(`Extracting token IDs from ${receipt.logs.length} logs`);

    for (const log of receipt.logs) {
      try {
        const parsed = this.astraNFTContract.interface.parseLog(log);

        if (parsed) {
          this.logger.log(`Found event: ${parsed.name}`);

          // Handle different event types
          if (parsed.name === 'NFTMinted' || parsed.name === 'TokenMinted') {
            tokenIds.push(parsed.args.tokenId);
            this.logger.log(`Extracted tokenId: ${parsed.args.tokenId.toString()}`);
          } else if (parsed.name === 'Transfer') {
            // For Transfer events, only count mints
            if (parsed.args.from === ethers.constants.AddressZero) {
              tokenIds.push(parsed.args.tokenId);
              this.logger.log(`Extracted tokenId from Transfer: ${parsed.args.tokenId.toString()}`);
            }
          }
        }
      } catch (e) {
        // Log belongs to a different contract or unknown event
      }
    }

    this.logger.log(`Total token IDs extracted: ${tokenIds.length}, expected: ${expectedCount}`);
    return tokenIds.slice(0, expectedCount);
  }
}
