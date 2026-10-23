#!/usr/bin/env node
// Añade ?v=<hash del contenido> a los /assets/*.js y *.css referenciados desde las páginas HTML,
// para que los navegadores no se queden con versiones antiguas en caché. Uso: node tools/asset-versions.mjs [--check]
import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');const check=process.argv.includes('--check');
const hash={};const h=p=>hash[p]??=createHash('sha256').update(readFileSync(join(root,p))).digest('hex').slice(0,10);
const pages=[];(function walk(d){for(const n of readdirSync(d)){if(n==='node_modules'||n==='work'||n.startsWith('.'))continue;const p=join(d,n);if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.html'))pages.push(p);}})(root);
let stale=0;
for(const f of pages){const s=readFileSync(f,'utf8');
 const t=s.replace(/((?:src|href)=")(\/assets\/[^"?#]+\.(?:js|css))(?:\?v=[\w]*)?"/g,(m,a,p)=>existsSync(join(root,p))?`${a}${p}?v=${h(p.slice(1))}"`:m);
 if(t!==s){stale++;if(!check)writeFileSync(f,t);}}
console.log(`${pages.length} páginas, ${stale} ${check?'desactualizadas':'actualizadas'}`);if(check&&stale)process.exit(1);
