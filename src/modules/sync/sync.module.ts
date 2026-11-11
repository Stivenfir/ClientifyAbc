import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientifyModule } from '../clientify/clientify.module';
import { SyncController } from './sync.controller';
import { ClientifySyncService } from './sync.service';
import { SqlServerService } from './sql-server.service';

@Module({
  imports: [ConfigModule, ClientifyModule],
  controllers: [SyncController],
  providers: [SqlServerService, ClientifySyncService],
})
export class SyncModule {}
