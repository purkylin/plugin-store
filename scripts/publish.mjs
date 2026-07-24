import { readFile } from "node:fs/promises";

const file = process.argv[2];
const baseURL = process.env.PLUGIN_STORE_URL;
const token = process.env.PLUGIN_STORE_ADMIN_TOKEN;

if (!file || !baseURL || !token) {
  console.error(
    "Usage: PLUGIN_STORE_URL=https://worker.example.com "
      + "PLUGIN_STORE_ADMIN_TOKEN=... npm run publish -- examples/example-hot.json",
  );
  process.exit(1);
}

const body = await readFile(file, "utf8");
const payload = JSON.parse(body);
const pluginID = payload?.manifest?.id;
if (typeof pluginID !== "string" || pluginID.length === 0) {
  throw new Error("The publish file must contain manifest.id.");
}

const endpoint = new URL(`/api/v1/admin/plugins/${encodeURIComponent(pluginID)}`, baseURL);
const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body,
});

const responseBody = await response.text();
if (!response.ok) {
  throw new Error(`Publish failed (${response.status}): ${responseBody}`);
}
console.log(responseBody);
