import { Body, Controller, Post, Get, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
// TODO: import { AuthGuard } from '../common/guards/auth.guard';

@Controller('transactions')
// @UseGuards(AuthGuard) // To be implemented with Better Auth verification
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // TBD: Pegar o userId via Decorator do request.user quando o AuthGuard estiver pronto
    // No momento, exigimos via Query parameter para testes
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.transactionsService.findAll(userId, pageNum, limitNum);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('userId') userId: string
  ) {
    return this.transactionsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() updateTransactionDto: UpdateTransactionDto
  ) {
    return this.transactionsService.update(id, userId, updateTransactionDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('userId') userId: string
  ) {
    return this.transactionsService.remove(id, userId);
  }
}
