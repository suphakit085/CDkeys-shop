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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const cloudinary_service_1 = require("./cloudinary.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
let UploadController = class UploadController {
    cloudinaryService;
    constructor(cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }
    async uploadImage(file, folder = 'general') {
        if (!file) {
            throw new Error('No file uploaded');
        }
        if (this.cloudinaryService.isEnabled()) {
            const result = await this.cloudinaryService.uploadImage(file, folder);
            return {
                url: result.url,
                publicId: result.publicId,
                provider: 'cloudinary',
            };
        }
        const fs = await import('fs/promises');
        const path = await import('path');
        const uploadDir = path.join(process.cwd(), 'uploads', folder);
        await fs.mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${(0, path_1.extname)(file.originalname)}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, file.buffer);
        return {
            url: `/uploads/${folder}/${filename}`,
            filename,
            provider: 'local',
        };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [cloudinary_service_1.CloudinaryService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map