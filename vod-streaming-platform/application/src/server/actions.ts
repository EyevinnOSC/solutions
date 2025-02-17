'use server';

import { Context } from "@osaas/client-core";
import { getApacheCouchdbInstance } from "@osaas/client-services";
import nano from "nano";

interface Asset extends nano.MaybeDocument {
  assetId: string,
  vodUrl: string
};

async function getDbUrl() {
  const ctx = new Context();
  const dbInstance = await getApacheCouchdbInstance(ctx, 'vodsvc');
  const dbUrl = new URL(dbInstance.url);
  dbUrl.username = 'admin';
  dbUrl.password = dbInstance.AdminPassword;
  return dbUrl.toString();
}

export async function getAssets(): Promise<Asset[]> {
  const dbUrl = await getDbUrl();
  const client = nano(dbUrl);
  const db = client.use('myassets');
  const res = await db.list({ include_docs: true });
  const assets = res.rows.map((row) => row.doc as Asset);
  return assets;
}
