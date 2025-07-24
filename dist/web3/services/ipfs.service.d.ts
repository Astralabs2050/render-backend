import { ThirdwebService } from './thirdweb.service';
export interface IPFSMetadata {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    external_url?: string;
    animation_url?: string;
    background_color?: string;
}
export declare class IPFSService {
    private thirdwebService;
    private readonly logger;
    constructor(thirdwebService: ThirdwebService);
    uploadMetadata(metadata: IPFSMetadata): Promise<string>;
    uploadImage(imageBuffer: Buffer, fileName: string): Promise<string>;
    uploadDesignAssets(designData: {
        name: string;
        description: string;
        category: string;
        price: number;
        imageBuffer: Buffer;
        attributes: Array<{
            trait_type: string;
            value: string | number;
        }>;
    }): Promise<{
        metadataUri: string;
        imageUri: string;
    }>;
    uploadBulkAssets(assets: Array<{
        name: string;
        description: string;
        imageBuffer: Buffer;
        attributes?: Array<{
            trait_type: string;
            value: string | number;
        }>;
    }>): Promise<Array<{
        name: string;
        metadataUri: string;
        imageUri: string;
    }>>;
    getIPFSUrl(hash: string): string;
    extractIPFSHash(uri: string): string;
    validateIPFSUri(uri: string): Promise<boolean>;
}
