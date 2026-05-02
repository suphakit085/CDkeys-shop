import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './dto';

const PASSWORD_RESET_SENT_MESSAGE =
  'If this email exists, a password reset link has been sent.';
const MAGIC_LINK_SENT_MESSAGE =
  'If this email exists, a sign-in link has been sent.';
const REGISTRATION_LINK_SENT_MESSAGE =
  'Activation link sent. Please check your email to activate the account.';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);

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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);

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

  private generateTokens(userId: string, email: string, role: Role) {
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

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
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

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: PASSWORD_RESET_SENT_MESSAGE };
    }

    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt,
      },
    });

    if (this.emailService.isConfigured()) {
      await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.name,
      );
    }

    return { message: PASSWORD_RESET_SENT_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const users = await this.prisma.user.findMany({
      where: {
        resetPasswordExpires: { gte: new Date() },
        NOT: { resetPasswordToken: null },
      },
    });

    let matchedUser: (typeof users)[0] | null = null;
    for (const user of users) {
      const isValid = await bcrypt.compare(token, user.resetPasswordToken!);
      if (isValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired.',
      );
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

    return { message: 'Password updated successfully.' };
  }

  async sendMagicLink(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: MAGIC_LINK_SENT_MESSAGE };
    }

    const magicToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(magicToken, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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

    return { message: MAGIC_LINK_SENT_MESSAGE };
  }

  async verifyMagicLink(token: string) {
    const users = await this.prisma.user.findMany({
      where: {
        magicLinkExpires: { gte: new Date() },
        NOT: { magicLinkToken: null },
      },
    });

    let matchedUser: (typeof users)[0] | null = null;
    for (const user of users) {
      const isValid = await bcrypt.compare(token, user.magicLinkToken!);
      if (isValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException(
        'This sign-in link is invalid or has expired.',
      );
    }

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        magicLinkToken: null,
        magicLinkExpires: null,
      },
    });

    const tokens = this.generateTokens(
      matchedUser.id,
      matchedUser.email,
      matchedUser.role,
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

  async registerWithMagicLink(
    email: string,
    name: string,
  ): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email already registered. Use the sign-in email link instead.',
      );
    }

    const magicToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(magicToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = randomBytes(16).toString('hex');
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
      await this.emailService.sendRegistrationMagicLinkEmail(
        email,
        magicToken,
        name,
      );
    }

    return { message: REGISTRATION_LINK_SENT_MESSAGE };
  }
}
