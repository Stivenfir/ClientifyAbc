import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ClientifyController } from './clientify.controller';
import { ClientifyService } from './clientify.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(configService.get('CLIENTIFY_TIMEOUT', 15000)),
      }),
    }),
  ],
  controllers: [ClientifyController],
  providers: [ClientifyService],
  exports: [ClientifyService],
})
export class ClientifyModule {}