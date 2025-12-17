import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) { }

    async register(dto: RegisterDto) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            },
        });

        // Generate tokens
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

    async login(dto: LoginDto) {
        // Find user
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const passwordValid = await bcrypt.compare(dto.password, user.password);

        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
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

    async getProfile(userId: string) {
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
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET || 'default-secret',
            expiresIn: 900, // 15 minutes in seconds
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
            expiresIn: 604800, // 7 days in seconds
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return this.generateTokens(user.id, user.email, user.role);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // Password Reset Methods
    async requestPasswordReset(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success even if user not found (security best practice)
        if (!user) {
            return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' };
        }

        // Generate secure random token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Token expires in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Save token to database
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: expiresAt,
            },
        });

        // Send email with reset link
        if (this.emailService.isConfigured()) {
            await this.emailService.sendPasswordResetEmail(email, resetToken, user.name);
        }

        return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        // Find users with non-expired reset tokens
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

        // Check each user's token (since it's hashed)
        let matchedUser: typeof users[0] | null = null;
        for (const user of users) {
            const isValid = await bcrypt.compare(token, user.resetPasswordToken!);
            if (isValid) {
                matchedUser = user;
                break;
            }
        }

        if (!matchedUser) {
            throw new UnauthorizedException('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
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

    // Magic Link Methods
    async sendMagicLink(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success even if user not found (security)
        if (!user) {
            return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์ล็อกอินไปให้' };
        }

        // Generate secure random token
        const crypto = require('crypto');
        const magicToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(magicToken, 10);

        // Token expires in 15 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Save token to database
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                magicLinkToken: hashedToken,
                magicLinkExpires: expiresAt,
            },
        });

        // Send email with magic link
        if (this.emailService.isConfigured()) {
            await this.emailService.sendMagicLinkEmail(email, magicToken, user.name);
        }

        return { message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์ล็อกอินไปให้' };
    }

    async verifyMagicLink(token: string) {
        // Find users with non-expired magic link tokens
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

        // Check each user's token (since it's hashed)
        let matchedUser: typeof users[0] | null = null;
        for (const user of users) {
            const isValid = await bcrypt.compare(token, user.magicLinkToken!);
            if (isValid) {
                matchedUser = user;
                break;
            }
        }

        if (!matchedUser) {
            throw new UnauthorizedException('ลิงก์ล็อกอินไม่ถูกต้องหรือหมดอายุแล้ว');
        }

        // Clear magic link token (one-time use)
        await this.prisma.user.update({
            where: { id: matchedUser.id },
            data: {
                magicLinkToken: null,
                magicLinkExpires: null,
            },
        });

        // Generate auth tokens
        const tokens = await this.generateTokens(
            matchedUser.id,
            matchedUser.email,
            matchedUser.role
        );

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
}
