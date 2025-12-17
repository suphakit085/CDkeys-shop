import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Min, IsDateString, IsArray } from 'class-validator';
import { Platform } from '@prisma/client';

export class CreateGameDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(Platform)
    platform: Platform;

    @IsString()
    @IsNotEmpty()
    genre: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    developer?: string;

    @IsString()
    @IsOptional()
    publisher?: string;

    @IsDateString()
    @IsOptional()
    releaseDate?: string;

    @IsString()
    @IsOptional()
    systemRequirements?: string;

    @IsArray()
    @IsOptional()
    screenshots?: string[];
}

export class UpdateGameDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(Platform)
    @IsOptional()
    platform?: Platform;

    @IsString()
    @IsOptional()
    genre?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    developer?: string;

    @IsString()
    @IsOptional()
    publisher?: string;

    @IsDateString()
    @IsOptional()
    releaseDate?: string;

    @IsString()
    @IsOptional()
    systemRequirements?: string;

    @IsArray()
    @IsOptional()
    screenshots?: string[];
}
