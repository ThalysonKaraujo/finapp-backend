import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
// TODO: import { AuthGuard } from '../common/guards/auth.guard';

@Controller('transactions')
// @UseGuards(AuthGuard) // To be implemented with Better Auth verification
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }
}
