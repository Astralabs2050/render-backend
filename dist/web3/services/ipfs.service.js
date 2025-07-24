"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var IPFSService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSService = void 0;
const common_1 = require("@nestjs/common");
const thirdweb_service_1 = require("./thirdweb.service");
let IPFSService = IPFSService_1 = class IPFSService {
    constructor(thirdwebService) {
        this.thirdwebService = thirdwebService;
        this.logger = new common_1.Logger(IPFSService_1.name);
    }
    async uploadMetadata(metadata) {
        try {
            const uri = await this.thirdwebService.uploadToIPFS(metadata);
            this.logger.log(`Metadata uploaded to IPFS: ${uri}`);
            return uri;
        }
        catch (error) {
            this.logger.error(`Failed to upload metadata: ${error.message}`);
            throw error;
        }
    }
    async uploadImage(imageBuffer, fileName) {
        try {
            const uri = await this.thirdwebService.uploadFileToIPFS(imageBuffer, fileName);
            this.logger.log(`Image uploaded to IPFS: ${uri}`);
            return uri;
        }
        catch (error) {
            this.logger.error(`Failed to upload image: ${error.message}`);
            throw error;
        }
    }
    async uploadDesignAssets(designData) {
        try {
            const imageUri = await this.uploadImage(designData.imageBuffer, `${designData.name.replace(/\s+/g, '_')}.png`);
            const metadata = {
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
            const metadataUri = await this.uploadMetadata(metadata);
            this.logger.log(`Design assets uploaded - Image: ${imageUri}, Metadata: ${metadataUri}`);
            return {
                metadataUri,
                imageUri,
            };
        }
        catch (error) {
            this.logger.error(`Failed to upload design assets: ${error.message}`);
            throw error;
        }
    }
    async uploadBulkAssets(assets) {
        try {
            const results = [];
            for (const asset of assets) {
                const imageUri = await this.uploadImage(asset.imageBuffer, `${asset.name.replace(/\s+/g, '_')}.png`);
                const metadata = {
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
        }
        catch (error) {
            this.logger.error(`Bulk upload failed: ${error.message}`);
            throw error;
        }
    }
    getIPFSUrl(hash) {
        if (hash.startsWith('ipfs://')) {
            return hash.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return hash;
    }
    extractIPFSHash(uri) {
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
    async validateIPFSUri(uri) {
        try {
            const httpUrl = this.getIPFSUrl(uri);
            const response = await fetch(httpUrl, { method: 'HEAD' });
            return response.ok;
        }
        catch (error) {
            this.logger.warn(`IPFS URI validation failed: ${uri} - ${error.message}`);
            return false;
        }
    }
};
exports.IPFSService = IPFSService;
exports.IPFSService = IPFSService = IPFSService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [thirdweb_service_1.ThirdwebService])
], IPFSService);
//# sourceMappingURL=ipfs.service.js.map