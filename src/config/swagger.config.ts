import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('API Clientify')
  .setDescription('API de integración interna para consumir Clientify')
  .setVersion('1.0.0')
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-api-key',
      in: 'header',
      description: 'API Key interna para consumir esta API',
    },
    'x-api-key',
  )
  .build();