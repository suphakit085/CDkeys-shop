import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, ProcessPaymentDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Customer endpoints
  @Get()
  async findMyOrders(@Request() req: { user: { id: string } }) {
    return this.ordersService.findByUser(req.user.id);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.ordersService.findAll({
      page: this.parsePositiveInt(page),
      limit: this.parsePositiveInt(limit),
      search,
      status: this.parseOrderStatus(status),
      paymentStatus: this.parsePaymentStatus(paymentStatus),
    });
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getSalesStats() {
    return this.ordersService.getSalesStats();
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

  private parsePositiveInt(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private parseOrderStatus(value?: string) {
    return Object.values(OrderStatus).includes(value as OrderStatus)
      ? (value as OrderStatus)
      : undefined;
  }

  private parsePaymentStatus(value?: string) {
    return Object.values(PaymentStatus).includes(value as PaymentStatus)
      ? (value as PaymentStatus)
      : undefined;
  }
}
