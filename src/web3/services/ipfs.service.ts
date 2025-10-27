import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);
  private jwt: string | null = null;

  constructor(private configService: ConfigService) {
    this.jwt = this.configService.get('PINATA_JWT_TOKEN');
  }

  async uploadDesignAssets(params: {
    name: string;
    description: string;
    imageBuffer: Buffer;
    attributes: Array<{ trait_type: string; value: string | number }>;
  }): Promise<{ metadataUri: string; imageUri: string }> {
    if (!this.jwt) {
      this.logger.warn('Pinata not configured, using mock IPFS');
      return {
        imageUri: `ipfs://QmMockImageHash${Date.now()}`,
        metadataUri: `ipfs://QmMockMetadataHash${Date.now()}`,
      };
    }

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', params.imageBuffer, { filename: `${params.name}.png` });

      const imageRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.jwt}`,
        },
      });
      const imageUri = `ipfs://${imageRes.data.IpfsHash}`;

      const metadata = {
        name: params.name,
        description: params.description,
        image: imageUri,
        attributes: params.attributes,
      };

      const metadataRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.jwt}`,
        },
      });
      const metadataUri = `ipfs://${metadataRes.data.IpfsHash}`;

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
