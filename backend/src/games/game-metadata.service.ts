import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Platform } from '@prisma/client';
import { isConfiguredValue } from '../common/env';

type RawgNamedItem = {
  id?: number;
  name?: string;
  slug?: string;
};

type RawgPlatformEntry = {
  platform?: RawgNamedItem;
  requirements_en?: {
    minimum?: string;
    recommended?: string;
  };
};

type RawgSearchGame = {
  id: number;
  slug?: string;
  name: string;
  released?: string | null;
  background_image?: string | null;
  rating?: number | null;
  genres?: RawgNamedItem[];
  platforms?: RawgPlatformEntry[];
};

type RawgGameDetail = RawgSearchGame & {
  description_raw?: string | null;
  website?: string | null;
  developers?: RawgNamedItem[];
  publishers?: RawgNamedItem[];
  tags?: RawgNamedItem[];
  esrb_rating?: RawgNamedItem | null;
};

type RawgSearchResponse = {
  results?: RawgSearchGame[];
};

type RawgScreenshotsResponse = {
  results?: Array<{
    image?: string | null;
    hidden?: boolean;
  }>;
};

export type GameMetadataSearchResult = {
  source: 'rawg';
  sourceId: string;
  title: string;
  imageUrl?: string;
  releaseDate?: string;
  genres: string[];
  platforms: string[];
  rating?: number;
};

export type GameMetadataImport = {
  source: 'rawg';
  sourceId: string;
  sourceUrl: string;
  title: string;
  description?: string;
  platform: Platform;
  genre: string;
  imageUrl?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  systemRequirements?: string;
  minimumSystemRequirements?: string;
  recommendedSystemRequirements?: string;
  features: string[];
  supportedLanguages: string[];
  activationRegion: string;
  ageRating?: string;
  screenshots: string[];
};

@Injectable()
export class GameMetadataService {
  private readonly logger = new Logger(GameMetadataService.name);
  private readonly rawgBaseUrl = 'https://api.rawg.io/api';

  async searchRawgGames(
    query: string,
    pageSize = 8,
  ): Promise<GameMetadataSearchResult[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      throw new BadRequestException(
        'Search term must be at least 2 characters',
      );
    }

    const response = await this.fetchRawg<RawgSearchResponse>('/games', {
      search: trimmedQuery,
      page_size: String(Math.max(1, Math.min(12, pageSize))),
      ordering: '-rating',
    });

