"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting seed...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cdkeys.com' },
        update: {},
        create: {
            email: 'admin@cdkeys.com',
            password: adminPassword,
            name: 'Admin User',
            role: client_1.Role.ADMIN,
        },
    });
    console.log('✅ Admin user created:', admin.email);
    const customerPassword = await bcrypt.hash('demo123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'demo@email.com' },
        update: {},
        create: {
            email: 'demo@email.com',
            password: customerPassword,
            name: 'Demo Customer',
            role: client_1.Role.CUSTOMER,
        },
    });
    console.log('✅ Demo customer created:', customer.email);
    const games = [
        {
            title: 'Cyberpunk 2077',
            description: 'An open-world action-adventure RPG set in Night City.',
            platform: client_1.Platform.STEAM,
            genre: 'RPG',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
        },
        {
            title: 'Elden Ring',
            description: 'An action RPG developed by FromSoftware and published by Bandai Namco.',
            platform: client_1.Platform.STEAM,
            genre: 'Action',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400',
        },
        {
            title: 'Red Dead Redemption 2',
            description: 'An epic tale of life in America at the dawn of the modern age.',
            platform: client_1.Platform.STEAM,
            genre: 'Adventure',
            price: 49.99,
            imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
        },
        {
            title: 'FIFA 24',
            description: 'The latest installment in the iconic football simulation series.',
            platform: client_1.Platform.PLAYSTATION,
            genre: 'Sports',
            price: 69.99,
            imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f950b?w=400',
        },
        {
            title: 'Halo Infinite',
            description: 'The legendary Halo series returns with the most expansive Master Chief story yet.',
            platform: client_1.Platform.XBOX,
            genre: 'Shooter',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0c?w=400',
        },
        {
            title: 'The Legend of Zelda: Tears of the Kingdom',
            description: 'An epic adventure awaits in the vast landscapes of Hyrule.',
            platform: client_1.Platform.NINTENDO,
            genre: 'Adventure',
            price: 69.99,
            imageUrl: 'https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400',
        },
        {
            title: 'Grand Theft Auto V',
            description: 'When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening criminals in the underworld.',
            platform: client_1.Platform.STEAM,
            genre: 'Action',
            price: 29.99,
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400',
        },
        {
            title: 'Assassin\'s Creed Valhalla',
            description: 'Become Eivor, a Viking raider raised to be a fearless warrior.',
            platform: client_1.Platform.UPLAY,
            genre: 'Action',
            price: 39.99,
            imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        },
        {
            title: 'Battlefield 2042',
            description: 'Experience the dawn of all-out war in 2042.',
            platform: client_1.Platform.ORIGIN,
            genre: 'Shooter',
            price: 34.99,
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
        },
        {
            title: 'Fortnite: Save the World',
            description: 'Build, explore and save the world from monsters.',
            platform: client_1.Platform.EPIC,
            genre: 'Action',
            price: 19.99,
            imageUrl: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=400',
        },
    ];
    for (const gameData of games) {
        const game = await prisma.game.upsert({
            where: {
                id: gameData.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            },
            update: gameData,
            create: {
                ...gameData,
            },
        });
        const existingKeys = await prisma.cdKey.count({ where: { gameId: game.id } });
        if (existingKeys === 0) {
            const sampleKeys = Array.from({ length: 10 }, (_, i) => ({
                gameId: game.id,
                keyCode: `${game.title.substring(0, 4).toUpperCase()}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                status: client_1.KeyStatus.AVAILABLE,
            }));
            await prisma.cdKey.createMany({ data: sampleKeys });
            console.log(`✅ Created ${sampleKeys.length} keys for ${game.title}`);
        }
    }
    console.log('🎉 Seed completed!');
    console.log('\n📋 Demo Accounts:');
    console.log('   Admin: admin@cdkeys.com / admin123');
    console.log('   Customer: demo@email.com / demo123');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map