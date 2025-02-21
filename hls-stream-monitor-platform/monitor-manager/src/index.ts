import { Context } from "@osaas/client-core";
import { createEyevinnHlsMonitorInstance, getApacheCouchdbInstance, getEyevinnHlsMonitorInstance } from "@osaas/client-services";
import { CronJob } from "cron";
import fastify from "fastify";
import nano from "nano";

interface Stream extends nano.MaybeDocument {
  hlsUrl: string
}

interface MonitorStream {
  id: string;
  url: string;
}

interface Monitor {
  createdAt: string;
  streams: MonitorStream[];
  state: string;
  errorCount: number;
  statusEndpoint: string;
}

type MonitorMap = { [key: string]: Monitor };

async function getDbUrl(ctx: Context) {
  const dbInstance = await getApacheCouchdbInstance(ctx, 'hlsmon');
  const dbUrl = new URL(dbInstance.url);
  dbUrl.username = 'admin';
  dbUrl.password = dbInstance.AdminPassword;
  return dbUrl.toString();
}

async function getHlsStreams(dbUrl: string): Promise<Stream[]> {
  const dbClient = nano(dbUrl);
  const db = dbClient.use('streams');
  const res = await db.list({ include_docs: true });
  const streams = res.rows.map(row => row.doc).filter((doc) => doc !== undefined);
  return streams as Stream[];
}

async function setupHlsMonitor(ctx: Context) {
  let instance = await getEyevinnHlsMonitorInstance(ctx, 'test');
  if (!instance) {
    instance = await createEyevinnHlsMonitorInstance(ctx, { name: 'test' });
  }
  return instance.url;
}

async function getAllMonitors(ctx: Context, hlsMonitorUrl: string, token: string): Promise<MonitorMap> {
  const url = new URL(`/monitor`, hlsMonitorUrl);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to get monitors: ${response.statusText}`);
  }
  const monitors = await response.json() as MonitorMap;
  return monitors;
}

async function addStreamToMonitor(ctx: Context, hlsMonitorUrl: string, stream: Stream, token: string) {
  const url = new URL(`/monitor`, hlsMonitorUrl);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      streams: [ stream.hlsUrl ]
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to add stream to monitor: ${response.statusText}`);
  }
}

function findStreamInMonitors(stream: Stream, monitors: MonitorMap): Monitor | undefined {
  for (const monitor of Object.values(monitors)) {
    for (const monitorStream of monitor.streams) {
      if (monitorStream.url === stream.hlsUrl) {
        return monitor;
      }
    }
  }
  return undefined;
}

async function main() {
  const ctx = new Context();
  const server = fastify();
  const dbUrl = await getDbUrl(ctx);
  const monitorUrl = await setupHlsMonitor(ctx);

  const job = new CronJob('*/5 * * * * *', async () => {
    try {
      const token = await ctx.getServiceAccessToken('eyevinn-hls-monitor');
      const streams = await getHlsStreams(dbUrl);
      const monitors = await getAllMonitors(ctx, monitorUrl, token);
      for (const stream of streams) {
        if (!findStreamInMonitors(stream, monitors)) {
          console.log(`Adding stream ${stream.hlsUrl} to monitor`);
          await addStreamToMonitor(ctx, monitorUrl, stream, token);
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
  job.start();

  server.get('/', async (request, reply) => {
    reply.send('Hello World');
  });

  server.listen({ host: '0.0.0.0', port: process.env.PORT ? Number(process.env.PORT) : 8080 }, (err, address) => {
    if (err) console.error(err);
    console.log(`Server listening at ${address}`);
  });
}

main();