import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GameMetadataService } from './game-metadata.service';

@Module({
  controllers: [GamesController],
  providers: [GamesService, GameMetadataService],
  exports: [GamesService],
})
export class GamesModule {}
