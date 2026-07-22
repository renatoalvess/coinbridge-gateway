import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifyApiReference from '@scalar/fastify-api-reference';
import { webhookRoutes } from './routes/webhook-routes.js';
import { errorHandler } from './error-handler.js';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';

export const app = Fastify({ logger: true });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'CoinBridge Gateway API',
      description:
        'API responsável por receber depósitos em criptomoedas e efetuar a liquidação via PIX',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
});

app.register(fastifyApiReference, {
  routePrefix: '/docs',
  configuration: {
    spec: {
      content: () => app.swagger(),
    },
  },
});

app.register(webhookRoutes);

app.setErrorHandler(errorHandler);
