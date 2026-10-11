import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const root = existsSync('app.js') ? '' : 'dist/';
const require = createRequire(import.meta.url);
const core = require('../' + root + 'qdii-monitor-core.js');
let previous = null;
try { previous = JSON.parse(await readFile(root+'qdii-quota-history.json','utf8')); } catch {}
const payload = JSON.parse(await readFile(root+'qdii-limits.json','utf8'));
const result = core.track(previous, payload.funds || []);
await writeFile(root+'qdii-quota-history.json', JSON.stringify(result,null,2)+'\n');
console.log(`Quota baselines ${Object.keys(result.baseline).length}; observed changes ${result.events.length}`);
