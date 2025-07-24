import { ConfigService } from '@nestjs/config';
export declare class ThirdwebService {
    private configService;
    private readonly logger;
    private sdk;
    private readonly chainId;
    private readonly privateKey;
    constructor(configService: ConfigService);
    private initializeSDK;
    uploadToIPFS(data: any): Promise<string>;
    uploadFileToIPFS(file: Buffer, fileName: string): Promise<string>;
    mintNFT(contractAddress: string, metadata: any): Promise<{
        tokenId: string;
        transactionHash: string;
    }>;
    mintNFTTo(contractAddress: string, to: string, metadata: any): Promise<{
        tokenId: string;
        transactionHash: string;
    }>;
    deployNFTContract(name: string, symbol: string, description: string): Promise<string>;
    deployEscrowContract(): Promise<string>;
    getContractEvents(contractAddress: string, eventName: string, fromBlock?: number): Promise<any[]>;
    listenToContractEvents(contractAddress: string, eventName: string, callback: (event: any) => void): Promise<void>;
    getWalletAddress(): Promise<string>;
    getBalance(): Promise<string>;
}
