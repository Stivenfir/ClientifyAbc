import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { ClientifySyncService } from './sync.service';

@ApiTags('Clientify Sync')
@ApiHeader({
  name: 'x-api-key',
  required: true,
  description: 'API key interna',
})
@UseGuards(InternalApiKeyGuard)
@Controller('clientify/sync')
export class SyncController {
  constructor(private readonly clientifySyncService: ClientifySyncService) {}

  @Post('run')
  @ApiOperation({
    summary: 'Ejecuta sincronización manual de Clientify hacia SQL Server',
  })
  runManualSync() {
    return this.clientifySyncService.runFullSync('manual');
  }
}
