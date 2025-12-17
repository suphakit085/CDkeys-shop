"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const streamifier = __importStar(require("streamifier"));
let CloudinaryService = class CloudinaryService {
    configService;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
        if (cloudName && apiKey && apiSecret) {
            cloudinary_1.v2.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            this.isConfigured = true;
            console.log('✅ Cloudinary configured successfully');
        }
        else {
            console.log('⚠️ Cloudinary not configured - using local storage fallback');
        }
    }
    isEnabled() {
        return this.isConfigured;
    }
    async uploadImage(file, folder = 'cdkeys') {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Cloudinary is not configured');
        }
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: `cdkeys/${folder}`,
                resource_type: 'image',
                transformation: [
                    { width: 1200, height: 800, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            }, (error, result) => {
                if (error) {
                    reject(new common_1.BadRequestException('Failed to upload image to Cloudinary'));
                }
                else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                }
            });
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }
    async deleteImage(publicId) {
        if (!this.isConfigured) {
            return;
        }
        try {
            await cloudinary_1.v2.uploader.destroy(publicId);
        }
        catch (error) {
            console.error('Failed to delete image from Cloudinary:', error);
        }
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map