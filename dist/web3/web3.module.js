"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Module = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const thirdweb_service_1 = require("./services/thirdweb.service");
const ipfs_service_1 = require("./services/ipfs.service");
const nft_service_1 = require("./services/nft.service");
const escrow_service_1 = require("./services/escrow.service");
const qr_service_1 = require("./services/qr.service");
const webhook_service_1 = require("./services/webhook.service");
const web3_controller_1 = require("./controllers/web3.controller");
const nft_entity_1 = require("./entities/nft.entity");
const escrow_entity_1 = require("./entities/escrow.entity");
const qr_entity_1 = require("./entities/qr.entity");
const escrow_entity_2 = require("./entities/escrow.entity");
let Web3Module = class Web3Module {
};
exports.Web3Module = Web3Module;
exports.Web3Module = Web3Module = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([nft_entity_1.NFT, escrow_entity_1.EscrowContract, escrow_entity_2.EscrowMilestone, qr_entity_1.QRCode]),
        ],
        controllers: [web3_controller_1.Web3Controller],
        providers: [
            thirdweb_service_1.ThirdwebService,
            ipfs_service_1.IPFSService,
            nft_service_1.NFTService,
            escrow_service_1.EscrowService,
            qr_service_1.QRService,
            webhook_service_1.WebhookService,
        ],
        exports: [
            thirdweb_service_1.ThirdwebService,
            ipfs_service_1.IPFSService,
            nft_service_1.NFTService,
            escrow_service_1.EscrowService,
            qr_service_1.QRService,
            webhook_service_1.WebhookService,
        ],
    })
], Web3Module);
//# sourceMappingURL=web3.module.js.map