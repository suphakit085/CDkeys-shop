import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { KeysService } from './keys.service';
import { AddKeysDto, UpdateKeyStatusDto } from './dto/keys.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, KeyStatus } from '@prisma/client';

@Controller('keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class KeysController {
    constructor(private keysService: KeysService) { }

    @Get('game/:gameId')
    async findByGame(@Param('gameId') gameId: string) {
        return this.keysService.findByGame(gameId);
    }

    @Get('stats')
    async getStats(@Query('gameId') gameId?: string) {
        return this.keysService.getStats(gameId);
    }

    @Post()
    async addKeys(@Body() dto: AddKeysDto) {
        return this.keysService.addKeys(dto.gameId, dto.keys);
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body() dto: UpdateKeyStatusDto) {
        return this.keysService.updateStatus(id, dto.status as KeyStatus);
    }

    @Delete(':id')
    async deleteKey(@Param('id') id: string) {
        return this.keysService.deleteKey(id);
    }

    @Post('release-expired')
    async releaseExpired(@Query('minutes') minutes?: string) {
        return this.keysService.releaseExpiredReservations(
            minutes ? parseInt(minutes) : 15,
        );
    }
}
