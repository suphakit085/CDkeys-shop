import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Request,
    Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import {
    RequestPasswordResetDto,
    ResetPasswordDto,
    RequestMagicLinkDto,
    VerifyMagicLinkDto,
    MagicLinkRegisterDto
} from './dto/email-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: { user: { id: string } }) {
        return this.authService.getProfile(req.user.id);
    }

    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshTokens(refreshToken);
    }

    // Password Reset Endpoints
    @Post('forgot-password')
    async forgotPassword(@Body() dto: RequestPasswordResetDto) {
        return this.authService.requestPasswordReset(dto.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    // Magic Link Endpoints
    @Post('send-magic-link')
    async sendMagicLink(@Body() dto: RequestMagicLinkDto) {
        return this.authService.sendMagicLink(dto.email);
    }

    @Get('verify-magic-link/:token')
    async verifyMagicLink(@Param('token') token: string) {
        return this.authService.verifyMagicLink(token);
    }

    // Magic Link Registration
    @Post('register-magic-link')
    async registerWithMagicLink(@Body() dto: MagicLinkRegisterDto) {
        return this.authService.registerWithMagicLink(dto.email, dto.name);
    }
}
