import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { DepositWithdrawDto } from './dto/deposit-withdraw.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { ObjectivesService } from './objectives.service';

@ApiTags('objectives')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('objectives')
export class ObjectivesController {
  constructor(private readonly objectivesService: ObjectivesService) {}

  @Post()
  create(@Body() createObjectiveDto: CreateObjectiveDto, @CurrentUser('id') userId: string) {
    return this.objectivesService.create(createObjectiveDto, userId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.objectivesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.objectivesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateObjectiveDto: UpdateObjectiveDto,
  ) {
    return this.objectivesService.update(id, userId, updateObjectiveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.objectivesService.remove(id, userId);
  }

  @Post(':id/deposit')
  deposit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DepositWithdrawDto,
  ) {
    return this.objectivesService.deposit(id, userId, dto);
  }

  @Post(':id/withdraw')
  withdraw(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DepositWithdrawDto,
  ) {
    return this.objectivesService.withdraw(id, userId, dto);
  }
}
