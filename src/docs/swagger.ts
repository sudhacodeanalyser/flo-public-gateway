import swaggerJsDoc from 'swagger-jsdoc';
import pkg from 'pjson';

export const swaggerOpts = {
  customSiteTitle: `${pkg.name} - ${pkg.version}`
}

export default swaggerJsDoc({
  swaggerDefinition: {
    info: {
      title: pkg.name,
      version: pkg.version,
      description: pkg.description
    },
    produces: ['application/json'],
    consumes: ['application/json']
  },
  apis: [
    './dist/**/*.yaml'
  ]
});