import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSettings() {
        let settings = await this.prisma.siteSettings.findUnique({
            where: { id: 'main' },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await this.prisma.siteSettings.create({
                data: {
                    id: 'main',
                    storeName: 'CDKeys Marketplace',
                    tagline: 'Get your favorite games instantly',
                    primaryColor: '#8b5cf6',
                },
            });
        }

        return settings;
    }

    async updateSettings(data: {
        storeName?: string;
        logoUrl?: string;
        faviconUrl?: string;
        tagline?: string;
        primaryColor?: string;
    }) {
        // Ensure settings exist first
        await this.getSettings();

        return this.prisma.siteSettings.update({
            where: { id: 'main' },
            data,
        });
    }
}
