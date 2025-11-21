import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class HederaEscrowService {
  private readonly logger = new Logger(HederaEscrowService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private escrowContract: ethers.Contract;

  constructor(private configService: ConfigService) {
    const privateKey = this.configService.get('HEDERA_PRIVATE_KEY');
    const rpcUrl = this.configService.get('HEDERA_TESTNET_RPC_URL');

    if (!privateKey || !rpcUrl) {
      this.logger.warn('Hedera credentials not configured. Escrow service will be unavailable.');
      return;
    }

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.escrowContract = new ethers.Contract(
      this.configService.get('HEDERA_ESCROW_CONTRACT_ADDRESS'),
      [
        'function createEscrowByAgent(address shopper, address maker, address creator, uint256 amount, uint256 nftTokenId) external returns (uint256)',
        'function getAllEscrows() external view returns (tuple(address shopper, address maker, address creator, address agent, uint256 amount, uint256 nftTokenId, uint8 milestonesCompleted, bytes status, uint256 remainingBalance, bool hasCreator)[] memory)',
      ],
      this.wallet
    );
  }

  async createEscrowByAgent(data: {
    shopper: string;
    maker: string;
    creator: string;
    amount: bigint;
    nftTokenId: number;
  }): Promise<{ success: boolean; escrowId?: bigint; txHash?: string; error?: string }> {
    if (!this.escrowContract) {
      return { success: false, error: 'Hedera escrow service not configured' };
    }
    try {
      const tx = await this.escrowContract.createEscrowByAgent(
        data.shopper,
        data.maker,
        data.creator,
        data.amount,
        data.nftTokenId
      );
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        const escrowId = this.extractEscrowId(receipt);
        return { success: true, escrowId, txHash: receipt.hash };
      }

      return { success: false, error: 'Transaction failed' };
    } catch (error) {
      this.logger.error('Create escrow failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllEscrows(): Promise<any[]> {
    if (!this.escrowContract) return [];
    try {
      return await this.escrowContract.getAllEscrows();
    } catch (error) {
      this.logger.error('Get all escrows failed:', error);
      return [];
    }
  }

  private extractEscrowId(receipt: any): bigint | undefined {
    for (const log of receipt.logs) {
      try {
        const parsed = this.escrowContract.interface.parseLog(log);
        if (parsed && parsed.name === 'EscrowCreated') {
          return parsed.args.escrowId;
        }
      } catch (e) {}
    }
    return undefined;
  }
}
