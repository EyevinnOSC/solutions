'use server';

import { Context } from "@osaas/client-core";
import { getEyevinnAppConfigSvcInstance } from "@osaas/client-services";

let configUrl: string | undefined = undefined;

export async function getChannelUrl() {
  const ctx = new Context();
  if (!configUrl) {
    const configService = await getEyevinnAppConfigSvcInstance(ctx, 'tvappconfig');
    configUrl = configService.url;
  }
  const response = await fetch(new URL('/api/v1/config/channelurl', configUrl), {
    cache: 'no-store'
  });
  if (response.ok) {
    const data = await response.json();
    return data.value;
  }
  return undefined;
}