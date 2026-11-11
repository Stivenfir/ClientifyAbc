import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { ClientifyModule } from './modules/clientify/clientify.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ClientifyModule,
    SyncModule,
  ],
})
export class AppModule {}
