import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Clientify Corporate Integration API')
  .setDescription(
    'Capa corporativa de integración para consumir Clientify desde aplicaciones internas (ABC Mudanzas y futuras apps).',
  )
  .setVersion('1.0.0')
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-api-key',
      in: 'header',
      description: 'API key interna corporativa',
    },
    'x-api-key',
  )
  .build();
