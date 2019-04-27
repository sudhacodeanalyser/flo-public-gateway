import swaggerJsDoc from 'swagger-jsdoc';
import pkg from 'pjson';

export const swaggerOpts = {
  customSiteTitle: `${pkg.name} - ${pkg.version}`
}

export default swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: pkg.name,
      version: pkg.version,
      description: pkg.description
    },
    servers: [
      {
        url: '/api/v1'
      }
    ]
  },
  apis: [
    './dist/**/*.yaml'
  ]
});