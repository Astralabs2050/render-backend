import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { uploadBase64, uploadJson } from 'pinata';

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);
  private config: { pinataJwt: string } | null = null;

  constructor(private configService: ConfigService) {
    const jwt = this.configService.get('PINATA_JWT_TOKEN');
    if (jwt) {
      this.config = { pinataJwt: jwt };
    }
  }

  async uploadDesignAssets(params: {
    name: string;
    description: string;
    imageBuffer: Buffer;
    attributes: Array<{ trait_type: string; value: string | number }>;
  }): Promise<{ metadataUri: string; imageUri: string }> {
    if (!this.config) {
      this.logger.warn('Pinata not configured, using mock IPFS');
      return {
        imageUri: `ipfs://QmMockImageHash${Date.now()}`,
        metadataUri: `ipfs://QmMockMetadataHash${Date.now()}`,
      };
    }

    try {
      const base64Image = params.imageBuffer.toString('base64');
      const imageUpload = await uploadBase64(this.config, base64Image, 'public');
      const imageUri = `ipfs://${imageUpload.cid}`;

      const metadata = {
        name: params.name,
        description: params.description,
        image: imageUri,
        attributes: params.attributes,
      };

      const metadataUpload = await uploadJson(this.config, metadata, 'public');
      const metadataUri = `ipfs://${metadataUpload.cid}`;

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
