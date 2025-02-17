import { Context } from "@osaas/client-core";
import { getApacheCouchdbInstance } from "@osaas/client-services";
import fastify from "fastify";
import nano from "nano";

interface IQuerystring {
  channelId: string;
}
interface INextVod {
  id: string;
  title: string;
  hlsUrl: string;
}
interface Asset extends nano.MaybeDocument {
  assetId: string,
  vodUrl: string
}

async function getDbUrl() {
  const ctx = new Context();
  const dbInstance = await getApacheCouchdbInstance(ctx, 'vodsvc');
  const dbUrl = new URL(dbInstance.url);
  dbUrl.username = 'admin';
  dbUrl.password = dbInstance.AdminPassword;
  return dbUrl.toString();
}

async function getAssets(dbUrl: string): Promise<Asset[]> {
  const dbClient = nano(dbUrl);
  const db = dbClient.use('myassets');
  const res = await db.list({ include_docs: true });
  const assets = res.rows.map(row => row.doc).filter((doc) => doc !== undefined);
  return assets as Asset[];
}

async function main() {
  const server = fastify();
  const dbUrl = await getDbUrl();

  server.get('/', async (request, reply) => {
    reply.send('Hello World');
  });

  server.get<{
    Querystring: IQuerystring;
    Reply: {
      200: INextVod;
      '4xx': { error: string};
    }
  }>('/nextVod', async (request, reply) => {
    const channelId = request.query.channelId;
    console.log(`Requesting next VOD for channel ${channelId}`);
    const assets = await getAssets(dbUrl);
    const asset = assets[Math.floor(Math.random() * assets.length)];
    reply.code(200).send({
      id: asset.assetId,
      title: 'Random VOD',
      hlsUrl: asset.vodUrl
    });
  });

  server.listen({ host: '0.0.0.0', port: process.env.PORT ? Number(process.env.PORT) : 8080 }, (err, address) => {
    if (err) console.error(err);
    console.log(`Server listening at ${address}`);
  });
}

main();