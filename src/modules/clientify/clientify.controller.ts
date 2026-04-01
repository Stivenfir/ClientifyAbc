import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { CreateDealDto, UpdateDealDto } from './dto/deal.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { CreatePipelineDto } from './dto/pipeline.dto';
import { ClientifyService } from './clientify.service';

@ApiTags('Clientify')
@ApiHeader({ name: 'x-api-key', required: true, description: 'API key interna' })
@UseGuards(InternalApiKeyGuard)
@Controller('clientify')
export class ClientifyController {
  constructor(private readonly clientifyService: ClientifyService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check interno del módulo de integración' })
  health() {
    return this.clientifyService.getHealth();
  }

  @Get('me')
  getMe() {
    return this.clientifyService.getMe();
  }

  @Get('users')
  getUsers(@Query() query: ListQueryDto) {
    return this.clientifyService.getUsers(query);
  }

  @Get('contacts')
  getContacts(@Query() query: ListQueryDto) {
    return this.clientifyService.getContacts(query);
  }

  @Get('search/contacts')
  @ApiQuery({ name: 'query', required: true })
  searchContacts(
    @Query('query') query: string,
    @Query() listQuery: ListQueryDto,
  ) {
    return this.clientifyService.getSearchContacts(query, listQuery);
  }

  @Get('contacts/:id')
  getContactById(@Param('id', ParseIntPipe) id: number, @Query('fields') fields?: string) {
    return this.clientifyService.getContactById(id, fields);
  }

  @Post('contacts')
  createContact(@Body() body: CreateContactDto) {
    return this.clientifyService.createContact(body);
  }

  @Put('contacts/:id')
  updateContact(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateContactDto) {
    return this.clientifyService.updateContact(id, body);
  }

  @Get('contacts/:id/deals')
  getContactDeals(@Param('id', ParseIntPipe) id: number, @Query('fields') fields?: string) {
    return this.clientifyService.getContactDeals(id, fields);
  }

  @Get('contacts/:id/tasks')
  getContactTasks(@Param('id', ParseIntPipe) id: number, @Query() query: ListQueryDto) {
    return this.clientifyService.getContactTasks(id, query);
  }

  @Get('contacts/:id/custom-fields')
  getContactCustomFields(@Param('id', ParseIntPipe) id: number) {
    return this.clientifyService.getContactCustomFields(id);
  }

  @Get('contacts-with-deals')
  getContactsWithDeals(@Query() query: ListQueryDto) {
    return this.clientifyService.getContactsWithDeals(query);
  }

  @Get('companies')
  getCompanies(@Query() query: ListQueryDto) {
    return this.clientifyService.getCompanies(query);
  }

  @Get('companies/sectors')
  getCompanySectors() {
    return this.clientifyService.getCompanySectors();
  }

  @Get('companies/tags')
  getCompanyTags() {
    return this.clientifyService.getCompanyTags();
  }

  @Get('companies/:id')
  getCompanyById(@Param('id', ParseIntPipe) id: number, @Query('fields') fields?: string) {
    return this.clientifyService.getCompanyById(id, fields);
  }

  @Post('companies')
  createCompany(@Body() body: CreateCompanyDto) {
    return this.clientifyService.createCompany(body);
  }

  @Put('companies/:id')
  updateCompany(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCompanyDto) {
    return this.clientifyService.updateCompany(id, body);
  }

  @Get('deals')
  getDeals(@Query() query: ListQueryDto) {
    return this.clientifyService.getDeals(query);
  }

  @Get('deals/pipelines')
  getDealPipelines(@Query() query: ListQueryDto) {
    return this.clientifyService.getDealPipelines(query);
  }

  @Get('deals/pipelines/:id')
  getDealPipelineById(@Param('id', ParseIntPipe) id: number) {
    return this.clientifyService.getDealPipelineById(id);
  }

  @Post('deals/pipelines')
  createDealPipeline(@Body() body: CreatePipelineDto) {
    return this.clientifyService.createDealPipeline(body);
  }

  @Get('deals/tags')
  getDealTags() {
    return this.clientifyService.getDealTags();
  }

  @Get('deals/:id')
  getDealById(@Param('id', ParseIntPipe) id: number, @Query('fields') fields?: string) {
    return this.clientifyService.getDealById(id, fields);
  }

  @Post('deals')
  createDeal(@Body() body: CreateDealDto) {
    return this.clientifyService.createDeal(body);
  }

  @Put('deals/:id')
  updateDeal(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDealDto) {
    return this.clientifyService.updateDeal(id, body);
  }

  @Get('deals/:id/tasks')
  getDealTasks(@Param('id', ParseIntPipe) id: number, @Query() query: ListQueryDto) {
    return this.clientifyService.getDealTasks(id, query);
  }

  @Get('deals/:id/contacts')
  getDealContacts(@Param('id', ParseIntPipe) id: number, @Query() query: ListQueryDto) {
    return this.clientifyService.getDealContacts(id, query);
  }

  @Get('custom-fields')
  getCustomFields(@Query() query: ListQueryDto) {
    return this.clientifyService.getCustomFields(query);
  }

  @Get('pipelines')
  getPipelines(@Query() query: ListQueryDto) {
    return this.clientifyService.getPipelines(query);
  }

  @Get('tags')
  getTags() {
    return this.clientifyService.getTags();
  }
}
