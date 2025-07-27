import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { FastifyTypeInstance } from '../types';

const TITLE = 'API';
const DOC_VERSION = '1.0.0';
const PROJECT_REPOSITORY = 'https://github.com/JaisonPeres/order-log-api';
const EMAIL = 'jaisoncperes@gmail.com';
const NAME = 'Jaison Peres';
const URL = 'https://github.com/JaisonPeres';
const LICENSE_NAME = 'MIT';
const LICENSE_URL = 'https://opensource.org/licenses/MIT';
const DESCRIPTION = `
  This is the API documentation for the Order Log API.<br/>
  <a href="${PROJECT_REPOSITORY}" target="_blank">Github Repository</a>
`;

interface SwaggerTagsConfig {
  name: string;
  description: string;
}

export class SwaggerConfig {
  static register(app: FastifyTypeInstance, tags: SwaggerTagsConfig[]) {
    app.register(fastifySwagger, {
      openapi: {
        info: {
          title: TITLE,
          version: DOC_VERSION,
          contact: {
            email: EMAIL,
            name: NAME,
            url: URL,
          },
          description: DESCRIPTION,
          license: {
            name: LICENSE_NAME,
            identifier: LICENSE_NAME,
            url: LICENSE_URL,
          },
          summary: DESCRIPTION,
          termsOfService: PROJECT_REPOSITORY,
        },
        tags,
      },
      transform: jsonSchemaTransform,
    });

    app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    });
  }
}
