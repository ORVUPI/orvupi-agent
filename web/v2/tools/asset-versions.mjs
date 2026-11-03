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
 let t=s.replace(/((?:src|href)=")(\/assets\/[^"?#]+\.(?:js|css))(?:\?v=[\w]*)?"/g,(m,a,p)=>existsSync(join(root,p))?`${a}${p}?v=${h(p.slice(1))}"`:m);
 const studioCss='studio/studio.css';
 t=t.replace(/((?:src|href)=")((?:\/studio\/)?studio\.css)(?:\?v=[\w]*)?"/g,(m,a,p)=>existsSync(join(root,studioCss))?`${a}${p}?v=${h(studioCss)}"`:m);
 if(t!==s){stale++;if(!check)writeFileSync(f,t);}}
// Hojas de estilo que cargan los módulos (p. ej. sonar.css desde shell.mjs): el CDN de orvupi.com
// las guarda 4 h en el navegador, así que también llevan ?v=<hash>.
const mods=[];(function walk(d){for(const n of readdirSync(d)){const p=join(d,n);if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.mjs')&&!n.endsWith('.test.mjs'))mods.push(p);}})(join(root,'assets'));
// La página 404 de Sonar (functions/_lib/seo.js) también carga sonar.css.
{const seo=join(root,'..','..','functions','_lib','seo.js');if(existsSync(seo))mods.push(seo);}
for(const f of mods){const s=readFileSync(f,'utf8');
 const t=s.replace(/(["'`])(\/assets\/[^"'`?#]+\.css)(?:\?v=[\w]*)?\1/g,(m,q,p)=>existsSync(join(root,p))?`${q}${p}?v=${h(p.slice(1))}${q}`:m);
 if(t!==s){stale++;if(!check)writeFileSync(f,t);}}
// Módulos ES (/assets/**/*.mjs y verify/net/*.mjs). Antes iban sin versión y, con importaciones
// circulares y carga diferida, el navegador podía mezclar módulos de dos despliegues y Sonar
// Mercados no arrancaba. Todo el grafo lleva una única versión V (hash del contenido de todos
// los módulos sin sus propios ?v=), así un despliegue nuevo cambia todas las URL a la vez.
const graph=[];(function walk(d){if(!existsSync(d))return;for(const n of readdirSync(d)){const p=join(d,n);if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.mjs')&&!n.endsWith('.test.mjs'))graph.push(p);}})(join(root,'assets'));
{const net=join(root,'verify','net');if(existsSync(net))for(const n of readdirSync(net))if(n.endsWith('.mjs')&&!n.endsWith('.test.mjs'))graph.push(join(net,n));}
const spec=/(["'])(\.{1,2}\/[^"'?#\s]+\.m?js)(?:\?v=[\w]*)?\1/g;
const norm=s=>s.replace(spec,(m,q,p)=>`${q}${p}${q}`).replace(/(\/assets\/[^"'?#\s]+\.mjs)\?v=[\w]*/g,'$1');
const gh=createHash('sha256');const deps=new Set();
for(const f of graph.sort()){const s=readFileSync(f,'utf8');gh.update(f.slice(root.length)+'\n'+norm(s));for(const m of s.matchAll(spec)){const d=join(dirname(f),m[2]);if(m[2].endsWith('.js')&&existsSync(d))deps.add(d);}}
for(const d of [...deps].sort())gh.update(d.slice(root.length)+'\n'+readFileSync(d,'utf8'));
const V=gh.digest('hex').slice(0,10);
for(const f of graph){const s=readFileSync(f,'utf8');
 const t=s.replace(spec,(m,q,p)=>existsSync(join(dirname(f),p))?`${q}${p}?v=${V}${q}`:m);
 if(t!==s){stale++;if(!check)writeFileSync(f,t);}}
for(const f of pages){const s=readFileSync(f,'utf8');
 const t=s.replace(/(src=")(\/assets\/[^"?#]+\.mjs)(?:\?v=[\w]*)?"/g,(m,a,p)=>existsSync(join(root,p))?`${a}${p}?v=${V}"`:m);
 if(t!==s){stale++;if(!check)writeFileSync(f,t);}}
console.log(`${pages.length} páginas, ${stale} ${check?'desactualizadas':'actualizadas'}`);if(check&&stale)process.exit(1);
