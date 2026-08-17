import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ObjectivesController } from './objectives.controller';
import { ObjectivesService } from './objectives.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ObjectivesController],
  providers: [ObjectivesService],
})
export class ObjectivesModule {}
