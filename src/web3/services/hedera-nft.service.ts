import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class HederaNFTService {
  private readonly logger = new Logger(HederaNFTService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private astraNFTContract: ethers.Contract;
  private hederaTokenServiceContract: ethers.Contract;

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
        'function mintNFTs(address to, string memory designId, string memory designName, string memory designImage, string memory prompt, uint256 count) external',
        'function getBaseMintFee() external view returns (uint256)',
        'function isDesignIdUsed(string memory designId) external view returns (bool)',
        // 'function totalSupply() external view returns (uint256)',
        // 'function MAX_SUPPLY() external view returns (uint256)',
        'function MAX_PER_MINT() external view returns (uint256)',
        'function setBaseURI(string memory _baseTokenURI) external',
        'function tokenURI(uint256 tokenId) external view returns (string)',
        'function listNFT(uint256 tokenId, uint256 price) external',
        'function listOwnedNFTsByQuantity(uint256 quantity, uint256 price) external',
        'function isNFTListed(uint256 tokenId) external view returns (bool)',
        'function getSellerListings(address seller) external view returns (uint256[] memory)',
        'function getActiveListings() external view returns (uint256[] memory)',
        'function getListing(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listingTime))',
      ],
      this.wallet
    );

    this.hederaTokenServiceContract = new ethers.Contract(
      this.configService.get('HEDERA_TOKEN_SERVICE_ADDRESS'),
      ['function approve(address token, address spender, uint256 amount) external returns (int64 responseCode)'],
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
      const isUsed = await this.astraNFTContract.isDesignIdUsed(data.designId);
      if (isUsed) {
        return { success: false, error: 'Design ID already exists' };
      }

      // const maxSupply = await this.astraNFTContract.MAX_SUPPLY();
      const maxPerMint = await this.astraNFTContract.MAX_PER_MINT();
      // const totalSupply = await this.astraNFTContract.totalSupply();

      // if (totalSupply + BigInt(data.count) > maxSupply) {
      //   return { success: false, error: `Exceeds max supply. Available: ${maxSupply - totalSupply}` };
      // }

      if (data.count > Number(maxPerMint)) {
        return { success: false, error: `Exceeds max per mint. Max: ${maxPerMint}` };
      }

      const baseMintFee = await this.astraNFTContract.getBaseMintFee();
      const totalFee = baseMintFee * BigInt(data.count);

      await this.approveUSDC(this.astraNFTContract.target as string, totalFee);

      const mintTx = await this.astraNFTContract.mintNFTs(
        data.recipientAddress,
        data.designId,
        data.designName,
        data.designImage,
        data.prompt,
        data.count
      );

      const receipt = await mintTx.wait();

      if (receipt.status === 1) {
        const tokenIds = this.extractTokenIds(receipt, data.count);
        return { success: true, tokenIds, txHash: receipt.hash };
      }

      return { success: false, error: 'Transaction failed' };
    } catch (error) {
      this.logger.error('Minting failed:', error);
      return { success: false, error: error.message };
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
    const tx = await this.hederaTokenServiceContract.approve(
      this.configService.get('HEDERA_USDC_TOKEN_ADDRESS'),
      spender,
      amount
    );
    await tx.wait();
  }

  private extractTokenIds(receipt: any, expectedCount: number): bigint[] {
    const tokenIds: bigint[] = [];
    for (const log of receipt.logs) {
      try {
        const parsed = this.astraNFTContract.interface.parseLog(log);
        if (parsed && parsed.name === 'NFTMinted') {
          tokenIds.push(parsed.args.tokenId);
        }
      } catch (e) {}
    }
    return tokenIds.slice(0, expectedCount);
  }
}
