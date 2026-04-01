import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { GetContactsDto } from './dto/get-contacts.dto';
import { ClientifyService } from './clientify.service';

@ApiTags('Clientify')
@ApiHeader({
  name: 'x-api-key',
  description: 'API Key interna',
  required: true,
})
@UseGuards(InternalApiKeyGuard)
@Controller('clientify')
export class ClientifyController {
  constructor(private readonly clientifyService: ClientifyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Validar conexión con Clientify' })
  getMe() {
    return this.clientifyService.getMe();
  }

  @Get('contacts')
  getContacts(@Query() query: GetContactsDto) {
    return this.clientifyService.getContacts(query);
  }

  @Get('contacts/:id')
  getContactById(@Param('id', ParseIntPipe) id: number) {
    return this.clientifyService.getContactById(id);
  }

  @Get('contacts/:id/deals')
  getContactDeals(@Param('id', ParseIntPipe) id: number) {
    return this.clientifyService.getContactDeals(id);
  }
}