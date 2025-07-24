import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);

  constructor(private thirdwebService: ThirdwebService) {}

  async uploadMetadata(metadata: IPFSMetadata): Promise<string> {
    try {
      const uri = await this.thirdwebService.uploadToIPFS(metadata);
      this.logger.log(`Metadata uploaded to IPFS: ${uri}`);
      return uri;
    } catch (error) {
      this.logger.error(`Failed to upload metadata: ${error.message}`);
      throw error;
    }
  }

  async uploadImage(imageBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const uri = await this.thirdwebService.uploadFileToIPFS(imageBuffer, fileName);
      this.logger.log(`Image uploaded to IPFS: ${uri}`);
      return uri;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  }

  async uploadDesignAssets(designData: {
    name: string;
    description: string;
    category: string;
    price: number;
    imageBuffer: Buffer;
    attributes: Array<{ trait_type: string; value: string | number }>;
  }): Promise<{ metadataUri: string; imageUri: string }> {
    try {
      // Upload image first
      const imageUri = await this.uploadImage(
        designData.imageBuffer,
        `${designData.name.replace(/\s+/g, '_')}.png`
      );

      // Create metadata with image URI
      const metadata: IPFSMetadata = {
        name: designData.name,
        description: designData.description,
        image: imageUri,
        attributes: [
          { trait_type: 'Category', value: designData.category },
          { trait_type: 'Price', value: designData.price },
          ...designData.attributes,
        ],
        external_url: 'https://astra.fashion',
      };

      // Upload metadata
      const metadataUri = await this.uploadMetadata(metadata);

      this.logger.log(`Design assets uploaded - Image: ${imageUri}, Metadata: ${metadataUri}`);
      
      return {
        metadataUri,
        imageUri,
      };
    } catch (error) {
      this.logger.error(`Failed to upload design assets: ${error.message}`);
      throw error;
    }
  }

  async uploadBulkAssets(assets: Array<{
    name: string;
    description: string;
    imageBuffer: Buffer;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  }>): Promise<Array<{ name: string; metadataUri: string; imageUri: string }>> {
    try {
      const results = [];

      for (const asset of assets) {
        const imageUri = await this.uploadImage(
          asset.imageBuffer,
          `${asset.name.replace(/\s+/g, '_')}.png`
        );

        const metadata: IPFSMetadata = {
          name: asset.name,
          description: asset.description,
          image: imageUri,
          attributes: asset.attributes || [],
        };

        const metadataUri = await this.uploadMetadata(metadata);

        results.push({
          name: asset.name,
          metadataUri,
          imageUri,
        });
      }

      this.logger.log(`Bulk upload completed: ${results.length} assets`);
      return results;
    } catch (error) {
      this.logger.error(`Bulk upload failed: ${error.message}`);
      throw error;
    }
  }

  getIPFSUrl(hash: string): string {
    // Convert IPFS hash to HTTP URL
    if (hash.startsWith('ipfs://')) {
      return hash.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return hash;
  }

  extractIPFSHash(uri: string): string {
    // Extract IPFS hash from various URI formats
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', '');
    }
    if (uri.includes('ipfs.io/ipfs/')) {
      return uri.split('ipfs.io/ipfs/')[1];
    }
    if (uri.includes('gateway.thirdweb.com/ipfs/')) {
      return uri.split('gateway.thirdweb.com/ipfs/')[1];
    }
    return uri;
  }

  async validateIPFSUri(uri: string): Promise<boolean> {
    try {
      const httpUrl = this.getIPFSUrl(uri);
      const response = await fetch(httpUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      this.logger.warn(`IPFS URI validation failed: ${uri} - ${error.message}`);
      return false;
    }
  }
}