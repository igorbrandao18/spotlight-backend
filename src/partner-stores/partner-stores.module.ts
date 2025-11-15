import { Module } from '@nestjs/common';
import { PartnerStoresService } from './partner-stores.service';
import { PartnerStoresController } from './partner-stores.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PartnerStoresController],
  providers: [PartnerStoresService],
  exports: [PartnerStoresService],
})
export class PartnerStoresModule {}

