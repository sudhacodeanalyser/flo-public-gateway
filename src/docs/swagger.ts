import {glob} from 'glob';
import * as jsYaml from 'js-yaml';
import mergeYaml from 'merge-yaml';
import swaggerJsDoc from 'swagger-jsdoc';

const internalDocsDescription = `
<div style="line-height: 24pt; font-size: 16pt;">
    Public Api providing client access to account information.<br/>
    Multiple versions of API are accessible side by side.<br/>
    <strong>DO NOT</strong> use any DEPRECATED APIs, they will be removed without notice.
</div>
`;

const partnerDescription = `
<div style="line-height: 24pt; font-size: 16pt;">
    To use the API, your team needs to have a 'client id' and a 'client secret' to login.<br/>
    If you have any questions, need client id, or have any other feedback, please contact us <a href="mailto:api-support@meetflo.com" style="font-size: 16pt; font-weight: bold;">Api Support Team</a>
</div>
`;

const legacyDescription = `
<div style="line-height: 24pt; font-size: 16pt;">
    These endpoints cover API version 1, built with sweat, blood, and tears (of joy) by Flo OG crew.
    <br/><br/>
    Thank you Andrew Chen for compiling these docs!
</div>
`;


const buildSwaggerJsDoc = (docsFolder: string, title: string, description?: string) =>
  swaggerJsDoc({
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title,
        description,
        version: ''
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


export const swaggerLegacyOpts = {
    customSiteTitle: `Flo Legacy Docs`
}

export const swaggerPartnerOpts = {
    customSiteTitle: `Flo Partner Docs`
}

export const swaggerInternalOpts = {
    customSiteTitle: `Flo Internal Docs`
}

export const internalSwaggerOpenApiContents = jsYaml.dump(mergeYaml(glob.globSync('./dist/docs/{,internal}/*.yaml')));

export const thirdPartiesSwaggerOpenApiContents = jsYaml.dump(mergeYaml(glob.globSync('./dist/docs/{,third-parties}/*.yaml')));

export const internalSwaggerJsDoc = buildSwaggerJsDoc('internal', 'Flo Internal Docs', internalDocsDescription);

export const thirdPartiesSwaggerJsDoc = buildSwaggerJsDoc('third-parties', 'Welcome, Flo Partners!', partnerDescription);

export const legacySwaggerJsDoc = buildSwaggerJsDoc('legacy', 'Flo Legacy Docs', legacyDescription);