/* Living Furniture · Shopee Performance dashboard */
(() => {
'use strict';

/* ================= helpers ================= */
const TZ = 7 * 3600, DAY = 86400;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const nf = new Intl.NumberFormat('vi-VN');
const full = v => nf.format(Math.round(v || 0));
const money = v => full(v) + ' ₫';
const short = v => {
  const a = Math.abs(v || 0);
  if (a >= 1e9) return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
  if (a >= 1e6) return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: a >= 1e8 ? 0 : 2 }) + ' tr';
  if (a >= 1e3) return (v / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: a >= 1e4 ? (a % 1e3 >= 50 && a < 1e5 ? 1 : 0) : 1 }) + 'k';
  return full(v);
};
const pct = (v, d = 1) => (isFinite(v) ? (v * 100).toLocaleString('vi-VN', { maximumFractionDigits: d }) + '%' : '–');
const star1 = v => (isFinite(v) ? v.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–');
const num2 = v => (isFinite(v) ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '–');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayKey = t => Math.floor((t + TZ) / DAY);
const keyToDate = k => new Date(k * DAY * 1000);
const keyToISO = k => keyToDate(k).toISOString().slice(0, 10);
const isoToKey = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 1000 / DAY);
const p2 = n => String(n).padStart(2, '0');
const dmy = k => { const d = keyToDate(k); return p2(d.getUTCDate()) + '/' + p2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const dm = k => { const d = keyToDate(k); return p2(d.getUTCDate()) + '/' + p2(d.getUTCMonth() + 1); };
const tsLabel = t => { const d = new Date((t + TZ) * 1000); return p2(d.getUTCDate()) + '/' + p2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
const monthKey = k => { const d = keyToDate(k); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const monthLabel = mk => 'T' + ((mk % 12) + 1) + '/' + Math.floor(mk / 12);
const monthStart = mk => Date.UTC(Math.floor(mk / 12), mk % 12, 1) / 1000 / DAY;
const monthEnd = mk => monthStart(mk + 1) - 1;
const todayKey = () => dayKey(Date.now() / 1000);
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const store = {
  get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
  set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
};
const ICON = {
  sales: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  fee: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  health: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
  promo: '<svg viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  ads: '<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>'
};

/* ================= reference data ================= */
const REGIONS = {
  'Miền Bắc': ['hà nội', 'hải phòng', 'quảng ninh', 'bắc ninh', 'hưng yên', 'ninh bình', 'thái nguyên', 'phú thọ', 'lào cai', 'tuyên quang', 'cao bằng', 'lạng sơn', 'điện biên', 'lai châu', 'sơn la', 'hải dương', 'thái bình', 'nam định', 'hà nam', 'vĩnh phúc', 'bắc giang', 'hòa bình', 'hoà bình', 'yên bái', 'hà giang', 'bắc kạn'],
  'Miền Trung': ['thanh hóa', 'thanh hoá', 'nghệ an', 'hà tĩnh', 'quảng trị', 'huế', 'đà nẵng', 'quảng ngãi', 'gia lai', 'đắk lắk', 'đắc lắc', 'khánh hòa', 'khánh hoà', 'lâm đồng', 'quảng bình', 'quảng nam', 'bình định', 'kon tum', 'phú yên', 'ninh thuận', 'bình thuận', 'đắk nông'],
  'Miền Nam': ['hồ chí minh', 'đồng nai', 'tây ninh', 'đồng tháp', 'an giang', 'vĩnh long', 'cần thơ', 'cà mau', 'bình dương', 'bà rịa', 'vũng tàu', 'bình phước', 'long an', 'tiền giang', 'bến tre', 'trà vinh', 'sóc trăng', 'hậu giang', 'kiên giang', 'bạc liêu']
};
const regionOf = p => { const s = (p || '').toLowerCase(); for (const r in REGIONS) if (REGIONS[r].some(k => s.includes(k))) return r; return 'Khác'; };
const REGION_COLORS = { 'Miền Bắc': 'var(--c-blue)', 'Miền Trung': 'var(--c-ads)', 'Miền Nam': 'var(--c-brand)', 'Khác': 'var(--label-3)' };
const CARRIER_NAMES = { GHN: 'Giao Hàng Nhanh', SPX: 'SPX Express', VNP: 'VNPost', GHTK: 'Giao Hàng Tiết Kiệm', 'J&T': 'J&T Express', NJV: 'Ninja Van', BEST: 'BEST Express' };
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WARD_PREFIX = /^(Phường|Xã|Thị trấn|Đặc khu|Quận|Huyện|Thị xã)\s/;

/* ================= crypto ================= */
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
const SHOPS = {
  lf: { file: 'data/data.enc.json', name: 'Living Furniture', sub: 'Shopee · living_furniture', logo: 'assets/logo.png', slug: 'living-furniture' },
  nikon: { file: 'data/nikon.enc.json', name: 'Nikon Việt Nam', sub: 'Shopee · Nikon', logo: 'assets/nikon.png', slug: 'nikon' }
};
let SHOP = 'lf', KEYS = {}, BOUND = false;
async function fetchEnc(shop = 'lf') {
  const r = await fetch(SHOPS[shop].file + '?ts=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('Không tải được dữ liệu (' + r.status + ')');
  return r.json();
}

/* ================= state & data model ================= */
let ORDERS = [], ADS = [], PRODUCTS = [], LIST = {}, LEDGER = [], ADSPLIT = {}, REVIEWS = [], META = {}, PROMO = { fs: [], disc: [], vch: [], kpi: [] };
let WALLET = { paidIn: 0, freeIn: 0, paidUsed: 0, freeUsed: 0, freeBal: 0, paidBal: 0, hasLedger: false };
const S = { from: 0, to: 0, preset: '30', cmp: 'prev', sku: '', region: '', carrier: '', hour: null, prov: '',
  grain: null, monthlyMetric: 'nmv', q: '', status: '', sort: 't', dir: -1, page: 0 };

// các nhãn viết riêng cho Living Furniture (Ads "LF nạp", đơn vị "kệ") đổi sang chữ chung khi xem shop khác
function relabel() {
  const w = document.createTreeWalker($('#app'), NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.nodeValue; if (/LF nạp|kệ/.test(t)) n.nodeValue = t.replace(/LF nạp/g, 'shop nạp').replace(/\bkệ\b/g, 'sp'); }
}
/* ================= SKU chuẩn (shop nhiều sản phẩm, vd Nikon) =================
   Mỗi dòng đơn: [sku, sl, giá, item_id, model_id, cờ]. SKU hiệu lực lấy theo phân loại hiện tại trong catalog
   (item_id/model_id) để sửa các dòng chỉ mang SKU cha; tách hậu tố _COMBOX2 (bộ 2 cái), SKU ghép bằng "-" (bộ nhiều
   sản phẩm), hậu tố màu (-Green); quà tặng (giá 0 / GIFT...) để riêng. */
let CATALOG = [], MIDX = {}, LIDX = {}, MASTER = {}, MAPSTAT = { lines: 0, mapped: 0, bySku: 0, fromModel: 0, unknown: {} };
const CODE_RE = /^[A-Z]{2,5}\d{2,}[A-Z0-9]*$/;
const GROUPS = [[/máy ảnh|camera(?!.*(phụ kiện|ống kính))/i, 'Máy ảnh'], [/ống kính$|^ống kính/i, 'Ống kính'], [/ống nhòm|kính thiên văn|rangefinder|đo khoảng cách/i, 'Ống nhòm & quang học'], [/kính lọc|loa che|nắp ống kính|ngàm/i, 'Phụ kiện ống kính'], [/.*/, 'Phụ kiện & khác']];
const groupOf = cat => cat ? GROUPS.find(g => g[0].test(cat.split(' > ').slice(-1)[0]) || (g[1] === 'Máy ảnh' && /Máy ảnh >/.test(cat)))[1] : 'Phụ kiện & khác';
const LINE_RE = /\b(Z\s?\d{1,2}\s?II|Z\s?\d{1,2}|Zfc|Zf|Z\s?f|D\d{3,4}|COOLPIX\s?[A-Z]?\d+|Prostaff\s?P?\d+[a-z]?|PROSTAFF\s?\w+|Monarch\s?(?:HG|M\d|\d+)?|MONARCH\s?\w+|Aculon\s?\w+|ACULON\s?\w+|Travelite|Sportstar|Coolshot\s?\w+|Action\s?EX|Z\s?DX|NIKKOR\s?Z)/i;
function cleanTitle(t) { return String(t || '').replace(/^(Máy ảnh( kỹ thuật số| không gương lật)?|Ống kính|Ống nhòm( 2 mắt)?( cao cấp)?|Kính lọc( Filter)?|Ống Nhòm|Ống Nhóm)\s+/i, '').replace(/\s*(chính hãng|chuyên dụng).*$/i, '').split(/\s[-|–]\s/)[0].trim().slice(0, 52); }
function normalizeSkus(d) {
  CATALOG = d.catalog || []; MIDX = {}; LIDX = {}; MASTER = {}; MAPSTAT = { lines: 0, mapped: 0, bySku: 0, fromModel: 0, unknown: {} };
  CATALOG.forEach(l => { const [iid, name, psku, st, sold, cat, models] = l; LIDX[iid] = { iid, name, psku, st, sold, cat, models, group: groupOf(cat), n: models.length };
    models.forEach(m => { MIDX[m[0]] = { iid, mid: m[0], mname: m[1], sku: m[2] || (models.length === 1 ? psku : ''), price: m[3], promo: m[4], stock: m[5], sold: m[6] }; }); });
  (d.products || []).forEach(p => { if (!MIDX[p[1]]) MIDX[p[1]] = { iid: p[0], mid: p[1], mname: p[3], sku: p[4], price: p[5], promo: p[6], stock: p[7], sold: 0, name: p[2] }; });
  if (!CATALOG.length) return;
  const parse = raw => { let s = String(raw || '').trim(), mult = 1; const cm = s.match(/_COMBOX(\d+)$/i); if (cm) { mult = +cm[1]; s = s.slice(0, cm.index); }
    const tok = s.split('-'), codes = tok.filter(x => CODE_RE.test(x)), attrs = tok.filter(x => x && !CODE_RE.test(x)); return { base: codes.length > 1 ? codes.join('-') : (codes[0] || s), codes: codes.length ? codes : [s], attrs, mult }; };
  const info = (code, mid, iid) => { const m = MIDX[mid] || {}, l = LIDX[m.iid || iid] || {};
    if (!MASTER[code]) MASTER[code] = { code, names: {}, group: l.group || groupOf(l.cat), cat: l.cat || '', line: '', listings: new Set(), mids: new Set() };
    const M = MASTER[code]; const nm = (cleanTitle(l.name || m.name) + (l.n > 1 && m.mname ? ' · ' + m.mname : '')).trim(); if (nm) M.names[nm] = (M.names[nm] || 0) + 1;
    if (l.iid) M.listings.add(l.iid); if (mid) M.mids.add(mid); if (!M.line && l.group && l.group !== 'Phụ kiện & khác' && l.group !== 'Phụ kiện ống kính') { const lm = ((l.name || m.name || '') + ' ' + (m.mname || '')).match(LINE_RE); if (lm) M.line = lm[1].replace(/\s+/g, ' ').replace(/^z\s?/i, 'Z').replace(/ ?II$/i, ' II'); }
    if (l.group && M.group === 'Phụ kiện & khác') M.group = l.group; return M; };
  // gán SKU chuẩn cho mọi phân loại đang có trong catalog (để bảng SKU có cả mã chưa bán)
  Object.values(MIDX).forEach(m => { if (m.sku) info(parse(m.sku).base, m.mid, m.iid); });
  ORDERS.forEach(o => {
    const raw = o._items || []; if (!raw.length) { o.skus = o.sku ? [o.sku] : []; return; }
    o.lines = raw.map(([sku, q, p, iid, mid, fl]) => { const cm = (MIDX[mid] || {}).sku, eff = cm || sku, P = parse(eff), gift = !p || /^GIFT/i.test(eff);
      MAPSTAT.lines++; if (cm || MIDX[mid]) MAPSTAT.mapped++; else if (P.codes.every(c => CODE_RE.test(c)) || gift) MAPSTAT.bySku++; else MAPSTAT.unknown[eff] = (MAPSTAT.unknown[eff] || 0) + q; if (cm && cm !== sku) MAPSTAT.fromModel++;
      const M = info(P.base, mid, iid); return { raw: sku, eff, master: P.base, comps: P.codes, attrs: P.attrs, units: q * P.mult, q, p, v: q * p, iid, mid, gift, bundle: P.codes.length > 1 || P.mult > 1, flag: fl || '', M }; });
    const sell = o.lines.filter(l => !l.gift);
    o.skus = [...new Set(sell.map(l => l.master))]; o.sku = o.skus.join('/'); o.q = sell.reduce((s, l) => s + l.units, 0) || o.q;
    o.gifts = o.lines.filter(l => l.gift).length; o.grp = sell[0] ? sell[0].M.group : '';
  });
  Object.values(MASTER).forEach(M => { M.name = Object.entries(M.names).sort((a, b) => b[1] - a[1])[0]?.[0] || M.code; M.stock = [...M.mids].reduce((s, mid) => s + (MIDX[mid] && parse(MIDX[mid].sku).base === M.code ? +(MIDX[mid].stock || 0) : 0), 0); });
}
let SKU_GROUP = '', SKU_Q = '';
function renderSkus() {
  const on = CATALOG.length > 0 && SHOP !== 'lf'; $('#skuSection').hidden = !on; if (!on) return;
  const lines = C.ok.flatMap(o => (o.lines || []).map(l => ({ ...l, o })));
  const sell = lines.filter(l => !l.gift), nmv = sum(sell, l => l.v) || 1;
  const by = new Map(); sell.forEach(l => { const k = l.master; if (!by.has(k)) by.set(k, { M: l.M, q: 0, v: 0, n: new Set(), lst: {}, prices: [] }); const x = by.get(k); x.q += l.units; x.v += l.v; x.n.add(l.o.sn); x.lst[l.iid] = (x.lst[l.iid] || 0) + l.units; x.prices.push(l.p / (l.units / l.q)); });
  const grp = {}; by.forEach(x => { const g = x.M.group; grp[g] = grp[g] || { v: 0, q: 0, n: 0 }; grp[g].v += x.v; grp[g].q += x.q; grp[g].n++; });
  const ln = {}; by.forEach(x => { const k = x.M.line || '(khác)'; ln[k] = ln[k] || { v: 0, q: 0, skus: new Set() }; ln[k].v += x.v; ln[k].q += x.q; ln[k].skus.add(x.M.code); });
  const gifts = lines.filter(l => l.gift), bundles = sell.filter(l => l.bundle), mapRate = MAPSTAT.lines ? (MAPSTAT.mapped + MAPSTAT.bySku) / MAPSTAT.lines : 1;
  const active = CATALOG.filter(l => l[3] === 1).length;
  $('#skuTiles').innerHTML = [['SKU chuẩn đã bán', String(by.size), `${sum([...by.values()], x => x.q)} sản phẩm · ${C.orders} đơn`], ['Khớp SKU', pct(mapRate, 1), `${MAPSTAT.mapped + MAPSTAT.bySku}/${MAPSTAT.lines} dòng đơn (mọi thời gian)`, mapRate === 1 ? 'free' : 'fs'],
    ['Listing đang bán', String(active), `${CATALOG.length} listing · ${Object.keys(MIDX).length} phân loại`], ['Bộ / combo', String(bundles.length), bundles.length ? short(sum(bundles, l => l.v)) + ' ₫ NMV' : 'không có trong kỳ'], ['Quà tặng kèm', String(sum(gifts, l => l.q)), gifts.length ? 'món 0₫, không tính NMV' : 'không có trong kỳ']]
    .map(([l, v, f, k]) => `<div class="tile ${k || ''}"><span class="tile-l">${l}</span><span class="tile-v">${v}</span><span class="tile-f"><em>${f}</em></span></div>`).join('');
  barList($('#groupChart'), Object.entries(grp).sort((a, b) => b[1].v - a[1].v).map(([g, x]) => ({ key: g, l: g, v: x.v, sub: `${x.n} SKU · ${x.q} sp`, label: `${short(x.v)} ₫ <span>${pct(x.v / nmv, 0)}</span>`, c: SKU_GROUP === g ? 'var(--c-brand)' : 'var(--c-blue)' })),
    { active: SKU_GROUP, tipFn: r => `<b>${esc(r.l)}</b>` + tipRows([['NMV', money(r.v)], ['% NMV', pct(r.v / nmv)], ['Sản phẩm / SKU', r.sub]]), onClick: k => { SKU_GROUP = SKU_GROUP === k ? '' : k; renderSkus(); } });
  barList($('#lineChart'), Object.entries(ln).sort((a, b) => b[1].v - a[1].v).slice(0, 14).map(([k, x]) => ({ key: k, l: k, v: x.v, sub: `${x.skus.size} SKU · ${x.q} sp`, label: `${short(x.v)} ₫ <span>${pct(x.v / nmv, 0)}</span>`, c: 'var(--c-brand)' })),
    { tipFn: r => `<b>${esc(r.l)}</b>` + tipRows([['NMV', money(r.v)], ['% NMV', pct(r.v / nmv)], ['Sản phẩm / SKU', r.sub]]) });
  const q = SKU_Q.trim().toLowerCase();
  const rows = [...by.values()].filter(x => (!SKU_GROUP || x.M.group === SKU_GROUP) && (!q || (x.M.code + ' ' + x.M.name + ' ' + x.M.line).toLowerCase().includes(q))).sort((a, b) => b.v - a.v);
  $('#masterSub').textContent = `${rows.length} SKU chuẩn${SKU_GROUP ? ' · ' + SKU_GROUP : ''} · cộng dồn mọi listing và phân loại bán ra cùng một mã`;
  $('#masterTable').innerHTML = rows.length ? `<table><thead><tr><th>SKU chuẩn</th><th>Sản phẩm</th><th>Nhóm</th><th class="r">SL</th><th class="r">NMV</th><th class="r">% NMV</th><th class="r">Giá TB</th><th class="r">Listing bán</th><th class="r">Tồn</th></tr></thead><tbody>` +
    rows.map(x => { const nl = Object.keys(x.lst).length, lstTxt = Object.entries(x.lst).map(([iid, u]) => { const L = LIDX[iid] || {}; return `${L.n > 1 ? 'gộp ' + L.n + ' phân loại' : 'riêng'}: ${u}`; }).join(' · ');
      return `<tr data-sku="${esc(x.M.code)}"><td class="sn">${esc(x.M.code)}</td><td><span class="cell2">${esc(x.M.name)}<em>${esc(x.M.line || '')}</em></span></td><td>${esc(x.M.group)}</td><td class="r"><b>${x.q}</b></td><td class="r">${full(x.v)}</td><td class="r">${pct(x.v / nmv)}</td><td class="r">${short(x.v / x.q)}</td><td class="r" title="${esc(lstTxt)}"><span class="cell2">${nl}<em>${esc(lstTxt)}</em></span></td><td class="r">${x.M.stock ?? '–'}</td></tr>`; }).join('') + '</tbody></table>' : '<p class="empty-note">Không có SKU nào khớp bộ lọc.</p>';
  $$('#masterTable tr[data-sku]').forEach(tr => tr.addEventListener('click', () => { S.sku = S.sku === tr.dataset.sku ? '' : tr.dataset.sku; S.page = 0; $('#skuSel').value = S.sku; render(); }));
  const byL = new Map(); sell.forEach(l => { if (!byL.has(l.iid)) byL.set(l.iid, { q: 0, v: 0, skus: new Set() }); const x = byL.get(l.iid); x.q += l.units; x.v += l.v; x.skus.add(l.master); });
  const lrows = [...byL.entries()].sort((a, b) => b[1].v - a[1].v);
  $('#listingTable').innerHTML = lrows.length ? `<table><thead><tr><th>Listing</th><th class="r">Phân loại</th><th class="r">SL</th><th class="r">NMV</th></tr></thead><tbody>` +
    lrows.map(([iid, x]) => { const L = LIDX[iid] || {}; return `<tr><td><span class="cell2">${esc(cleanTitle(L.name) || iid)}<em>${L.n > 1 ? 'Listing gộp · ' : 'Listing riêng · '}${[...x.skus].map(esc).join(', ')}${L.st && L.st !== 1 ? ' · đã ẩn' : ''}</em></span></td><td class="r">${L.n || '–'}</td><td class="r">${x.q}</td><td class="r">${full(x.v)}</td></tr>`; }).join('') + '</tbody></table>' : '<p class="empty-note">Chưa có đơn.</p>';
  const unk = Object.entries(MAPSTAT.unknown);
  $('#mapSub').textContent = `Mọi thời gian: ${MAPSTAT.mapped} dòng khớp phân loại đang có trên Shopee · ${MAPSTAT.bySku} dòng khớp theo SKU ghi trên đơn (phân loại đã xóa/đổi) · ${Object.keys(MAPSTAT.unknown).length} SKU chưa nhận ra · ${MAPSTAT.fromModel} dòng được sửa từ SKU cha sang SKU phân loại`;
  const combos = [...by.values()].filter(x => x.M.code && sell.some(l => l.master === x.M.code && l.bundle));
  $('#mapCheck').innerHTML = `<div class="mrows">` +
    (unk.length ? unk.map(([k, n]) => `<div class="mr"><span class="mr-k">Chưa nhận ra: <b>${esc(k || '(trống)')}</b></span><span class="mr-v">${n} sp</span><span></span><span></span></div>`).join('') : `<div class="mr"><span class="mr-k">100% dòng đơn đã quy về SKU chuẩn</span><span class="mr-v up">✓</span><span></span><span></span></div>`) +
    sell.filter(l => l.bundle).slice(0, 8).map(l => `<div class="mr"><span class="mr-k">Bộ ${esc(l.eff)} → ${l.units / l.q > 1 ? (l.units / l.q) + ' × ' + esc(l.comps[0]) : l.comps.map(esc).join(' + ')}</span><span class="mr-v">${l.q} bộ</span><span></span><span></span></div>`).join('') +
    `</div><p class="foot-note">SKU chuẩn = SKU của phân loại hiện tại trên Shopee (tra theo item_id + model_id); hậu tố _COMBOXn tính n sản phẩm cùng mã; SKU ghép bằng "-" là một bộ (combo) riêng, liệt kê từng mã thành phần. Món 0₫ hoặc mã GIFT… là quà tặng, không tính NMV.</p>`;
}

function prepare(d) {
  META = d.meta || {}; PRODUCTS = d.products || [];
  LIST = {}; PRODUCTS.forEach(p => { LIST[p[4]] = { list: p[5], promo: p[6], stock: p[7], model: p[3], name: p[2], item: p[0] }; });
  // row: [sn,t,st,status,qty,value,paid,model,price,province,carrier,fx,sv,pi,tx,voucherShop,voucherShopee,income,sku,return,itemId,ward,shipBuyer,shipFee,shipSubsidy,final,surcharge]
  ORDERS = (d.orders || []).map(r => {
    const o = { sn: r[0], t: r[1], st: r[2], s: r[3] || '', q: r[4] || 0, v: r[5] || 0, paid: r[6] || 0, m: r[7] || '', p: r[8] || 0, prov: r[9] || '', car: r[10] || '',
      fx: r[11] || 0, sv: r[12] || 0, pi: r[13] || 0, tx: r[14] || 0, sh: r[15] || 0, pv: r[16] || 0, inc: r[17], sku: r[18] || '', ret: !!r[19], iid: r[20],
      ward: r[21] || '', sb: r[22] || 0, sf: r[23] || 0, ss: r[24] || 0, fin: !!r[25], surcharge: r[26], deal: r[27] || '', chan: r[28] || '', exp: r[29] == null ? null : !!r[29], tp: r[30] || null, td: r[31] || null, _items: r[32] || null };
    o.day = dayKey(o.t); o.hour = Math.floor(((o.t + TZ) % DAY) / 3600); o.wd = keyToDate(o.day).getUTCDay();
    o.region = regionOf(o.prov); o.cx = /hủy/i.test(o.s) || o.st === 5;
    o.cls = o.cx ? 'cx' : /trả hàng|hoàn tiền/i.test(o.s) ? 'cx' : /^Đã giao$|hoàn thành/i.test(o.s) ? 'ok' : /ĐVVC|đang giao|vận chuyển/i.test(o.s) ? 'ship' : 'wait';
    const lp = (LIST[o.sku] || {}).list || 0; o.promo = lp > o.p ? (lp - o.p) * o.q : 0;
    o.fee = o.fx + o.sv + o.tx + o.pi;
    o.prodNet = o.v - o.sh - o.fee;                     // thực thu từ sản phẩm
    o.shipNet = o.sb - o.sf + o.ss;                     // tiền ship đi qua (khách trả + Shopee trợ giá − phí ship)
    o.income = o.inc != null ? o.inc : o.prodNet + o.shipNet;
    o.recon = o.inc == null ? null : Math.round(o.inc - (o.prodNet + o.shipNet));            // 0 = khớp
    o.surOk = o.surcharge == null ? null : Math.round(o.surcharge - o.fee) === 0;           // phụ phí = tổng 4 loại phí
    return o;
  }).sort((a, b) => b.t - a.t);
  normalizeSkus(d);
  // ward names masked by Shopee ("***ường An Khánh") -> match with a full name in the same province
  const fullW = {}; ORDERS.forEach(o => { if (WARD_PREFIX.test(o.ward)) (fullW[o.prov] = fullW[o.prov] || new Set()).add(o.ward); });
  ORDERS.forEach(o => { if (o.ward && !WARD_PREFIX.test(o.ward)) { const m = [...(fullW[o.prov] || [])].find(w => w.endsWith(o.ward)); o.ward = m || '…' + o.ward; } if (!o.ward) o.ward = 'Không rõ'; });

  LEDGER = (d.ledger || []).map(r => ({ day: dayKey(r[0]), kind: r[1], amt: r[2] || 0, type: r[3] || '', from: r[4] || '' }))
    .sort((a, b) => a.day - b.day || (a.kind === 'spend') - (b.kind === 'spend'));
  ADSPLIT = {}; WALLET = { paidIn: 0, freeIn: 0, paidUsed: 0, freeUsed: 0, freeBal: 0, paidBal: 0, hasLedger: LEDGER.length > 0 };
  let fb = 0, pb = 0;
  LEDGER.forEach(e => {
    if (e.kind === 'free') { fb += e.amt; WALLET.freeIn += e.amt; }
    else if (e.kind === 'paid') { pb += e.amt; WALLET.paidIn += e.amt; }
    else if (e.kind === 'spend') {
      let f = Math.min(e.amt, Math.max(0, fb)), p = e.amt - f;
      if (p > 0 && p < 5 && pb < 5) { f += p; p = 0; }          // sai số làm tròn của Shopee
      fb -= f; pb -= p; WALLET.freeUsed += f; WALLET.paidUsed += p;
      const x = ADSPLIT[e.day] || (ADSPLIT[e.day] = { free: 0, paid: 0 }); x.free += f; x.paid += p;
    }
  });
  WALLET.freeBal = fb; WALLET.paidBal = pb;
  ADS = (d.ads || []).map(r => {
    const a = { day: dayKey(r[0]), imp: r[1] || 0, clk: r[2] || 0, cost: r[3] || 0, ord: r[4] || 0, gmv: r[5] || 0, dord: r[6] || 0, dgmv: r[7] || 0, atc: r[8] || 0, units: r[9] || 0 };
    const x = ADSPLIT[a.day]; if (!x || !(x.free + x.paid)) { a.free = WALLET.hasLedger ? 0 : 0; a.paid = a.cost; if (WALLET.hasLedger && !x) { a.free = 0; a.paid = a.cost; } }
    else { const fr = x.free / (x.free + x.paid); a.free = a.cost * fr; a.paid = a.cost - a.free; }
    return a;
  }).sort((a, b) => a.day - b.day);
  // promotions: flash sale slots, shop discounts / combos / add-ons, vouchers, Shopee 7-day tool metrics
  const pr = d.promo || {};
  PROMO = { fs: (pr.fs || []).map(f => ({ id: f[0], a: f[1], b: f[1] + f[2], price: f[3], stock: f[4], lim: f[5], clk: f[6], rem: f[7] })).sort((x, y) => y.a - x.a),
    disc: (pr.disc || []).map(x => ({ id: x[0], kind: x[1], name: x[2], a: x[3], b: x[4], price: x[5] })).sort((x, y) => y.a - x.a),
    vch: (pr.vch || []).map(v => ({ id: v[0], name: v[1], code: v[2], a: v[3], b: v[4], pct: v[5], val: v[6], max: v[7], min: v[8], lim: v[9], used: v[10], claimed: v[11], seller: v[12] })).sort((x, y) => y.a - x.a),
    kpi: pr.kpi || [] };
  // each order's price source: Flash Sale (in a slot and at the slot price), shop discount price, combo/add-on, or other
  ORDERS.forEach(o => {
    const f = PROMO.fs.find(x => o.t >= x.a && o.t < x.b && Math.abs(x.price - o.p) < 1);
    const dc = !f && PROMO.disc.find(x => x.kind === 'discount' && o.t >= x.a && o.t <= x.b && x.price && Math.abs(x.price - o.p) < 1);
    o.fs = f ? f.id : ''; o.src = f ? 'fs' : o.deal ? 'deal' : dc ? 'disc' : 'other'; o.discName = dc ? dc.name : '';
  });
  REVIEWS = (d.reviews || []).map(r => ({ t: r[0], day: dayKey(r[0]), star: r[1], text: r[2] || '', media: r[3] || 0, sn: r[4], replied: !!r[5], rt: r[6] || 0, hidden: !!r[7] })).sort((a, b) => b.t - a.t);
}

/* ================= ranges ================= */
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
  const f = keyToDate(S.from), tt = keyToDate(S.to + 1);
  if (f.getUTCDate() === 1 && tt.getUTCDate() === 1) { const mk = monthKey(S.from), n = monthKey(S.to) - mk + 1; return [monthStart(mk - n), monthStart(mk) - 1]; }
  return [S.from - len, S.from - 1];
}

/* ================= aggregation ================= */
function filterOrders(a, b, o2 = {}) {
  return ORDERS.filter(o => o.day >= a && o.day <= b && (!S.sku || o.sku === S.sku || (o.skus && o.skus.includes(S.sku))) && (!S.region || o.region === S.region) &&
    (!S.carrier || o.car === S.carrier) && (o2.ignoreHour || S.hour === null || o.hour === S.hour));
}
function agg(a, b) {
  const os = filterOrders(a, b), ok = os.filter(o => !o.cx);
  const ads = ADS.filter(r => r.day >= a && r.day <= b);
  const A = { imp: sum(ads, r => r.imp), clk: sum(ads, r => r.clk), cost: sum(ads, r => r.cost), ord: sum(ads, r => r.ord), gmv: sum(ads, r => r.gmv), atc: sum(ads, r => r.atc), units: sum(ads, r => r.units), free: sum(ads, r => r.free), paid: sum(ads, r => r.paid) };
  const nmv = sum(ok, o => o.v), units = sum(ok, o => o.q), fee = sum(ok, o => o.fee), sh = sum(ok, o => o.sh);
  const adsUnits = Math.min(A.units || A.ord, units), mkt = A.paid + sh;
  const R = {
    a, b, days: b - a + 1, os, ok, ads, A, nmv, gmv: sum(os, o => o.v), units, orders: ok.length, aov: ok.length ? nmv / ok.length : 0, asp: units ? nmv / units : 0,
    fx: sum(ok, o => o.fx), sv: sum(ok, o => o.sv), tx: sum(ok, o => o.tx), pi: sum(ok, o => o.pi), fee, sh, pv: sum(ok, o => o.pv), promo: sum(ok, o => o.promo),
    prodNet: sum(ok, o => o.prodNet), shipNet: sum(ok, o => o.shipNet), income: sum(ok, o => o.income),
    mkt, net: nmv - fee - mkt, adsUnits, organicUnits: Math.max(0, units - adsUnits),
    cxN: os.filter(o => o.cx).length, retN: ok.filter(o => o.ret).length, totalN: os.length,
    waitN: ok.filter(o => o.cls === 'wait').length, shipN: ok.filter(o => o.cls === 'ship').length, doneN: ok.filter(o => o.cls === 'ok').length,
    multiN: ok.filter(o => o.q >= 2).length,
    fxBase: sum(ok.filter(o => o.fx > 0), o => o.v - o.sh), fxPos: sum(ok.filter(o => o.fx > 0), o => o.fx), fxFreeN: ok.filter(o => o.fx === 0 && o.fee > 0).length,
    reconN: ok.filter(o => o.recon === 0).length, reconChecked: ok.filter(o => o.recon !== null).length, finalN: ok.filter(o => o.fin).length
  };
  R.cxRate = R.totalN ? R.cxN / R.totalN : NaN; R.retRate = R.orders ? R.retN / R.orders : NaN; R.take = nmv ? fee / nmv : NaN;
  R.multiRate = R.orders ? R.multiN / R.orders : NaN; R.upo = R.orders ? units / R.orders : NaN; R.unitNet = units ? R.prodNet / units : 0;
  return R;
}
function delta(c, p, invert) {
  if (p == null || !isFinite(c) || !isFinite(p)) return null;
  if (p === 0) return c === 0 ? { t: '0%', c: 'flat' } : { t: 'Mới', c: 'flat' };
  const r = c / p - 1; if (Math.abs(r) < .0005) return { t: '0%', c: 'flat' };
  return { t: (r > 0 ? '▲ ' : '▼ ') + Math.abs(r * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%', c: (invert ? r < 0 : r > 0) ? 'up' : 'down' };
}
const ptDelta = (c, p, invert) => {
  if (p == null || !isFinite(c) || !isFinite(p)) return null;
  const d = (c - p) * 100; if (Math.abs(d) < .05) return { t: '0 đ%', c: 'flat' };
  return { t: (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' đ%', c: (invert ? d < 0 : d > 0) ? 'up' : 'down' };
};
const badge = d => d ? `<span class="badge ${d.c}">${d.t}</span>` : '';
const groupBy = (arr, kf) => { const m = new Map(); arr.forEach(o => { const k = kf(o); if (!m.has(k)) m.set(k, []); m.get(k).push(o); }); return m; };

/* ================= tooltip ================= */
const tipEl = $('#tooltip');
function tip(e, html) {
  tipEl.innerHTML = html; tipEl.classList.add('on');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = e.clientX + 16, y = e.clientY - h - 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (x < 8) x = 8; if (y < 8) y = e.clientY + 20;
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
const untip = () => tipEl.classList.remove('on');
document.addEventListener('scroll', untip, { passive: true });
const tipRows = rows => rows.filter(Boolean).map(([k, v, c]) => `<div class="tr"><span>${c ? `<i style="background:${c}"></i>` : ''}${k}</span><b>${v}</b></div>`).join('');
function bindTips(root, fn, sel = '[data-tip]') {
  root.querySelectorAll(sel).forEach(el => {
    const show = e => { root.querySelectorAll('.hov').forEach(x => x.classList.remove('hov')); el.classList.add('hov'); tip(e, fn(el.dataset.tip, el)); };
    el.addEventListener('pointermove', show); el.addEventListener('pointerdown', show);
    el.addEventListener('pointerleave', () => { el.classList.remove('hov'); untip(); });
  });
}

/* ================= charts ================= */
const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
/* Column chart: stacked bar series + optional line on a right axis, value labels, hover band and rich tooltip. */
function colChart(el, o) {
  const { labels, series, height = 260, tipFn, onClick, active, yFmt = short, y2Fmt = short, barLabel = short, lineLabel } = o;
  const lines = (o.lines || (o.line ? [o.line] : [])).filter(Boolean), line = lines[0], grouped = !!o.grouped;
  const W = Math.max(280, Math.round(el.clientWidth || 600)), H = height, L = 46, R = line ? 46 : 8, T = 22, B = 26, iw = W - L - R, ih = H - T - B, n = labels.length;
  const totals = labels.map((_, i) => grouped ? Math.max(0, ...series.map(se => se.vals[i] || 0)) : series.reduce((s, se) => s + (se.vals[i] || 0), 0));
  const mx = niceMax(Math.max(...totals, 0)), ml = line ? niceMax(Math.max(0, ...lines.flatMap(l => l.vals))) : 1;
  const bw = iw / Math.max(n, 1), gap = Math.min(14, bw * .3), w = Math.max(2, bw - gap);
  const y = v => T + ih - v / mx * ih, yl = v => T + ih - v / ml * ih, cx = i => L + i * bw + bw / 2;
  const every = o.every || Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 56))));
  const showBarLabels = o.barLabels !== false && bw >= 26;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria || '')}">`;
  for (let i = 0; i <= 4; i++) { const v = mx * i / 4; s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 7}" y="${y(v) + 4}" text-anchor="end">${yFmt(v)}</text>`; if (line) s += `<text class="ax" x="${W - R + 7}" y="${yl(ml * i / 4) + 4}">${y2Fmt(ml * i / 4)}</text>`; }
  labels.forEach((lb, i) => { s += `<rect class="band" data-tip="${i}" x="${(L + i * bw).toFixed(1)}" y="${T - 6}" width="${bw.toFixed(1)}" height="${ih + 6}"/>`; });
  labels.forEach((lb, i) => {
    let acc = 0; const op = active == null || active === i ? 1 : .32;
    if (grouped) { const gw = w / series.length; series.forEach((se, k) => { const v = se.vals[i] || 0; if (v <= 0) return;
      s += `<rect class="bar" x="${(cx(i) - w / 2 + k * gw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${Math.max(1, gw - 1).toFixed(1)}" height="${Math.max(.5, y(0) - y(v)).toFixed(1)}" rx="${Math.min(4, gw / 2).toFixed(1)}" fill="${se.color}" opacity="${op}"/>`; });
      if (i % every === 0) s += `<text class="ax" x="${cx(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${esc(lb)}</text>`; return; }
    series.forEach((se, k) => { const v = se.vals[i] || 0; if (v <= 0) return; const y0 = y(acc), y1 = y(acc + v); acc += v;
      const top = k === series.length - 1 || !series.slice(k + 1).some(x => x.vals[i] > 0);
      s += `<rect class="bar" x="${(cx(i) - w / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(.5, y0 - y1).toFixed(1)}" rx="${top ? Math.min(5, w / 2).toFixed(1) : 0}" fill="${se.color}" opacity="${op}"/>`; });
    if (showBarLabels && totals[i] > 0 && String(barLabel(totals[i])).length * 5.9 <= bw + 4) s += `<text class="vl" x="${cx(i).toFixed(1)}" y="${(y(totals[i]) - 5).toFixed(1)}" text-anchor="middle">${barLabel(totals[i])}</text>`;
    if (i % every === 0) s += `<text class="ax" x="${cx(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${esc(lb)}</text>`;
  });
  lines.forEach((ln, li) => {
    if (!ln.vals.some(v => v)) return;
    const pts = ln.vals.map((v, i) => [cx(i), yl(v)]), dots = n <= 62;
    let dd = '', pen = false; pts.forEach((p, i) => { if (ln.vals[i] == null) { pen = false; return; } dd += (pen ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); pen = true; });
    s += `<path d="${dd}" stroke="${ln.color}" stroke-width="${ln.width || 2.2}" fill="none" class="ln"${ln.dash ? ` stroke-dasharray="${ln.dash}"` : ''}/>`;
    const lblLine = li === 0 && lineLabel && n <= 16 && bw >= 30;
    ln.vals.forEach((v, i) => { if (!v || !dots || ln.dash) return; s += `<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="${lines.length > 1 ? 2.8 : 3.6}" fill="var(--card)" stroke="${ln.color}" stroke-width="2"/>`;
      const bt = y(totals[i]) - 5, near = showBarLabels && totals[i] > 0 && Math.abs(pts[i][1] - 9 - bt) < 13, ly = near ? (pts[i][1] < bt ? pts[i][1] - 9 : pts[i][1] + 17) : pts[i][1] - 9;
      if (lblLine) s += `<text class="vl ln-l" x="${pts[i][0].toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" style="fill:${ln.color}">${lineLabel(v)}</text>`; });
  });
  el.innerHTML = s + '</svg>';
  if (tipFn) bindTips(el, i => tipFn(+i));
  if (onClick) el.querySelectorAll('.band').forEach(h => { h.style.cursor = 'pointer'; h.addEventListener('click', () => { untip(); onClick(+h.dataset.tip); }); });
}
/* Horizontal bar list with value labels, tooltip and click */
function barList(el, rows, o = {}) {
  if (!rows.length) { el.innerHTML = '<p class="empty-note">Chưa có đơn trong khoảng này.</p>'; return; }
  const mx = Math.max(...rows.map(r => r.v), 1);
  el.innerHTML = `<div class="blist">` + rows.map((r, i) => `<div class="bl ${o.onClick ? 'click' : ''} ${o.active === r.key ? 'act' : ''}" data-tip="${i}" data-key="${esc(r.key ?? r.l)}">
    <div class="bl-l"><span class="bl-name" title="${esc(r.l)}">${esc(r.l)}</span>${r.sub ? `<span class="bl-sub">${r.sub}</span>` : ''}</div>
    <div class="bl-bar"><b style="--w:${(r.v / mx * 100).toFixed(1)}%;--c:${r.c || 'var(--c-brand)'}"></b></div>
    <div class="bl-v">${r.label}</div></div>`).join('') + '</div>';
  if (o.tipFn) bindTips(el, i => o.tipFn(rows[+i]));
  if (o.onClick) el.querySelectorAll('.bl').forEach(b => b.addEventListener('click', () => { untip(); o.onClick(b.dataset.key); }));
}
function donut(el, parts, centerTop, centerBottom, tipFn) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1, R = 72, r = 50, C = 86; let a0 = -Math.PI / 2, s = `<svg viewBox="0 0 172 172">`;
  const nz = parts.filter(p => p.v);
  if (!nz.length) s += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" stroke="var(--fill)" stroke-width="${R - r}" fill="none"/>`;
  parts.forEach((p, i) => {
    if (!p.v) return; const frac = p.v / tot;
    if (frac > .9999) { s += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" stroke="${p.c}" stroke-width="${R - r}" fill="none" data-tip="${i}" class="seg-arc"/>`; return; }
    const a1 = a0 + frac * Math.PI * 2 - (nz.length > 1 ? .025 : 0), lg = a1 - a0 > Math.PI ? 1 : 0, pt = (rad, a) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
    const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
    s += `<path class="seg-arc" d="M${x0} ${y0}A${R} ${R} 0 ${lg} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${lg} 0 ${x3} ${y3}Z" fill="${p.c}" data-tip="${i}"/>`;
    a0 += frac * Math.PI * 2;
  });
  s += `<text x="${C}" y="${C - 1}" text-anchor="middle" class="dn-t">${esc(centerTop)}</text><text x="${C}" y="${C + 17}" text-anchor="middle" class="dn-s">${esc(centerBottom)}</text></svg>`;
  el.className = 'donut'; el.innerHTML = s;
  bindTips(el, i => tipFn ? tipFn(parts[+i]) : `<b>${esc(parts[+i].l)}</b>${tipRows([['Giá trị', short(parts[+i].v) + ' ₫'], ['Tỷ trọng', pct(parts[+i].v / tot)]])}`);
}
function spark(vals, color, id) {
  if (vals.length < 2 || !vals.some(v => v)) return '';
  const w = 220, h = 36, mx = Math.max(...vals, 1), pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 3 - v / mx * (h - 7)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-spark="${id}"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${color}" opacity=".14" stroke="none"/><path d="${d}" stroke="${color}" stroke-width="1.7" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ================= render ================= */
let C = null, P = null;
function render() {
  C = agg(S.from, S.to); const cr = cmpRange(); P = cr ? agg(cr[0], cr[1]) : null;
  const pEmpty = P && !P.totalN && !P.A.cost && !P.A.imp, pLabel = P ? (P.a === P.b ? dmy(P.a) : dmy(P.a) + ' – ' + dmy(P.b)) : '';
  if (pEmpty) P = null;
  const rangeTxt = S.from === S.to ? dmy(S.from) : dmy(S.from) + ' – ' + dmy(S.to);
  $('#heroRange').textContent = rangeTxt; $('#tbRange').textContent = rangeTxt;
  $('#cmpLabel').innerHTML = P ? `So sánh với<br><b>${pLabel}</b>` : pEmpty ? `Kỳ so sánh ${pLabel}<br><b>chưa có dữ liệu</b>` : 'Không so sánh';
  const filt = [S.sku && 'SKU ' + S.sku, S.region, S.carrier && (CARRIER_NAMES[S.carrier] || S.carrier), S.hour !== null && 'Giờ ' + S.hour + 'h'].filter(Boolean);
  $('#activeFilters').innerHTML = filt.map(f => `<span>${esc(f)}</span>`).join('');
  $('#heroNote').textContent = (filt.length ? 'Đang lọc: ' + filt.join(' · ') + ' · ' : '') + `${C.orders} đơn hợp lệ · ${C.units} sản phẩm · ${C.cxN} đơn hủy`;
  syncControls();
  [renderBiz, renderWaterfall, renderGroups, renderTarget, renderKpi, renderChannels, renderDaily, renderMonthly, renderWeekday, renderPrice, renderMulti, renderSku,
   renderSkus, renderPromos, renderRegion, renderProv, renderWard, renderHour, renderCarrier, renderExpress, renderReviews, renderAds, renderOrders].forEach(f => { try { f(); } catch (e) { console.error(f.name, e); } });
  if (SHOP !== 'lf') relabel();
}

function seriesBy(f) { const out = Array(C.days).fill(0); C.ok.forEach(o => { const i = o.day - C.a; if (i >= 0 && i < out.length) out[i] += f(o); }); return out; }
function renderBiz() {
  const vv = v => { const t = short(v); const m = t.match(/^(.*?)( tr| tỷ|k)?$/); return `${m[1]}<small>${m[2] || ''} ₫</small>`; };
  const K = [
    { l: 'NMV thực nhận', v: C.net, d: P && delta(C.net, P.net), f: `${pct(C.net / C.nmv)} NMV sau phí sàn, voucher shop, Ads LF nạp`, cls: 'lead', sp: seriesBy(o => o.prodNet), c: SHOP === 'nikon' ? '#111111' : '#ffffff', tip: [['NMV', money(C.nmv)], ['− Phí sàn', money(C.fee)], ['− Voucher shop', money(C.sh)], ['− Ads LF nạp', money(C.A.paid)], ['= NMV thực nhận', money(C.net)]] },
    { l: 'NMV', v: C.nmv, d: P && delta(C.nmv, P.nmv), f: `${C.orders} đơn · ${C.units} sản phẩm · AOV ${short(C.aov)} ₫`, sp: seriesBy(o => o.v), c: 'var(--c-brand)', tip: [['NMV', money(C.nmv)], ['GMV (gồm hủy)', money(C.gmv)], ['Đơn hợp lệ', C.orders], ['Sản phẩm', C.units]] },
    { l: 'Phí sàn Shopee', v: C.fee, d: P && delta(C.fee, P.fee, true), f: `${pct(C.take)} NMV`, sp: seriesBy(o => o.fee), c: 'var(--c-ads)', tip: [['Phí cố định', money(C.fx)], ['Phí dịch vụ', money(C.sv)], ['Phí xử lý GD', money(C.tx)], ['PiShip', money(C.pi)], ['Tổng', money(C.fee) + ' · ' + pct(C.take)]] },
    { l: 'Thực thu / sản phẩm', v: C.unitNet, d: P && delta(C.unitNet, P.unitNet), f: `Giá bán TB ${short(C.asp)} ₫ · giữ lại ${pct(C.prodNet / C.nmv)}`, sp: seriesBy(o => o.prodNet), c: 'var(--c-blue)', tip: [['Giá bán TB/sp', money(C.asp)], ['Voucher shop TB/sp', money(C.units ? C.sh / C.units : 0)], ['Phí sàn TB/sp', money(C.units ? C.fee / C.units : 0)], ['Thực thu TB/sp', money(C.unitNet)]] }
  ];
  $('#biz').innerHTML = K.map((k, i) => `<div class="kpi ${k.cls || ''}" data-tip="${i}"><div class="kpi-l">${k.l}</div><div class="kpi-v">${vv(k.v)}</div>${C.days > 1 ? spark(k.sp, k.c, i) : ''}<div class="kpi-f">${badge(k.d)}<span>${k.f}</span></div></div>`).join('');
  bindTips($('#biz'), i => `<b>${K[+i].l}</b>${tipRows(K[+i].tip)}${P ? `<div class="tr muted"><span>Kỳ so sánh</span><b>${badge(K[+i].d) || '–'}</b></div>` : ''}`, '.kpi');
}

function renderWaterfall() {
  const n = C.nmv || 1;
  const steps = [
    { l: 'NMV', v: C.nmv, kind: 'base', note: 'Giá shop bán × số lượng' },
    { l: 'Phí cố định', v: -C.fx, kind: 'fee' }, { l: 'Phí dịch vụ', v: -C.sv, kind: 'fee' }, { l: 'Phí xử lý giao dịch', v: -C.tx, kind: 'fee' }, { l: 'Phí dịch vụ PiShip', v: -C.pi, kind: 'fee' },
    { l: 'Voucher shop', v: -C.sh, kind: 'promo' }, { l: 'Ads LF nạp tiền', v: -C.A.paid, kind: 'ads', note: C.A.free ? `Không gồm ${short(C.A.free)} ₫ Ads Shopee tặng` : '' },
    { l: 'NMV thực nhận', v: C.net, kind: 'total' }
  ];
  let run = C.nmv;
  $('#waterfall').innerHTML = `<div class="wf">` + steps.map((st, i) => {
    let a, b; if (st.kind === 'base' || st.kind === 'total') { a = 0; b = st.v; } else { b = run; a = run + st.v; run = a; }
    const L = Math.max(0, a / n * 100), Wd = Math.max(st.v ? .6 : 0, Math.abs(b - a) / n * 100);
    return `<div class="wf-r ${st.kind}" data-tip="${i}"><div class="wf-l">${st.l}${st.note ? `<span>${esc(st.note)}</span>` : ''}</div>
      <div class="wf-track"><b style="left:${L.toFixed(2)}%;width:${Wd.toFixed(2)}%"></b></div>
      <div class="wf-v">${st.kind === 'base' || st.kind === 'total' ? '' : '−'}${full(Math.abs(st.v))} ₫<span>${pct(Math.abs(st.v) / n)}</span></div></div>`;
  }).join('') + '</div>';
  bindTips($('#waterfall'), i => { const st = steps[+i]; return `<b>${st.l}</b>${tipRows([['Số tiền', money(Math.abs(st.v))], ['% NMV', pct(Math.abs(st.v) / n, 2)], st.note ? ['Ghi chú', esc(st.note)] : null])}`; }, '.wf-r');
  const chk = C.reconChecked;
  $('#reconChip').innerHTML = chk ? `<span class="recon-pill ${C.reconN === chk ? 'ok' : 'warn'}">${ICON.check}Đối soát ${C.reconN}/${chk} đơn khớp số Shopee</span>` : '';
  $('#reconChip').title = 'Với mỗi đơn: giá bán − voucher shop − phí sàn + tiền ship đi qua = "Doanh thu đơn hàng" Shopee báo';
}

function mcard(o) {
  // o: { icon, title, color, hero:{label, value, sub, d}, viz, rows:[{k, v, ratio, d, cls}], note }
  const rows = o.rows.map(r => `<div class="mr ${r.cls || ''}"><span class="mr-k">${r.k}</span><span class="mr-v">${r.v}</span>${r.ratio != null ? `<span class="mr-p">${r.ratio}</span>` : '<span></span>'}<span class="mr-d ${r.d ? r.d.c : ''}">${r.d ? r.d.t : ''}</span></div>`).join('');
  return `<article class="mcard" style="--c:${o.color}"><header><span class="mi">${o.icon}</span><h3>${o.title}</h3></header>
    <div class="mhero"><div><div class="mh-v">${o.hero.value}</div><div class="mh-l">${o.hero.label}</div></div>${o.hero.d ? badge(o.hero.d) : ''}</div>
    ${o.viz || ''}<div class="mrows">${rows}</div>${o.note ? `<p class="note">${o.note}</p>` : ''}</article>`;
}
function stackBar(parts) { const t = parts.reduce((s, p) => s + p.v, 0) || 1; return `<div class="stack">${parts.map(p => `<i style="width:${(p.v / t * 100).toFixed(2)}%;background:${p.c}" title="${esc(p.l)}: ${pct(p.v / t)}"></i>`).join('')}</div><div class="stack-lg">${parts.map(p => `<span><i style="background:${p.c}"></i>${esc(p.l)} ${pct(p.v / t, 0)}</span>`).join('')}</div>`; }
function renderGroups() {
  const n = C.nmv || NaN, D = (f, inv) => P ? delta(f(C), f(P), inv) : null, PT = (f, inv) => P ? ptDelta(f(C), f(P), inv) : null, rp = v => pct(v / n);
  const cards = [
    mcard({ icon: ICON.sales, title: 'Hiệu suất bán hàng', color: 'var(--c-brand)', hero: { label: 'NMV', value: money(C.nmv), d: D(x => x.nmv) },
      viz: `<div class="quad"><div><b>${C.orders}</b><span>đơn hợp lệ</span></div><div><b>${C.units}</b><span>sản phẩm</span></div><div><b>${short(C.aov)}</b><span>AOV ₫/đơn</span></div><div><b>${short(C.asp)}</b><span>giá TB ₫/sp</span></div></div>`,
      rows: [{ k: 'GMV (gồm đơn hủy)', v: money(C.gmv), d: D(x => x.gmv) }, { k: 'NMV thực nhận', v: money(C.net), ratio: rp(C.net), d: D(x => x.net) }, { k: 'Thực thu TB / sản phẩm', v: money(C.unitNet), d: D(x => x.unitNet) }, { k: 'Đơn mua ≥ 2 sản phẩm', v: C.multiN + ' đơn', ratio: pct(C.multiRate), d: PT(x => x.multiRate) }] }),
    mcard({ icon: ICON.fee, title: 'Chi phí sàn Shopee', color: 'var(--c-ads)', hero: { label: `Tổng phí sàn · ${pct(C.take)} NMV`, value: money(C.fee), d: D(x => x.fee, 1) },
      viz: stackBar([{ l: 'Cố định', v: C.fx, c: 'var(--c-ads)' }, { l: 'Dịch vụ', v: C.sv, c: 'var(--c-warn-2)' }, { l: 'Xử lý GD', v: C.tx, c: 'var(--c-amber)' }, { l: 'PiShip', v: C.pi, c: 'var(--label-3)' }]),
      rows: [{ k: 'Phí cố định', v: money(C.fx), ratio: rp(C.fx), d: D(x => x.fx, 1) }, { k: 'Phí dịch vụ', v: money(C.sv), ratio: rp(C.sv), d: D(x => x.sv, 1) }, { k: 'Phí xử lý giao dịch', v: money(C.tx), ratio: rp(C.tx), d: D(x => x.tx, 1) }, { k: 'Phí dịch vụ PiShip', v: money(C.pi), ratio: rp(C.pi), d: D(x => x.pi, 1) }],
      note: C.fxFreeN ? `${C.fxFreeN} đơn được Shopee để phí cố định ₫0 nên tỷ lệ chung thấp hơn. Ở các đơn có thu, phí cố định = ${pct(C.fxPos / C.fxBase)} giá bán sau voucher shop.` : '' }),
    mcard({ icon: ICON.health, title: 'Sức khỏe đơn hàng', color: 'var(--c-bad)', hero: { label: 'Tỷ lệ hủy (trên tổng đơn đặt)', value: pct(C.cxRate), d: PT(x => x.cxRate, 1) },
      viz: stackBar([{ l: 'Đã giao', v: C.doneN, c: 'var(--c-good)' }, { l: 'Đang giao', v: C.shipN, c: 'var(--c-blue)' }, { l: 'Chờ xử lý', v: C.waitN, c: 'var(--c-warn)' }, { l: 'Hủy', v: C.cxN, c: 'var(--c-bad)' }]),
      rows: [{ k: 'Tổng đơn đặt', v: C.totalN + ' đơn', d: D(x => x.totalN) }, { k: 'Đơn hủy', v: C.cxN + ' đơn', ratio: pct(C.cxRate), d: D(x => x.cxN, 1) }, { k: 'Trả hàng / hoàn tiền', v: C.retN + ' đơn', ratio: pct(C.retRate), d: D(x => x.retN, 1) }, { k: 'Đã chốt doanh thu', v: C.finalN + ' đơn', ratio: pct(C.finalN / (C.orders || 1)) }, { k: 'Giao hỏa tốc', v: C.ok.some(o => o.exp !== null) ? C.ok.filter(o => o.exp).length + ' đơn' : '–', ratio: C.ok.some(o => o.exp !== null) ? pct(C.ok.filter(o => o.exp).length / (C.ok.filter(o => o.exp !== null).length || 1)) : null }] }),
    mcard({ icon: ICON.promo, title: 'Khuyến mãi', color: 'var(--c-indigo)', hero: { label: `Voucher shop (shop tự chi) · ${pct(C.sh / n)} NMV`, value: money(C.sh), d: D(x => x.sh, 1) },
      viz: stackBar([{ l: 'Voucher shop', v: C.sh, c: 'var(--c-indigo)' }, { l: 'Voucher Shopee', v: C.pv, c: 'var(--c-teal)' }]),
      rows: [{ k: 'NMV từ Flash Sale', v: money(sum(C.ok.filter(o => o.src === 'fs'), o => o.v)), ratio: rp(sum(C.ok.filter(o => o.src === 'fs'), o => o.v)) }, { k: 'Voucher shop (shop trả)', v: money(C.sh), ratio: rp(C.sh), d: D(x => x.sh, 1) }, { k: 'Voucher & trợ giá Shopee (sàn trả)', v: money(C.pv), ratio: rp(C.pv), d: D(x => x.pv) }, { k: 'Giảm giá so giá niêm yết', v: money(C.promo), ratio: rp(C.promo), d: D(x => x.promo), cls: 'dim' }],
      note: 'Giảm giá so với giá niêm yết đã nằm trong giá bán (NMV) nên không trừ thêm. Chỉ voucher shop là chi phí.' }),
    mcard({ icon: ICON.ads, title: 'Marketing & Ads', color: 'var(--c-blue)', hero: { label: `Tổng chi phí Ads chạy · trong đó LF nạp ${money(C.A.paid)} (${pct(C.A.paid / n)} NMV)`, value: money(C.A.cost), d: D(x => x.A.cost, 1) },
      viz: stackBar([{ l: 'Ads LF nạp', v: C.A.paid, c: 'var(--c-blue)' }, { l: 'Ads Shopee tặng', v: C.A.free, c: 'var(--c-good)' }]),
      rows: [{ k: 'Ads LF nạp tiền', v: money(C.A.paid), ratio: rp(C.A.paid), d: D(x => x.A.paid, 1) }, { k: 'Ads Shopee tặng (nhiệm vụ)', v: money(C.A.free), ratio: rp(C.A.free), d: D(x => x.A.free), cls: 'dim' }, { k: 'Doanh số từ Ads', v: money(C.A.gmv), ratio: rp(C.A.gmv), d: D(x => x.A.gmv) }, { k: 'ROAS (doanh số ÷ chi phí)', v: C.A.cost ? num2(C.A.gmv / C.A.cost) : '–' }, { k: 'Sản phẩm bán qua Ads', v: C.adsUnits + ' sp', ratio: pct(C.adsUnits / (C.units || 1)), d: D(x => x.adsUnits) }, { k: 'Sản phẩm tự nhiên', v: C.organicUnits + ' sp', ratio: pct(C.organicUnits / (C.units || 1)), d: D(x => x.organicUnits) }],
      note: 'Chỉ phần Ads LF nạp tiền mới trừ vào NMV thực nhận. Voucher shop nằm ở thẻ Khuyến mãi.' }),
    reviewMiniCard()
  ];
  $('#groups').innerHTML = cards.join('');
}
function reviewMiniCard() {
  const rv = REVIEWS.filter(r => r.day >= S.from && r.day <= S.to), avg = rv.length ? sum(rv, r => r.star) / rv.length : NaN;
  const delivered = C.doneN, rate = delivered ? Math.min(1, rv.length / delivered) : NaN;
  return mcard({ icon: ICON.star, title: 'Khách hàng', color: 'var(--c-amber)', hero: { label: `${rv.length} đánh giá trong kỳ`, value: isFinite(avg) ? `${star1(avg)} <small>/ 5 ★</small>` : '—' },
    viz: `<div class="stars-row">${[5, 4, 3, 2, 1].map(s => { const c = rv.filter(r => r.star === s).length; return `<div><span>${s}★</span><i><b style="width:${rv.length ? c / rv.length * 100 : 0}%"></b></i><em>${c}</em></div>`; }).join('')}</div>`,
    rows: [{ k: 'Tỷ lệ đánh giá / đơn đã giao', v: isFinite(rate) ? pct(rate, 0) : '–' }, { k: 'Đánh giá có nội dung', v: rv.filter(r => r.text.trim()).length + ' / ' + rv.length }, { k: 'Shop đã phản hồi', v: rv.filter(r => r.replied).length + ' / ' + rv.length }, { k: 'Đơn mua ≥ 2 sản phẩm', v: pct(C.multiRate) }, { k: 'Sản phẩm trung bình / đơn', v: num2(C.upo) + ' sp' }] });
}

/* Kế hoạch kệ 3 tầng (bảng target): kệ/tháng, giá sàn 315.000₫, thực thu mục tiêu 189.051₫/kệ */
const PLAN = { months: { '2026-11': 95, '2026-12': 300, '2027-01': 555, '2027-02': 333, '2027-03': 400, '2027-04': 480, '2027-05': 537 }, floor: 315000, netUnit: 189051 };
function planUnits(a, b) { // kế hoạch kệ trong khoảng ngày, chia đều theo ngày của từng tháng
  let u = 0; for (let k = a; k <= b; k++) { const d = keyToDate(k), ym = d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1), n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); u += (PLAN.months[ym] || 0) / n; } return u;
}
function renderTarget() {
  const key = 'lf-target-' + S.from + '-' + S.to, manual = +(store.get(key) || 0), t = todayKey();
  // only days covered by the plan (T11/2026–T5/2027) are compared with the plan
  const inPlan = k => { const d = keyToDate(k); return !!PLAN.months[d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1)]; };
  // a range that ends today runs to the end of this month, so the plan is the whole month and the projection is month-end
  const endK = S.to === t ? monthEnd(monthKey(t)) : S.to;
  let pa = null, pb = null; for (let k = S.from; k <= endK; k++) if (inPlan(k)) { if (pa === null) pa = k; pb = k; }
  const hasPlan = pa !== null && !manual, a = hasPlan ? pa : S.from, b = hasPlan ? pb : S.to;
  const R = (a === S.from && b === S.to) ? C : agg(a, Math.min(b, t));
  const pu = hasPlan ? planUnits(a, b) : 0, tgtU = Math.round(pu), tgt = manual || Math.round(pu * PLAN.floor);
  const live = t >= a && t <= b, last = Math.min(b, t), elapsed = Math.max(1, last - a + 1), days = b - a + 1;
  const fut = t < a, projU = live ? R.units / elapsed * days : R.units, proj = live ? R.nmv / elapsed * days : R.nmv;
  const rate = tgt ? R.nmv / tgt : 0, rateU = tgtU ? R.units / tgtU : 0, puToDate = hasPlan && live ? planUnits(a, last) : pu;
  const netU = R.units ? (R.nmv - R.fee - R.sh - R.A.paid) / R.units : 0;
  const clipped = hasPlan && (a !== S.from || b !== S.to);
  const sub = hasPlan ? `Kế hoạch ${full(tgtU)} kệ × giá sàn ${short(PLAN.floor)} ₫ = ${short(tgt)} ₫${clipped ? ` · chỉ tính ${dmy(a)} – ${dmy(b)} (trong kỳ kế hoạch)` : ''}` : manual ? 'Đang dùng mục tiêu NMV nhập tay' : 'Ngoài kỳ kế hoạch T11/2026–T5/2027 · nhập mục tiêu NMV';
  const tiles = [
    `<div><b>${full(R.units)}${tgtU ? ' / ' + full(tgtU) : ''} kệ</b><span>Đã bán / kế hoạch${live && hasPlan ? ` · tiến độ đến hôm nay ${full(Math.round(puToDate))} kệ` : ''}</span></div>`,
    `<div><b>${short(R.nmv)} ₫</b><span>Net GMV${tgt ? ' · ' + pct(rate, 0) + ' của ' + short(tgt) + ' ₫' : ''}</span></div>`,
    live && !fut ? `<div><b>${full(Math.round(projU))} kệ · ${short(proj)} ₫</b><span>Dự phóng cuối kỳ${tgtU ? ' · ' + pct(projU / tgtU, 0) + ' kế hoạch' : ''}</span></div>`
      : `<div><b class="${tgtU && R.units < tgtU ? 'bad' : 'good'}">${tgtU ? (R.units >= tgtU ? '+' : '−') + full(Math.abs(tgtU - R.units)) + ' kệ' : '—'}</b><span>${tgtU ? (R.units >= tgtU ? 'Vượt kế hoạch' : 'Thiếu so với kế hoạch') : 'Chênh lệch kế hoạch'}</span></div>`,
    `<div><b class="${R.units && netU < PLAN.netUnit ? 'bad' : ''}">${R.units ? short(netU) + ' ₫' : '—'}</b><span>Thực về/kệ (sau phí sàn, voucher, Ads) · KH ${short(PLAN.netUnit)} ₫</span></div>`,
    tgtU && live ? `<div><b>${full(Math.max(0, Math.ceil((tgtU - R.units) / Math.max(1, b - t + 1))))} kệ/ngày</b><span>Cần bán mỗi ngày còn lại đến ${dmy(b)} (${b - t + 1} ngày, gồm hôm nay)</span></div>` : ''
  ];
  $('#targetCard').innerHTML = `<div class="card-h"><div><h3>Mục tiêu theo kế hoạch</h3><p class="card-sub">${sub}</p></div>
    <label class="target-input"><input id="targetInput" inputmode="numeric" placeholder="${tgtU ? 'Theo kế hoạch: ' + full(Math.round(pu * PLAN.floor)) : 'Nhập mục tiêu, VD 30.000.000'}" value="${manual ? full(manual) : ''}" aria-label="Mục tiêu NMV"></label></div>
    <div class="ring-row"><div class="ring" style="--p:${Math.min(100, (tgtU ? rateU : rate) * 100).toFixed(1)}"><b>${tgtU ? pct(rateU, 0) : tgt ? pct(rate, 0) : '—'}</b><span>${tgtU ? 'kệ đã đạt' : 'NMV đã đạt'}</span></div>
    <div class="target-meta">${tiles.join('')}</div></div>`;
  $('#targetInput').addEventListener('change', e => { const v = +String(e.target.value).replace(/\D/g, ''); if (v) store.set(key, v); else store.del(key); renderTarget(); });
}

