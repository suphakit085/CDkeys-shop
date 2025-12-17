import { BannersService } from './banners.service';
export declare class BannersController {
    private bannersService;
    constructor(bannersService: BannersService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }[]>;
    findAllAdmin(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }>;
    create(data: {
        title: string;
        subtitle?: string;
        description?: string;
        imageUrl?: string;
        bgColor?: string;
        link?: string;
        buttonText?: string;
        isActive?: boolean;
        order?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }>;
    update(id: string, data: {
        title?: string;
        subtitle?: string;
        description?: string;
        imageUrl?: string;
        bgColor?: string;
        link?: string;
        buttonText?: string;
        isActive?: boolean;
        order?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        link: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        order: number;
        subtitle: string | null;
        bgColor: string;
        buttonText: string;
        isActive: boolean;
    }>;
    uploadImage(file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
    }>;
}
