import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pinataSDK from '@pinata/sdk';

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);
  private pinata: any;

  constructor(private configService: ConfigService) {
    const jwt = this.configService.get('PINATA_JWT_TOKEN');
    if (jwt) {
      this.pinata = new pinataSDK({ pinataJWTKey: jwt });
    }
  }

  async uploadDesignAssets(params: {
    name: string;
    description: string;
    category: string;
    price: number;
    imageBuffer: Buffer;
    attributes: Array<{ trait_type: string; value: string | number }>;
  }): Promise<{ metadataUri: string; imageUri: string }> {
    if (!this.pinata) {
      this.logger.warn('Pinata not configured, using mock IPFS');
      return {
        imageUri: `ipfs://QmMockImageHash${Date.now()}`,
        metadataUri: `ipfs://QmMockMetadataHash${Date.now()}`,
      };
    }

    try {
      const imageResult = await this.pinata.pinFileToIPFS(params.imageBuffer, {
        pinataMetadata: { name: `${params.name}.png` },
      });
      const imageUri = `ipfs://${imageResult.IpfsHash}`;

      const metadata = {
        name: params.name,
        description: params.description,
        image: imageUri,
        attributes: params.attributes,
      };

      const metadataResult = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: { name: `${params.name}-metadata.json` },
      });
      const metadataUri = `ipfs://${metadataResult.IpfsHash}`;

      this.logger.log(`IPFS upload successful for: ${params.name}`);

      return {
        imageUri,
        metadataUri,
      };
    } catch (error) {
      this.logger.error(`IPFS upload failed: ${error.message}`);
      throw error;
    }
  }

  extractIPFSHash(uri: string): string {
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', '');
    }
    return uri;
  }
}