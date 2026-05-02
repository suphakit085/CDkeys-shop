import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { GameMetadataService } from './game-metadata.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, Platform } from '@prisma/client';

@Controller('games')
export class GamesController {
  constructor(
    private gamesService: GamesService,
    private gameMetadataService: GameMetadataService,
  ) {}

  @Get()
  async findAll(
    @Query('platform') platform?: Platform,
    @Query('genre') genre?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamesService.findAll({
      platform,
      genre,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
      page: this.parsePositiveInt(page),
      limit: this.parsePositiveInt(limit),
    });
  }

  private parsePositiveInt(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  @Get('genres')
  async getGenres() {
    return this.gamesService.getGenres();
  }

  @Get('import/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async searchImportCandidates(
    @Query('query') query = '',
    @Query('limit') limit?: string,
  ) {
    return this.gameMetadataService.searchGames(
      query,
      this.parsePositiveInt(limit) || 12,
    );
  }

  @Get('import/rawg/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getRawgImport(@Param('id') id: string) {
    return this.gameMetadataService.getRawgGame(id);
  }

  @Get('import/steam/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getSteamImport(@Param('id') id: string) {
    return this.gameMetadataService.getSteamGame(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    return this.gamesService.delete(id);
  }
}
