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
    steamDetailsCache = new Map();
    async searchGames(query, pageSize = 12) {
        const trimmedQuery = this.validateSearchQuery(query);
        const perSourceLimit = Math.max(4, Math.min(12, pageSize));
        const [steamResult, rawgResult] = await Promise.allSettled([
            this.searchSteamGames(trimmedQuery, perSourceLimit),
            this.searchRawgGames(trimmedQuery, Math.min(6, perSourceLimit)),
        ]);
        const combined = [];
        if (steamResult.status === 'fulfilled') {
            combined.push(...steamResult.value);
        }
        else {
            this.logger.warn(`Steam search failed: ${steamResult.reason}`);
        }
        if (rawgResult.status === 'fulfilled') {
            combined.push(...rawgResult.value);
        }
        else {
            this.logger.warn(`RAWG search failed: ${rawgResult.reason}`);
        }
        if (combined.length === 0) {
            if (steamResult.status === 'rejected' &&
                rawgResult.status === 'rejected') {
                throw new common_1.ServiceUnavailableException('Game metadata providers are unavailable right now');
            }
            return [];
        }
        return this.dedupeSearchResults(combined).slice(0, pageSize);
    }
    async searchRawgGames(query, pageSize = 8) {
        const trimmedQuery = this.validateSearchQuery(query);
        const response = await this.fetchRawg('/games', {
            search: trimmedQuery,
            search_precise: 'true',
            page_size: String(Math.max(1, Math.min(12, pageSize))),
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
    async searchSteamGames(query, pageSize = 8) {
        const trimmedQuery = this.validateSearchQuery(query);
        const items = await this.searchSteamStore(trimmedQuery);
        const scored = items
            .map((item) => ({
            item,
            score: this.scoreTitleMatch(item.name || '', trimmedQuery),
        }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score ||
            (a.item.name || '').length - (b.item.name || '').length)
            .slice(0, Math.max(8, pageSize * 2));
        const details = await Promise.all(scored.map(async ({ item, score }) => {
            const appId = String(item.id);
            const detail = await this.fetchSteamAppDetails(appId).catch((error) => {
                this.logger.warn(`Steam details unavailable for ${appId}: ${error}`);
                return null;
            });
            return { item, detail, score };
        }));
        return details
            .filter(({ detail }) => !detail || detail.type === 'game')
            .map(({ item, detail }) => ({
            source: 'steam',
            sourceId: String(item.id),
            title: detail?.name || item.name || `Steam App ${item.id}`,
            imageUrl: detail?.header_image ||
                detail?.capsule_imagev5 ||
                detail?.capsule_image ||
                item.tiny_image ||
                undefined,
            releaseDate: this.parseSteamDate(detail?.release_date),
            genres: this.steamDescriptions(detail?.genres),
            platforms: ['Steam'],
            rating: undefined,
        }))
            .slice(0, pageSize);
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
    async getSteamGame(appId) {
        const id = appId.trim();
        if (!/^\d+$/.test(id)) {
            throw new common_1.BadRequestException('Invalid Steam app id');
        }
        const detail = await this.fetchSteamAppDetails(id);
        if (!detail || detail.type !== 'game') {
            throw new common_1.NotFoundException('Steam game metadata not found');
        }
        const requirements = this.getSteamRequirements(detail.pc_requirements);
        const screenshots = (detail.screenshots || [])
            .map((item) => item.path_full || item.path_thumbnail)
            .filter((url) => Boolean(url))
            .slice(0, 6);
        const imageUrl = detail.header_image ||
            detail.capsule_imagev5 ||
            detail.capsule_image ||
            screenshots[0];
        return {
            source: 'steam',
            sourceId: id,
            sourceUrl: `https://store.steampowered.com/app/${id}`,
            title: detail.name || `Steam App ${id}`,
            description: this.cleanText(detail.short_description ||
                detail.about_the_game ||
                detail.detailed_description),
            platform: client_1.Platform.STEAM,
            genre: this.steamDescriptions(detail.genres)[0] || 'Action',
            imageUrl,
            developer: (detail.developers || []).join(', ') || undefined,
            publisher: (detail.publishers || []).join(', ') || undefined,
            releaseDate: this.parseSteamDate(detail.release_date),
            systemRequirements: `Steam store: https://store.steampowered.com/app/${id}`,
            minimumSystemRequirements: this.cleanText(requirements.minimum),
            recommendedSystemRequirements: this.cleanText(requirements.recommended),
            features: this.steamDescriptions(detail.categories).slice(0, 8),
            supportedLanguages: this.parseSteamLanguages(detail.supported_languages),
            activationRegion: 'Global',
            ageRating: this.parseSteamAgeRating(detail.required_age),
            screenshots: [imageUrl, ...screenshots]
                .filter((url) => Boolean(url))
                .filter((url, index, urls) => urls.indexOf(url) === index)
                .slice(0, 6),
        };
    }
    async searchSteamStore(query) {
        const url = new URL('https://store.steampowered.com/api/storesearch/');
        url.searchParams.set('term', query);
        url.searchParams.set('l', 'english');
        url.searchParams.set('cc', 'US');
        let response;
        try {
            response = await fetch(url);
        }
        catch (error) {
            this.logger.error(`Steam store search request failed: ${error}`);
            throw new common_1.ServiceUnavailableException('Unable to reach Steam right now');
        }
        if (!response.ok) {
            const message = await response.text().catch(() => response.statusText);
            this.logger.error(`Steam store search error ${response.status}: ${message}`);
            throw new common_1.ServiceUnavailableException('Steam search is unavailable');
        }
        const payload = (await response.json());
        return (payload.items || []).filter((item) => item.type === 'app' &&
            Number.isFinite(item.id) &&
            Boolean(item.name?.trim()));
    }
    async fetchSteamAppDetails(appId) {
        const cached = this.steamDetailsCache.get(appId);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }
        const url = new URL('https://store.steampowered.com/api/appdetails');
        url.searchParams.set('appids', appId);
        url.searchParams.set('cc', 'US');
        url.searchParams.set('l', 'english');
        let response;
        try {
            response = await fetch(url);
        }
        catch (error) {
            this.logger.error(`Steam app details request failed: ${error}`);
            throw new common_1.ServiceUnavailableException('Unable to reach Steam store right now');
        }
        if (!response.ok) {
            const message = await response.text().catch(() => response.statusText);
            this.logger.error(`Steam app details error ${response.status}: ${message}`);
            throw new common_1.ServiceUnavailableException('Steam app details are unavailable');
        }
        const payload = (await response.json());
        const data = payload[appId]?.success ? payload[appId]?.data || null : null;
        this.steamDetailsCache.set(appId, {
            data,
            expiresAt: now + 6 * 60 * 60 * 1000,
        });
        return data;
    }
    validateSearchQuery(query) {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) {
            throw new common_1.BadRequestException('Search term must be at least 2 characters');
        }
        return trimmedQuery;
    }
    dedupeSearchResults(results) {
        const seen = new Set();
        const deduped = [];
        for (const result of results) {
            const key = `${this.normalizeTitle(result.title)}:${result.source}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            deduped.push(result);
        }
        return deduped;
    }
    scoreTitleMatch(title, query) {
        const normalizedTitle = this.normalizeTitle(title);
        const normalizedQuery = this.normalizeTitle(query);
        if (!normalizedTitle || !normalizedQuery) {
            return 0;
        }
        if (normalizedTitle === normalizedQuery) {
            return 1000;
        }
        if (normalizedTitle.startsWith(`${normalizedQuery} `)) {
            return 900;
        }
        if (normalizedTitle.includes(` ${normalizedQuery} `)) {
            return 760;
        }
        if (normalizedTitle.includes(normalizedQuery)) {
            return 650;
        }
        const queryTokens = normalizedQuery.split(' ');
        const titleTokens = new Set(normalizedTitle.split(' '));
        const matchedTokens = queryTokens.filter((token) => titleTokens.has(token));
        if (matchedTokens.length === queryTokens.length) {
            return 560;
        }
        if (queryTokens.length > 1 &&
            matchedTokens.length >= queryTokens.length - 1) {
            return 420;
        }
        return 0;
    }
    normalizeTitle(value) {
        return value
            .toLowerCase()
            .replace(/['’]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
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
        const requirements = pc?.requirements_en;
        if (!requirements || typeof requirements !== 'object') {
            return {};
        }
        return requirements;
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
    steamDescriptions(items) {
        return (items || [])
            .map((item) => item.description?.trim())
            .filter((description) => Boolean(description));
    }
    getSteamRequirements(value) {
        if (!value || typeof value !== 'object') {
            return {};
        }
        return value;
    }
    parseSteamDate(releaseDate) {
        if (!releaseDate?.date || releaseDate.coming_soon) {
            return undefined;
        }
        const timestamp = Date.parse(releaseDate.date);
        if (!Number.isFinite(timestamp)) {
            return undefined;
        }
        return new Date(timestamp).toISOString().slice(0, 10);
    }
    parseSteamLanguages(value) {
        const cleaned = this.cleanText(value)
            ?.replace(/\*.+$/s, '')
            .replace(/languages with full audio support/gi, '')
            .replace(/interface/gi, '')
            .replace(/full audio/gi, '')
            .replace(/subtitles/gi, '');
        if (!cleaned) {
            return [];
        }
        return cleaned
            .split(/,|\n/)
            .map((language) => language.trim())
            .filter((language) => language.length > 0)
            .filter((language, index, languages) => languages.indexOf(language) === index)
            .slice(0, 12);
    }
    parseSteamAgeRating(value) {
        const age = Number(value);
        if (!Number.isFinite(age) || age <= 0) {
            return undefined;
        }
        return `${age}+`;
    }
    toDateInputValue(value) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return undefined;
        }
        return value;
    }
    cleanText(value) {
        if (value === null || value === undefined) {
            return undefined;
        }
        const raw = typeof value === 'string'
            ? value
            : Array.isArray(value)
                ? value.join('\n')
                : this.safeStringify(value);
        if (!raw.trim()) {
            return undefined;
        }
        const cleaned = raw
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
    safeStringify(value) {
        try {
            return JSON.stringify(value);
        }
        catch {
            return '';
        }
    }
};
exports.GameMetadataService = GameMetadataService;
exports.GameMetadataService = GameMetadataService = GameMetadataService_1 = __decorate([
    (0, common_1.Injectable)()
], GameMetadataService);
//# sourceMappingURL=game-metadata.service.js.map