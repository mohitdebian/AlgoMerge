import { createClient } from "redis";
async function cacheData() {
  const client = createClient();
  await client.connect();
  await client.set("key", "value", { EX: 3600 });
  const val = await client.get("key");
}
