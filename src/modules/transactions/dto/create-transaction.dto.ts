export class CreateTransactionDto {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  date: Date;
  userId: string;
  walletId?: string;
  categoryId?: string;
}
