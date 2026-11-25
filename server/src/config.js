export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  azureSql: {
    server: process.env.AZURE_SQL_SERVER ?? '',
    database: process.env.AZURE_SQL_DATABASE ?? '',
    user: process.env.AZURE_SQL_USER ?? '',
    password: process.env.AZURE_SQL_PASSWORD ?? '',
    encrypt: true,
    trustServerCertificate: false,
    connectionTimeout: 15000,
    requestTimeout: 30000,
  },
  entra: {
    tenantId: process.env.ENTRA_TENANT_ID ?? '',
    audience: process.env.ENTRA_AUDIENCE ?? '',
  },
  isEasyAuth: process.env.EASY_AUTH_ENABLED === 'true' || process.env.WEBSITE_AUTH_ENABLED === 'true',
};
