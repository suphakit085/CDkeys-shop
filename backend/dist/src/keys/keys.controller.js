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
exports.KeysController = void 0;
const common_1 = require("@nestjs/common");
const keys_service_1 = require("./keys.service");
const keys_dto_1 = require("./dto/keys.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let KeysController = class KeysController {
    keysService;
    constructor(keysService) {
        this.keysService = keysService;
    }
    async findByGame(gameId) {
        return this.keysService.findByGame(gameId);
    }
    async getStats(gameId) {
        return this.keysService.getStats(gameId);
    }
    async addKeys(dto) {
        return this.keysService.addKeys(dto.gameId, dto.keys);
    }
    async updateStatus(id, dto) {
        return this.keysService.updateStatus(id, dto.status);
    }
    async deleteKey(id) {
        return this.keysService.deleteKey(id);
    }
    async releaseExpired(minutes) {
        return this.keysService.releaseExpiredReservations(minutes ? parseInt(minutes) : 15);
    }
};
exports.KeysController = KeysController;
__decorate([
    (0, common_1.Get)('game/:gameId'),
    __param(0, (0, common_1.Param)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "findByGame", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [keys_dto_1.AddKeysDto]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "addKeys", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, keys_dto_1.UpdateKeyStatusDto]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "deleteKey", null);
__decorate([
    (0, common_1.Post)('release-expired'),
    __param(0, (0, common_1.Query)('minutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeysController.prototype, "releaseExpired", null);
exports.KeysController = KeysController = __decorate([
    (0, common_1.Controller)('keys'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [keys_service_1.KeysService])
], KeysController);
//# sourceMappingURL=keys.controller.js.map