/* ===== KPI P&L kệ 3 tầng (bảng kế hoạch T11/2026–T5/2027) ===== */
const KPI_M = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'];
const KPI_PLAN = {
  units: [95, 300, 555, 333, 400, 480, 537],
  fx: [3944115, 12455100, 23041935, 13825161, 16606800, 19928160, 22294629],
  tx: [1795500, 5670000, 10489500, 6293700, 7560000, 9072000, 10149300],
  sv: [1556100, 4914000, 9090900, 5454540, 6552000, 7862400, 8796060],
  aff: [2992500, 9450000, 17482500, 10489500, 12600000, 15120000, 16915500],
  pi: [479940, 1515600, 2803860, 1682316, 2020800, 2424960, 2712924],
  ads: [1197000, 3780000, 6993000, 4195800, 5040000, 6048000, 6766200]
};
const KPI_LIST = 700000, KPI_TAX = 20000000, KPI_COM = 0.03;
let KPI_SEL = null;
function kpiPlan(i) { // i = index tháng, hoặc 'all'
  const ix = i === 'all' ? KPI_M.map((_, j) => j) : [i], g = k => ix.reduce((s, j) => s + KPI_PLAN[k][j], 0);
  const u = g('units'), nmv = u * PLAN.floor, fee = g('fx') + g('tx') + g('sv') + g('aff') + g('pi'), ads = g('ads'), tax = KPI_TAX * ix.length;
  const netRev = nmv - fee - ads, com = Math.round(netRev * KPI_COM);
  return { u, gmv: u * KPI_LIST, nmv, fx: g('fx'), tx: g('tx'), sv: g('sv'), aff: g('aff'), pi: g('pi'), fee, ads, sh: 0, feeAds: fee + ads, tax, netRev, com, profit: netRev - com - tax };
}
function kpiActual(a, b) {
  const R = agg(a, b), gmv = sum(R.ok, o => ((LIST[o.sku] || {}).list || KPI_LIST) * o.q), ads = R.A.paid;
  const netRev = R.nmv - R.fee - R.sh - ads, com = Math.round(netRev * KPI_COM), months = new Set(); for (let k = a; k <= b; k += 28) months.add(monthKey(k)); months.add(monthKey(b));
  const tax = KPI_TAX * months.size;
  return { u: R.units, gmv, nmv: R.nmv, fx: R.fx, tx: R.tx, sv: R.sv, aff: null, pi: R.pi, fee: R.fee, ads, sh: R.sh, feeAds: R.fee + R.sh + ads, tax, netRev, com, profit: netRev - com - tax, orders: R.orders };
}
function kpiCharts(i, all, t) {
  const ms = KPI_M.map(m => isoToKey(m + '-01')), act = ms.map((a, j) => t >= a ? kpiActual(a, Math.min(monthEnd(monthKey(a)), t)) : null);
  colChart($('#kpiAllChart'), { labels: KPI_M.map(m => 'T' + +m.slice(5)), series: [{ vals: KPI_PLAN.units, color: 'var(--fill-3, #c9c9c9)' }, { vals: act.map(x => x ? x.u : 0), color: 'var(--c-brand)' }], grouped: true,
    lines: [{ vals: KPI_M.map((_, j) => kpiPlan(j).netRev), color: 'var(--label-2)', dash: '5 4', width: 1.8 }, { vals: act.map(x => x ? x.netRev : null), color: 'var(--c-blue)' }],
    yFmt: full, y2Fmt: short, barLabels: false, height: 240, every: 1, active: all ? null : i, aria: 'Kệ và Net Revenue kế hoạch so với thực tế theo tháng',
    tipFn: j => { const p = kpiPlan(j), a = act[j]; return `<b>Tháng ${KPI_M[j].slice(5)}/${KPI_M[j].slice(0, 4)}</b>` + tipRows([['Kệ KH / thực tế', `${full(p.u)} / ${a ? full(a.u) : '–'}`, 'var(--c-brand)'], ['Net GMV KH / thực tế', `${short(p.nmv)} / ${a ? short(a.nmv) : '–'}`], ['Net Revenue KH / thực tế', `${short(p.netRev)} / ${a ? short(a.netRev) : '–'}`, 'var(--c-blue)'], ['Profit KH / thực tế', `${short(p.profit)} / ${a ? short(a.profit) : '–'}`]]) + '<div class="tr muted"><span>Bấm để xem tháng này</span></div>'; },
    onClick: j => { KPI_SEL = j; renderKpi(); } });
  let labels, bars, cumA, cumP, tips;
  if (all) {
    labels = KPI_M.map(m => 'T' + +m.slice(5)); bars = act.map(x => x ? x.u : 0); let s1 = 0, s2 = 0;
    cumA = act.map(x => x ? (s1 += x.u) : null); cumP = KPI_PLAN.units.map(u => (s2 += u)); tips = labels.map((l, j) => 'Tháng ' + KPI_M[j].slice(5) + '/' + KPI_M[j].slice(0, 4));
    $('#kpiOneTitle').textContent = 'Lũy kế cả kỳ · kệ';
  } else {
    const a = isoToKey(KPI_M[i] + '-01'), e = monthEnd(monthKey(a)), nd = e - a + 1, per = KPI_PLAN.units[i] / nd; labels = []; bars = []; cumA = []; cumP = []; tips = [];
    const byDay = {}; ORDERS.forEach(o => { if (!o.cx && o.day >= a && o.day <= e) byDay[o.day] = (byDay[o.day] || 0) + o.q; });
    let c = 0; for (let d = a; d <= e; d++) { labels.push(String(keyToDate(d).getUTCDate())); bars.push(byDay[d] || 0); c += byDay[d] || 0; cumA.push(d <= t ? c : null); cumP.push(Math.round(per * (d - a + 1) * 10) / 10); tips.push(dmy(d)); }
    $('#kpiOneTitle').textContent = `Tháng ${+KPI_M[i].slice(5)}/${KPI_M[i].slice(0, 4)} · kệ theo ngày`;
  }
  colChart($('#kpiOneChart'), { labels, series: [{ vals: bars, color: 'var(--c-brand)' }], lines: [{ vals: cumP, color: 'var(--label-2)', dash: '5 4', width: 1.8 }, { vals: cumA, color: 'var(--c-blue)' }],
    yFmt: full, y2Fmt: full, barLabel: full, height: 240, aria: 'Kệ bán và lũy kế so với kế hoạch',
    tipFn: j => `<b>${tips[j]}</b>` + tipRows([['Kệ bán', full(bars[j]), 'var(--c-brand)'], ['Lũy kế thực tế', cumA[j] != null ? full(cumA[j]) : '–', 'var(--c-blue)'], ['Lũy kế kế hoạch', full(Math.round(cumP[j]))], cumA[j] != null ? ['Chênh lệch', (cumA[j] - cumP[j] >= 0 ? '+' : '') + full(Math.round(cumA[j] - cumP[j])) + ' kệ'] : null]) });
}
function renderKpi() {
  const el = $('#kpiCard'); if (!el) return;
  if (SHOP !== 'lf') { el.innerHTML = ''; return; }
  const t = todayKey(), curM = KPI_M.indexOf(keyToISO(t).slice(0, 7));
  if (KPI_SEL === null) KPI_SEL = curM >= 0 ? curM : 0;
  const all = KPI_SEL === 'all', i = KPI_SEL;
  const a = all ? isoToKey(KPI_M[0] + '-01') : isoToKey(KPI_M[i] + '-01');
  const mEnd = all ? monthEnd(monthKey(isoToKey(KPI_M[6] + '-01'))) : monthEnd(monthKey(a));
  const b = Math.min(mEnd, t), live = t >= a && t < mEnd, el2 = Math.max(1, b - a + 1), span = mEnd - a + 1;
  const P_ = kpiPlan(i), A_ = t >= a ? kpiActual(a, b) : null, f = live ? span / el2 : 1;
  const rows = [
    ['Sản lượng bán (kệ)', 'u', 'n', 'up'], ['GMV niêm yết', 'gmv', 'm', 'up'], ['Doanh thu thực tế (Net GMV)', 'nmv', 'm', 'up', 'b'],
    ['Phí cố định sàn', 'fx', 'm', 'dn', 's'], ['Phí xử lý giao dịch', 'tx', 'm', 'dn', 's'], ['Phí dịch vụ (gói Voucher Xtra)', 'sv', 'm', 'dn', 's'],
    ['Hoa hồng Affiliate (10%)', 'aff', 'm', 'dn', 's'], ['Phí hạ tầng / PiShip', 'pi', 'm', 'dn', 's'], ['Tổng chi phí sàn', 'fee', 'm', 'dn', 'b'],
    ['Voucher shop', 'sh', 'm', 'dn', 's'], ['Chi phí quảng cáo (LF nạp)', 'ads', 'm', 'dn', 's'], ['Tổng chi phí sàn & Ads', 'feeAds', 'm', 'dn', 'b'],
    ['Thuế khoán', 'tax', 'm', 'dn', 's'], ['Doanh thu thuần thực về (Net Revenue)', 'netRev', 'm', 'up', 'hl'], ['Commission (3%)', 'com', 'm', 'dn', 's'],
    ['Profit (chưa gồm COGS)', 'profit', 'm', 'up', 'hl2']
  ];
  const fmt = (v, k) => v == null ? '<span class="muted">chưa có</span>' : k === 'n' ? full(v) : full(v);
  const proj = (k, v) => v == null ? null : (k === 'tax' ? v : k === 'com' ? null : v * f);
  let projNet = A_ ? (A_.netRev) * f : 0; const projProfit = A_ ? projNet - projNet * KPI_COM - A_.tax : 0;
  const body = rows.map(([l, k, ty, dir, cls]) => {
    const pv = P_[k], av = A_ ? A_[k] : null; let pj = A_ ? proj(k, av) : null;
    if (k === 'com' && A_) pj = Math.round(projNet * KPI_COM); if (k === 'profit' && A_) pj = projProfit; if (k === 'netRev' && A_) pj = projNet;
    const cmp = live ? pj : av, r = pv && cmp != null ? cmp / pv : null;
    const good = r == null ? '' : (dir === 'up' ? r >= 1 : r <= 1) ? 'good' : 'bad';
    const rTxt = r == null || !pv ? '–' : (k === 'profit' && pv < 0) ? (cmp >= pv ? '<span class="good">tốt hơn</span>' : '<span class="bad">kém hơn</span>') : `<span class="${good}">${pct(r, 0)}</span>`;
    return `<tr class="${cls || ''}"><td>${l}</td><td class="r">${fmt(pv, ty)}</td><td class="r">${A_ ? fmt(av, ty) : '–'}</td>${live ? `<td class="r">${pj == null ? '–' : fmt(Math.round(pj), ty)}</td>` : ''}<td class="r">${rTxt}</td></tr>`;
  }).join('');
  const ratio = A_ && A_.nmv ? A_.netRev / A_.nmv : null, unitNet = A_ && A_.u ? A_.netRev / A_.u : null;
  const opts = KPI_M.map((m, j) => `<option value="${j}"${j === i ? ' selected' : ''}>Tháng ${+m.slice(5)}/${m.slice(0, 4)}</option>`).join('') + `<option value="all"${all ? ' selected' : ''}>Tổng lũy kế T11/2026–T5/2027</option>`;
  el.innerHTML = `<div class="card-h"><div><h3>KPI kế hoạch kệ 3 tầng</h3><p class="card-sub">Bảng KPI so với thực tế Shopee${live ? ` · thực tế đến ${dmy(b)}, dự phóng = thực tế ÷ ${el2} ngày × ${span} ngày` : ''}. % đạt ${live ? 'tính theo dự phóng' : 'tính theo thực tế'}.</p></div>
    <label class="target-input"><select id="kpiSel" aria-label="Chọn tháng KPI">${opts}</select></label></div>
    <div class="kpi-mini"><div><b>${A_ ? full(A_.u) : 0} / ${full(P_.u)}</b><span>Kệ thực tế / kế hoạch</span></div>
      <div><b>${unitNet != null ? short(unitNet) + ' ₫' : '—'}</b><span>Thực về TB/kệ · KH ${short(PLAN.netUnit)} ₫</span></div>
      <div><b>${ratio != null ? pct(ratio) : '—'}</b><span>Biên thực thu / Net GMV · KH 60,02%</span></div>
      <div><b class="${A_ && (live ? projProfit : A_.profit) >= P_.profit ? 'good' : 'bad'}">${A_ ? short(live ? projProfit : A_.profit) + ' ₫' : '—'}</b><span>${live ? 'Profit dự phóng' : 'Profit thực tế'} · KH ${short(P_.profit)} ₫</span></div></div>
    <div class="cards-2 kpi-charts"><div><h4>Cả kỳ kế hoạch · theo tháng</h4><div class="chart" id="kpiAllChart"></div><div class="legend"><span><i class="lg-bar" style="--c:var(--fill-3, #c9c9c9)"></i>Kệ kế hoạch</span><span><i class="lg-bar" style="--c:var(--c-brand)"></i>Kệ thực tế</span><span><i class="lg-line lg-dash" style="--c:var(--label-2)"></i>Net Revenue KH</span><span><i class="lg-line" style="--c:var(--c-blue)"></i>Net Revenue thực tế (₫, trục phải)</span></div></div>
      <div><h4 id="kpiOneTitle"></h4><div class="chart" id="kpiOneChart"></div><div class="legend"><span><i class="lg-bar" style="--c:var(--c-brand)"></i>Kệ bán</span><span><i class="lg-line lg-dash" style="--c:var(--label-2)"></i>Lũy kế kế hoạch</span><span><i class="lg-line" style="--c:var(--c-blue)"></i>Lũy kế thực tế (trục phải)</span></div></div></div>
    <div class="tbl-scroll"><table class="kpitable"><thead><tr><th>Hạng mục</th><th class="r">Kế hoạch</th><th class="r">Thực tế</th>${live ? '<th class="r">Dự phóng</th>' : ''}<th class="r">% đạt</th></tr></thead><tbody>${body}</tbody></table></div>
    <p class="card-sub" style="margin-top:10px">Thực tế: Phí dịch vụ Shopee gộp gói Voucher Xtra; Affiliate chưa có trong dữ liệu đơn. Ads tính phần LF nạp (không gồm Ads Shopee tặng). Net Revenue thực tế đã trừ thêm voucher shop. Thuế khoán 20 tr/tháng.</p>`;
  kpiCharts(i, all, t);
  $('#kpiSel').addEventListener('change', e => { KPI_SEL = e.target.value === 'all' ? 'all' : +e.target.value; renderKpi(); });
}
function renderChannels() {
  const rows = [['Shopee', C.nmv, true], ['TikTok Shop', 0, false], ['Lazada', 0, false], ['Website', 0, false]];
  $('#channelCard').innerHTML = `<div class="card-h"><div><h3>Thị phần theo kênh</h3><p class="card-sub">NMV · tổng ${short(C.nmv)} ₫</p></div></div>` +
    rows.map(([nm, v, on]) => `<div class="ch-row ${on ? '' : 'na'}"><span>${nm}</span><div class="bar"><b style="width:${on && C.nmv ? 100 : 0}%"></b></div><span class="v">${on ? (C.nmv ? '100%' : '0%') : 'Chưa kết nối'}</span></div>`).join('') +
    `<p class="foot-note">Khi có thêm kênh, dữ liệu sẽ gộp vào đây theo cùng định nghĩa NMV.</p>`;
}

