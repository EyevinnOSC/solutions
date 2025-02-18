import { Context } from "@osaas/client-core";
import { setupDatabase } from "@osaas/client-db";
import { createEyevinnAppConfigSvcInstance, getEyevinnAppConfigSvcInstance } from "@osaas/client-services";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const ctx = new Context();
    let appConfigInstance = await getEyevinnAppConfigSvcInstance(ctx, 'tvappconfig');
    if (!appConfigInstance) {
      const redisUrl = await setupDatabase('valkey', 'tvappconfig', {});
      appConfigInstance = await createEyevinnAppConfigSvcInstance(ctx, {
        name: 'tvappconfig', RedisUrl: redisUrl
      });
    }
  }
}