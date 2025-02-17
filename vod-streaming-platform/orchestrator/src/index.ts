import { Context } from '@osaas/client-core';
import { createVod, createVodPipeline } from '@osaas/client-transcode';
import http from 'node:http';
import { setupListener } from './listener';
import { setupDatabase } from '@osaas/client-db';
import nano from 'nano';

interface Asset extends nano.MaybeDocument {
  assetId: string,
  vodUrl: string
};

async function main() {
  const ctx = new Context();
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Hello");
  });
  server.listen(process.env.PORT ? Number(process.env.PORT) : 8080, '0.0.0.0', async () => {
    console.log('Server is running');

    const pipeline = await createVodPipeline('vodsvc', ctx, { createInputBucket: true });
    console.log(pipeline);

    const dbUrl = await setupDatabase('couchdb', 'vodsvc', { rootPassword: 'verysecret' });
    console.log(dbUrl);
    const client = nano(dbUrl.toString());
    const dbList = await client.db.list();
    if (!dbList.includes('myassets')) {
      await client.db.create('myassets');
    }
    const db = client.use('myassets');

    if (pipeline.inputStorage) {
      setupListener(
        pipeline.inputStorage.name,
        new URL(pipeline.inputStorage.endpoint),
        pipeline.inputStorage.accessKeyId,
        pipeline.inputStorage.secretAccessKey,
        async (record) => {
          console.log('Received notification', record);
          const sourceUrl = new URL(`s3://${record.s3.bucket.name}/${record.s3.object.key}`);
          const vod = await createVod(pipeline, sourceUrl.toString(), ctx);
          console.log(vod);
          const asset: Asset = {
            assetId: vod.id,
            vodUrl: vod.vodUrl
          };
          await db.insert(asset);
          console.log('Asset saved to database');
        });
    } else {
      console.error('No input storage found, failed to setup listener');
    }
  });
}

main();