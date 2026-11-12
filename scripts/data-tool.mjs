#!/usr/bin/env node
// Living Furniture dashboard data tool.
// The dashboard data is stored encrypted in data/data.enc.json (AES-256-GCM).
// The key is derived from the login email + password (PBKDF2-SHA256), so the
// file in this public repo is unreadable without the account.
//
//   LF_EMAIL=... LF_PASS=... node scripts/data-tool.mjs init <plain.json>   create the encrypted file (prints the key hex)
//   LF_KEY=<hex> node scripts/data-tool.mjs merge <collected.json>           merge a new collection into the encrypted file
//   LF_KEY=<hex> node scripts/data-tool.mjs summary                          print a short summary
//   LF_KEY=<hex> node scripts/data-tool.mjs export <out.json>                write the decrypted data (do not commit it)
//
// collected.json = { orders:[row...], ads:[row...], products:[row...] }  (rows exactly as scripts/collector.js emits)
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as C } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENC = path.join(ROOT, 'data', 'data.enc.json');
const ITER = 250000;
const b64 = u8 => Buffer.from(u8).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));
const hex = u8 => Buffer.from(u8).toString('hex');
const unhex = s => new Uint8Array(Buffer.from(s, 'hex'));

async function deriveRaw(email, pass, salt) {
  const base = await C.subtle.importKey('raw', new TextEncoder().encode(email.trim().toLowerCase() + '\n' + pass), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await C.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, 256));
}
const aesKey = raw => C.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function encrypt(obj, raw, salt) {
  const iv = C.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await C.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(raw), new TextEncoder().encode(JSON.stringify(obj))));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct), updated: new Date().toISOString() };
}
async function decrypt(file, raw) {
  const pt = await C.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) }, await aesKey(raw), unb64(file.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
const readEnc = () => JSON.parse(readFileSync(ENC, 'utf8'));
const keyFromEnv = () => { if (!process.env.LF_KEY) throw new Error('Set LF_KEY (hex)'); return unhex(process.env.LF_KEY); };
const now = () => Math.floor(Date.now() / 1000);

function merge(data, add) {
  const bySn = new Map(data.orders.map(r => [r[0], r]));
  let added = 0, updated = 0;
  for (const r of add.orders || []) {
    const old = bySn.get(r[0]);
    if (!old) { bySn.set(r[0], r); added++; continue; }
    const m = r.slice();
    for (let i = 11; i <= 17; i++) if (m[i] === null || m[i] === undefined) m[i] = old[i] ?? null;
    for (let i = 18; i <= 20; i++) if (m[i] === null || m[i] === undefined) m[i] = old[i] ?? null;
    bySn.set(r[0], m); updated++;
  }
  data.orders = [...bySn.values()].sort((a, b) => b[1] - a[1]);
  const byDay = new Map(data.ads.map(r => [r[0], r]));
  for (const r of add.ads || []) byDay.set(r[0], r);
  data.ads = [...byDay.values()].sort((a, b) => a[0] - b[0]);
  if (add.products && add.products.length) data.products = add.products;
  data.meta = { ...(data.meta || {}), at: now() };
  return { added, updated };
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'init') {
  const { LF_EMAIL, LF_PASS } = process.env;
  if (!LF_EMAIL || !LF_PASS) throw new Error('Set LF_EMAIL and LF_PASS');
  const salt = C.getRandomValues(new Uint8Array(16));
  const raw = await deriveRaw(LF_EMAIL, LF_PASS, salt);
  const data = JSON.parse(readFileSync(arg, 'utf8')); data.meta = { ...(data.meta || {}), at: now() };
  writeFileSync(ENC, JSON.stringify(await encrypt(data, raw, salt)));
  console.log('key=' + hex(raw));
} else if (cmd === 'merge') {
  const raw = keyFromEnv(); const file = readEnc();
  const data = await decrypt(file, raw);
  const r = merge(data, JSON.parse(readFileSync(arg, 'utf8')));
  writeFileSync(ENC, JSON.stringify(await encrypt(data, raw, unb64(file.salt))));
  console.log(JSON.stringify({ ...r, orders: data.orders.length, ads: data.ads.length }));
} else if (cmd === 'summary') {
  const data = await decrypt(readEnc(), keyFromEnv());
  const ok = data.orders.filter(r => !/hủy/i.test(r[3]));
  console.log(JSON.stringify({ orders: data.orders.length, valid: ok.length, nmv: ok.reduce((s, r) => s + r[5], 0), ads: data.ads.length, at: new Date(data.meta.at * 1000).toISOString() }));
} else if (cmd === 'export') {
  writeFileSync(arg, JSON.stringify(await decrypt(readEnc(), keyFromEnv())));
} else {
  console.log('usage: init <plain.json> | merge <collected.json> | summary | export <out.json>');
}
