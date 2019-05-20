import swaggerJsDoc from 'swagger-jsdoc';

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