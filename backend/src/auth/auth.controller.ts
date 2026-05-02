import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { RegisterDto, LoginDto } from './dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  RequestMagicLinkDto,
  MagicLinkRegisterDto,
} from './dto/email-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private authRateLimitService: AuthRateLimitService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: ExpressRequest) {
    this.authRateLimitService.consumeAuthRequest(req, 'register', dto.email);
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: ExpressRequest) {
    this.authRateLimitService.consumeAuthRequest(req, 'login', dto.email);
    return this.authRateLimitService.protectLogin(req, dto.email, () =>
      this.authService.login(dto),
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(req, 'refresh');
    return this.authService.refreshTokens(refreshToken);
  }

  // Password Reset Endpoints
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(
      req,
      'forgot-password',
      dto.email,
    );
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(req, 'reset-password');
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // Magic Link Endpoints
  @Post('send-magic-link')
  async sendMagicLink(
    @Body() dto: RequestMagicLinkDto,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(
      req,
      'send-magic-link',
      dto.email,
    );
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('verify-magic-link/:token')
  async verifyMagicLink(
    @Param('token') token: string,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(req, 'verify-magic-link');
    return this.authService.verifyMagicLink(token);
  }

  // Magic Link Registration
  @Post('register-magic-link')
  async registerWithMagicLink(
    @Body() dto: MagicLinkRegisterDto,
    @Req() req: ExpressRequest,
  ) {
    this.authRateLimitService.consumeAuthRequest(
      req,
      'register-magic-link',
      dto.email,
    );
    return this.authService.registerWithMagicLink(dto.email, dto.name);
  }
}