/* ---------- sales ---------- */
const dayTip = (title, os, ads) => {
  const ok = os.filter(o => !o.cx), nmv = sum(ok, o => o.v), q = sum(ok, o => o.q), net = sum(ok, o => o.prodNet), fee = sum(ok, o => o.fee);
  return `<b>${title}</b>` + tipRows([['NMV', money(nmv), 'var(--c-brand)'], ['GMV', money(sum(os, o => o.v))], ['Đơn hợp lệ / hủy', `${ok.length} / ${os.length - ok.length}`], ['Sản phẩm', q], ['Phí sàn', money(fee) + (nmv ? ' · ' + pct(fee / nmv) : '')], ['Thực thu sản phẩm', money(net)],
    ads && (ads.cost || ads.imp) ? ['Chi phí Ads', money(ads.cost) + (ads.free ? ` (tặng ${short(ads.free)})` : ''), 'var(--c-ads)'] : null]);
};
function renderDaily() {
  const n = C.days, g = S.grain || (n > 400 ? 'month' : n > 120 ? 'week' : 'day');
  $$('#dailyMetric button').forEach(b => b.classList.toggle('on', b.dataset.m === g));
  const keyOf = d => g === 'day' ? d : g === 'week' ? d - ((keyToDate(d).getUTCDay() + 6) % 7) : monthStart(monthKey(d));
  const starts = []; for (let d = C.a; d <= C.b; d++) { const k = keyOf(d); if (!starts.length || starts[starts.length - 1] !== k) starts.push(k); }
  const idx = new Map(starts.map((k, i) => [k, i])), B = starts.length;
  const units = Array(B).fill(0), nmv = Array(B).fill(0), gmv = Array(B).fill(0), cost = Array(B).fill(0), buckets = Array.from({ length: B }, () => []), adsB = Array.from({ length: B }, () => ({ cost: 0, free: 0, imp: 0 }));
  C.os.forEach(o => { const i = idx.get(keyOf(o.day)); if (i == null) return; buckets[i].push(o); gmv[i] += o.v; if (!o.cx) { units[i] += o.q; nmv[i] += o.v; } });
  C.ads.forEach(r => { const i = idx.get(keyOf(r.day)); if (i == null) return; cost[i] += r.cost; adsB[i].cost += r.cost; adsB[i].free += r.free; adsB[i].imp += r.imp; });
  const lab = k => g === 'month' ? monthLabel(monthKey(k)) : dm(k);
  const title = (k, i) => g === 'day' ? dmy(k) : g === 'week' ? `Tuần ${dm(Math.max(k, C.a))} – ${dm(Math.min(k + 6, C.b))}` : monthLabel(monthKey(k));
  colChart($('#dailyChart'), { labels: starts.map(lab), series: [{ vals: units, color: 'var(--c-brand)' }],
    lines: [{ vals: nmv, color: 'var(--c-blue)' }, { vals: gmv, color: 'var(--label-2)', dash: '5 4', width: 1.8 }, { vals: cost, color: 'var(--c-ads)' }],
    yFmt: full, barLabel: v => full(v), y2Fmt: short, height: 290, aria: 'Sản phẩm bán, NMV, GMV và Ads theo ' + { day: 'ngày', week: 'tuần', month: 'tháng' }[g],
    tipFn: i => dayTip(title(starts[i], i), buckets[i], adsB[i]) });
  $('#dailyLegend').innerHTML = `<span><i class="lg-bar" style="--c:var(--c-brand)"></i>Cột: sản phẩm bán (trục trái)</span><span><i class="lg-line" style="--c:var(--c-blue)"></i>NMV</span><span><i class="lg-line lg-dash" style="--c:var(--label-2)"></i>GMV (gồm đơn hủy)</span><span><i class="lg-line" style="--c:var(--c-ads)"></i>Chi phí Ads (đường: ₫, trục phải)</span>`;
  $('#dailyNote').textContent = { day: 'Theo ngày', week: 'Theo tuần (thứ 2 – CN)', month: 'Theo tháng' }[g] + ' · số trên đầu cột là sản phẩm bán';
  $('#dailyTitle').textContent = 'Doanh số theo ' + { day: 'ngày', week: 'tuần', month: 'tháng' }[g];
}
function renderMonthly() {
  const all = ORDERS.filter(o => (!S.sku || o.sku === S.sku || (o.skus && o.skus.includes(S.sku))) && (!S.region || o.region === S.region) && (!S.carrier || o.car === S.carrier) && (S.hour === null || o.hour === S.hour));
  if (!all.length) { $('#monthlyChart').innerHTML = '<p class="empty-note">Chưa có dữ liệu.</p>'; return; }
  const m0 = monthKey(Math.min(...all.map(o => o.day))), m1 = monthKey(todayKey()), mk = []; for (let k = m0; k <= m1; k++) mk.push(k);
  const m = S.monthlyMetric, f = { nmv: o => (o.cx ? 0 : o.v), gmv: o => o.v, units: o => (o.cx ? 0 : o.q) }[m], isMoney = m !== 'units';
  const groups = mk.map(k => all.filter(o => monthKey(o.day) === k)), adsM = mk.map(k => { const a = ADS.filter(r => monthKey(r.day) === k); return { cost: sum(a, r => r.cost), free: sum(a, r => r.free), imp: sum(a, r => r.imp) }; });
  colChart($('#monthlyChart'), { labels: mk.map(monthLabel), series: [{ vals: groups.map(g => sum(g, f)), color: 'var(--c-brand)' }], line: { vals: adsM.map(a => a.cost), color: 'var(--c-ads)' }, yFmt: isMoney ? short : full, barLabel: isMoney ? short : full, height: 250, every: 1,
    tipFn: i => dayTip(monthLabel(mk[i]), groups[i], adsM[i]) + '<div class="tr muted"><span>Bấm để xem tháng này</span></div>',
    onClick: i => setRange(monthStart(mk[i]), monthEnd(mk[i]), 'm' + mk[i]) });
  $('#monthlyLegend').innerHTML = `<span><i class="lg-bar" style="--c:var(--c-brand)"></i>Cột: ${{ nmv: 'NMV', gmv: 'GMV', units: 'Số sản phẩm' }[m]}</span><span><i class="lg-line" style="--c:var(--c-ads)"></i>Đường: chi phí Ads (trục phải)</span>`;
}
function renderWeekday() {
  const order = [1, 2, 3, 4, 5, 6, 0], g = order.map(d => C.os.filter(o => o.wd === d));
  colChart($('#weekdayChart'), { labels: order.map(d => WEEKDAYS[d]), series: [{ vals: g.map(x => sum(x.filter(o => !o.cx), o => o.v)), color: 'var(--c-brand)' }], line: { vals: g.map(x => sum(x.filter(o => !o.cx), o => o.q)), color: 'var(--c-ads)' }, y2Fmt: full, lineLabel: full, height: 250, every: 1,
    tipFn: i => dayTip('Thứ ' + (order[i] === 0 ? 'Chủ nhật' : order[i] + 1), g[i]) });
}

