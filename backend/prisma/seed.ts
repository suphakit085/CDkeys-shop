import { PrismaClient, Role, Platform, KeyStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cdkeys.com' },
        update: {},
        create: {
            email: 'admin@cdkeys.com',
            password: adminPassword,
            name: 'Admin User',
            role: Role.ADMIN,
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create demo customer
    const customerPassword = await bcrypt.hash('demo123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'demo@email.com' },
        update: {},
        create: {
            email: 'demo@email.com',
            password: customerPassword,
            name: 'Demo Customer',
            role: Role.CUSTOMER,
        },
    });
    console.log('✅ Demo customer created:', customer.email);

    // Sample games
    const games = [
        {
            title: 'Cyberpunk 2077',
            description: 'An open-world action-adventure RPG set in Night City.',
            platform: Platform.STEAM,
            genre: 'RPG',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
        },
        {
            title: 'Elden Ring',
            description: 'An action RPG developed by FromSoftware and published by Bandai Namco.',
            platform: Platform.STEAM,
            genre: 'Action',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400',
        },
        {
            title: 'Red Dead Redemption 2',
            description: 'An epic tale of life in America at the dawn of the modern age.',
            platform: Platform.STEAM,
            genre: 'Adventure',
            price: 49.99,
            imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
        },
        {
            title: 'FIFA 24',
            description: 'The latest installment in the iconic football simulation series.',
            platform: Platform.PLAYSTATION,
            genre: 'Sports',
            price: 69.99,
            imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f950b?w=400',
        },
        {
            title: 'Halo Infinite',
            description: 'The legendary Halo series returns with the most expansive Master Chief story yet.',
            platform: Platform.XBOX,
            genre: 'Shooter',
            price: 59.99,
            imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0c?w=400',
        },
        {
            title: 'The Legend of Zelda: Tears of the Kingdom',
            description: 'An epic adventure awaits in the vast landscapes of Hyrule.',
            platform: Platform.NINTENDO,
            genre: 'Adventure',
            price: 69.99,
            imageUrl: 'https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400',
        },
        {
            title: 'Grand Theft Auto V',
            description: 'When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening criminals in the underworld.',
            platform: Platform.STEAM,
            genre: 'Action',
            price: 29.99,
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400',
        },
        {
            title: 'Assassin\'s Creed Valhalla',
            description: 'Become Eivor, a Viking raider raised to be a fearless warrior.',
            platform: Platform.UPLAY,
            genre: 'Action',
            price: 39.99,
            imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        },
        {
            title: 'Battlefield 2042',
            description: 'Experience the dawn of all-out war in 2042.',
            platform: Platform.ORIGIN,
            genre: 'Shooter',
            price: 34.99,
            imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
        },
        {
            title: 'Fortnite: Save the World',
            description: 'Build, explore and save the world from monsters.',
            platform: Platform.EPIC,
            genre: 'Action',
            price: 19.99,
            imageUrl: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=400',
        },
    ];

    // Create games and add sample keys
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

        // Generate sample CD keys for each game
        const existingKeys = await prisma.cdKey.count({ where: { gameId: game.id } });
        if (existingKeys === 0) {
            const sampleKeys = Array.from({ length: 10 }, (_, i) => ({
                gameId: game.id,
                keyCode: `${game.title.substring(0, 4).toUpperCase()}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                status: KeyStatus.AVAILABLE,
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
