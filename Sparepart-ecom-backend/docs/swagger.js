const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SpareParts E-commerce API',
    version: '1.0.0',
    description:
      'Public API documentation for the SpareParts ecommerce platform covering catalog, authentication, cart, orders, and CMS endpoints.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      GenericSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer', description: 'Access token expiry in seconds' },
        },
      },
      ProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          price: { type: 'number', format: 'float' },
          currency: { type: 'string', example: 'USD' },
          thumbnailUrl: { type: 'string', format: 'uri' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          parentId: { type: 'string', nullable: true },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          price: { type: 'number', format: 'float' },
          currency: { type: 'string', example: 'USD' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' },
          },
          subtotal: { type: 'number', format: 'float' },
          discounts: { type: 'number', format: 'float' },
          total: { type: 'number', format: 'float' },
          currency: { type: 'string', example: 'USD' },
          couponCode: { type: 'string', nullable: true },
        },
      },
      OrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', example: 'processing' },
          paymentStatus: { type: 'string', example: 'paid' },
          total: { type: 'number', format: 'float' },
          currency: { type: 'string', example: 'USD' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                name: { type: 'string' },
                quantity: { type: 'integer' },
                price: { type: 'number', format: 'float' },
              },
            },
          },
        },
      },
      PageContent: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          published: { type: 'boolean' },
        },
      },
      SeoResolution: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          canonicalUrl: { type: 'string', format: 'uri' },
          image: { type: 'string', format: 'uri', nullable: true },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [path.join(__dirname, '../modules/**/*.routes.js')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