/* ---------- products ---------- */
function renderPrice() {
  const rows = [...groupBy(C.ok, o => o.p).entries()].map(([p, os]) => ({ p, os, q: sum(os, o => o.q), n: os.length, v: sum(os, o => o.v), net: sum(os, o => o.prodNet), fee: sum(os, o => o.fee), sh: sum(os, o => o.sh), sku: os[0].sku })).sort((a, b) => a.p - b.p);
  if (!rows.length) { $('#priceChart').innerHTML = '<p class="empty-note">Chưa có đơn trong khoảng này.</p>'; $('#priceTable').innerHTML = ''; return; }
  const top = rows.reduce((m, r) => (r.q > m.q ? r : m), rows[0]), tq = C.units || 1;
  colChart($('#priceChart'), { labels: rows.map(r => full(r.p)), series: [{ vals: rows.map(r => r.q), color: 'var(--c-brand)' }], line: { vals: rows.map(r => r.net / r.q), color: 'var(--c-blue)' },
    yFmt: full, barLabel: v => v + ' sp', lineLabel: short, height: 270, every: 1, aria: 'Số sản phẩm và thực thu theo giá bán',
    tipFn: i => { const r = rows[i], lp = (LIST[r.sku] || {}).list; return `<b>Giá bán ${money(r.p)}</b>` + tipRows([['Số sản phẩm', `${r.q} (${pct(r.q / tq, 0)} tổng)`, 'var(--c-brand)'], ['Số đơn', r.n], lp ? ['Giảm so giá niêm yết', pct(1 - r.p / lp, 0)] : null, ['Voucher shop TB/sp', money(r.sh / r.q)], ['Phí sàn TB/sp', money(r.fee / r.q)], ['Thực thu TB/sp', money(r.net / r.q), 'var(--c-blue)'], ['Tỷ lệ thực thu', pct(r.net / r.v)]]); } });
  $('#priceTable').innerHTML = `<table class="ptable"><thead><tr><th>Giá bán</th><th class="r">Số SP</th><th class="r">Tỷ trọng số lượng</th><th class="r">Thực thu / sp</th><th class="r">Tỷ lệ thực thu</th><th class="r">Phí sàn / sp</th><th class="r">Voucher shop / sp</th><th class="r">Số đơn</th></tr></thead><tbody>` +
    rows.map(r => `<tr${r === top ? ' class="hl"' : ''}><td><b>${money(r.p)}</b>${r === top ? ' <span class="pill free">mua nhiều nhất</span>' : ''}</td><td class="r">${r.q}</td><td class="r"><span class="minibar"><i style="width:${(r.q / tq * 100).toFixed(0)}%"></i></span>${pct(r.q / tq, 0)}</td><td class="r"><b>${money(r.net / r.q)}</b></td><td class="r">${pct(r.net / r.v)}</td><td class="r">${full(r.fee / r.q)}</td><td class="r">${full(r.sh / r.q)}</td><td class="r">${r.n}</td></tr>`).join('') +
    `<tr class="total"><td><b>Cả kỳ</b></td><td class="r"><b>${C.units}</b></td><td class="r">100%</td><td class="r"><b>${money(C.unitNet)}</b></td><td class="r">${pct(C.prodNet / C.nmv)}</td><td class="r">${full(C.fee / tq)}</td><td class="r">${full(C.sh / tq)}</td><td class="r">${C.orders}</td></tr></tbody></table>`;
}
function renderMulti() {
  const bucket = q => (q >= 3 ? '3+' : String(q)), keys = ['1', '2', '3+'];
  const g = keys.map(k => C.ok.filter(o => bucket(o.q) === k)), on = C.orders || 1;
  $('#multiTop').innerHTML = `<div class="big-stat"><b>${pct(C.multiRate)}</b><span>đơn mua từ 2 sản phẩm trở lên (${C.multiN}/${C.orders} đơn)</span></div><div class="big-stat sm"><b>${num2(C.upo)}</b><span>sản phẩm / đơn trung bình</span></div><div class="big-stat sm"><b>${pct(sum(C.ok.filter(o => o.q >= 2), o => o.v) / (C.nmv || 1), 0)}</b><span>NMV đến từ đơn ≥ 2 sp</span></div>`;
  colChart($('#multiChart'), { labels: keys.map(k => k + ' sp/đơn'), series: [{ vals: g.map(x => x.length), color: 'var(--c-indigo)' }], line: { vals: g.map(x => sum(x, o => o.v)), color: 'var(--c-brand)' }, yFmt: full, barLabel: v => v + ' đơn', lineLabel: short, height: 220, every: 1,
    tipFn: i => `<b>Đơn ${keys[i]} sản phẩm</b>` + tipRows([['Số đơn', `${g[i].length} (${pct(g[i].length / on, 0)})`, 'var(--c-indigo)'], ['NMV', money(sum(g[i], o => o.v)), 'var(--c-brand)'], ['Thực thu TB/sp', money(sum(g[i], o => o.prodNet) / (sum(g[i], o => o.q) || 1))], ['Voucher shop TB/đơn', money(sum(g[i], o => o.sh) / (g[i].length || 1))]]) });
}
function renderSku() {
  const rows = [...groupBy(C.ok, o => o.sku || '—').entries()].map(([k, os]) => ({ k, os, v: sum(os, o => o.v), q: sum(os, o => o.q), net: sum(os, o => o.prodNet) })).sort((a, b) => b.v - a.v);
  $('#skuTable').innerHTML = rows.length ? `<table><thead><tr><th>Phân loại</th><th class="r">SP</th><th class="r">NMV</th><th class="r">% NMV</th><th class="r">Thực thu/sp</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td><b>${esc(r.k)}</b> <span class="muted">${esc((LIST[r.k] || {}).model || r.os[0].m)}</span></td><td class="r">${r.q}</td><td class="r">${short(r.v)} ₫</td><td class="r">${pct(r.v / C.nmv)}</td><td class="r">${short(r.net / r.q)} ₫</td></tr>`).join('') + '</tbody></table>' : '<p class="empty-note">Chưa có đơn.</p>';
  const t = todayKey(), last30 = ORDERS.filter(o => !o.cx && o.day > t - 30);
  $('#stockNote').textContent = 'Tồn kho hiện tại · tốc độ bán tính trên 30 ngày gần nhất';
  $('#stockTable').innerHTML = PRODUCTS.length ? `<table class="mt"><thead><tr><th>Tồn kho</th><th class="r">Giá niêm yết</th><th class="r">Giá KM</th><th class="r">Tồn</th><th class="r">Bán/ngày</th><th class="r">Đủ bán</th></tr></thead><tbody>` +
    PRODUCTS.map(p => { const sold = sum(last30.filter(o => o.sku === p[4]), o => o.q) / 30, cover = sold ? p[7] / sold : null;
      const st = p[7] === 0 ? '<span class="status cx">Hết hàng</span>' : cover != null ? `<span class="status ${cover < 14 ? 'wait' : 'ok'}">${full(cover)} ngày</span>` : '<span class="muted">Chưa bán</span>';
      return `<tr><td><b>${esc(p[4])}</b> <span class="muted">${esc(p[3])}</span></td><td class="r">${short(p[5])}</td><td class="r">${p[6] ? short(p[6]) : '–'}</td><td class="r">${p[7] ?? '–'}</td><td class="r">${num2(sold)}</td><td class="r">${st}</td></tr>`; }).join('') + '</tbody></table>' : '';
}

