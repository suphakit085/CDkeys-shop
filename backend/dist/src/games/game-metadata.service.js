"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GameMetadataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameMetadataService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const env_1 = require("../common/env");
let GameMetadataService = GameMetadataService_1 = class GameMetadataService {
    logger = new common_1.Logger(GameMetadataService_1.name);
    rawgBaseUrl = 'https://api.rawg.io/api';
    async searchRawgGames(query, pageSize = 8) {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) {
            throw new common_1.BadRequestException('Search term must be at least 2 characters');
        }
        const response = await this.fetchRawg('/games', {
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
    async getRawgGame(rawgId) {
        const id = rawgId.trim();
        if (!/^\d+$/.test(id)) {
            throw new common_1.BadRequestException('Invalid RAWG game id');
        }
        const [detail, screenshots] = await Promise.all([
            this.fetchRawg(`/games/${id}`),
            this.fetchRawg(`/games/${id}/screenshots`, {
                page_size: '8',
            }).catch((error) => {
                this.logger.warn(`RAWG screenshots unavailable for ${id}: ${error}`);
                return { results: [] };
            }),
        ]);
        if (!detail?.id) {
            throw new common_1.NotFoundException('Game metadata not found');
        }
        const pcRequirements = this.getPcRequirements(detail.platforms);
        const screenshotUrls = (screenshots.results || [])
            .filter((item) => item.image && !item.hidden)
            .map((item) => item.image)
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
                .filter((url) => Boolean(url))
                .filter((url, index, urls) => urls.indexOf(url) === index)
                .slice(0, 6),
        };
    }
    async fetchRawg(path, params = {}) {
        const apiKey = this.getRawgApiKey();
        const url = new URL(`${this.rawgBaseUrl}${path}`);
        url.searchParams.set('key', apiKey);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        let response;
        try {
            response = await fetch(url);
        }
        catch (error) {
            this.logger.error(`RAWG request failed: ${error}`);
            throw new common_1.ServiceUnavailableException('Unable to reach RAWG right now');
        }
        if (response.status === 404) {
            throw new common_1.NotFoundException('Game metadata not found');
        }
        if (!response.ok) {
            const message = await response.text().catch(() => response.statusText);
            this.logger.error(`RAWG API error ${response.status}: ${message}`);
            throw new common_1.ServiceUnavailableException('RAWG metadata service returned an error');
        }
        return (await response.json());
    }
    getRawgApiKey() {
        const apiKey = process.env.RAWG_API_KEY;
        if (!(0, env_1.isConfiguredValue)(apiKey)) {
            throw new common_1.BadRequestException('RAWG_API_KEY is not configured on the backend');
        }
        return apiKey;
    }
    names(items) {
        return (items || [])
            .map((item) => item.name?.trim())
            .filter((name) => Boolean(name));
    }
    platformNames(platforms) {
        return (platforms || [])
            .map((entry) => entry.platform?.name?.trim())
            .filter((name) => Boolean(name));
    }
    mapPlatform(platforms) {
        const names = this.platformNames(platforms).join(' ').toLowerCase();
        if (names.includes('playstation')) {
            return client_1.Platform.PLAYSTATION;
        }
        if (names.includes('xbox')) {
            return client_1.Platform.XBOX;
        }
        if (names.includes('nintendo')) {
            return client_1.Platform.NINTENDO;
        }
        if (names.includes('epic')) {
            return client_1.Platform.EPIC;
        }
        return client_1.Platform.STEAM;
    }
    getPcRequirements(platforms) {
        const pc = (platforms || []).find((entry) => {
            const name = entry.platform?.name?.toLowerCase() || '';
            return name === 'pc' || name.includes('windows');
        });
        return pc?.requirements_en || {};
    }
    getFeatureList(detail) {
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
    toDateInputValue(value) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return undefined;
        }
        return value;
    }
    cleanText(value) {
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
};
exports.GameMetadataService = GameMetadataService;
exports.GameMetadataService = GameMetadataService = GameMetadataService_1 = __decorate([
    (0, common_1.Injectable)()
], GameMetadataService);
//# sourceMappingURL=game-metadata.service.js.map