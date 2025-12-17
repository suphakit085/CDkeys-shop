import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, ProcessPaymentDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    // Customer endpoints
    @Get()
    async findMyOrders(@Request() req: { user: { id: string } }) {
        return this.ordersService.findByUser(req.user.id);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Request() req: { user: { id: string } },
    ) {
        return this.ordersService.findOne(id, req.user.id);
    }

    @Post()
    async createOrder(
        @Body() dto: CreateOrderDto,
        @Request() req: { user: { id: string } },
    ) {
        return this.ordersService.createOrder(req.user.id, dto);
    }

    @Post('pay')
    async processPayment(
        @Body() dto: ProcessPaymentDto,
        @Request() req: { user: { id: string } },
    ) {
        return this.ordersService.processPayment(
            dto.orderId,
            req.user.id,
            dto.simulateFail,
        );
    }

    @Delete(':id')
    async cancelOrder(
        @Param('id') id: string,
        @Request() req: { user: { id: string } },
    ) {
        return this.ordersService.cancelOrder(id, req.user.id);
    }

    // Admin endpoints
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async findAll() {
        return this.ordersService.findAll();
    }

    @Get('admin/stats')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getSalesStats() {
        return this.ordersService.getSalesStats();
    }
}
