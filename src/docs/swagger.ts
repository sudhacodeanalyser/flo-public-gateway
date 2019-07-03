import swaggerJsDoc from 'swagger-jsdoc';

const internalDocsDescription = 'Public Api providing client access to account information.<br/>Multiple versions of API are accessible side by side.<br/><br/><strong>DO NOT</strong> use any DEPRECATED APIs, they will be removed without notice.';

const buildSwaggerJsDoc = (docsFolder: string, description?: string) =>
  swaggerJsDoc({
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'Flo Technologies - Public Gateway',
        description
      },
      security: [
        {
          bearerAuth: []
        }
      ],
    },
    apis: [
      `./dist/docs/global.yaml`,
      `./dist/docs/${docsFolder}/*.yaml`
    ]
  });


export const swaggerOpts = {
  customSiteTitle: `Flo Public Gateway`
}

export const internalSwaggerJsDoc = buildSwaggerJsDoc('internal', internalDocsDescription);

export const thirdPartiesSwaggerJsDoc = buildSwaggerJsDoc('third-parties');

export const legacySwaggerJsDoc = buildSwaggerJsDoc('legacy');