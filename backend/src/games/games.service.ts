import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { Platform, KeyStatus, Prisma } from '@prisma/client';

interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    platform?: Platform;
    genre?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.GameWhereInput = {};

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.genre) {
      where.genre = filters.genre;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters?.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters?.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters?.search) {
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const include = {
      _count: {
        select: {
          cdKeys: {
            where: { status: KeyStatus.AVAILABLE },
          },
        },
      },
    } satisfies Prisma.GameInclude;

    const pagination = this.getPagination(filters);
    const mapGame = (
      game: Prisma.GameGetPayload<{ include: typeof include }>,
    ) => ({
      ...game,
      availableKeys: game._count.cdKeys,
      _count: undefined,
    });

    if (!pagination) {
      const games = await this.prisma.game.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });

      return games.map(mapGame);
    }

    const [games, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.game.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

    return {
      data: games.map(mapGame),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1,
      },
    };
  }

  private getPagination(options?: PaginationOptions) {
    if (options?.page === undefined && options?.limit === undefined) {
      return null;
    }

    const page = Number.isFinite(options?.page)
      ? Math.max(1, Math.floor(options?.page || 1))
      : 1;
    const limit = Number.isFinite(options?.limit)
      ? Math.max(1, Math.min(100, Math.floor(options?.limit || 20)))
      : 20;

    return { page, limit };
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cdKeys: {
              where: { status: KeyStatus.AVAILABLE },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return {
      ...game,
      availableKeys: game._count.cdKeys,
      _count: undefined,
    };
  }

  async create(dto: CreateGameDto) {
    try {
      return await this.prisma.game.create({
        data: {
          ...dto,
          price: dto.price,
        },
      });
    } catch (error) {
      this.handleGameWriteError(error);
    }
  }

  async update(id: string, dto: UpdateGameDto) {
    await this.findOne(id);

    try {
      return await this.prisma.game.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.handleGameWriteError(error);
    }
  }

  async delete(id: string) {
    await this.findOne(id);

    // Check if game has sold keys (can't delete)
    const soldKeys = await this.prisma.cdKey.count({
      where: { gameId: id, status: 'SOLD' },
    });

    if (soldKeys > 0) {
      throw new BadRequestException('ไม่สามารถลบเกมที่มี keys ขายแล้วได้');
    }

    // Check if game has orders
    const orders = await this.prisma.orderItem.count({
      where: { gameId: id },
    });

    if (orders > 0) {
      throw new BadRequestException('ไม่สามารถลบเกมที่มี orders ได้');
    }

    // Delete all cdKeys first (available/reserved ones)
    await this.prisma.cdKey.deleteMany({
      where: { gameId: id },
    });

    // Then delete game
    return this.prisma.game.delete({
      where: { id },
    });
  }

  async getGenres() {
    const games = await this.prisma.game.findMany({
      select: { genre: true },
      distinct: ['genre'],
    });
    return games.map((g) => g.genre);
  }

  private handleGameWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A game with this title and platform already exists. Edit the existing game or choose another platform.',
      );
    }

    throw error;
  }
}
