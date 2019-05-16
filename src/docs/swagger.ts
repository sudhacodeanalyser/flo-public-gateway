import swaggerJsDoc from 'swagger-jsdoc';
import pkg from 'pjson';
import config from '../config/config';

export const swaggerOpts = {
  customSiteTitle: `Flo Public Gateway`
}

export default swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Flo Technologies Public Gateway',
      description: 'Public Api providing client access to account information.<br/>Multiple versions of API are accessible side by side.<br/><br/><strong>DO NOT</strong> use any DEPRECATED APIs, they will be removed without notice.'
    },
    servers: [
      {
        description: 'Current',
        url: '/'
      },
      {
        description: 'Production',
        url: 'https://api-gw.meetflo.com'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ],
  },
  apis: [
    './dist/**/*.yaml'
  ]
});