import { app } from '#src/infrastructure/http/app.js';
import { env } from '#src/lib/env.js';

export async function bootstrap(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(
      `API inicializado com sucesso na porta ${env.PORT}. Docs: /docs`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
