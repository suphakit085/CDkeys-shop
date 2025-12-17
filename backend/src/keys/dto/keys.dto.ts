import { IsString, IsNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AddKeysDto {
    @IsUUID()
    gameId: string;

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    keys: string[];
}

export class UpdateKeyStatusDto {
    @IsString()
    @IsNotEmpty()
    status: 'AVAILABLE' | 'SOLD' | 'RESERVED';
}