    return (response.results || []).map((game) => ({
      source: 'rawg',
      sourceId: String(game.id),
      title: game.name,
      imageUrl: game.background_image || undefined,
      releaseDate: this.toDateInputValue(game.released),
      genres: this.names(game.genres),
      platforms: this.platformNames(game.platforms),
      rating: typeof game.rating === 'number' ? game.rating : undefined,
    }));
  }

  async getRawgGame(rawgId: string): Promise<GameMetadataImport> {
    const id = rawgId.trim();
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Invalid RAWG game id');
    }

    const [detail, screenshots] = await Promise.all([
      this.fetchRawg<RawgGameDetail>(`/games/${id}`),
      this.fetchRawg<RawgScreenshotsResponse>(`/games/${id}/screenshots`, {
        page_size: '8',
      }).catch((error) => {
        this.logger.warn(`RAWG screenshots unavailable for ${id}: ${error}`);
        return { results: [] };
      }),
    ]);

    if (!detail?.id) {
      throw new NotFoundException('Game metadata not found');
    }

    const pcRequirements = this.getPcRequirements(detail.platforms);
    const screenshotUrls = (screenshots.results || [])
      .filter((item) => item.image && !item.hidden)
      .map((item) => item.image as string)
      .slice(0, 6);

    const imageUrl = detail.background_image || screenshotUrls[0] || undefined;
    const minimum = this.cleanText(pcRequirements.minimum);
    const recommended = this.cleanText(pcRequirements.recommended);

    return {
      source: 'rawg',
      sourceId: String(detail.id),
      sourceUrl: `https://rawg.io/games/${detail.slug || detail.id}`,
      title: detail.name,
      description: this.cleanText(detail.description_raw),
      platform: this.mapPlatform(detail.platforms),
      genre: this.names(detail.genres)[0] || 'Action',
      imageUrl,
      developer: this.names(detail.developers).join(', ') || undefined,
      publisher: this.names(detail.publishers).join(', ') || undefined,
      releaseDate: this.toDateInputValue(detail.released),
      systemRequirements: detail.website
        ? `Official website: ${detail.website}`
        : undefined,
      minimumSystemRequirements: minimum,
      recommendedSystemRequirements: recommended,
      features: this.getFeatureList(detail),
      supportedLanguages: [],
      activationRegion: 'Global',
      ageRating: detail.esrb_rating?.name,
      screenshots: [imageUrl, ...screenshotUrls]
        .filter((url): url is string => Boolean(url))
        .filter((url, index, urls) => urls.indexOf(url) === index)
        .slice(0, 6),
    };
  }

  private async fetchRawg<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const apiKey = this.getRawgApiKey();
    const url = new URL(`${this.rawgBaseUrl}${path}`);
    url.searchParams.set('key', apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      this.logger.error(`RAWG request failed: ${error}`);
      throw new ServiceUnavailableException('Unable to reach RAWG right now');
    }

    if (response.status === 404) {
      throw new NotFoundException('Game metadata not found');
    }

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      this.logger.error(`RAWG API error ${response.status}: ${message}`);
      throw new ServiceUnavailableException(
        'RAWG metadata service returned an error',
      );
    }

    return (await response.json()) as T;
  }

  private getRawgApiKey() {
    const apiKey = process.env.RAWG_API_KEY;
    if (!isConfiguredValue(apiKey)) {
      throw new BadRequestException(
        'RAWG_API_KEY is not configured on the backend',
      );
    }

    return apiKey;
  }

  private names(items?: RawgNamedItem[]) {
    return (items || [])
      .map((item) => item.name?.trim())
      .filter((name): name is string => Boolean(name));
  }

  private platformNames(platforms?: RawgPlatformEntry[]) {
    return (platforms || [])
      .map((entry) => entry.platform?.name?.trim())
      .filter((name): name is string => Boolean(name));
  }

  private mapPlatform(platforms?: RawgPlatformEntry[]): Platform {
    const names = this.platformNames(platforms).join(' ').toLowerCase();

    if (names.includes('playstation')) {
      return Platform.PLAYSTATION;
    }
    if (names.includes('xbox')) {
      return Platform.XBOX;
    }
    if (names.includes('nintendo')) {
      return Platform.NINTENDO;
    }
    if (names.includes('epic')) {
      return Platform.EPIC;
    }

    return Platform.STEAM;
  }

  private getPcRequirements(platforms?: RawgPlatformEntry[]) {
    const pc = (platforms || []).find((entry) => {
      const name = entry.platform?.name?.toLowerCase() || '';
      return name === 'pc' || name.includes('windows');
    });

    return pc?.requirements_en || {};
  }

  private getFeatureList(detail: RawgGameDetail) {
    const blockedTags = new Set([
      'steam achievements',
      'steam trading cards',
      'full controller support',
      'partial controller support',
      'steam cloud',
      'steam workshop',
      'steam leaderboards',
      'remote play on tv',
      'remote play on phone',
      'remote play on tablet',
    ]);

    const tags = this.names(detail.tags)
      .filter((tag) => tag.length <= 32)
      .filter((tag) => !blockedTags.has(tag.toLowerCase()))
      .slice(0, 8);

    if (tags.length > 0) {
      return tags;
    }

    return this.names(detail.genres).slice(0, 5);
  }

  private toDateInputValue(value?: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return undefined;
    }

    return value;
  }

  private cleanText(value?: string | null) {
    if (!value) {
      return undefined;
    }

    const cleaned = value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned || undefined;
  }
}
