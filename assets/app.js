/* Living Furniture · Shopee Performance dashboard */
(() => {
'use strict';

/* ---------------- constants & helpers ---------------- */
const TZ = 7 * 3600, DAY = 86400;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const nf = new Intl.NumberFormat('vi-VN');
const full = v => nf.format(Math.round(v || 0));
const money = v => full(v) + ' ₫';
const short = v => {
  const a = Math.abs(v || 0);
  if (a >= 1e9) return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
  if (a >= 1e6) return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: a >= 1e8 ? 0 : 1 }) + ' tr';
  if (a >= 1e3) return Math.round(v / 1e3).toLocaleString('vi-VN') + 'k';
  return full(v);
};
const pct = (v, d = 1) => (isFinite(v) ? (v * 100).toLocaleString('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: 0 }) + '%' : '–');
const num2 = v => (isFinite(v) ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '–');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayKey = t => Math.floor((t + TZ) / DAY);
const keyToDate = k => new Date(k * DAY * 1000); // UTC date == local GMT+7 calendar date
const keyToISO = k => keyToDate(k).toISOString().slice(0, 10);
const isoToKey = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 1000 / DAY);
const dmy = k => { const d = keyToDate(k); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear(); };
const dm = k => { const d = keyToDate(k); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const monthKey = k => { const d = keyToDate(k); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const monthLabel = mk => 'T' + ((mk % 12) + 1) + '/' + Math.floor(mk / 12);
const monthStart = mk => Date.UTC(Math.floor(mk / 12), mk % 12, 1) / 1000 / DAY;
const monthEnd = mk => monthStart(mk + 1) - 1;
const todayKey = () => dayKey(Date.now() / 1000);
const store = {
  get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
  set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
};
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------------- region map (34 tỉnh/thành sau 2025 + tên cũ) ---------------- */
const REGIONS = {
  'Miền Bắc': ['hà nội', 'hải phòng', 'quảng ninh', 'bắc ninh', 'hưng yên', 'ninh bình', 'thái nguyên', 'phú thọ', 'lào cai', 'tuyên quang', 'cao bằng', 'lạng sơn', 'điện biên', 'lai châu', 'sơn la', 'hải dương', 'thái bình', 'nam định', 'hà nam', 'vĩnh phúc', 'bắc giang', 'hòa bình', 'hoà bình', 'yên bái', 'hà giang', 'bắc kạn'],
  'Miền Trung': ['thanh hóa', 'thanh hoá', 'nghệ an', 'hà tĩnh', 'quảng trị', 'huế', 'đà nẵng', 'quảng ngãi', 'gia lai', 'đắk lắk', 'đắc lắc', 'khánh hòa', 'khánh hoà', 'lâm đồng', 'quảng bình', 'quảng nam', 'bình định', 'kon tum', 'phú yên', 'ninh thuận', 'bình thuận', 'đắk nông'],
  'Miền Nam': ['hồ chí minh', 'đồng nai', 'tây ninh', 'đồng tháp', 'an giang', 'vĩnh long', 'cần thơ', 'cà mau', 'bình dương', 'bà rịa', 'vũng tàu', 'bình phước', 'long an', 'tiền giang', 'bến tre', 'trà vinh', 'sóc trăng', 'hậu giang', 'kiên giang', 'bạc liêu']
};
const regionOf = p => { const s = (p || '').toLowerCase(); for (const r in REGIONS) if (REGIONS[r].some(k => s.includes(k))) return r; return 'Khác'; };
const REGION_COLORS = { 'Miền Bắc': '--c-blue', 'Miền Trung': '--c-ads', 'Miền Nam': '--c-brand', 'Khác': '--label-3' };
const CARRIER_NAMES = { GHN: 'Giao Hàng Nhanh', SPX: 'SPX Express', VNP: 'VNPost', GHTK: 'Giao Hàng Tiết Kiệm', 'J&T': 'J&T Express', NJV: 'Ninja Van', BEST: 'BEST Express' };
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* ---------------- crypto ---------------- */
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = u => btoa(String.fromCharCode(...u));
async function deriveRaw(email, pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(email.trim().toLowerCase() + '\n' + pass), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, 256));
}
async function decryptWith(raw, file) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(file.iv) }, key, b64d(file.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function fetchEnc() {
  const r = await fetch('data/data.enc.json?ts=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('Không tải được dữ liệu (' + r.status + ')');
  return r.json();
}

/* ---------------- state ---------------- */
let DATA = null, ORDERS = [], ADS = [], PRODUCTS = [], LIST = {}, LEDGER = [], ADSPLIT = {}, WALLET = { paidIn: 0, freeIn: 0, paidUsed: 0, freeUsed: 0 };
const S = { from: 0, to: 0, preset: '30', cmp: 'prev', sku: '', region: '', carrier: '', hour: null,
  dailyMetric: 'nmv', monthlyMetric: 'nmv', q: '', status: '', sort: 't', dir: -1, page: 0 };

function prepare(d) {
  DATA = d; PRODUCTS = d.products || [];
  LIST = {}; PRODUCTS.forEach(p => { LIST[p[4]] = { list: p[5], promo: p[6], stock: p[7], model: p[3], name: p[2], item: p[0] }; });
  ORDERS = (d.orders || []).map(r => {
    const o = { sn: r[0], t: r[1], st: r[2], s: r[3] || '', q: r[4] || 0, v: r[5] || 0, paid: r[6] || 0, m: r[7] || '', p: r[8] || 0, prov: r[9] || '', car: r[10] || '',
      fx: r[11] || 0, sv: r[12] || 0, pi: r[13] || 0, tx: r[14] || 0, sh: r[15] || 0, pv: r[16] || 0, inc: r[17], sku: r[18] || '', ret: !!r[19], iid: r[20] };
    o.day = dayKey(o.t); o.hour = Math.floor(((o.t + TZ) % DAY) / 3600); o.wd = keyToDate(o.day).getUTCDay();
    o.region = regionOf(o.prov); o.cx = /hủy/i.test(o.s) || o.st === 5;
    o.cls = o.cx ? 'cx' : /trả hàng|hoàn tiền/i.test(o.s) ? 'cx' : /^Đã giao$|hoàn thành/i.test(o.s) ? 'ok' : /ĐVVC|đang giao|vận chuyển/i.test(o.s) ? 'ship' : 'wait';
    const lp = (LIST[o.sku] || {}).list || 0; o.promo = lp > o.p ? (lp - o.p) * o.q : 0;
    o.fee = o.fx + o.sv + o.tx + o.pi;
    o.prodNet = o.v - o.sh - o.fee;                       // thực thu từ sản phẩm (không gồm tiền ship khách trả)
    o.income = o.inc != null ? o.inc : o.prodNet;         // số Shopee chuyển (có thể gồm phí ship khách trả)
    o.shipNet = o.income - o.prodNet;
    return o;
  }).sort((a, b) => b.t - a.t);
  // Sổ giao dịch tài khoản Ads: tách tiền LF nạp và tiền Shopee tặng.
  // Mỗi ngày: cộng tiền vào trước, khấu trừ dùng tiền tặng trước rồi mới tới tiền nạp.
  LEDGER = (d.ledger || []).map(r => ({ day: dayKey(r[0]), kind: r[1], amt: r[2] || 0, type: r[3] || '', from: r[4] || '' })).sort((a, b) => a.day - b.day || (a.kind === 'spend') - (b.kind === 'spend'));
  ADSPLIT = {}; WALLET = { paidIn: 0, freeIn: 0, paidUsed: 0, freeUsed: 0 };
  let freeBal = 0, paidBal = 0;
  LEDGER.forEach(e => {
    if (e.kind === 'free') { freeBal += e.amt; WALLET.freeIn += e.amt; }
    else if (e.kind === 'paid') { paidBal += e.amt; WALLET.paidIn += e.amt; }
    else if (e.kind === 'spend') {
      let f = Math.min(e.amt, Math.max(0, freeBal)), p = e.amt - f;
      if (p > 0 && p < 5 && paidBal < 5) { f += p; p = 0; } // sai số làm tròn của Shopee (số lẻ), không phải tiền nạp
      freeBal -= f; paidBal -= p;
      WALLET.freeUsed += f; WALLET.paidUsed += p;
      const x = ADSPLIT[e.day] || (ADSPLIT[e.day] = { free: 0, paid: 0 }); x.free += f; x.paid += p;
    }
  });
  WALLET.freeBal = freeBal; WALLET.paidBal = paidBal; WALLET.hasLedger = LEDGER.length > 0;
  ADS = (d.ads || []).map(r => ({ day: dayKey(r[0]), imp: r[1] || 0, clk: r[2] || 0, cost: r[3] || 0, ord: r[4] || 0, gmv: r[5] || 0, dord: r[6] || 0, dgmv: r[7] || 0, atc: r[8] || 0, units: r[9] || 0 })).sort((a, b) => a.day - b.day);
}

/* ---------------- ranges ---------------- */
function dataBounds() {
  const ks = ORDERS.map(o => o.day).concat(ADS.map(a => a.day));
  return ks.length ? [Math.min(...ks), Math.max(todayKey(), Math.max(...ks))] : [todayKey(), todayKey()];
}
function presetRange(p) {
  const t = todayKey(), d = keyToDate(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
  switch (p) {
    case 'today': return [t, t];
    case 'yesterday': return [t - 1, t - 1];
    case '7': return [t - 6, t];
    case '30': return [t - 29, t];
    case 'month': return [Date.UTC(y, m, 1) / 864e5, t];
    case 'lastmonth': return [Date.UTC(y, m - 1, 1) / 864e5, Date.UTC(y, m, 1) / 864e5 - 1];
    case 'year': return [Date.UTC(y, 0, 1) / 864e5, t];
    default: return dataBounds();
  }
}
function cmpRange() {
  if (S.cmp === 'none') return null;
  const len = S.to - S.from + 1;
  if (S.cmp === 'yoy') return [S.from - 365, S.to - 365];
  // whole calendar month -> previous calendar month
  const f = keyToDate(S.from), tt = keyToDate(S.to + 1);
  if (f.getUTCDate() === 1 && tt.getUTCDate() === 1) { const mk = monthKey(S.from); const n = monthKey(S.to) - mk + 1; return [monthStart(mk - n), monthStart(mk) - 1]; }
  return [S.from - len, S.from - 1];
}

/* ---------------- filtering & aggregation ---------------- */
function filterOrders(a, b, opts = {}) {
  return ORDERS.filter(o => o.day >= a && o.day <= b && (!S.sku || o.sku === S.sku) && (!S.region || o.region === S.region) &&
    (!S.carrier || o.car === S.carrier) && (opts.ignoreHour || S.hour === null || o.hour === S.hour));
}
const adsIn = (a, b) => ADS.filter(r => r.day >= a && r.day <= b);
// Chia chi phí Ads mỗi ngày theo nguồn tiền; ngày không có sổ giao dịch thì coi là tiền LF nạp.
function splitDay(r) { const x = ADSPLIT[r.day]; if (!x || !(x.free + x.paid)) return { free: 0, paid: r.cost }; const fr = x.free / (x.free + x.paid); return { free: r.cost * fr, paid: r.cost * (1 - fr) }; }
function agg(a, b) {
  const os = filterOrders(a, b), ok = os.filter(o => !o.cx), sum = (arr, f) => arr.reduce((s, o) => s + f(o), 0);
  const ads = adsIn(a, b);
  const A = ads.reduce((t, r) => { for (const k in t) t[k] += r[k]; return t; }, { imp: 0, clk: 0, cost: 0, ord: 0, gmv: 0, atc: 0, units: 0, dord: 0, dgmv: 0 });
  const nmv = sum(ok, o => o.v), units = sum(ok, o => o.q), fee = sum(ok, o => o.fee), sh = sum(ok, o => o.sh), promo = sum(ok, o => o.promo);
  const adsFree = ads.reduce((s, r) => s + splitDay(r).free, 0), adsPaid = A.cost - adsFree;
  const mkt = adsPaid + sh;
  const adsUnits = Math.min(A.units || A.ord, units);
  const res = {
    a, b, days: b - a + 1, os, ok, ads, A, nmv, gmv: sum(os, o => o.v), units, orders: ok.length, aov: ok.length ? nmv / ok.length : 0, asp: units ? nmv / units : 0,
    fx: sum(ok, o => o.fx), sv: sum(ok, o => o.sv), tx: sum(ok, o => o.tx), pi: sum(ok, o => o.pi), fee, sh, pv: sum(ok, o => o.pv), promo,
    income: sum(ok, o => o.income), prodNet: sum(ok, o => o.prodNet), shipNet: sum(ok, o => o.shipNet), adsFree, adsPaid,
    mkt, net: nmv - fee - mkt, payout: sum(ok, o => o.income) - adsPaid,
    fxBase: sum(ok.filter(o => o.fx > 0), o => o.v - o.sh), fxPos: sum(ok.filter(o => o.fx > 0), o => o.fx), fxFreeN: ok.filter(o => o.fx === 0 && o.fee > 0).length,
    cxN: os.filter(o => o.cx).length, retN: ok.filter(o => o.ret).length, totalN: os.length,
    waitN: ok.filter(o => o.cls === 'wait').length, shipN: ok.filter(o => o.cls === 'ship').length, doneN: ok.filter(o => o.cls === 'ok').length,
    adsUnits, organicUnits: Math.max(0, units - adsUnits)
  };
  res.cxRate = res.totalN ? res.cxN / res.totalN : NaN;
  res.retRate = res.orders ? res.retN / res.orders : NaN;
  res.take = nmv ? fee / nmv : NaN;
  return res;
}
function delta(c, p, invert) {
  if (p == null || !isFinite(c) || !isFinite(p)) return null;
  if (p === 0) return c === 0 ? { t: '0%', c: 'flat' } : { t: 'Mới', c: invert ? 'down' : 'up' };
  const r = c / p - 1; if (Math.abs(r) < .0005) return { t: '0%', c: 'flat' };
  return { t: (r > 0 ? '▲ ' : '▼ ') + Math.abs(r * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%', c: (invert ? r < 0 : r > 0) ? 'up' : 'down' };
}
const ptDelta = (c, p, invert) => { // percentage-point change for ratios
  if (p == null || !isFinite(c) || !isFinite(p)) return null;
  const d = (c - p) * 100; if (Math.abs(d) < .05) return { t: '0 đ%', c: 'flat' };
  return { t: (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' đ%', c: (invert ? d < 0 : d > 0) ? 'up' : 'down' };
};
const badge = d => d ? `<span class="badge ${d.c}">${d.t}</span>` : '';

/* ---------------- tooltip ---------------- */
const tipEl = $('#tooltip');
function tip(e, html) {
  tipEl.innerHTML = html; tipEl.classList.add('on');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = e.clientX + 14, y = e.clientY - h - 12;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 18;
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
const untip = () => tipEl.classList.remove('on');
function bindTips(root, fn) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    const show = e => tip(e, fn(el.dataset.tip)); el.addEventListener('pointermove', show); el.addEventListener('pointerdown', show); el.addEventListener('pointerleave', untip);
  });
}

/* ---------------- chart primitives ---------------- */
const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
function barChart(el, { labels, bars, line, line2, fmt = short, fmtLine = full, color = 'var(--c-brand)', lineColor = 'var(--c-ads)', line2Color = 'var(--c-blue)', height = 260, tipFn, onClick, active, everyLabel }) {
  const W = Math.max(280, Math.round(el.clientWidth || 600)), H = height, L = 50, R = line ? 44 : 8, T = 12, B = 26, iw = W - L - R, ih = H - T - B, n = labels.length;
  if (!everyLabel) everyLabel = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 58))));
  const mx = niceMax(Math.max(...bars, ...(line2 || []), 0)), ml = line ? niceMax(Math.max(...line, 0)) : 1;
  const bw = iw / Math.max(n, 1), gap = Math.min(10, bw * .28), y = v => T + ih - v / mx * ih, yl = v => T + ih - v / ml * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
  for (let i = 0; i <= 4; i++) { const v = mx * i / 4; s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; if (line) s += `<text x="${W - R + 8}" y="${yl(ml * i / 4) + 4}">${fmtLine(ml * i / 4)}</text>`; }
  const every = everyLabel;
  bars.forEach((v, i) => {
    const x = L + i * bw + gap / 2, w = Math.max(1.5, bw - gap), h = Math.max(0, T + ih - y(v));
    const op = active == null || active === i ? 1 : .35;
    if (v > 0) s += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(5, w / 2).toFixed(1)}" fill="${color}" stroke="none" opacity="${op}"/>`;
    if (i % every === 0) s += `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(labels[i])}</text>`;
  });
  const path = (arr, yf) => arr.map((v, i) => (i ? 'L' : 'M') + (L + i * bw + bw / 2).toFixed(1) + ' ' + yf(v).toFixed(1)).join('');
  if (line2 && line2.some(v => v)) s += `<path d="${path(line2, y)}" stroke="${line2Color}" stroke-width="2" fill="none" stroke-dasharray="4 4"/>`;
  if (line && line.some(v => v)) { s += `<path d="${path(line, yl)}" stroke="${lineColor}" stroke-width="2.2" fill="none"/>`; line.forEach((v, i) => { if (v) s += `<circle cx="${(L + i * bw + bw / 2).toFixed(1)}" cy="${yl(v).toFixed(1)}" r="3.2" fill="var(--card)" stroke="${lineColor}" stroke-width="2"/>`; }); }
  labels.forEach((_, i) => { s += `<rect class="hit" data-tip="${i}" x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}"/>`; });
  el.innerHTML = s + '</svg>';
  if (tipFn) bindTips(el, i => tipFn(+i));
  if (onClick) el.querySelectorAll('.hit').forEach(h => h.addEventListener('click', () => onClick(+h.dataset.tip)));
}
function donut(el, parts, centerTop, centerBottom) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1, R = 70, r = 48, C = 85; let a0 = -Math.PI / 2, s = `<svg viewBox="0 0 170 170">`;
  if (!parts.some(p => p.v)) s += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" stroke="var(--fill)" stroke-width="${R - r}" fill="none"/>`;
  parts.forEach((p, i) => {
    if (!p.v) return; const a1 = a0 + p.v / tot * Math.PI * 2 - (parts.filter(x => x.v).length > 1 ? .02 : 0), lg = a1 - a0 > Math.PI ? 1 : 0;
    const pt = (rad, a) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
    if (p.v / tot > .9999) { s += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" stroke="${p.c}" stroke-width="${R - r}" fill="none" data-tip="${i}"/>`; }
    else { const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
      s += `<path d="M${x0} ${y0}A${R} ${R} 0 ${lg} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${lg} 0 ${x3} ${y3}Z" fill="${p.c}" stroke="none" data-tip="${i}"/>`; }
    a0 = a0 + p.v / tot * Math.PI * 2;
  });
  s += `<text x="${C}" y="${C - 2}" text-anchor="middle" font-size="19" font-weight="700">${esc(centerTop)}</text><text x="${C}" y="${C + 16}" text-anchor="middle" font-size="11" fill="var(--label-2)" style="fill:var(--label-2)">${esc(centerBottom)}</text></svg>`;
  el.className = 'donut'; el.innerHTML = s;
  bindTips(el, i => { const p = parts[+i]; return `<b>${esc(p.l)}</b>${short(p.v)} ₫ · ${pct(p.v / tot)}`; });
}
function spark(vals, color) {
  if (vals.length < 2 || !vals.some(v => v)) return '';
  const w = 200, h = 34, mx = Math.max(...vals, 1), pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 3 - v / mx * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${color}" opacity=".14" stroke="none"/><path d="${d}" stroke="${color}" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}
function hbars(el, rows, color, fmt) {
  const mx = Math.max(...rows.map(r => r.v), 1), tot = rows.reduce((s, r) => s + r.v, 0) || 1;
  el.innerHTML = rows.length ? rows.map(r => `<div class="hb" style="--c:${r.c || color}"><div class="hb-top"><span title="${esc(r.l)}">${esc(r.l)}</span><span><b>${fmt(r.v)}</b> · ${pct(r.v / tot, 0)}${r.extra ? ' · ' + r.extra : ''}</span></div><div class="hb-track"><b data-w="${(r.v / mx * 100).toFixed(1)}"></b></div></div>`).join('')
    : '<p class="empty-note">Chưa có đơn trong khoảng này.</p>';
  requestAnimationFrame(() => el.querySelectorAll('.hb-track b').forEach(b => { b.style.width = b.dataset.w + '%'; }));
}
const groupSum = (arr, kf, vf) => { const m = new Map(); arr.forEach(o => { const k = kf(o); m.set(k, (m.get(k) || 0) + vf(o)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };

/* ---------------- render ---------------- */
let C = null, P = null;
function render() {
  C = agg(S.from, S.to); const cr = cmpRange(); P = cr ? agg(cr[0], cr[1]) : null;
  const pEmpty = P && !P.totalN && !P.A.cost && !P.A.imp; const pLabel = P ? (P.a === P.b ? dmy(P.a) : dmy(P.a) + ' – ' + dmy(P.b)) : '';
  if (pEmpty) P = null;
  const rangeTxt = S.from === S.to ? dmy(S.from) : dmy(S.from) + ' – ' + dmy(S.to);
  $('#heroRange').textContent = rangeTxt; $('#tbRange').textContent = rangeTxt;
  $('#cmpLabel').textContent = P ? 'So với ' + pLabel : pEmpty ? 'Kỳ so sánh ' + pLabel + ' chưa có dữ liệu' : 'Không so sánh';
  const filt = [S.sku && 'SKU ' + S.sku, S.region, S.carrier && (CARRIER_NAMES[S.carrier] || S.carrier), S.hour !== null && 'Giờ ' + S.hour + 'h'].filter(Boolean);
  $('#activeFilters').innerHTML = filt.map(f => `<span>${esc(f)}</span>`).join('');
  $('#heroNote').textContent = (filt.length ? 'Đang lọc: ' + filt.join(' · ') + '. ' : '') + `${C.orders} đơn hợp lệ · ${C.units} sản phẩm · ${C.cxN} đơn hủy`;
  syncControls();
  renderBiz(); renderGroups(); renderTarget(); renderChannels();
  renderDaily(); renderMonthly(); renderWeekday();
  renderSku(); renderStock(); renderPrice();
  renderRegion(); renderProv(); renderCarrier(); renderHour();
  renderAds(); renderOrders();
}

function renderBiz() {
  const sp = f => { const out = Array(C.days).fill(0); C.ok.forEach(o => { const i = o.day - C.a; if (i >= 0 && i < out.length) out[i] += f(o); }); return out; };
  const k = (l, v, d, foot, cls = '', sparkHtml = '') => `<div class="kpi ${cls}"><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div>${sparkHtml}<div class="kpi-f">${badge(d)}<span>${foot}</span></div></div>`;
  const vv = v => `${short(v).replace(/ (tr|tỷ|k)$/, '<small> $1</small>')}<small> ₫</small>`;
  $('#biz').innerHTML =
    k('NMV thực nhận', vv(C.net), P && delta(C.net, P.net), `${pct(C.net / C.nmv)} NMV · đã trừ phí sàn, voucher shop, Ads LF trả`, 'lead', C.days > 1 ? spark(sp(o => o.prodNet), '#ffffff') : '') +
    k('NMV', vv(C.nmv), P && delta(C.nmv, P.nmv), `Giá shop bán · ${C.orders} đơn · ${C.units} sản phẩm`, '', C.days > 1 ? spark(sp(o => o.v), 'var(--c-brand)') : '') +
    k('Chi phí sàn Shopee', vv(C.fee), P && delta(C.fee, P.fee, true), pct(C.take) + ' NMV (take rate)', '', C.days > 1 ? spark(sp(o => o.fee), 'var(--c-ads)') : '') +
    k('Thực thu / sản phẩm', vv(C.units ? C.prodNet / C.units : 0), P && delta(C.units ? C.prodNet / C.units : 0, P.units ? P.prodNet / P.units : 0), `Giá bán TB ${short(C.asp)} ₫ · giữ lại ${pct(C.prodNet / C.nmv)}`, '', C.days > 1 ? spark(sp(o => o.prodNet), 'var(--c-blue)') : '');
}

function renderGroups() {
  const r = (k, v, d, cls = '') => `<div class="row ${cls}"><span class="k">${k}</span><span class="v">${v}</span><span class="d ${d ? d.c : 'flat'}">${d ? d.t : ''}</span></div>`;
  const D = (f, inv) => P ? delta(f(C), f(P), inv) : null, PT = (f, inv) => P ? ptDelta(f(C), f(P), inv) : null;
  const n = C.nmv || NaN;
  const carrierRows = groupSum(C.ok, o => o.car || '—', o => o.v).map(([k, v]) => {
    const pv = P ? P.ok.filter(o => (o.car || '—') === k).reduce((s, o) => s + o.v, 0) : null;
    return r(esc(CARRIER_NAMES[k] || k), short(v) + ' ₫', P ? delta(v, pv) : null) + r('% NMV', pct(v / n), null, 'sub');
  }).join('') || r('Chưa có đơn', '–', null);
  const G = [
    ['Hiệu suất tổng quan', '--c-brand', [r('NMV', money(C.nmv), D(x => x.nmv)), r('GMV (gồm đơn hủy)', money(C.gmv), D(x => x.gmv)), r('Sản phẩm bán ra', full(C.units), D(x => x.units)), r('Số đơn hợp lệ', full(C.orders), D(x => x.orders)), r('AOV (giá trị/đơn)', money(C.aov), D(x => x.aov)), r('Giá bán TB/sản phẩm', money(C.asp), D(x => x.asp))]],
    ['Chi phí sàn Shopee', '--c-ads', [r('Phí cố định', money(C.fx), D(x => x.fx, 1)), r('% NMV', pct(C.fx / n), PT(x => x.fx / x.nmv, 1), 'sub'), r('Phí dịch vụ', money(C.sv), D(x => x.sv, 1)), r('% NMV', pct(C.sv / n), PT(x => x.sv / x.nmv, 1), 'sub'), r('Phí xử lý giao dịch', money(C.tx), D(x => x.tx, 1)), r('% NMV', pct(C.tx / n), PT(x => x.tx / x.nmv, 1), 'sub'), r('Phí dịch vụ PiShip', money(C.pi), D(x => x.pi, 1)), r('% NMV', pct(C.pi / n), PT(x => x.pi / x.nmv, 1), 'sub'), r('Tổng phí sàn', money(C.fee), D(x => x.fee, 1), 'total'), r('% NMV', pct(C.take), PT(x => x.take, 1), 'sub'),
      C.fxFreeN ? `<p class="note">${C.fxFreeN} đơn được Shopee miễn phí cố định nên tỷ lệ chung thấp hơn. Ở các đơn có thu, phí cố định ≈ ${pct(C.fxPos / C.fxBase)} trên giá bán sau voucher shop.</p>` : '']],
    ['Sức khỏe đơn hàng', '--c-bad', [r('Đơn hủy', full(C.cxN) + ' đơn', D(x => x.cxN, 1)), r('% đơn hủy', pct(C.cxRate), PT(x => x.cxRate, 1), 'sub'), r('Đơn trả hàng/hoàn tiền', full(C.retN) + ' đơn', D(x => x.retN, 1)), r('% trả hàng', pct(C.retRate), PT(x => x.retRate, 1), 'sub'), r('Chờ xử lý', full(C.waitN) + ' đơn', null), r('Đang giao', full(C.shipN) + ' đơn', null), r('Đã giao', full(C.doneN) + ' đơn', null)]],
    ['Khuyến mãi', '--c-indigo', [r('Giảm giá shop (so giá niêm yết)', money(C.promo), D(x => x.promo, 1)), r('% NMV', pct(C.promo / n), PT(x => x.promo / x.nmv, 1), 'sub'), r('Voucher shop', money(C.sh), D(x => x.sh, 1)), r('% NMV', pct(C.sh / n), PT(x => x.sh / x.nmv, 1), 'sub'), r('Voucher Shopee (sàn trả)', money(C.pv), D(x => x.pv)), r('% NMV', pct(C.pv / n), PT(x => x.pv / x.nmv), 'sub'), r('Tổng trợ giá', money(C.promo + C.sh + C.pv), D(x => x.promo + x.sh + x.pv), 'total')]],
    ['Marketing & Ads', '--c-blue', [r('Ads LF nạp tiền', money(C.adsPaid), D(x => x.adsPaid, 1)), r('% NMV', pct(C.adsPaid / n), PT(x => x.adsPaid / x.nmv, 1), 'sub'), r('Ads Shopee tặng (nhiệm vụ)', money(C.adsFree), D(x => x.adsFree)), r('% NMV · không tính chi phí', pct(C.adsFree / n), null, 'sub'), r('Mkt fee (Ads LF trả + voucher shop)', money(C.mkt), D(x => x.mkt, 1)), r('% NMV', pct(C.mkt / n), PT(x => x.mkt / x.nmv, 1), 'sub'), r('Sản phẩm bán qua Ads', full(C.adsUnits), D(x => x.adsUnits)), r('Sản phẩm tự nhiên', full(C.organicUnits), D(x => x.organicUnits))]],
    ['Đơn vị vận chuyển', '--c-teal', [carrierRows]]
  ];
  $('#groups').innerHTML = G.map(([t, c, rows]) => `<div class="card grp"><div class="card-h"><h3><i style="--c:var(${c})"></i>${t}</h3></div><div class="rows">${rows.join('')}</div></div>`).join('');
}

function renderTarget() {
  const key = 'lf-target-' + S.from + '-' + S.to; const tgt = +(store.get(key) || 0);
  const t = todayKey(), elapsed = Math.max(1, Math.min(S.to, t) - S.from + 1), days = S.to - S.from + 1;
  const proj = S.to > t && S.from <= t ? C.nmv / elapsed * days : C.nmv;
  const rate = tgt ? C.nmv / tgt : 0;
  $('#targetCard').innerHTML = `<div class="card-h"><h3>Tiến độ mục tiêu NMV</h3><span class="muted sm">Lưu theo khoảng ngày đang chọn</span></div>
    <div class="target-top"><div><div class="kpi-v">${tgt ? pct(rate, 0) : '—'}</div><div class="muted sm">${tgt ? 'Đạt ' + short(C.nmv) + ' ₫ / ' + short(tgt) + ' ₫' : 'Chưa nhập mục tiêu cho khoảng này'}</div></div>
    <label class="target-input"><span class="muted sm">Mục tiêu</span><input id="targetInput" inputmode="numeric" placeholder="VD: 30.000.000" value="${tgt ? full(tgt) : ''}" aria-label="Mục tiêu NMV"></label></div>
    <div class="progress"><b data-w="${Math.min(100, rate * 100).toFixed(1)}"></b></div>
    <div class="target-meta"><div><b>${short(proj)} ₫</b><span>${S.to > t ? 'Dự phóng cuối kỳ' : 'NMV cả kỳ'}</span></div><div><b>${tgt ? short(Math.max(0, tgt - C.nmv)) + ' ₫' : '—'}</b><span>Còn thiếu</span></div><div><b>${tgt && S.to > t ? short(Math.max(0, tgt - C.nmv) / Math.max(1, S.to - t)) + ' ₫' : short(C.nmv / days) + ' ₫'}</b><span>${tgt && S.to > t ? 'Cần mỗi ngày còn lại' : 'NMV trung bình/ngày'}</span></div></div>`;
  requestAnimationFrame(() => { const b = $('#targetCard .progress b'); if (b) b.style.width = b.dataset.w + '%'; });
  $('#targetInput').addEventListener('change', e => { const v = +String(e.target.value).replace(/\D/g, ''); if (v) store.set(key, v); else store.del(key); renderTarget(); });
}
function renderChannels() {
  const rows = [['Shopee', C.nmv, true], ['TikTok Shop', 0, false], ['Lazada', 0, false], ['Website', 0, false]];
  $('#channelCard').innerHTML = `<div class="card-h"><h3>Thị phần theo kênh (NMV)</h3><span class="muted sm">Tổng ${short(C.nmv)} ₫</span></div>` +
    rows.map(([n, v, on]) => `<div class="ch-row ${on ? '' : 'na'}"><span>${n}</span><div class="bar"><b style="width:${on && C.nmv ? 100 : 0}%"></b></div><span class="v">${on ? (C.nmv ? '100%' : '0%') : 'Chưa kết nối'}</span></div>`).join('') +
    `<p class="muted sm" style="margin:10px 0 0">Khi có thêm kênh, dữ liệu sẽ được gộp vào đây theo cùng định nghĩa NMV.</p>`;
}

function renderDaily() {
  const n = C.days, weekly = n > 120, step = weekly ? 7 : 1, B = Math.ceil(n / step);
  const m = S.dailyMetric, f = { nmv: o => (o.cx ? 0 : o.v), gmv: o => o.v, units: o => (o.cx ? 0 : o.q), orders: o => (o.cx ? 0 : 1) }[m];
  const bars = Array(B).fill(0), units = Array(B).fill(0), cost = Array(B).fill(0), prev = Array(B).fill(0), labels = [];
  for (let i = 0; i < B; i++) labels.push(dm(C.a + i * step));
  C.os.forEach(o => { const i = Math.floor((o.day - C.a) / step); bars[i] += f(o); if (!o.cx) units[i] += o.q; });
  C.ads.forEach(r => { cost[Math.floor((r.day - C.a) / step)] += r.cost; });
  if (P && P.days === C.days) P.os.forEach(o => { const i = Math.floor((o.day - P.a) / step); if (i >= 0 && i < B) prev[i] += f(o); });
  const money = m === 'nmv' || m === 'gmv';
  barChart($('#dailyChart'), { labels, bars, line: money ? cost : null, line2: P && P.days === C.days ? prev : null, fmt: money ? short : full, fmtLine: short, lineColor: 'var(--c-ads)',
    tipFn: i => `<b>${weekly ? 'Tuần từ ' : ''}${dmy(C.a + i * step)}</b>${{ nmv: 'NMV', gmv: 'GMV', units: 'Sản phẩm', orders: 'Đơn' }[m]}: ${money ? full(bars[i]) + ' ₫' : full(bars[i])}<br>Sản phẩm: ${units[i]}${cost[i] ? '<br>Chi phí Ads: ' + full(cost[i]) + ' ₫' : ''}${P && P.days === C.days ? '<br><span class="muted">Kỳ so sánh: ' + (money ? short(prev[i]) + ' ₫' : full(prev[i])) + '</span>' : ''}` });
  $('#dailyLegend').innerHTML = `<span><i style="background:var(--c-brand)"></i>${{ nmv: 'NMV', gmv: 'GMV', units: 'Sản phẩm', orders: 'Đơn' }[m]}</span>` + (money ? '<span><i style="background:var(--c-ads)"></i>Chi phí Ads (trục phải)</span>' : '') + (P && P.days === C.days ? '<span><i style="background:var(--c-blue)"></i>Kỳ so sánh</span>' : '');
}
function renderMonthly() {
  const all = ORDERS.filter(o => (!S.sku || o.sku === S.sku) && (!S.region || o.region === S.region) && (!S.carrier || o.car === S.carrier) && (S.hour === null || o.hour === S.hour));
  if (!all.length) { $('#monthlyChart').innerHTML = '<p class="empty-note">Chưa có dữ liệu.</p>'; return; }
  const m0 = monthKey(Math.min(...all.map(o => o.day))), m1 = monthKey(todayKey()), mk = [];
  for (let k = m0; k <= m1; k++) mk.push(k);
  const m = S.monthlyMetric, f = { nmv: o => (o.cx ? 0 : o.v), gmv: o => o.v, units: o => (o.cx ? 0 : o.q) }[m];
  const bars = mk.map(k => all.filter(o => monthKey(o.day) === k).reduce((s, o) => s + f(o), 0));
  const cost = mk.map(k => ADS.filter(r => monthKey(r.day) === k).reduce((s, r) => s + r.cost, 0));
  const money = m !== 'units';
  barChart($('#monthlyChart'), { labels: mk.map(monthLabel), bars, line: money ? cost : null, fmt: money ? short : full, fmtLine: short, height: 240, everyLabel: 1,
    tipFn: i => `<b>${monthLabel(mk[i])}</b>${{ nmv: 'NMV', gmv: 'GMV', units: 'Sản phẩm' }[m]}: ${money ? full(bars[i]) + ' ₫' : full(bars[i])}${cost[i] ? '<br>Chi phí Ads: ' + full(cost[i]) + ' ₫' : ''}<br><span class="muted">Bấm để xem tháng này</span>`,
    onClick: i => setRange(monthStart(mk[i]), Math.min(monthEnd(mk[i]), Math.max(todayKey(), monthEnd(mk[i]))), 'm' + mk[i]) });
}
function renderWeekday() {
  const order = [1, 2, 3, 4, 5, 6, 0], v = order.map(d => C.ok.filter(o => o.wd === d).reduce((s, o) => s + o.v, 0)), u = order.map(d => C.ok.filter(o => o.wd === d).reduce((s, o) => s + o.q, 0));
  barChart($('#weekdayChart'), { labels: order.map(d => WEEKDAYS[d]), bars: v, height: 240, everyLabel: 1, tipFn: i => `<b>${WEEKDAYS[order[i]]}</b>NMV ${full(v[i])} ₫<br>${u[i]} sản phẩm` });
}

function renderSku() {
  const rows = groupSum(C.ok, o => o.sku || '—', o => o.v);
  if (!rows.length) { $('#skuTable').innerHTML = '<p class="empty-note">Chưa có đơn trong khoảng này.</p>'; return; }
  $('#skuTable').innerHTML = `<div class="tbl-scroll"><table><thead><tr><th>Phân loại</th><th class="r">SP</th><th class="r">NMV</th><th class="r">Giá TB</th><th class="r">% NMV</th><th class="r">So kỳ trước</th></tr></thead><tbody>` +
    rows.map(([sku, v]) => { const os = C.ok.filter(o => o.sku === sku), q = os.reduce((s, o) => s + o.q, 0), info = LIST[sku] || {}; const pv = P ? P.ok.filter(o => o.sku === sku).reduce((s, o) => s + o.v, 0) : null; const d = P ? delta(v, pv) : null;
      return `<tr><td><b>${esc(sku)}</b> <span class="muted">${esc(info.model || os[0]?.m || '')}</span></td><td class="r">${q}</td><td class="r">${short(v)} ₫</td><td class="r">${short(v / q)} ₫</td><td class="r">${pct(v / C.nmv)}</td><td class="r ${d ? d.c : ''}">${d ? d.t : '–'}</td></tr>`; }).join('') + '</tbody></table></div>';
}
function renderStock() {
  if (!PRODUCTS.length) { $('#stockTable').innerHTML = '<p class="empty-note">Chưa có dữ liệu tồn kho.</p>'; return; }
  const t = todayKey(), last30 = ORDERS.filter(o => !o.cx && o.day > t - 30);
  $('#stockNote').textContent = 'Tốc độ bán tính trên 30 ngày gần nhất';
  $('#stockTable').innerHTML = `<div class="tbl-scroll"><table><thead><tr><th>Phân loại</th><th class="r">Giá niêm yết</th><th class="r">Giá KM</th><th class="r">Tồn</th><th class="r">Bán/ngày</th><th class="r">Đủ bán</th></tr></thead><tbody>` +
    PRODUCTS.map(p => { const sold = last30.filter(o => o.sku === p[4]).reduce((s, o) => s + o.q, 0) / 30; const cover = sold ? p[7] / sold : null;
      const st = p[7] === 0 ? '<span class="status cx">Hết hàng</span>' : cover != null ? (cover < 14 ? `<span class="status wait">${Math.round(cover)} ngày</span>` : `<span class="status ok">${Math.round(cover)} ngày</span>`) : '<span class="muted">Chưa bán</span>';
      return `<tr><td><b>${esc(p[4])}</b> <span class="muted">${esc(p[3])}</span></td><td class="r">${short(p[5])} ₫</td><td class="r">${p[6] ? short(p[6]) + ' ₫' : '–'}</td><td class="r">${p[7] ?? '–'}</td><td class="r">${sold ? num2(sold) : '0'}</td><td class="r">${st}</td></tr>`; }).join('') + '</tbody></table></div>';
}
function renderPrice() {
  const by = new Map(); C.ok.forEach(o => { const x = by.get(o.p) || { p: o.p, q: 0, n: 0, v: 0, net: 0, fee: 0, sh: 0, sku: o.sku }; x.q += o.q; x.n++; x.v += o.v; x.net += o.prodNet; x.fee += o.fee; x.sh += o.sh; by.set(o.p, x); });
  const rows = [...by.values()].sort((a, b) => a.p - b.p);
  if (!rows.length) { $('#priceChart').innerHTML = '<p class="empty-note">Chưa có đơn trong khoảng này.</p>'; $('#priceTable').innerHTML = ''; return; }
  const top = rows.reduce((m, r) => (r.q > m.q ? r : m), rows[0]);
  barChart($('#priceChart'), { labels: rows.map(r => full(r.p)), bars: rows.map(r => r.q), line: rows.map(r => r.net / r.q), fmt: v => full(v), fmtLine: short, lineColor: 'var(--c-blue)', height: 240, everyLabel: 1,
    tipFn: i => { const r = rows[i]; return `<b>Giá bán ${full(r.p)} ₫</b>${r.q} sản phẩm · ${r.n} đơn<br>Thực thu TB: ${full(r.net / r.q)} ₫/sp (${pct(r.net / r.v)})<br>Phí sàn TB: ${full(r.fee / r.q)} ₫ · Voucher shop TB: ${full(r.sh / r.q)} ₫`; } });
  const tq = C.units || 1;
  $('#priceTable').innerHTML = `<table><thead><tr><th>Giá bán</th><th class="r">Sản phẩm</th><th class="r">Thực thu/sp</th><th class="r">% giữ lại</th><th class="r">% sản phẩm</th><th class="r">Đơn</th><th class="r">Voucher shop/sp</th><th class="r">Phí sàn/sp</th><th class="r">Giảm so niêm yết</th></tr></thead><tbody>` +
    rows.map(r => { const lp = (LIST[r.sku] || {}).list; return `<tr${r === top ? ' style="font-weight:600"' : ''}><td>${full(r.p)} ₫${r === top ? ' <span class="pill free">mua nhiều nhất</span>' : ''}</td><td class="r">${r.q}</td><td class="r"><b>${full(r.net / r.q)} ₫</b></td><td class="r">${pct(r.net / r.v)}</td><td class="r">${pct(r.q / tq, 0)}</td><td class="r">${r.n}</td><td class="r">${full(r.sh / r.q)}</td><td class="r">${full(r.fee / r.q)}</td><td class="r">${lp && lp > r.p ? pct(1 - r.p / lp, 0) : '–'}</td></tr>`; }).join('') +
    `<tr class="total"><td><b>Tổng / bình quân</b></td><td class="r"><b>${C.units}</b></td><td class="r"><b>${full(C.prodNet / tq)} ₫</b></td><td class="r">${pct(C.prodNet / C.nmv)}</td><td class="r">100%</td><td class="r">${C.orders}</td><td class="r">${full(C.sh / tq)}</td><td class="r">${full(C.fee / tq)}</td><td></td></tr></tbody></table>`;
}

function renderRegion() {
  const regs = ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Khác'], vals = regs.map(r => C.ok.filter(o => o.region === r).reduce((s, o) => s + o.v, 0));
  const parts = regs.map((r, i) => ({ l: r, v: vals[i], c: `var(${REGION_COLORS[r]})` })).filter(p => p.v || p.l !== 'Khác');
  donut($('#regionDonut'), parts, short(C.nmv), 'NMV');
  $('#regionTable').innerHTML = `<table><thead><tr><th>Miền</th><th class="r">Đơn</th><th class="r">NMV</th><th class="r">%</th></tr></thead><tbody>` +
    parts.map(p => `<tr style="cursor:pointer" data-region="${p.l}"><td><span class="legend"><span><i style="background:${p.c}"></i>${p.l}</span></span></td><td class="r">${C.ok.filter(o => o.region === p.l).length}</td><td class="r">${short(p.v)} ₫</td><td class="r">${pct(p.v / (C.nmv || 1))}</td></tr>`).join('') + '</tbody></table>';
  $$('#regionTable tr[data-region]').forEach(tr => tr.addEventListener('click', () => { S.region = S.region === tr.dataset.region ? '' : tr.dataset.region; S.page = 0; render(); }));
}
function renderProv() {
  hbars($('#provBars'), groupSum(C.ok, o => o.prov || 'Khác', o => o.v).slice(0, 8).map(([k, v]) => ({ l: k, v, extra: C.ok.filter(o => o.prov === k).length + ' đơn', c: `var(${REGION_COLORS[regionOf(k)]})` })), 'var(--c-brand)', v => short(v) + ' ₫');
}
function renderCarrier() {
  const cols = ['--c-brand', '--c-blue', '--c-ads', '--c-teal', '--c-indigo', '--label-3'];
  const rows = groupSum(C.ok, o => o.car || '—', o => o.v), parts = rows.map(([k, v], i) => ({ l: CARRIER_NAMES[k] || k, k, v, c: `var(${cols[i % cols.length]})` }));
  donut($('#carrierDonut'), parts, String(C.orders), 'đơn');
  $('#carrierTable').innerHTML = parts.length ? `<table><thead><tr><th>Đơn vị</th><th class="r">Đơn</th><th class="r">NMV</th><th class="r">%</th></tr></thead><tbody>` +
    parts.map(p => `<tr style="cursor:pointer" data-car="${esc(p.k)}"><td><span class="legend"><span><i style="background:${p.c}"></i>${esc(p.l)}</span></span></td><td class="r">${C.ok.filter(o => (o.car || '—') === p.k).length}</td><td class="r">${short(p.v)} ₫</td><td class="r">${pct(p.v / (C.nmv || 1))}</td></tr>`).join('') + '</tbody></table>' : '<p class="empty-note">Chưa có đơn.</p>';
  $$('#carrierTable tr[data-car]').forEach(tr => tr.addEventListener('click', () => { S.carrier = S.carrier === tr.dataset.car ? '' : tr.dataset.car; S.page = 0; render(); }));
}
function renderHour() {
  const os = filterOrders(S.from, S.to, { ignoreHour: true }).filter(o => !o.cx);
  const v = Array(24).fill(0), q = Array(24).fill(0); os.forEach(o => { v[o.hour] += o.v; q[o.hour] += o.q; });
  barChart($('#hourChart'), { labels: v.map((_, i) => i + 'h'), bars: v, height: 220, everyLabel: 3, active: S.hour,
    tipFn: i => `<b>${i}h – ${i + 1}h</b>NMV ${full(v[i])} ₫<br>${q[i]} sản phẩm<br><span class="muted">${S.hour === i ? 'Bấm để bỏ lọc' : 'Bấm để lọc theo giờ này'}</span>`,
    onClick: i => { S.hour = S.hour === i ? null : i; S.page = 0; untip(); render(); } });
  const top = v.map((x, i) => [i, x]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $('#hourNote').textContent = top.length ? 'Khung giờ mạnh nhất: ' + top.map(([h, x]) => `${h}h (${short(x)} ₫)`).join(', ') + '.' : 'Chưa có đơn trong khoảng này.';
  $('#clearHour').hidden = S.hour === null;
}

function renderAds() {
  const A = C.A, PA = P ? P.A : null;
  const filtered = S.sku || S.region || S.carrier || S.hour !== null;
  $('#adsSub').textContent = 'Dịch vụ Hiển thị Sản phẩm · đơn tính "gián tiếp" theo Shopee' + (filtered ? ' · Ads không tách được theo bộ lọc SKU, khu vực, giờ' : '');
  const roas = A.cost ? A.gmv / A.cost : NaN, proas = PA && PA.cost ? PA.gmv / PA.cost : NaN;
  const t = (l, v, d) => `<div class="tile"><span class="tile-l">${l}</span><span class="tile-v">${v}</span>${badge(d)}</div>`;
  renderWallet();
  const D = (c, p, inv) => PA ? delta(c, p, inv) : null;
  $('#adsTiles').innerHTML = t('Ads LF nạp tiền', full(C.adsPaid) + ' ₫', P ? delta(C.adsPaid, P.adsPaid, 1) : null) + t('Ads Shopee tặng', full(C.adsFree) + ' ₫', P ? delta(C.adsFree, P.adsFree) : null) + t('Tổng chi phí Ads chạy', short(A.cost) + ' ₫', D(A.cost, PA?.cost, 1)) + t('Doanh số từ Ads', short(A.gmv) + ' ₫', D(A.gmv, PA?.gmv)) + t('ROAS', num2(roas), PA ? delta(roas, proas) : null) +
    t('ACOS', pct(A.cost / A.gmv), PA ? ptDelta(A.cost / A.gmv, PA.cost / PA.gmv, 1) : null) + t('% Ads / NMV', pct(A.cost / C.nmv), P ? ptDelta(A.cost / C.nmv, PA.cost / P.nmv, 1) : null) +
    t('Lượt xem', full(A.imp), D(A.imp, PA?.imp)) + t('Lượt click', full(A.clk), D(A.clk, PA?.clk)) + t('CTR', pct(A.clk / A.imp, 2), PA ? ptDelta(A.clk / A.imp, PA.clk / PA.imp) : null) +
    t('CPC', A.clk ? full(A.cost / A.clk) + ' ₫' : '–', PA ? delta(A.cost / A.clk, PA.cost / PA.clk, 1) : null) + t('Tỉ lệ chuyển đổi', pct(A.ord / A.clk, 2), PA ? ptDelta(A.ord / A.clk, PA.ord / PA.clk) : null);
  // funnel
  if (!A.imp && !A.cost) { $('#funnel').innerHTML = '<p class="empty-note">Không có hoạt động quảng cáo trong khoảng này.</p>'; }
  else {
    const st = [['Lượt xem', A.imp, '--c-teal'], ['Lượt click', A.clk, '--c-blue'], ['Thêm vào giỏ', A.atc, '--c-indigo'], ['Đơn hàng', A.ord, '--c-ads'], ['Sản phẩm bán', A.units || A.ord, '--c-brand']];
    const mx = Math.max(A.imp, 1);
    $('#funnel').innerHTML = '<div class="funnel">' + st.map(([l, v, c], i) => `<div class="fn"><span class="fn-l">${l}</span><div class="fn-bar" style="--c:var(${c})" data-w="${Math.max(1.5, Math.sqrt(v / mx) * 100).toFixed(1)}"></div><span class="fn-v">${full(v)}</span>${i ? `<span class="fn-r">${pct(v / Math.max(st[i - 1][1], 1), 2)} từ bước trước</span>` : ''}</div>`).join('') + '</div><p class="muted sm" style="margin:10px 0 0">Thanh vẽ theo căn bậc hai để các bước nhỏ vẫn nhìn thấy được.</p>';
    requestAnimationFrame(() => $$('#funnel .fn-bar').forEach(b => { b.style.width = b.dataset.w + '%'; }));
  }
  // chart
  const labels = [], cost = [], gmv = [];
  for (let k = C.a; k <= C.b; k++) { labels.push(dm(k)); const r = ADS.find(x => x.day === k); cost.push(r ? r.cost : 0); gmv.push(r ? r.gmv : 0); }
  barChart($('#adsChart'), { labels, bars: cost, line: gmv, color: 'var(--c-ads)', lineColor: 'var(--c-brand)', fmt: short, fmtLine: short, height: 230,
    tipFn: i => { const r = ADS.find(x => x.day === C.a + i); return `<b>${dmy(C.a + i)}</b>` + (r ? `Chi phí ${full(r.cost)} ₫<br>Doanh số ${full(r.gmv)} ₫<br>ROAS ${num2(r.cost ? r.gmv / r.cost : NaN)} · ${r.clk} click` : 'Không chạy Ads'); } });
  // table
  const rows = C.ads.filter(r => r.imp || r.cost).slice().reverse();
  $('#adsTable').innerHTML = rows.length ? `<table><thead><tr><th>Ngày</th><th class="r">Xem</th><th class="r">Click</th><th class="r">CTR</th><th class="r">Thêm giỏ</th><th class="r">Đơn</th><th class="r">Chi phí</th><th class="r">Doanh số</th><th class="r">ROAS</th><th class="r">CPC</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${dmy(r.day)}</td><td class="r">${full(r.imp)}</td><td class="r">${full(r.clk)}</td><td class="r">${pct(r.clk / r.imp, 2)}</td><td class="r">${full(r.atc)}</td><td class="r">${full(r.ord)}</td><td class="r">${full(r.cost)} ₫</td><td class="r">${full(r.gmv)} ₫</td><td class="r">${r.cost ? num2(r.gmv / r.cost) : '–'}</td><td class="r">${r.clk ? full(r.cost / r.clk) + ' ₫' : '–'}</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Không có ngày nào chạy Ads trong khoảng này.</p>';
}

function renderWallet() {
  const C2 = C, A = C2.A, tot = (C2.adsFree + C2.adsPaid) || 1;
  const kindLbl = { free: 'Shopee tặng', paid: 'LF nạp tiền', spend: 'Khấu trừ chạy Ads' }, fromLbl = { seller_mission_free_credit: 'Nhiệm vụ người bán' };
  $('#walletCard').innerHTML = `<div class="card-h"><h3>Nguồn tiền chạy Ads</h3><span class="muted sm">Khoảng đang chọn</span></div>
    <div class="wallet"><div><b>${full(C2.adsPaid)} ₫</b><span>Ads LF nạp tiền · tính vào chi phí</span></div><div><b>${full(C2.adsFree)} ₫</b><span>Ads Shopee tặng · không tốn tiền</span></div></div>
    <div class="split" title="Tỷ lệ nguồn tiền"><i style="width:${(C2.adsPaid / tot * 100).toFixed(1)}%;background:var(--c-blue)"></i><i style="width:${(C2.adsFree / tot * 100).toFixed(1)}%;background:var(--c-good)"></i></div>
    <div class="legend" style="margin:0 0 12px"><span><i style="background:var(--c-blue)"></i>LF nạp ${pct(C2.adsPaid / tot, 0)}</span><span><i style="background:var(--c-good)"></i>Shopee tặng ${pct(C2.adsFree / tot, 0)}</span></div>
    <div class="rows">
      <div class="row"><span class="k">Tổng LF đã nạp (toàn thời gian)</span><span class="v">${full(WALLET.paidIn)} ₫</span><span></span></div>
      <div class="row"><span class="k">Tổng Shopee đã tặng</span><span class="v">${full(WALLET.freeIn)} ₫</span><span></span></div>
      <div class="row"><span class="k">Đã dùng: tiền nạp / tiền tặng</span><span class="v">${full(WALLET.paidUsed)} / ${full(WALLET.freeUsed)} ₫</span><span></span></div>
      <div class="row"><span class="k">Số dư ước tính: nạp / tặng</span><span class="v">${full(Math.max(0, WALLET.paidBal || 0))} / ${full(Math.max(0, WALLET.freeBal || 0))} ₫</span><span></span></div>
    </div>${WALLET.hasLedger ? '' : '<p class="note">Chưa có sổ giao dịch Ads nên toàn bộ chi phí Ads đang được tính là tiền LF nạp.</p>'}`;
  const rows = LEDGER.filter(e => e.day >= S.from && e.day <= S.to).slice().reverse();
  $('#ledgerTable').innerHTML = rows.length ? `<table><thead><tr><th>Ngày</th><th>Loại</th><th>Nguồn</th><th class="r">Số tiền</th></tr></thead><tbody>` +
    rows.map(e => `<tr><td>${dmy(e.day)}</td><td><span class="pill ${e.kind}">${kindLbl[e.kind] || esc(e.kind)}</span></td><td class="muted">${esc(e.kind === 'spend' ? 'Dịch vụ Hiển thị Sản phẩm' : (fromLbl[e.from] || e.from || '—'))}</td><td class="r">${e.kind === 'spend' ? '−' : '+'}${full(e.amt)} ₫</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Không có giao dịch Ads trong khoảng này.</p>';
}

const PAGE = 20;
function orderRows() {
  const q = S.q.trim().toLowerCase();
  let rows = C.os.filter(o => (!S.status || o.cls === S.status) && (!q || (o.sn + ' ' + o.prov + ' ' + o.sku + ' ' + o.m + ' ' + o.s).toLowerCase().includes(q)));
  const key = { t: o => o.t, v: o => o.v, q: o => o.q, fee: o => o.fee, inc: o => o.income, net: o => o.prodNet, prov: o => o.prov }[S.sort] || (o => o.t);
  return rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * S.dir; });
}
function renderOrders() {
  const rows = orderRows(), pages = Math.max(1, Math.ceil(rows.length / PAGE)); S.page = Math.min(S.page, pages - 1);
  $('#ordersSub').textContent = `${C.totalN} đơn trong khoảng · ${C.orders} hợp lệ · ${C.cxN} hủy`;
  const th = (k, l, r) => `<th class="sortable ${r ? 'r' : ''}" data-sort="${k}">${l}${S.sort === k ? (S.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
  const fmtT = t => { const d = new Date((t + TZ) * 1000); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  $('#ordersTable').innerHTML = rows.length ? `<table><thead><tr><th>Mã đơn</th>${th('t', 'Ngày đặt')}<th>Trạng thái</th>${th('prov', 'Tỉnh/thành')}<th>Phân loại</th>${th('q', 'SL', 1)}${th('v', 'NMV', 1)}<th class="r">Voucher shop</th>${th('fee', 'Phí sàn', 1)}${th('net', 'Thực thu SP', 1)}${th('inc', 'Shopee chuyển', 1)}<th>ĐVVC</th></tr></thead><tbody>` +
    rows.slice(S.page * PAGE, S.page * PAGE + PAGE).map(o => `<tr><td class="sn">${esc(o.sn)}</td><td>${fmtT(o.t)}</td><td><span class="status ${o.cls}">${esc(o.s || '—')}</span></td><td>${esc(o.prov)}</td><td>${esc(o.sku)} <span class="muted">${esc(o.m)}</span></td><td class="r">${o.q}</td><td class="r">${o.cx ? '<s class="muted">' + full(o.v) + '</s>' : full(o.v)}</td><td class="r">${o.cx || !o.sh ? '–' : full(o.sh)}</td><td class="r">${o.cx ? '–' : full(o.fee)}</td><td class="r">${o.cx ? '–' : full(o.prodNet)}</td><td class="r">${o.cx ? '–' : full(o.income)}${!o.cx && o.shipNet > 0 ? '<br><span class="muted sm">gồm ship khách trả ' + short(o.shipNet) + '</span>' : ''}</td><td>${esc(o.car || '—')}</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Không có đơn khớp bộ lọc.</p>';
  $$('#ordersTable th[data-sort]').forEach(h => h.addEventListener('click', () => { const k = h.dataset.sort; S.dir = S.sort === k ? -S.dir : -1; S.sort = k; renderOrders(); }));
  $('#pager').innerHTML = rows.length > PAGE ? `<span>${S.page * PAGE + 1}–${Math.min(rows.length, (S.page + 1) * PAGE)} / ${rows.length} đơn</span><div><button class="btn-ghost sm" data-pg="-1" ${S.page ? '' : 'disabled'}>Trước</button><button class="btn-ghost sm" data-pg="1" ${S.page < pages - 1 ? '' : 'disabled'}>Sau</button></div>` : `<span>${rows.length} đơn</span>`;
  $$('#pager [data-pg]').forEach(b => b.addEventListener('click', () => { S.page += +b.dataset.pg; renderOrders(); }));
}

/* ---------------- controls ---------------- */
function syncControls() {
  $('#dFrom').value = keyToISO(S.from); $('#dTo').value = keyToISO(S.to);
  $$('#presets button').forEach(b => b.classList.toggle('on', b.dataset.p === S.preset));
  $('#monthSel').value = S.preset.startsWith('m') && S.preset.length > 2 ? S.preset.slice(1) : '';
  $('#cmpSel').value = S.cmp; $('#skuSel').value = S.sku; $('#regionSel').value = S.region; $('#carrierSel').value = S.carrier;
}
function setRange(a, b, preset) {
  if (a > b) [a, b] = [b, a];
  S.from = a; S.to = b; S.preset = preset || 'custom'; S.page = 0;
  store.set('lf-range', JSON.stringify({ a, b, p: S.preset })); render();
}
function buildSelectors() {
  const [a] = dataBounds(); const m0 = monthKey(a), m1 = monthKey(todayKey());
  let html = '<option value="">Chọn tháng…</option>'; for (let k = m1; k >= m0; k--) html += `<option value="${k}">${monthLabel(k)}</option>`;
  $('#monthSel').innerHTML = html;
  const skus = [...new Set(PRODUCTS.map(p => p[4]).concat(ORDERS.map(o => o.sku)).filter(Boolean))];
  $('#skuSel').innerHTML = '<option value="">Tất cả phân loại</option>' + skus.map(s => `<option value="${esc(s)}">${esc(s)} · ${esc((LIST[s] || {}).model || '')}</option>`).join('');
  const cars = [...new Set(ORDERS.map(o => o.car).filter(Boolean))];
  $('#carrierSel').innerHTML = '<option value="">Tất cả</option>' + cars.map(c => `<option value="${esc(c)}">${esc(CARRIER_NAMES[c] || c)}</option>`).join('');
}
function bind() {
  $('#presets').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const [a, c] = presetRange(b.dataset.p); setRange(a, c, b.dataset.p); closeSheet(); });
  const onDate = () => { const a = isoToKey($('#dFrom').value), b = isoToKey($('#dTo').value); if (isFinite(a) && isFinite(b)) setRange(a, b, 'custom'); };
  $('#dFrom').addEventListener('change', onDate); $('#dTo').addEventListener('change', onDate);
  $('#monthSel').addEventListener('change', e => { if (!e.target.value) return; const k = +e.target.value; setRange(monthStart(k), monthEnd(k), 'm' + k); });
  $('#cmpSel').addEventListener('change', e => { S.cmp = e.target.value; store.set('lf-cmp', S.cmp); render(); });
  $('#skuSel').addEventListener('change', e => { S.sku = e.target.value; S.page = 0; render(); });
  $('#regionSel').addEventListener('change', e => { S.region = e.target.value; S.page = 0; render(); });
  $('#carrierSel').addEventListener('change', e => { S.carrier = e.target.value; S.page = 0; render(); });
  $('#resetFilters').addEventListener('click', () => { Object.assign(S, { sku: '', region: '', carrier: '', hour: null, q: '', status: '', page: 0 }); $('#orderSearch').value = ''; $$('#statusSeg button').forEach(b => b.classList.toggle('on', !b.dataset.s)); render(); });
  $('#clearHour').addEventListener('click', () => { S.hour = null; render(); });
  $('#dailyMetric').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.dailyMetric = b.dataset.m; $$('#dailyMetric button').forEach(x => x.classList.toggle('on', x === b)); renderDaily(); });
  $('#monthlyMetric').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.monthlyMetric = b.dataset.m; $$('#monthlyMetric button').forEach(x => x.classList.toggle('on', x === b)); renderMonthly(); });
  $('#statusSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.status = b.dataset.s; S.page = 0; $$('#statusSeg button').forEach(x => x.classList.toggle('on', x === b)); renderOrders(); });
  let qt; $('#orderSearch').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; S.page = 0; renderOrders(); }, 150); });
  $('#exportBtn').addEventListener('click', exportCSV);
  $('#themeBtn').addEventListener('click', () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; store.set('lf-theme', r.dataset.theme); render(); });
  $('#logoutBtn').addEventListener('click', () => { store.del('lf-key'); location.reload(); });
  $('#openFilters').addEventListener('click', openSheet); $('#tabFilters').addEventListener('click', openSheet); $('#closeFilters').addEventListener('click', closeSheet); $('#scrim').addEventListener('click', closeSheet);
  // scroll spy + toolbar
  const secs = ['overview', 'sales', 'products', 'customers', 'ads', 'orders'], names = { overview: 'Tổng quan', sales: 'Doanh số', products: 'Sản phẩm', customers: 'Khu vực & giờ', ads: 'Shopee Ads', orders: 'Đơn hàng' };
  const onScroll = () => {
    $('#toolbar').classList.toggle('scrolled', scrollY > 60);
    let cur = 'overview'; secs.forEach(id => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) cur = id; });
    $('#tbTitle').textContent = names[cur];
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === cur));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true }); onScroll();
  let rw = innerWidth, rt; addEventListener('resize', () => { if (Math.abs(innerWidth - rw) < 20) return; rw = innerWidth; clearTimeout(rt); rt = setTimeout(() => { renderDaily(); renderMonthly(); renderWeekday(); renderHour(); renderAds(); }, 150); });
  $$('.side-nav a').forEach(a => a.addEventListener('click', closeSheet));
}
function openSheet() { $('#sidebar').classList.add('open'); $('#scrim').hidden = false; }
function closeSheet() { $('#sidebar').classList.remove('open'); $('#scrim').hidden = true; }
function exportCSV() {
  const rows = orderRows(), head = ['Mã đơn', 'Ngày đặt', 'Trạng thái', 'Tỉnh/thành', 'Miền', 'SKU', 'Phân loại', 'SL', 'Giá bán', 'NMV', 'Khách trả', 'Phí cố định', 'Phí dịch vụ', 'Phí xử lý GD', 'PiShip', 'Voucher shop', 'Voucher Shopee', 'Thực thu sản phẩm', 'Shopee chuyển (ước tính)', 'ĐVVC'];
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = rows.map(o => [o.sn, new Date((o.t + TZ) * 1000).toISOString().slice(0, 16).replace('T', ' '), o.s, o.prov, o.region, o.sku, o.m, o.q, o.p, o.cx ? 0 : o.v, o.paid, o.fx, o.sv, o.tx, o.pi, o.sh, o.pv, o.cx ? 0 : o.prodNet, o.cx ? 0 : o.income, o.car].map(q).join(','));
  const blob = new Blob(['﻿' + [head.map(q).join(',')].concat(lines).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `living-furniture-shopee_${keyToISO(S.from)}_${keyToISO(S.to)}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------------- boot ---------------- */
function start(d) {
  prepare(d);
  const at = d.meta && d.meta.at ? new Date((d.meta.at + TZ) * 1000) : null;
  $('#syncInfo').textContent = at ? `Đồng bộ lúc ${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')} ${String(at.getUTCDate()).padStart(2, '0')}/${String(at.getUTCMonth() + 1).padStart(2, '0')}/${at.getUTCFullYear()}` : '—';
  S.cmp = store.get('lf-cmp') || 'prev';
  buildSelectors(); bind();
  let saved = null; try { saved = JSON.parse(store.get('lf-range') || 'null'); } catch (e) {}
  if (saved && saved.p && !['custom'].includes(saved.p) && !saved.p.startsWith('m')) { const [a, b] = presetRange(saved.p); S.from = a; S.to = b; S.preset = saved.p; }
  else if (saved) { S.from = saved.a; S.to = saved.b; S.preset = saved.p; }
  else { const [a, b] = presetRange('30'); S.from = a; S.to = b; S.preset = '30'; }
  $('#login').hidden = true; $('#app').hidden = false; document.body.classList.add('fade-in');
  render();
}
async function tryAuto() {
  const saved = store.get('lf-key') || store.get('lf-key', true);
  if (!saved) return false;
  try { const file = await fetchEnc(); const d = await decryptWith(b64d(saved), file); start(d); return true; } catch (e) { store.del('lf-key'); return false; }
}
function loginUI() {
  $('#pwToggle').addEventListener('click', () => { const i = $('#password'); i.type = i.type === 'password' ? 'text' : 'password'; $('#pwToggle').textContent = i.type === 'password' ? 'Hiện' : 'Ẩn'; });
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#loginErr'), btn = $('#loginBtn'); err.hidden = true;
    const email = $('#email').value, pass = $('#password').value;
    if (!email || !pass) { err.textContent = 'Nhập email và mật khẩu.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Đang mở dữ liệu…';
    try {
      const file = await fetchEnc(); const raw = await deriveRaw(email, pass, b64d(file.salt), file.iter || 250000);
      let d; try { d = await decryptWith(raw, file); } catch (x) { throw new Error('Email hoặc mật khẩu không đúng.'); }
      if ($('#remember').checked) store.set('lf-key', b64e(raw)); else store.set('lf-key', b64e(raw), true);
      start(d);
    } catch (x) { err.textContent = x.message || 'Không mở được dữ liệu.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  });
}
const th = store.get('lf-theme'); if (th) document.documentElement.dataset.theme = th;
loginUI();
tryAuto();
})();
