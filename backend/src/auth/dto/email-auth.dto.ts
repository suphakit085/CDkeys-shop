import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @IsString()
    token: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    newPassword: string;
}

export class RequestMagicLinkDto {
    @IsEmail()
    email: string;
}

export class VerifyMagicLinkDto {
    @IsString()
    token: string;
}

export class MagicLinkRegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters' })
    name: string;
}

