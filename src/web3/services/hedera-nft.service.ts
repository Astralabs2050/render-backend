import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class HederaNFTService {
  private readonly logger = new Logger(HederaNFTService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private astraNFTContract: ethers.Contract;
  private usdcTokenContract: ethers.Contract;

  constructor(private configService: ConfigService) {
    const privateKey = this.configService.get('HEDERA_PRIVATE_KEY');
    const rpcUrl = this.configService.get('HEDERA_TESTNET_RPC_URL');

    if (!privateKey || !rpcUrl) {
      this.logger.warn('Hedera credentials not configured. Service will be unavailable.');
      return;
    }

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.astraNFTContract = new ethers.Contract(
      this.configService.get('ASTRA_NFT_COLLECTIBLE_CONTRACT_ADDRESS'),
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
      this.configService.get('HEDERA_USDC_TOKEN_ADDRESS'),
      [
        'function balanceOf(address account) external view returns (uint256)',
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function associate() external returns (int64 responseCode)',
      ],
      this.wallet
    );
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
      return { success: false, error: 'Hedera service not configured. Please set HEDERA_PRIVATE_KEY and HEDERA_TESTNET_RPC_URL' };
    }
    try {
      if (!data.recipientAddress || !ethers.utils.isAddress(data.recipientAddress)) {
        return { success: false, error: `Invalid recipient address: ${data.recipientAddress}` };
      }

      this.logger.log(`Starting minting process for ${data.count} NFTs to ${data.recipientAddress}`);

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

      let balance: any;
      try {
        balance = await this.usdcTokenContract.balanceOf(this.wallet.address);
        this.logger.log(`Wallet USDC balance: ${balance.toString()} (${ethers.utils.formatUnits(balance, 6)} USDC)`);
      } catch (balanceError) {
        this.logger.log('Failed to get USDC balance. Attempting automatic token association...');
        const associationResult = await this.associateUSDCToken();

        if (!associationResult.success) {
          return {
            success: false,
            error: `USDC token not associated and auto-association failed: ${associationResult.error}`
          };
        }

        this.logger.log('Auto-association successful. Rechecking balance...');
        balance = await this.usdcTokenContract.balanceOf(this.wallet.address);
        this.logger.log(`Wallet USDC balance: ${balance.toString()} (${ethers.utils.formatUnits(balance, 6)} USDC)`);
      }

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
        this.logger.log('USDC approval successful');
      } else {
        this.logger.log('Sufficient allowance already exists, skipping approval');
      }

      this.logger.log('Calling mintNFTs on contract...');
      const mintTx = await this.astraNFTContract.mintNFTs(
        data.recipientAddress,
        data.designId,
        data.designName,
        data.designImage,
        data.prompt,
        data.count
      );

      this.logger.log(`Mint transaction submitted: ${mintTx.hash}. Waiting for confirmation...`);
      const receipt = await mintTx.wait();

      this.logger.log(`Transaction confirmed. Receipt status: ${receipt.status}`);
      this.logger.log(`Transaction hash: ${mintTx.hash}`);
      this.logger.log(`Receipt object keys: ${Object.keys(receipt).join(', ')}`);

      if (receipt.status === 1) {
        const tokenIds = this.extractTokenIds(receipt, data.count);
        this.logger.log(`Minting successful! Token IDs: ${tokenIds.join(', ')}`);
        // Use mintTx.hash (not receipt.hash) - receipt doesn't have hash property
        const txHash = receipt.transactionHash || mintTx.hash;
        this.logger.log(`Returning txHash: ${txHash}`);
        return { success: true, tokenIds, txHash };
      }

      return { success: false, error: 'Transaction failed' };
    } catch (error) {
      this.logger.error('Minting failed:');
      this.logger.error(error);

      let errorMessage = error.message;
      if (error.error?.code === 3 && error.error?.data) {
        const errorCode = error.error.data;
        errorMessage = `Hedera error: ${errorCode}. This may indicate token association or balance issues.`;
      }

      return { success: false, error: errorMessage };
    }
  }

  async setBaseTokenURI(folderHash: string): Promise<void> {
    const baseTokenURI = `ipfs://${folderHash}/`;
    const tx = await this.astraNFTContract.setBaseURI(baseTokenURI);
    await tx.wait();
    this.logger.log(`Base token URI set to: ${baseTokenURI}`);
  }

  async getTokenURI(tokenId: number): Promise<string> {
    return await this.astraNFTContract.tokenURI(tokenId);
  }

  async listNFT(tokenId: number, price: bigint): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.astraNFTContract) {
      return { success: false, error: 'Hedera service not configured' };
    }
    try {
      const tx = await this.astraNFTContract.listNFT(tokenId, price);
      const receipt = await tx.wait();
      return { success: receipt.status === 1, txHash: receipt.hash };
    } catch (error) {
      this.logger.error('Listing NFT failed:', error);
      return { success: false, error: error.message };
    }
  }

  async listOwnedNFTsByQuantity(quantity: number, price: bigint): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.astraNFTContract) {
      return { success: false, error: 'Hedera service not configured' };
    }
    try {
      const tx = await this.astraNFTContract.listOwnedNFTsByQuantity(quantity, price);
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

      const tx = await this.usdcTokenContract.approve(spender, amount);

      this.logger.log(`Approval transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error('USDC approval transaction failed');
      }

      this.logger.log('USDC approval transaction confirmed');
    } catch (error) {
      this.logger.error('USDC approval failed:', error);
      throw new Error(`Failed to approve USDC: ${error.message}`);
    }
  }

  async associateUSDCToken(): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.logger.log('Checking if USDC token association is needed...');

      try {
        const balance = await this.usdcTokenContract.balanceOf(this.wallet.address);
        this.logger.log(`USDC token already associated. Balance: ${ethers.utils.formatUnits(balance, 6)} USDC`);
        return { success: true };
      } catch (balanceError) {
        this.logger.log('Token not associated. Proceeding with association...');
      }

      this.logger.log('Calling associate() on USDC token contract...');
      const tx = await this.usdcTokenContract.associate();

      this.logger.log(`Association transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        this.logger.log('USDC token association successful!');
        return { success: true, txHash: receipt.hash };
      }

      return { success: false, error: 'Token association transaction failed' };
    } catch (error) {
      this.logger.error('Token association failed:', error);

      let errorMessage = error.message;
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient HBAR for gas fees. Please fund your wallet with HBAR.';
      } else if (error.message.includes('already associated')) {
        this.logger.log('Token already associated (caught in error handler)');
        return { success: true };
      }

      return { success: false, error: errorMessage };
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
            // For Transfer events, only count mints t
            if (parsed.args.from === ethers.constants.AddressZero) {
              tokenIds.push(parsed.args.tokenId);
              this.logger.log(`Extracted tokenId from Transfer: ${parsed.args.tokenId.toString()}`);
            }
          }
        }
      } catch (e) {
        // Log belongs to a different contract or unknown event
        // this.logger.debug(`Could not parse log: ${e.message}`);
      }
    }

    this.logger.log(`Total token IDs extracted: ${tokenIds.length}, expected: ${expectedCount}`);
    return tokenIds.slice(0, expectedCount);
  }
}
