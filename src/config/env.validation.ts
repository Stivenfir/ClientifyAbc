export function validateEnv(config: Record<string, unknown>) {
  const requiredVars = [
    'PORT',
    'INTERNAL_API_KEY',
    'CLIENTIFY_BASE_URL',
    'CLIENTIFY_TOKEN',
  ];

  for (const variable of requiredVars) {
    if (!config[variable]) {
      throw new Error(`Falta la variable de entorno: ${variable}`);
    }
  }

  return config;
}