/* ---------- promotions ---------- */
const SRC = { fs: ['Flash Sale', 'var(--c-ads)'], disc: ['Giá khuyến mãi thường', 'var(--c-brand)'], deal: ['Combo / mua kèm', 'var(--c-indigo)'], other: ['Giá khác', 'var(--label-3)'] };
const hm = t => { const d = new Date((t + TZ) * 1000); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
const slotLabel = f => dm(dayKey(f.a)) + ' ' + hm(f.a) + '–' + hm(f.b);
const inRange = (a, b) => b >= (S.from * DAY - TZ) && a <= ((S.to + 1) * DAY - TZ);
function renderPromos() {
  const ok = C.ok, by = k => ok.filter(o => o.src === k), n = C.nmv || 1;
  const grp = k => { const os = by(k), q = sum(os, o => o.q), v = sum(os, o => o.v); return { os, q, v, net: sum(os, o => o.prodNet), n: os.length }; };
  const G = { fs: grp('fs'), disc: grp('disc'), deal: grp('deal'), other: grp('other') };
  const slots = PROMO.fs.filter(f => inRange(f.a, f.b) && (!S.sku || true));
  const slotOrders = f => C.os.filter(o => o.fs === f.id);
  const hit = slots.filter(f => slotOrders(f).some(o => !o.cx)).length;
  const vOrders = ok.filter(o => o.sh > 0);
  const unit = g => g.q ? g.net / g.q : NaN;
  const T = [
    ['NMV từ Flash Sale', money(G.fs.v), `${pct(G.fs.v / n)} NMV · ${G.fs.n} đơn · ${G.fs.q} sp`, 'fs'],
    ['NMV giá KM thường', money(G.disc.v), `${pct(G.disc.v / n)} NMV · ${G.disc.n} đơn · ${G.disc.q} sp`, 'disc'],
    ['Thực thu / sp: Flash Sale', isFinite(unit(G.fs)) ? money(unit(G.fs)) : '–', isFinite(unit(G.disc)) ? `Giá thường: ${short(unit(G.disc))} ₫` : ''],
    ['Khung Flash Sale đã chạy', String(slots.length), slots.length ? `${hit} khung có đơn (${pct(hit / slots.length, 0)})` : 'Không có khung nào'],
    ['Đơn dùng voucher shop', String(vOrders.length), `${pct(vOrders.length / (C.orders || 1), 0)} đơn · ${short(sum(vOrders, o => o.sh))} ₫`],
    ['Combo / mua kèm', String(G.deal.n) + ' đơn', G.deal.n ? `${short(G.deal.v)} ₫ NMV` : 'Chưa có đơn combo']
  ];
  $('#promoTiles').innerHTML = T.map(([l, v, f, k]) => `<div class="tile ${k === 'fs' ? 'fs' : k === 'disc' ? 'free' : ''}"><span class="tile-l">${l}</span><span class="tile-v">${v}</span><span class="tile-f"><em>${f}</em></span></div>`).join('');
  // daily stacked chart
  const labels = [], ser = { fs: [], disc: [], deal: [], other: [] }, hrs = [], dayOs = [];
  for (let k = C.a; k <= C.b; k++) {
    labels.push(dm(k)); const os = ok.filter(o => o.day === k); dayOs.push(C.os.filter(o => o.day === k));
    for (const s2 in ser) ser[s2].push(sum(os.filter(o => o.src === s2), o => o.v));
    const a = k * DAY - TZ, b = a + DAY; hrs.push(sum(PROMO.fs.filter(f => f.b > a && f.a < b), f => (Math.min(f.b, b) - Math.max(f.a, a)) / 3600));
  }
  const series = ['fs', 'disc', 'deal', 'other'].filter(k => ser[k].some(v => v)).map(k => ({ vals: ser[k], color: SRC[k][1] }));
  colChart($('#promoChart'), { labels, series: series.length ? series : [{ vals: ser.other, color: SRC.other[1] }], line: { vals: hrs, color: 'var(--c-indigo)' }, y2Fmt: v => num2(v) + 'h', height: 260,
    tipFn: i => { const k = C.a + i, os = dayOs[i].filter(o => !o.cx), sl = PROMO.fs.filter(f => dayKey(f.a) === k);
      return `<b>${dmy(k)}</b>` + tipRows(['fs', 'disc', 'deal', 'other'].filter(s2 => ser[s2][i]).map(s2 => [SRC[s2][0], `${money(ser[s2][i])} · ${os.filter(o => o.src === s2).length} đơn`, SRC[s2][1]]).concat([
        ['Giờ chạy Flash Sale', num2(hrs[i]) + ' giờ', 'var(--c-indigo)'], sl.length ? ['Khung giờ', sl.slice().sort((x, y) => x.a - y.a).map(f => hm(f.a) + '–' + hm(f.b) + ' @' + short(f.price)).join(', ')] : null])); } });
  // flash sale slots table
  $('#fsSub').textContent = slots.length ? `${slots.length} khung trong khoảng đang chọn · đơn được tính khi đặt trong khung và đúng giá Flash Sale` : 'Không có khung Flash Sale trong khoảng đang chọn';
  $('#fsTable').innerHTML = slots.length ? `<table><thead><tr><th>Khung giờ</th><th class="r">Giá Flash Sale</th><th class="r">Kho FS</th><th class="r">Giới hạn/khách</th><th class="r">Lượt click</th><th class="r">Nhắc tôi</th><th class="r">Đơn</th><th class="r">SP</th><th class="r">NMV</th></tr></thead><tbody>` +
    slots.map(f => { const os = slotOrders(f).filter(o => !o.cx), live = Date.now() / 1000 >= f.a && Date.now() / 1000 < f.b, soon = Date.now() / 1000 < f.a;
      return `<tr class="${os.length ? 'hl' : ''}"><td>${slotLabel(f)} ${live ? '<span class="pill free">Đang chạy</span>' : soon ? '<span class="pill">Sắp tới</span>' : ''}</td><td class="r"><b>${full(f.price)}</b></td><td class="r">${f.stock}</td><td class="r">${f.lim || '–'}</td><td class="r">${f.clk || '–'}</td><td class="r">${f.rem || '–'}</td><td class="r">${os.length || '–'}</td><td class="r">${sum(os, o => o.q) || '–'}</td><td class="r">${os.length ? full(sum(os, o => o.v)) : '–'}</td></tr>`; }).join('') + '</tbody></table>' : '<p class="empty-note">Không có khung Flash Sale trong khoảng này.</p>';
  // discounts / combos / add-ons
  const KIND = { discount: 'Chương trình của shop', combo: 'Combo khuyến mãi', addon: 'Mua kèm deal sốc' }, now = Date.now() / 1000;
  const ds = PROMO.disc.filter(x => inRange(x.a, x.b));
  $('#discTable').innerHTML = ds.length ? `<table><thead><tr><th>Chương trình</th><th>Thời gian</th><th class="r">Giá</th><th class="r">Đơn</th></tr></thead><tbody>` +
    ds.map(x => { const os = ok.filter(o => x.kind === 'discount' ? o.src === 'disc' && o.discName === x.name && o.t >= x.a && o.t <= x.b : o.deal === x.kind && o.t >= x.a && o.t <= x.b);
      return `<tr><td><span class="cell2">${esc(x.name.trim() || '—')}<em>${KIND[x.kind] || x.kind}${now >= x.a && now <= x.b ? ' · <span class="up">đang chạy</span>' : ''}</em></span></td><td><span class="cell2">${dm(dayKey(x.a))} ${hm(x.a)}<em>đến ${dm(dayKey(x.b))} ${hm(x.b)}</em></span></td><td class="r">${x.price ? full(x.price) : '–'}</td><td class="r">${os.length || '–'}</td></tr>`; }).join('') + '</tbody></table>' : '<p class="empty-note">Không có chương trình trong khoảng này.</p>';
  // vouchers
  const vs = PROMO.vch.filter(v => inRange(v.a, v.b));
  $('#vchTable').innerHTML = vs.length ? `<table><thead><tr><th>Mã</th><th>Giảm</th><th class="r">Đơn tối thiểu</th><th class="r">Đã dùng</th><th class="r">Đã lưu</th></tr></thead><tbody>` +
    vs.map(v => `<tr><td><span class="cell2">${esc(v.name)}<em>${esc(v.code)}${now >= v.a && now <= v.b ? ' · <span class="up">đang chạy</span>' : ' · đến ' + dm(dayKey(v.b))}</em></span></td><td>${v.pct ? v.pct + '%' + (v.max ? ` <span class="muted">tối đa ${short(v.max)}</span>` : '') : short(v.val) + ' ₫'}</td><td class="r">${short(v.min)}</td><td class="r"><b>${v.used}</b> / ${v.lim}</td><td class="r">${v.claimed}</td></tr>`).join('') + '</tbody></table>' : '<p class="empty-note">Không có mã giảm giá trong khoảng này.</p>';
  // Shopee's own 7-day metrics per tool (latest snapshot)
  const last = {}; PROMO.kpi.forEach(r => { if (!last[r[0]] || r[2] > last[r[0]][2]) last[r[0]] = r; });
  const TN = { shop_flash_sale: 'Flash Sale của shop', discount: 'Chương trình của shop', voucher: 'Mã giảm giá', bundle_deal: 'Combo khuyến mãi', add_on_deal: 'Mua kèm deal sốc' };
  const ks = Object.keys(TN).filter(k => last[k]), any = ks[0] && last[ks[0]];
  $('#promoKpiCard').innerHTML = any ? `<div class="card-h"><div><h3>Hiệu quả theo Shopee</h3><p class="card-sub">Số Shopee tự tính cho 7 ngày ${dmy(dayKey(any[1]))} – ${dmy(dayKey(any[2]) - 1)} (không theo bộ lọc ngày). Một đơn có thể được tính ở nhiều công cụ.</p></div></div>
    <div class="tbl-scroll"><table><thead><tr><th>Công cụ</th><th class="r">Doanh số</th><th class="r">Đơn</th><th class="r">Người mua</th><th class="r">Sản phẩm</th><th class="r">Lượt dùng</th></tr></thead><tbody>` +
    ks.map(k => { const r = last[k]; return `<tr><td>${TN[k]}</td><td class="r"><b>${r[3] ? full(r[3]) + ' ₫' : '–'}</b></td><td class="r">${r[4] || '–'}</td><td class="r">${r[5] || '–'}</td><td class="r">${r[6] || '–'}</td><td class="r">${r[7] || '–'}</td></tr>`; }).join('') + '</tbody></table></div>' : '<div class="card-h"><div><h3>Hiệu quả theo Shopee</h3><p class="card-sub">Chưa có dữ liệu</p></div></div>';
}

/* ---------- region ---------- */
const placeTip = (title, os) => { const ok = os.filter(o => !o.cx), nmv = sum(ok, o => o.v); return `<b>${esc(title)}</b>` + tipRows([['NMV', money(nmv)], ['% NMV kỳ', pct(nmv / (C.nmv || 1))], ['Đơn hợp lệ / hủy', `${ok.length} / ${os.length - ok.length}`], ['Sản phẩm', sum(ok, o => o.q)], ['Thực thu TB/sp', money(sum(ok, o => o.prodNet) / (sum(ok, o => o.q) || 1))]]); };
function renderRegion() {
  const regs = ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Khác'], parts = regs.map(r => ({ l: r, v: sum(C.ok.filter(o => o.region === r), o => o.v), c: REGION_COLORS[r] })).filter(p => p.v || p.l !== 'Khác');
  donut($('#regionDonut'), parts, short(C.nmv), 'NMV', p => placeTip(p.l, C.os.filter(o => o.region === p.l)));
  $('#regionTable').innerHTML = `<table class="click"><thead><tr><th>Miền</th><th class="r">Đơn</th><th class="r">NMV</th><th class="r">%</th></tr></thead><tbody>` +
    parts.map(p => `<tr data-region="${p.l}" class="${S.region === p.l ? 'sel' : ''}"><td><span class="dot" style="background:${p.c}"></span>${p.l}</td><td class="r">${C.ok.filter(o => o.region === p.l).length}</td><td class="r">${short(p.v)} ₫</td><td class="r">${pct(p.v / (C.nmv || 1))}</td></tr>`).join('') + '</tbody></table>';
  $$('#regionTable tr[data-region]').forEach(tr => tr.addEventListener('click', () => { S.region = S.region === tr.dataset.region ? '' : tr.dataset.region; S.page = 0; render(); }));
}
function renderProv() {
  const rows = [...groupBy(C.os, o => o.prov || 'Không rõ').entries()].map(([k, os]) => { const ok = os.filter(o => !o.cx); return { key: k, l: k, os, v: sum(ok, o => o.v), sub: `${ok.length} đơn · ${sum(ok, o => o.q)} sp`, c: REGION_COLORS[regionOf(k)] }; })
    .filter(r => r.v > 0).sort((a, b) => b.v - a.v).map(r => ({ ...r, label: `${short(r.v)} ₫ <span>${pct(r.v / (C.nmv || 1), 0)}</span>` }));
  barList($('#provChart'), rows, { active: S.prov, tipFn: r => placeTip(r.l, r.os) + '<div class="tr muted"><span>Bấm để xem phường/xã</span></div>', onClick: k => { S.prov = S.prov === k ? '' : k; renderProv(); renderWard(); } });
}
function renderWard() {
  const src = S.prov ? C.os.filter(o => o.prov === S.prov) : C.os;
  const rows = [...groupBy(src, o => (S.prov ? '' : o.prov + ' · ') + o.ward).entries()].map(([k, os]) => { const ok = os.filter(o => !o.cx); return { key: k, l: S.prov ? k : os[0].ward, os, v: sum(ok, o => o.v), sub: S.prov ? `${ok.length} đơn · ${sum(ok, o => o.q)} sp` : `${esc(os[0].prov)} · ${ok.length} đơn`, c: REGION_COLORS[os[0].region] }; })
    .filter(r => r.v > 0).sort((a, b) => b.v - a.v).slice(0, S.prov ? 30 : 15).map(r => ({ ...r, label: `${short(r.v)} ₫ <span>${pct(r.v / (C.nmv || 1), 0)}</span>` }));
  $('#wardTitle').textContent = S.prov ? 'Phường / xã · ' + S.prov : 'Phường / xã';
  $('#wardSub').textContent = S.prov ? `Tất cả phường/xã có đơn ở ${S.prov}` : 'Top 15 phường/xã theo NMV trên toàn quốc · bấm một tỉnh ở trên để xem chi tiết';
  $('#wardBack').hidden = !S.prov;
  barList($('#wardChart'), rows, { tipFn: r => placeTip(r.l + ' · ' + r.os[0].prov, r.os) });
}
function renderHour() {
  const os = filterOrders(S.from, S.to, { ignoreHour: true }), g = Array.from({ length: 24 }, (_, h) => os.filter(o => o.hour === h));
  const v = g.map(x => sum(x.filter(o => !o.cx), o => o.v)), cnt = g.map(x => x.filter(o => !o.cx).length);
  colChart($('#hourChart'), { labels: v.map((_, i) => i + 'h'), series: [{ vals: v, color: 'var(--c-brand)' }], line: { vals: cnt, color: 'var(--c-ads)' }, y2Fmt: full, height: 240, every: 3, active: S.hour, barLabels: false,
    tipFn: i => dayTip(`${i}h00 – ${i}h59`, g[i]) + `<div class="tr muted"><span>${S.hour === i ? 'Bấm để bỏ lọc giờ' : 'Bấm để lọc cả dashboard theo giờ này'}</span></div>`,
    onClick: i => { S.hour = S.hour === i ? null : i; S.page = 0; render(); } });
  const top = v.map((x, i) => [i, x]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $('#hourNote').textContent = top.length ? 'Khung giờ mạnh nhất: ' + top.map(([h, x]) => `${h}h (${short(x)} ₫)`).join(' · ') : 'Chưa có đơn trong khoảng này.';
  $('#clearHour').hidden = S.hour === null;
}
function renderCarrier() {
  const cols = ['var(--c-brand)', 'var(--c-blue)', 'var(--c-ads)', 'var(--c-teal)', 'var(--c-indigo)'];
  const parts = [...groupBy(C.ok, o => o.car || '—').entries()].map(([k, os]) => ({ k, l: CARRIER_NAMES[k] || k, v: sum(os, o => o.v), os })).sort((a, b) => b.v - a.v).map((p, i) => ({ ...p, c: cols[i % cols.length] }));
  donut($('#carrierDonut'), parts, String(C.orders), 'đơn', p => placeTip(p.l, p.os));
  $('#carrierTable').innerHTML = parts.length ? `<table class="click"><thead><tr><th>Đơn vị</th><th class="r">Đơn</th><th class="r">NMV</th><th class="r">%</th></tr></thead><tbody>` +
    parts.map(p => `<tr data-car="${esc(p.k)}" class="${S.carrier === p.k ? 'sel' : ''}"><td><span class="dot" style="background:${p.c}"></span>${esc(p.l)}</td><td class="r">${p.os.length}</td><td class="r">${short(p.v)} ₫</td><td class="r">${pct(p.v / (C.nmv || 1))}</td></tr>`).join('') + '</tbody></table>' : '<p class="empty-note">Chưa có đơn.</p>';
  $$('#carrierTable tr[data-car]').forEach(tr => tr.addEventListener('click', () => { S.carrier = S.carrier === tr.dataset.car ? '' : tr.dataset.car; S.page = 0; render(); }));
}

/* ---------- express delivery & shipping channels ---------- */
function renderExpress() {
  const ok = C.ok, known = ok.filter(o => o.exp !== null), ex = known.filter(o => o.exp), n = C.nmv || 1;
  const hrs = os => { const t = os.filter(o => o.td && o.t && o.td > o.t); return t.length ? sum(t, o => (o.td - o.t) / 3600) / t.length : NaN; };
  const shipAvg = os => os.length ? sum(os, o => o.sf) / os.length : NaN, dur = h => !isFinite(h) ? '–' : h < 48 ? num2(h) + ' giờ' : num2(h / 24) + ' ngày';
  $('#expSub').textContent = !known.length ? 'Dữ liệu kênh vận chuyển sẽ có từ lần cập nhật tự động tiếp theo' : known.length < ok.length ? `Kênh vận chuyển có cho ${known.length}/${ok.length} đơn (đơn cũ hơn chưa có thông tin này) · thời gian giao tính từ lúc đặt đến lúc đơn hoàn tất trên Shopee` : 'Theo kênh vận chuyển khách chọn khi đặt · thời gian giao tính từ lúc đặt đến lúc đơn hoàn tất trên Shopee';
  const T = [['Đơn giao hỏa tốc', known.length ? `${ex.length} đơn` : '–', known.length ? `${pct(ex.length / known.length)} số đơn` : 'Chưa có dữ liệu', 'fs'],
    ['NMV hỏa tốc', known.length ? money(sum(ex, o => o.v)) : '–', known.length ? pct(sum(ex, o => o.v) / n) + ' NMV' : ''],
    ['Thời gian giao TB: hỏa tốc', dur(hrs(ex)), ''], ['Thời gian giao TB: thường', dur(hrs(known.filter(o => !o.exp))), ''],
    ['Phí ship TB/đơn: hỏa tốc', ex.length ? money(shipAvg(ex)) : '–', 'Trước trợ giá Shopee'], ['Phí ship TB/đơn: thường', known.length - ex.length ? money(shipAvg(known.filter(o => !o.exp))) : '–', 'Trước trợ giá Shopee']];
  $('#expTiles').innerHTML = T.map(([l, v, f, k]) => `<div class="tile ${k || ''}"><span class="tile-l">${l}</span><span class="tile-v">${v}</span><span class="tile-f"><em>${f}</em></span></div>`).join('');
  const rows = [...groupBy(known, o => o.chan || 'Không rõ').entries()].map(([k, os]) => ({ k, os, v: sum(os, o => o.v), exp: os.some(o => o.exp) })).sort((a, b) => b.v - a.v);
  $('#chanTable').innerHTML = rows.length ? `<table><thead><tr><th>Kênh vận chuyển</th><th class="r">Đơn</th><th class="r">% đơn</th><th class="r">NMV</th><th class="r">Phí ship TB</th><th class="r">Khách trả TB</th><th class="r">Giao TB</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${esc(r.k)} ${r.exp ? '<span class="pill spend">Hỏa tốc</span>' : ''}</td><td class="r">${r.os.length}</td><td class="r">${pct(r.os.length / known.length)}</td><td class="r">${full(r.v)}</td><td class="r">${full(shipAvg(r.os))}</td><td class="r">${full(sum(r.os, o => o.sb) / r.os.length)}</td><td class="r">${dur(hrs(r.os))}</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Chưa có dữ liệu kênh vận chuyển, sẽ có sau lần cập nhật tự động tiếp theo.</p>';
}

/* ---------- reviews ---------- */
function renderReviews() {
  const rv = REVIEWS.filter(r => r.day >= S.from && r.day <= S.to), all = REVIEWS, avg = rv.length ? sum(rv, r => r.star) / rv.length : NaN, avgAll = all.length ? sum(all, r => r.star) / all.length : NaN;
  const stars = v => '★★★★★'.slice(0, Math.round(v)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(v));
  $('#ratingCard').innerHTML = `<div class="card-h"><div><h3>Điểm đánh giá</h3><p class="card-sub">Trong khoảng đang chọn</p></div></div>
    <div class="rating-big"><div><b>${isFinite(avg) ? star1(avg) : '—'}</b><span class="stars">${isFinite(avg) ? stars(avg) : ''}</span><em>${rv.length} đánh giá · toàn thời gian ${isFinite(avgAll) ? star1(avgAll) : '—'}★ / ${all.length}</em></div>
    <div class="stars-row lg">${[5, 4, 3, 2, 1].map(s => { const c = rv.filter(r => r.star === s).length; return `<div><span>${s}★</span><i><b style="width:${rv.length ? c / rv.length * 100 : 0}%"></b></i><em>${c}</em></div>`; }).join('')}</div></div>`;
  const delivered = C.doneN, withText = rv.filter(r => r.text.trim()).length, media = rv.filter(r => r.media).length, rep = rv.filter(r => r.replied), low = rv.filter(r => r.star <= 2).length;
  const repHours = rep.length ? sum(rep.filter(r => r.rt), r => (r.rt - r.t) / 3600) / (rep.filter(r => r.rt).length || 1) : NaN;
  $('#ratingStats').innerHTML = `<div class="card-h"><div><h3>Chất lượng phản hồi</h3><p class="card-sub">Shopee chỉ cho đánh giá sau khi đơn giao thành công</p></div></div>
    <div class="stat-grid"><div><b>${delivered ? pct(Math.min(1, rv.length / delivered), 0) : '–'}</b><span>Tỷ lệ đánh giá / đơn đã giao (${rv.length}/${delivered})</span></div>
    <div><b>${rv.length ? pct(withText / rv.length, 0) : '–'}</b><span>Đánh giá có viết nhận xét</span></div><div><b>${rv.length ? pct(media / rv.length, 0) : '–'}</b><span>Có ảnh / video</span></div>
    <div><b>${rv.length ? pct(rep.length / rv.length, 0) : '–'}</b><span>Shop đã phản hồi${isFinite(repHours) ? ` · TB sau ${num2(repHours)} giờ` : ''}</span></div><div class="${low ? 'bad' : ''}"><b>${low}</b><span>Đánh giá 1–2★ cần xử lý</span></div><div><b>${all.length}</b><span>Tổng đánh giá toàn thời gian</span></div></div>`;
  $('#reviewSub').textContent = rv.length ? `${rv.length} đánh giá, mới nhất trước` : 'Chưa có đánh giá trong khoảng này';
  $('#reviewList').innerHTML = rv.length ? rv.map(r => { const o = ORDERS.find(x => x.sn === r.sn);
    return `<article class="review"><header><span class="stars">${stars(r.star)}</span><time>${tsLabel(r.t)}</time></header><p class="${r.text.trim() ? '' : 'muted'}">${r.text.trim() ? esc(r.text) : 'Khách chỉ chấm sao, không viết nhận xét.'}</p>
      <footer><span>Đơn …${esc(String(r.sn).slice(-6))}${o ? ` · ${esc(o.sku)} ${esc(o.m)} · ${money(o.p)}` : ''}${o ? ` · ${esc(o.prov)}` : ''}</span>${r.media ? `<span class="pill">${r.media} ảnh/video</span>` : ''}${r.replied ? '<span class="pill free">Đã phản hồi</span>' : '<span class="pill spend">Chưa phản hồi</span>'}</footer></article>`; }).join('')
    : '<p class="empty-note">Chưa có đánh giá trong khoảng này.</p>';
}

/* ---------- ads ---------- */
function renderAds() {
  const A = C.A, PA = P ? P.A : null, filtered = S.sku || S.region || S.carrier || S.hour !== null;
  $('#adsSub').textContent = 'Dịch vụ Hiển thị Sản phẩm · đơn tính "gián tiếp" theo Shopee' + (filtered ? ' · Ads không tách được theo bộ lọc SKU/khu vực/giờ' : '');
  const roas = A.cost ? A.gmv / A.cost : NaN, D = (c, p, inv) => PA ? delta(c, p, inv) : null, PTd = (c, p, inv) => PA ? ptDelta(c, p, inv) : null;
  const T = [['Ads LF nạp tiền', money(A.paid), D(A.paid, PA?.paid, 1), 'Tính vào chi phí', 'paid'], ['Ads Shopee tặng', money(A.free), D(A.free, PA?.free), 'Không tốn tiền', 'free'], ['Tổng chi phí Ads chạy', money(A.cost), D(A.cost, PA?.cost, 1), pct(A.cost / (C.nmv || 1)) + ' NMV'],
    ['Doanh số từ Ads', money(A.gmv), D(A.gmv, PA?.gmv), pct(A.gmv / (C.nmv || 1)) + ' NMV'], ['ROAS', num2(roas), PA ? delta(roas, PA.cost ? PA.gmv / PA.cost : NaN) : null, 'Doanh số ÷ chi phí'], ['ACOS', pct(A.cost / A.gmv), PTd(A.cost / A.gmv, PA?.cost / PA?.gmv, 1), 'Chi phí ÷ doanh số'],
    ['Lượt xem', full(A.imp), D(A.imp, PA?.imp)], ['Lượt click', full(A.clk), D(A.clk, PA?.clk)], ['CTR', pct(A.clk / A.imp, 2), PTd(A.clk / A.imp, PA?.clk / PA?.imp), 'Click ÷ xem'],
    ['CPC', A.clk ? money(A.cost / A.clk) : '–', PA ? delta(A.cost / A.clk, PA.cost / PA.clk, 1) : null, 'Chi phí ÷ click'], ['Tỉ lệ chuyển đổi', pct(A.ord / A.clk, 2), PTd(A.ord / A.clk, PA?.ord / PA?.clk), 'Đơn ÷ click'], ['Đơn / SP từ Ads', `${A.ord} / ${A.units || A.ord}`, D(A.ord, PA?.ord)]];
  $('#adsTiles').innerHTML = T.map(([l, v, d, s, k]) => `<div class="tile ${k || ''}"><span class="tile-l">${l}</span><span class="tile-v">${v}</span><span class="tile-f">${badge(d)}${s ? `<em>${s}</em>` : ''}</span></div>`).join('');
  renderWallet();
  const st = [['Lượt xem', A.imp, 'var(--c-teal)'], ['Lượt click', A.clk, 'var(--c-blue)'], ['Thêm vào giỏ', A.atc, 'var(--c-indigo)'], ['Đơn hàng', A.ord, 'var(--c-ads)'], ['Sản phẩm bán', A.units || A.ord, 'var(--c-brand)']], mx = Math.max(A.imp, 1);
  $('#funnel').innerHTML = !A.imp && !A.cost ? '<p class="empty-note">Không chạy Ads trong khoảng này.</p>' : '<div class="funnel">' + st.map(([l, v, c], i) => `<div class="fn" data-tip="${i}"><span class="fn-l">${l}</span><div class="fn-track"><div class="fn-bar" style="--c:${c};--w:${Math.max(2, Math.sqrt(v / mx) * 100).toFixed(1)}%"></div></div><span class="fn-v">${full(v)}</span>${i ? `<span class="fn-r">${pct(v / Math.max(st[i - 1][1], 1), 2)} từ ${st[i - 1][0].toLowerCase()}</span>` : ''}</div>`).join('') + '</div><p class="foot-note">Độ dài thanh vẽ theo căn bậc hai để bước nhỏ vẫn nhìn thấy.</p>';
  bindTips($('#funnel'), i => `<b>${st[+i][0]}</b>` + tipRows([['Số lượng', full(st[+i][1])], +i ? ['Từ bước trước', pct(st[+i][1] / Math.max(st[+i - 1][1], 1), 2)] : null, ['So với lượt xem', pct(st[+i][1] / mx, 3)]]), '.fn');
  const labels = [], free = [], paid = [], gmv = [], rowsD = [];
  for (let k = C.a; k <= C.b; k++) { const r = ADS.find(x => x.day === k); labels.push(dm(k)); free.push(r ? r.free : 0); paid.push(r ? r.paid : 0); gmv.push(r ? r.gmv : 0); rowsD.push(r); }
  colChart($('#adsChart'), { labels, series: [{ vals: free, color: 'var(--c-good)' }, { vals: paid, color: 'var(--c-blue)' }], line: { vals: gmv, color: 'var(--c-ads)' }, height: 250,
    tipFn: i => { const r = rowsD[i]; return `<b>${dmy(C.a + i)}</b>` + (r ? tipRows([['Chi phí (Shopee tặng)', money(r.free), 'var(--c-good)'], ['Chi phí (LF nạp)', money(r.paid), 'var(--c-blue)'], ['Doanh số Ads', money(r.gmv), 'var(--c-ads)'], ['ROAS', num2(r.cost ? r.gmv / r.cost : NaN)], ['Xem / click', `${full(r.imp)} / ${full(r.clk)}`], ['CTR', pct(r.clk / r.imp, 2)], ['Thêm giỏ / đơn', `${r.atc} / ${r.ord}`]]) : '<div class="tr muted"><span>Không chạy Ads</span></div>'); } });
  const rows = C.ads.filter(r => r.imp || r.cost).slice().reverse();
  $('#adsTable').innerHTML = rows.length ? `<table><thead><tr><th>Ngày</th><th class="r">Chi phí</th><th class="r">Nguồn</th><th class="r">Xem</th><th class="r">Click</th><th class="r">CTR</th><th class="r">Đơn</th><th class="r">Doanh số</th><th class="r">ROAS</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${dmy(r.day)}</td><td class="r">${full(r.cost)}</td><td class="r">${r.cost ? (r.paid < 1 ? '<span class="pill free">Tặng</span>' : r.free < 1 ? '<span class="pill paid">LF nạp</span>' : '<span class="pill">Cả hai</span>') : '–'}</td><td class="r">${full(r.imp)}</td><td class="r">${full(r.clk)}</td><td class="r">${pct(r.clk / r.imp, 2)}</td><td class="r">${r.ord}</td><td class="r">${full(r.gmv)}</td><td class="r">${r.cost ? num2(r.gmv / r.cost) : '–'}</td></tr>`).join('') + '</tbody></table>' : '<p class="empty-note">Không có ngày nào chạy Ads trong khoảng này.</p>';
}
function renderWallet() {
  const A = C.A, tot = (A.free + A.paid) || 1, kindLbl = { free: 'Shopee tặng', paid: 'LF nạp tiền', spend: 'Trừ khi chạy Ads' }, fromLbl = { seller_mission_free_credit: 'Nhiệm vụ người bán' };
  $('#walletCard').innerHTML = `<div class="card-h"><div><h3>Nguồn tiền chạy Ads</h3><p class="card-sub">Theo sổ giao dịch tài khoản Dịch vụ Hiển thị</p></div></div>
    <div class="split-hero"><div class="sh paid"><span>Ads LF nạp tiền</span><b>${money(A.paid)}</b><em>${pct(A.paid / tot, 0)} · tính vào chi phí</em></div><div class="sh free"><span>Ads Shopee tặng</span><b>${money(A.free)}</b><em>${pct(A.free / tot, 0)} · không tốn tiền</em></div></div>
    <div class="stack big"><i style="width:${(A.paid / tot * 100).toFixed(1)}%;background:var(--c-blue)"></i><i style="width:${(A.free / tot * 100).toFixed(1)}%;background:var(--c-good)"></i></div>
    <div class="mrows">
      <div class="mr"><span class="mr-k">Tổng LF đã nạp (toàn thời gian)</span><span class="mr-v">${money(WALLET.paidIn)}</span><span></span><span></span></div>
      <div class="mr"><span class="mr-k">Tổng Shopee đã tặng</span><span class="mr-v">${money(WALLET.freeIn)}</span><span></span><span></span></div>
      <div class="mr"><span class="mr-k">Đã dùng: tiền nạp · tiền tặng</span><span class="mr-v">${full(WALLET.paidUsed)} · ${full(WALLET.freeUsed)} ₫</span><span></span><span></span></div>
      <div class="mr"><span class="mr-k">Số dư còn lại: nạp · tặng</span><span class="mr-v">${full(Math.max(0, WALLET.paidBal))} · ${full(Math.max(0, WALLET.freeBal))} ₫</span><span></span><span></span></div>
    </div>${WALLET.hasLedger ? '' : '<p class="note">Chưa có sổ giao dịch Ads nên toàn bộ chi phí Ads đang được tính là tiền LF nạp.</p>'}`;
  const rows = LEDGER.filter(e => e.day >= S.from && e.day <= S.to).slice().reverse();
  $('#ledgerTable').innerHTML = rows.length ? `<table><thead><tr><th>Ngày</th><th>Loại</th><th>Nguồn</th><th class="r">Số tiền</th></tr></thead><tbody>` +
    rows.map(e => `<tr><td>${dmy(e.day)}</td><td><span class="pill ${e.kind}">${kindLbl[e.kind] || esc(e.kind)}</span></td><td class="muted">${esc(e.kind === 'spend' ? 'Dịch vụ Hiển thị Sản phẩm' : (fromLbl[e.from] || e.from || '—'))}</td><td class="r ${e.kind === 'spend' ? '' : 'up'}">${e.kind === 'spend' ? '−' : '+'}${full(e.amt)} ₫</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Không có giao dịch Ads trong khoảng này.</p>';
}

/* ---------- orders ---------- */
const PAGE = 20;
function orderRows() {
  const q = S.q.trim().toLowerCase();
  const rows = C.os.filter(o => (!S.status || o.cls === S.status) && (!q || (o.sn + ' ' + o.prov + ' ' + o.ward + ' ' + o.sku + ' ' + o.m + ' ' + o.s).toLowerCase().includes(q)));
  const key = { t: o => o.t, v: o => o.v, q: o => o.q, fee: o => o.fee, inc: o => o.income, net: o => o.prodNet, prov: o => o.prov }[S.sort] || (o => o.t);
  return rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * S.dir; });
}
function renderOrders() {
  const rows = orderRows(), pages = Math.max(1, Math.ceil(rows.length / PAGE)); S.page = Math.min(S.page, pages - 1);
  $('#ordersSub').textContent = `${C.totalN} đơn trong khoảng · ${C.orders} hợp lệ · ${C.cxN} hủy · rê vào dòng để xem chi tiết phí`;
  const th = (k, l, r) => `<th class="sortable ${r ? 'r' : ''}" data-sort="${k}">${l}${S.sort === k ? (S.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
  const fmtT = t => { const d = new Date((t + TZ) * 1000); return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const page = rows.slice(S.page * PAGE, S.page * PAGE + PAGE);
  $('#ordersTable').innerHTML = rows.length ? `<table class="otable"><thead><tr><th>Mã đơn</th>${th('t', 'Ngày đặt')}<th>Trạng thái</th>${th('prov', 'Khu vực')}<th>Phân loại</th>${th('q', 'SL', 1)}${th('v', 'NMV', 1)}${th('fee', 'Phí sàn', 1)}<th class="r">Voucher shop</th>${th('net', 'Thực thu SP', 1)}${th('inc', 'Shopee chuyển', 1)}</tr></thead><tbody>` +
    page.map((o, i) => `<tr data-tip="${i}"><td class="sn">${esc(o.sn)}</td><td>${fmtT(o.t)}</td><td><span class="status ${o.cls}">${esc(o.s || '—')}</span></td><td><span class="cell2">${esc(o.ward)}<em>${esc(o.prov)}</em></span></td><td>${esc(o.sku)} <span class="muted">${esc(o.m)}</span></td><td class="r">${o.q}</td><td class="r">${o.cx ? '<s class="muted">' + full(o.v) + '</s>' : full(o.v)}</td><td class="r">${o.cx ? '–' : full(o.fee)}</td><td class="r">${o.cx || !o.sh ? '–' : full(o.sh)}</td><td class="r"><b>${o.cx ? '–' : full(o.prodNet)}</b></td><td class="r">${o.cx ? '–' : full(o.income)}${o.cx ? '' : o.fin ? '<em class="tag ok">đã chốt</em>' : '<em class="tag">ước tính</em>'}</td></tr>`).join('') + '</tbody></table>'
    : '<p class="empty-note">Không có đơn khớp bộ lọc.</p>';
  bindTips($('#ordersTable'), i => { const o = page[+i]; if (o.cx) return `<b>${esc(o.sn)}</b><div class="tr"><span>Đơn đã hủy, không tính NMV</span></div>`;
    return `<b>${esc(o.sn)} · ${o.q} × ${money(o.p)}</b>` + tipRows([o.chan ? ['Vận chuyển', esc(o.chan) + (o.exp ? ' · hỏa tốc' : '')] : null, ['Nguồn giá', SRC[o.src][0] + (o.discName ? ' · ' + esc(o.discName) : '')], ['NMV', money(o.v)], ['Phí cố định', '−' + full(o.fx) + ' · ' + pct(o.fx / o.v)], ['Phí dịch vụ', '−' + full(o.sv) + ' · ' + pct(o.sv / o.v)], ['Phí xử lý GD', '−' + full(o.tx) + ' · ' + pct(o.tx / o.v)], ['PiShip', '−' + full(o.pi)], ['Voucher shop', '−' + full(o.sh)],
      ['= Thực thu sản phẩm', money(o.prodNet) + ' · ' + pct(o.prodNet / o.v)], o.shipNet ? ['Ship đi qua (khách trả/trợ giá)', (o.shipNet > 0 ? '+' : '') + full(o.shipNet)] : null, ['Shopee chuyển', money(o.income) + (o.fin ? ' (đã chốt)' : ' (ước tính)')], o.recon != null ? ['Đối soát với Shopee', o.recon === 0 ? '✓ khớp' : 'lệch ' + full(o.recon)] : null]); }, 'tbody tr');
  $$('#ordersTable th[data-sort]').forEach(h => h.addEventListener('click', () => { const k = h.dataset.sort; S.dir = S.sort === k ? -S.dir : -1; S.sort = k; renderOrders(); }));
  $('#pager').innerHTML = rows.length > PAGE ? `<span>${S.page * PAGE + 1}–${Math.min(rows.length, (S.page + 1) * PAGE)} / ${rows.length} đơn</span><div><button class="btn-ghost sm" data-pg="-1" ${S.page ? '' : 'disabled'}>Trước</button><button class="btn-ghost sm" data-pg="1" ${S.page < pages - 1 ? '' : 'disabled'}>Sau</button></div>` : `<span>${rows.length} đơn</span>`;
  $$('#pager [data-pg]').forEach(b => b.addEventListener('click', () => { S.page += +b.dataset.pg; renderOrders(); }));
}

/* ================= controls ================= */
function syncControls() {
  $('#dFrom').value = keyToISO(S.from); $('#dTo').value = keyToISO(S.to);
  $$('#presets button').forEach(b => b.classList.toggle('on', b.dataset.p === S.preset));
  $('#monthSel').value = S.preset.startsWith('m') && S.preset.length > 2 ? S.preset.slice(1) : '';
  $('#cmpSel').value = S.cmp; $('#skuSel').value = S.sku; $('#regionSel').value = S.region; $('#carrierSel').value = S.carrier;
}
function setRange(a, b, preset) { if (a > b) [a, b] = [b, a]; S.from = a; S.to = b; S.preset = preset || 'custom'; S.page = 0; S.prov = ''; store.set('lf-range', JSON.stringify({ a, b, p: S.preset })); render(); }
function buildSelectors() {
  const [a] = dataBounds(), m0 = monthKey(a), m1 = monthKey(todayKey());
  let h = '<option value="">Chọn tháng…</option>'; for (let k = m1; k >= m0; k--) h += `<option value="${k}">${monthLabel(k)}</option>`; $('#monthSel').innerHTML = h;
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
  $('#resetFilters').addEventListener('click', () => { Object.assign(S, { sku: '', region: '', carrier: '', hour: null, prov: '', q: '', status: '', page: 0 }); $('#orderSearch').value = ''; $$('#statusSeg button').forEach(b => b.classList.toggle('on', !b.dataset.s)); render(); });
  $('#clearHour').addEventListener('click', () => { S.hour = null; render(); });
  $('#wardBack').addEventListener('click', () => { S.prov = ''; renderProv(); renderWard(); });
  const seg = (id, key, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S[key] = b.dataset.m ?? b.dataset.s; $$(id + ' button').forEach(x => x.classList.toggle('on', x === b)); if (key === 'status') S.page = 0; fn(); });
  seg('#dailyMetric', 'grain', renderDaily); seg('#monthlyMetric', 'monthlyMetric', renderMonthly); seg('#statusSeg', 'status', renderOrders);
  let qt; $('#orderSearch').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; S.page = 0; renderOrders(); }, 150); });
  $('#exportBtn').addEventListener('click', exportCSV);
  $('#themeBtn').addEventListener('click', () => { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; store.set('lf-theme', r.dataset.theme); });
  $('#logoutBtn').addEventListener('click', () => { store.del('lf-key'); store.del('lf-keys'); location.reload(); });
  $('#shopSel').addEventListener('change', e => loadShop(e.target.value));
  let sq; $('#skuSearch').addEventListener('input', e => { clearTimeout(sq); sq = setTimeout(() => { SKU_Q = e.target.value; renderSkus(); }, 150); });
  $('#openFilters').addEventListener('click', openSheet); $('#tabFilters').addEventListener('click', openSheet); $('#closeFilters').addEventListener('click', closeSheet); $('#scrim').addEventListener('click', closeSheet);
  const secs = ['overview', 'sales', 'products', 'promos', 'customers', 'reviews', 'ads', 'orders'], names = { overview: 'Tổng quan', sales: 'Doanh số', products: 'Sản phẩm & giá', promos: 'Khuyến mãi & Flash Sale', customers: 'Khách hàng & khu vực', reviews: 'Đánh giá', ads: 'Shopee Ads', orders: 'Đơn hàng' };
  const onScroll = () => { $('#toolbar').classList.toggle('scrolled', scrollY > 60); let cur = 'overview'; secs.forEach(id => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) cur = id; });
    $('#tbTitle').textContent = names[cur]; $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === cur || ((cur === 'products' || cur === 'promos') && a.dataset.nav === 'sales' && a.closest('.tabbar')) || (cur === 'reviews' && a.dataset.nav === 'customers' && a.closest('.tabbar')) || (cur === 'orders' && a.dataset.nav === 'ads' && a.closest('.tabbar')))); };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true }); onScroll();
  let rw = innerWidth, rt; addEventListener('resize', () => { if (Math.abs(innerWidth - rw) < 20) return; rw = innerWidth; clearTimeout(rt); rt = setTimeout(render, 160); });
  $$('.side-nav a').forEach(a => a.addEventListener('click', closeSheet));
}
function openSheet() { $('#sidebar').classList.add('open'); $('#scrim').hidden = false; }
function closeSheet() { $('#sidebar').classList.remove('open'); $('#scrim').hidden = true; }
function exportCSV() {
  const rows = orderRows(), head = ['Mã đơn', 'Ngày đặt', 'Trạng thái', 'Phường/xã', 'Tỉnh/thành', 'Miền', 'SKU', 'Phân loại', 'SL', 'Giá bán', 'NMV', 'Khách trả', 'Phí cố định', 'Phí dịch vụ', 'Phí xử lý GD', 'PiShip', 'Tổng phí sàn', 'Voucher shop', 'Voucher Shopee', 'Thực thu sản phẩm', 'Ship đi qua', 'Shopee chuyển', 'Đã chốt', 'Đối soát', 'ĐVVC'];
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = rows.map(o => [o.sn, tsLabel(o.t), o.s, o.ward, o.prov, o.region, o.sku, o.m, o.q, o.p, o.cx ? 0 : o.v, o.paid, o.fx, o.sv, o.tx, o.pi, o.fee, o.sh, o.pv, o.cx ? 0 : o.prodNet, o.shipNet, o.cx ? 0 : o.income, o.fin ? 'có' : 'ước tính', o.recon == null ? '' : o.recon === 0 ? 'khớp' : 'lệch ' + o.recon, o.car].map(q).join(','));
  const blob = new Blob(['﻿' + [head.map(q).join(',')].concat(lines).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${SHOPS[SHOP].slug}-shopee_${keyToISO(S.from)}_${keyToISO(S.to)}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ================= boot ================= */
function applyShop(shop) {
  SHOP = shop; const c = SHOPS[shop]; document.documentElement.dataset.shop = shop; store.set('lf-shop', shop);
  $$('.side-logo').forEach(i => { i.src = c.logo; i.alt = c.name; }); $('.side-sub').textContent = c.sub;
  const avail = Object.keys(SHOPS).filter(k => KEYS[k]);
  $('#shopSel').innerHTML = avail.map(k => `<option value="${k}"${k === shop ? ' selected' : ''}>${esc(SHOPS[k].name)}</option>`).join('');
  $('#shopSel').disabled = avail.length < 2; $('.side-title-text').textContent = c.name;
  document.title = c.name + ' · Shopee Performance';
}
function start(d) {
  prepare(d);
  const at = META.at ? new Date((META.at + TZ) * 1000) : null;
  $('#syncInfo').innerHTML = at && META.at ? `Đồng bộ lúc <b>${p2(at.getUTCHours())}:${p2(at.getUTCMinutes())} ${p2(at.getUTCDate())}/${p2(at.getUTCMonth() + 1)}/${at.getUTCFullYear()}</b>` : 'Chưa có dữ liệu đồng bộ';
  S.cmp = store.get('lf-cmp') || 'prev';
  Object.assign(S, { sku: '', region: '', carrier: '', hour: null, prov: '', q: '', status: '', page: 0 });
  buildSelectors(); if (!BOUND) { bind(); BOUND = true; }
  let saved = null; try { saved = JSON.parse(store.get('lf-range') || 'null'); } catch (e) {}
  if (saved && saved.p && saved.p !== 'custom' && !saved.p.startsWith('m')) { const [a, b] = presetRange(saved.p); Object.assign(S, { from: a, to: b, preset: saved.p }); }
  else if (saved) Object.assign(S, { from: saved.a, to: saved.b, preset: saved.p });
  else { const [a, b] = presetRange('30'); Object.assign(S, { from: a, to: b, preset: '30' }); }
  $('#login').hidden = true; $('#app').hidden = false; document.body.classList.add('fade-in');
  render();
}
async function loadShop(shop) {
  if (!KEYS[shop]) shop = Object.keys(SHOPS).find(k => KEYS[k]);
  const file = await fetchEnc(shop), d = await decryptWith(KEYS[shop], file);
  applyShop(shop); start(d); scrollTo(0, 0);
}
const keysToStore = () => JSON.stringify(Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, b64e(v)])));
function keysFromStore() {
  const j = store.get('lf-keys') || store.get('lf-keys', true);
  if (j) { try { return Object.fromEntries(Object.entries(JSON.parse(j)).map(([k, v]) => [k, b64d(v)])); } catch (e) {} }
  const legacy = store.get('lf-key') || store.get('lf-key', true); return legacy ? { lf: b64d(legacy) } : null;
}
async function tryAuto() {
  const k = keysFromStore(); if (!k) return false;
  KEYS = k;
  try { await loadShop(store.get('lf-shop') || 'lf'); return true; } catch (e) { store.del('lf-key'); store.del('lf-keys'); KEYS = {}; return false; }
}
// keyring: each user entry wraps the data keys of the shops that user may open
async function unlock(user, pass) {
  try {
    const kr = await (await fetch('data/keyring.json?ts=' + Date.now(), { cache: 'no-store' })).json();
    const tries = kr.users.map(async u => { const raw = await deriveRaw(user, pass, b64d(u.salt), u.iter); const j = await decryptWith(raw, u); return Object.fromEntries(Object.entries(j.shops).map(([k, v]) => [k, b64d(v)])); });
    return await Promise.any(tries);
  } catch (e) {
    const file = await fetchEnc('lf'), raw = await deriveRaw(user, pass, b64d(file.salt), file.iter || 250000);
    await decryptWith(raw, file); return { lf: raw };
  }
}
function loginUI() {
  $('#pwToggle').addEventListener('click', () => { const i = $('#password'); i.type = i.type === 'password' ? 'text' : 'password'; $('#pwToggle').textContent = i.type === 'password' ? 'Hiện' : 'Ẩn'; });
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#loginErr'), btn = $('#loginBtn'); err.hidden = true;
    const email = $('#email').value, pass = $('#password').value;
    if (!email || !pass) { err.textContent = 'Nhập tài khoản và mật khẩu.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Đang mở dữ liệu…';
    try {
      let k; try { k = await unlock(email, pass); } catch (x) { throw new Error('Tài khoản hoặc mật khẩu không đúng.'); }
      KEYS = k; store.del('lf-key'); store.set('lf-keys', keysToStore(), !$('#remember').checked);
      await loadShop(store.get('lf-shop') || 'lf');
    } catch (x) { err.textContent = x.message || 'Không mở được dữ liệu.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  });
}
const th0 = store.get('lf-theme'); if (th0) document.documentElement.dataset.theme = th0;
loginUI();
tryAuto();
})();
