#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist','playgama');
fs.mkdirSync(out,{recursive:true});
function copy(from,to=from){const dest=path.join(out,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,from),dest)}
for(const f of ['app.js','app.css','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png'])copy(f);
copy('playgama/boot.js','playgama-boot.js');
copy('playgama/ads.js','playgama-ads.js');
copy('playgama/playgama-bridge-config.json','playgama-bridge-config.json');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i,'')
  .replace(/<link rel="manifest"[^>]*>/i,'')
  .replace(/<script defer src="\.\/(?:ads|app|bootstrap)\.js\?v=\d+"><\/script>/g,'')
  .replace(/(\.\/app\.css)\?v=\d+/g,'$1')
  .replace('</body>','<div id="playgamaLoading" aria-live="polite" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#e7f7ff;font:14px system-ui;pointer-events:none">Loading Dotfront…</div><script defer src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script><script defer src="./playgama-ads.js"></script><script defer src="./playgama-boot.js"></script></body>');
if(!html.includes('playgama-boot.js')||html.includes('src="./app.js?v=')||html.includes('Content-Security-Policy'))throw Error('HTML substitution failed');
fs.writeFileSync(path.join(out,'index.html'),html);
const filenames=['index.html','app.css','app.js','playgama-boot.js','playgama-ads.js','playgama-bridge-config.json','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png'];
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function zip(entries){
 const local=[],central=[];let offset=0;
 for(const [name,data] of entries){
  const n=Buffer.from(name),compressed=deflateRawSync(data,{level:9}),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(n.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  local.push(h,n,compressed);central.push(c,n);offset+=h.length+n.length+compressed.length;
 }
 const dir=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,dir,end]);
}
const entries=filenames.map(n=>[n,fs.readFileSync(path.join(out,n))]);
const bytes=zip(entries);
if(bytes.length>300*1024*1024)throw Error('Exceeds Playgama 300 MB archive limit');
const target=path.join(root,'dist','dotfront-playgama.zip');fs.writeFileSync(target,bytes);
console.log('Created',target,bytes.length+' bytes');
