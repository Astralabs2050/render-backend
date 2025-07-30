import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);

  async uploadToIPFS(data: Buffer, fileName: string): Promise<string> {
    this.logger.log(`Uploading ${fileName} to IPFS`);
    return `ipfs://mock-hash/${fileName}`;
  }

  async uploadDesignAssets(assets: any): Promise<{ metadataUri: string; imageUri: string }> {
    this.logger.log(`Uploading design assets to IPFS`);
    return {
      metadataUri: 'ipfs://mock-metadata-hash',
      imageUri: 'ipfs://mock-image-hash'
    };
  }

  extractIPFSHash(uri: string): string {
    return uri.replace('ipfs://', '');
  }
}