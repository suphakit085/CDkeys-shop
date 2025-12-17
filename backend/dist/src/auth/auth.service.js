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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    emailService;
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            },
        });
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            ...tokens,
        };
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET || 'default-secret',
            expiresIn: 900,
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
            expiresIn: 604800,
        });
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
            });
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return this.generateTokens(user.id, user.email, user.role);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' };
        }
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: expiresAt,
            },
        });
        if (this.emailService.isConfigured()) {
            await this.emailService.sendPasswordResetEmail(email, resetToken, user.name);
        }
        return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' };
    }
    async resetPassword(token, newPassword) {
        const users = await this.prisma.user.findMany({
            where: {
                resetPasswordExpires: {
                    gte: new Date(),
                },
                NOT: {
                    resetPasswordToken: null,
                },
            },
        });
        let matchedUser = null;
        for (const user of users) {
            const isValid = await bcrypt.compare(token, user.resetPasswordToken);
            if (isValid) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) {
            throw new common_1.UnauthorizedException('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: matchedUser.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        return { message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
    }
    async sendMagicLink(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์ล็อกอินไปให้' };
        }
        const crypto = require('crypto');
        const magicToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(magicToken, 10);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                magicLinkToken: hashedToken,
                magicLinkExpires: expiresAt,
            },
        });
        if (this.emailService.isConfigured()) {
            await this.emailService.sendMagicLinkEmail(email, magicToken, user.name);
        }
        return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์ล็อกอินไปให้' };
    }
    async verifyMagicLink(token) {
        const users = await this.prisma.user.findMany({
            where: {
                magicLinkExpires: {
                    gte: new Date(),
                },
                NOT: {
                    magicLinkToken: null,
                },
            },
        });
        let matchedUser = null;
        for (const user of users) {
            const isValid = await bcrypt.compare(token, user.magicLinkToken);
            if (isValid) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) {
            throw new common_1.UnauthorizedException('ลิงก์ล็อกอินไม่ถูกต้องหรือหมดอายุแล้ว');
        }
        await this.prisma.user.update({
            where: { id: matchedUser.id },
            data: {
                magicLinkToken: null,
                magicLinkExpires: null,
            },
        });
        const tokens = await this.generateTokens(matchedUser.id, matchedUser.email, matchedUser.role);
        return {
            user: {
                id: matchedUser.id,
                email: matchedUser.email,
                name: matchedUser.name,
                role: matchedUser.role,
            },
            ...tokens,
        };
    }
    async registerWithMagicLink(email, name) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้ลิงก์ล้างรหัสผ่านแทน');
        }
        const crypto = require('crypto');
        const magicToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(magicToken, 10);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await this.prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                magicLinkToken: hashedToken,
                magicLinkExpires: expiresAt,
            },
        });
        if (this.emailService.isConfigured()) {
            await this.emailService.sendRegistrationMagicLinkEmail(email, magicToken, name);
        }
        return { message: 'เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบอีเมลเพื่อเปิดใช้งานบัญชี' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map