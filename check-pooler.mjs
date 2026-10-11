import { PrismaClient } from "@prisma/client";

const regions = ["ap-south-1", "ap-southeast-1", "us-east-1", "eu-central-1"];

async function testConnection() {
  for (const region of regions) {
    const poolerUrl = `postgresql://postgres.lxilbqjnlddkcccpuwqv:Jignesh%402509@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    console.log(`Testing region ${region}...`);
    const p = new PrismaClient({
      datasources: {
        db: {
          url: poolerUrl,
        },
      },
    });

    try {
      await p.$queryRaw`SELECT 1;`;
      console.log(`SUCCESS! Connected to Supabase in region: ${region}`);
      await p.$disconnect();
      return region;
    } catch (err) {
      console.log(`Failed in ${region}:`, err.message.slice(0, 100));
      await p.$disconnect();
    }
  }
}

testConnection().catch(console.error);
