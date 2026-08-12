import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsOptional()
  balance?: number;
}
