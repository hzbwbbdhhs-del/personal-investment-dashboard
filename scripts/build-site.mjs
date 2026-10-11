import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = resolve(projectRoot, "dist");
const template = await readFile(resolve(projectRoot, "worker/index.template.js"), "utf8");
const assetNames = ["index.html", "styles.css", "app.js", "qdii-ui.js", "qdii-monitor-core.js", "qdii-insights.js", "qdii-fees.json", "qdii-quota-history.json", "qdii-limits.json", "portfolio-data.js", "favicon.svg"];
const assets = {};
for (const name of assetNames) assets[`/${name}`] = await readFile(resolve(distRoot, name), "utf8");
const source = template.replace("/*__ASSETS__*/", JSON.stringify(assets));
await mkdir(resolve(distRoot, "server"), { recursive: true });
await writeFile(resolve(distRoot, "server/index.js"), source, "utf8");
console.log(`Built Cloudflare Worker with ${assetNames.length} embedded assets`);
