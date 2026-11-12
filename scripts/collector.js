// Living Furniture · Shopee collector
// Run inside a signed-in https://banhang.shopee.vn tab (Claude in Chrome javascript_tool).
//   LG.start(ORDER_DAYS, FEE_DAYS)  -> starts in background, returns 'started'
//   LG.status()                     -> {phase, orders, ads, fees, err}
//   LG.chunk(i)                     -> 5 order rows per call (JSON arrays, one per line)
//   LG.reviews()                    -> customer reviews: [time, stars, comment, mediaCount, orderSn, replied, replyTime, hidden]
//   LG.ads()                        -> ads daily rows
//   LG.products()                   -> product/model rows with list price + stock
//   LG.ledger()                     -> ads wallet ledger: [date, 'free'|'paid'|'spend', amountVND, type, receivedFrom]
//   LG.promo()                      -> {fs: flash sales, disc: discounts/combos/add-ons, vch: vouchers, kpi: Shopee 7-day metrics per tool}
// To save tokens, chunk/ads/ledger/reviews only return the recent window (fee window + 9 days, plus unfinished orders);
// data-tool merge keeps everything older.
// Order row: [sn,t,st,status,qty,value,paid,model,price,province,carrier,fx,sv,pi,tx,sh,pv,inc,sku,ret,itemId,ward,shipBuyer,shipFee,shipSubsidy,final,surcharge,deal,shipChannel,express,pickupTime,deliveredTime]
//   fee fields (fx..inc) are null when not refreshed in this run -> keep previous values when merging
// Ads row:   [dayStart,impr,clicks,cost,broadOrders,broadGMV,directOrders,directGMV,atc,broadUnits]
// Product:   [itemId,modelId,itemName,modelName,sku,normalPrice,promoPrice,stock]
window.LG = (() => {
  const cds = (document.cookie.match(/SPC_CDS=([^;]+)/) || [])[1];
  const Q = 'SPC_CDS=' + cds + '&SPC_CDS_VER=2';
  const S = { phase: 'idle', rows: [], ads: [], prods: [], ledger: [], reviews: [], promo: { fs: [], disc: [], vch: [], kpi: [] }, feeDone: 0, feeTotal: 0, feeCut: 0, err: null };
  const j = async (u, b) => (await fetch(u + (u.includes('?') ? '&' : '?') + Q, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(b) } : { credentials: 'include' })).json();
  const pick = (t, l) => { const m = t.match(new RegExp(l + '\\s*\\n\\s*(-?₫[\\d.]+)')); return m ? Number(m[1].replace(/[₫.]/g, '')) : null; };
  // Đọc toàn bộ "chi tiết doanh thu" của một đơn (mở iframe, cuộn để trang tải đủ, bấm "Xem chi tiết doanh thu" nếu đang ẩn)
  const parsePairs = t => { const L = t.split('\n').map(x => x.trim()).filter(Boolean), o = {};
    for (let i = 0; i < L.length - 1; i++) if (/^-?₫[\d.]+$/.test(L[i + 1]) && !/^-?₫/.test(L[i]) && !(L[i] in o)) o[L[i]] = Number(L[i + 1].replace(/[₫.]/g, ''));
    return o; };
  const g = (o, ...ks) => { for (const k of ks) if (k in o) return o[k]; return null; };
  const fee = id => new Promise(res => {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1300px;height:2400px';
    f.src = '/portal/sale/order/' + id; document.body.appendChild(f); let n = 0, clicks = 0;
    const iv = setInterval(() => { n++; let t = '', d = null; try { d = f.contentDocument; f.contentWindow.scrollTo(0, (n % 4) * 800); t = d.body.innerText; } catch (e) {}
      if (d && t.includes('Thông tin thanh toán') && !/Doanh thu đơn hàng/i.test(t) && clicks < 4) { const el = [...d.querySelectorAll('div,span,a,button')].find(e => /^\s*Xem chi tiết doanh thu\s*$/.test(e.textContent)); if (el) { el.click(); clicks++; } }
      if (/Doanh thu đơn hàng[^\n]*\n\s*₫/i.test(t) || n > 90) { clearInterval(iv); f.remove();
        const a = t.indexOf('Tổng tiền sản phẩm'), b = t.indexOf('Điều chỉnh đặt hàng'); const o = a >= 0 ? parsePairs(t.slice(a, b > a ? b : a + 2500)) : {};
        if (!('Phụ phí' in o)) return res({});
        const neg = v => v == null ? 0 : -v;
        res({ fx: neg(g(o, 'Phí cố định')), sv: neg(g(o, 'Phí Dịch Vụ')), pi: neg(g(o, 'Phí dịch vụ PiShip')), tx: neg(g(o, 'Phí xử lý giao dịch')),
          sh: neg(g(o, 'Trợ giá')), surcharge: neg(g(o, 'Phụ phí')), inc: g(o, 'Doanh Thu Đơn Hàng', 'Doanh thu đơn hàng ước tính'), fin: 'Doanh Thu Đơn Hàng' in o ? 1 : 0,
          sb: g(o, 'Phí vận chuyển Người mua trả') || 0, sf: neg(g(o, 'Phí vận chuyển thực tế', 'Phí vận chuyển ước tính')), ss: g(o, 'Phí vận chuyển được trợ giá từ Shopee', 'Phí vận chuyển được trợ giá từ Shopee ước tính') || 0 }); } }, 350); });
  const P = (u, b) => j(u, b);
  // kênh vận chuyển + giao hỏa tốc + mốc thời gian giao (quét key trong đơn vì Shopee đặt tên không cố định)
  const shipInfo = d => {
    const names = [], times = {};
    const walk = (o, k0, dep) => { if (!o || typeof o !== 'object' || dep > 4) return; for (const k in o) { const v = o[k], kk = (k0 + '.' + k).toLowerCase();
      if (typeof v === 'string' && v && v.length < 80 && /(carrier|channel|shipping_method|logistic)[a-z_]*name|carrier_name|channel_name/.test(kk)) names[/checkout|channel/.test(kk) ? 'unshift' : 'push'](v);
      else if (typeof v === 'number' && v > 1.6e9 && v < 2.2e9 && /(pickup|ship|deliver|complete|receive)[a-z_]*time/.test(kk) && !/by|deadline|expire|estimat|edt|days/.test(kk)) times[k] = v;
      else if (typeof v === 'object') walk(v, k, dep + 1); } };
    walk(d, '', 0);
    const chan = names[0] || '';
    const all = names.join(' | ');
    const pick = re => { const k = Object.keys(times).find(x => re.test(x)); return k ? times[k] : null; };
    return { chan, exp: /h[oỏ]a\s*t[oố]c|instant|siêu tốc|sieu toc|express 2h|trong 2h|ahamove|grab|bedelivery|\bbe\b/i.test(all) ? 1 : 0,
      tp: pick(/pickup|ship_time|shipping_confirm/), td: pick(/deliver|complete|receive/) };
  };
  async function promo(since) {
    let fs = [];
    for (let o = 0; o < 500; o += 50) { const r = await j('/api/marketing/v4/shop_flash_sale/get_shop_flash_sale_list/?offset=' + o + '&limit=50&type=0'); const l = (r.data && r.data.flash_sale_list) || []; fs = fs.concat(l); if (l.length < 50) break; }
    fs = fs.filter(f => f.end_time >= since);
    const rep = {}; for (let i = 0; i < fs.length; i += 50) { const r = await j('/api/marketing/v4/shop_flash_sale/report_shop_flash_sale/?promotion_id_list=' + encodeURIComponent(JSON.stringify(fs.slice(i, i + 50).map(f => f.flash_sale_id)))); ((r.data) || []).forEach(x => rep[x.promotionid] = x); }
    for (const f of fs) {
      const it = (((await j('/api/marketing/v4/shop_flash_sale/get_shop_flash_sale_item/?flash_sale_id=' + f.flash_sale_id + '&offset=0&limit=100')).data || {}).items || []).filter(x => x.status === 1);
      const x = rep[f.flash_sale_id] || {};
      // [id (last 6 digits), start, durationSec, price (lowest enabled model), stock, purchaseLimit, clicks, reminders]; slots with no enabled product are skipped
      if (it.length) S.promo.fs.push([String(f.flash_sale_id).slice(-6), f.start_time, f.end_time - f.start_time, Math.min(...it.map(i => i.promotion_price)), it.reduce((s, i) => s + (i.stock || 0), 0), (it[0] || {}).purchase_limit || 0, x.click_cnt || 0, x.remindme_cnt || 0]);
    }
    for (let o = 0; o < 300; o += 10) {
      const r = await P('/api/marketing/v3/public/discount/list/', { discount_type: 0, time_status: 0, offset: o, limit: 10 }); const l = (r.data && r.data.discounts) || [];
      for (const x of l) { const d = x.seller_discount || x.bundle_deal || x.add_on_deal || {}; if (d.end_time < since) continue;
        let price = null; if (x.seller_discount) { const a = await P('/api/marketing/v4/discount/get_discount_items_aggregated/', { promotion_id: d.discount_id, offset: 0, limit: 10 }); const li = ((a.data || {}).discount_item_list || []).filter(i => i.status === 1); if (li.length) price = Math.min(...li.map(i => i.promotion_price)) / 1e5; }
        // [id, kind ('discount'|'combo'|'addon'), name, start, end, price]
        S.promo.disc.push([String(d.discount_id).slice(-6), x.seller_discount ? 'discount' : x.bundle_deal ? 'combo' : 'addon', d.name || '', d.start_time, d.end_time, price]); }
      if (l.length < 10) break;
    }
    for (let o = 0; o < 300; o += 10) {
      const r = await j('/api/marketing/v3/voucher/list/?offset=' + o + '&limit=10&promotion_type=0'); const l = (r.data && r.data.voucher_list) || [];
      // [id, name, code, start, end, percent, fixedValue, maxValue, minSpend, usageLimit, used, claimed, sellerPays]
      l.filter(v => v.end_time >= since).forEach(v => S.promo.vch.push([String(v.voucher_id).slice(-6), v.name, v.voucher_code, v.start_time, v.end_time, v.discount || 0, Number(v.value) || 0, Number(v.max_value) || 0, Number(v.min_price) || 0, v.usage_limit || 0, v.current_usage || 0, v.distributed_count || 0, (v.rule || {}).is_seller_absorbed === false ? 0 : 1]));
      if (l.length < 10) break;
    }
    for (const t of ['shop_flash_sale', 'discount', 'bundle_deal', 'add_on_deal', 'voucher']) {
      const r = await j('/api/marketing/v4/public/get_promotion_tool_metrics/?tool_name=marketing_' + t); const d = (r.data && r.data.data) || {}, dr = (r.data && r.data.date_range) || {};
      // [tool, from, to, sales, orders, buyers, units, used, impressions, clicks]  (Shopee: 7 ngày gần nhất)
      S.promo.kpi.push([t, dr.start_time || 0, dr.end_time || 0, d.sales || 0, d.orders || 0, d.buyers || 0, d.units || 0, d.used || 0, d.product_impression || 0, d.product_clicks || 0]);
    }
  }
  async function start(orderDays = 45, feeDays = 21) {
    try {
      Object.assign(S, { phase: 'orders', rows: [], ads: [], prods: [], ledger: [], reviews: [], promo: { fs: [], disc: [], vch: [], kpi: [] }, feeDone: 0, feeTotal: 0, err: null });
      const now = Math.floor(Date.now() / 1000), cut = now - orderDays * 86400, feeCut = now - feeDays * 86400; S.feeCut = feeCut;
      const ids = []; let page = 1;
      while (page < 60) {
        const r = await j('/api/v3/order/search_order_list_index', { order_list_tab: 100, entity_type: 1, pagination: { from_page_number: 1, page_number: page, page_size: 40 }, filter: { fulfillment_type: 0, is_drop_off: 0, fulfillment_source: 0, action_filter: 0 }, sort: { sort_type: 3, ascending: false } });
        const l = (r.data && r.data.index_list) || []; if (!l.length) break; ids.push(...l.map(x => x.order_id));
        const last = (await j('/api/v3/order/get_one_order?order_id=' + l[l.length - 1].order_id)).data;
        if (l.length < 40 || (last && last.create_time < cut)) break; page++;
      }
      const items = new Set();
      for (const id of ids) {
        const d = (await j('/api/v3/order/get_one_order?order_id=' + id)).data;
        if (!d || d.create_time < cut) continue;
        const a = (d.shipping_address || '').split(',').map(s => s.trim()), it = d.order_items || [];
        it.forEach(i => items.add(i.item_id));
        S.rows.push({ id, sn: d.order_sn, t: d.create_time, st: d.status, s: (d.status_info_v2 || {}).status || '',
          q: it.reduce((s, i) => s + i.amount, 0), v: it.reduce((s, i) => s + i.amount * Number(i.order_price), 0), paid: Number(d.total_price),
          m: it.map(i => (i.item_model || {}).name).join('/'), p: Number((it[0] || {}).order_price || 0),
          prov: (a[a.length - 1] || '').replace(/^\*+/, '').replace('Thành phố ', '').replace('Tỉnh ', ''), ward: (a[a.length - 2] || '').replace(/^\*+/, ''), car: (d.fulfillment_carrier_name || '').split(' ')[0] || null,
          sku: it.map(i => (i.item_model || {}).sku || (i.product || {}).sku).join('/'), ret: d.return_id ? 1 : 0, iid: (it[0] || {}).item_id || null,
          deal: it.some(i => i.bundle_deal_id) ? 'combo' : it.some(i => i.add_on_deal_id) ? 'addon' : '', ...shipInfo(d) });
      }
      S.phase = 'products';
      for (const iid of items) {
        const p = ((await j('/api/v3/product/get_product_info?product_id=' + iid + '&is_draft=false')).data || {}).product_info;
        if (p) (p.model_list || []).forEach(m => S.prods.push([iid, m.id, p.name, m.name, m.sku, Number(m.price_info.normal_price), Number(m.price_info.promotion_price), (m.stock_detail || {}).total_available_stock ?? null]));
      }
      S.phase = 'ads';
      const day0 = Math.floor((now + 25200) / 86400) * 86400 - 25200;
      const g = await j('/api/pas/v1/report/get_time_graph/', { agg_interval: 96, campaign_type: 'product_homepage_v2', start_time: day0 - 89 * 86400, end_time: day0 + 86399, need_roi_target_setting: false, filter_params: { campaign_type: 'new_cpc_homepage' } });
      S.ads = ((g.data && g.data.report_by_time) || []).map(x => { const m = x.metrics;
        return [Number(x.key), m.impression, m.click, Math.round(m.cost / 1e3) / 100, m.broad_order, Math.round(m.broad_gmv / 1e5), m.direct_order, Math.round(m.direct_gmv / 1e5), m.atc || 0, m.broad_order_amount || 0]; })
        .filter(r => r[1] || r[3]);
      S.phase = 'ledger';  // sổ giao dịch tài khoản Ads: tiền nạp, tiền Shopee tặng, khấu trừ
      for (let w = 0; w < 3; w++) {
        const a = day0 - (w * 30 + 29) * 86400, b = day0 - w * 30 * 86400 + 86399;
        for (let off = 0; off < 2000; off += 100) {
          const t = await j('/api/pas/v1/transaction_history/get/', { start_time: a, end_time: b, offset: off, limit: 100 });
          const l = (t.data && t.data.translog_list) || [];
          l.forEach(e => S.ledger.push([e.date, e.transaction_group === 'topup' ? (e.transaction_type === 'free_ads_credit' ? 'free' : 'paid') : e.transaction_group === 'deduction' ? 'spend' : e.transaction_group, Math.round(e.amount / 1e3) / 100, e.transaction_type, e.received_from || '']));
          if (l.length < 100) break;
        }
      }
      S.ledger.sort((x, y) => x[0] - y[0]);
      S.phase = 'reviews';  // đánh giá của khách (Quản lý Đánh Giá)
      for (let pg = 1; pg < 50; pg++) {
        const r = await j('/api/v3/settings/search_shop_rating_comments_new/?rating_star=5,4,3,2,1&page_number=' + pg + '&page_size=50&cursor=0&from_page_number=1&language=vi');
        const l = (r.data && r.data.list) || [];
        l.forEach(c => S.reviews.push([c.ctime, c.rating_star, c.comment || '', (c.images || []).length + (c.videos || []).length, c.order_sn, c.reply && c.reply.comment ? 1 : 0, (c.reply && c.reply.ctime) || 0, c.is_hidden ? 1 : 0]));
        if (l.length < 50) break;
      }
      S.phase = 'promo';  // Flash Sale, chương trình giảm giá / combo / mua kèm, voucher, hiệu quả 7 ngày của từng công cụ
      try { await promo(now - orderDays * 86400); } catch (e) { S.promoErr = String(e); }
      S.phase = 'fees';
      const need = S.rows.filter(r => !/hủy/i.test(r.s) && r.t >= feeCut); S.feeTotal = need.length;
      for (const r of need) { const x = await fee(r.id); if (x.inc == null) x.retry = 1; Object.assign(r, x); S.feeDone++; }
      for (const r of need.filter(r => r.retry)) { const x = await fee(r.id); Object.assign(r, x); delete r.retry; } // thử lại một lần đơn chưa đọc được
      S.rows.forEach(r => { if (r.inc != null && r.sh != null) r.pv = Math.max(0, r.v - r.sh + (r.sb || 0) - r.paid); }); // voucher Shopee = phần khách được giảm do Shopee trả
      S.phase = 'done';
    } catch (e) { S.err = String(e); S.phase = 'error'; }
  }
  const N = v => v === undefined ? null : v;
  return {
    start(o, f) { start(o, f); return 'started'; },
    status() { return JSON.stringify({ phase: S.phase, orders: S.rows.length, ads: S.ads.length, fees: S.feeDone + '/' + S.feeTotal, err: S.err, promoErr: S.promoErr || null }); },
    // [sn,t,st,status,qty,value,paid,model,price,province,carrier,fx,sv,pi,tx,voucherShop,voucherShopee,income,sku,return,itemId,ward,shipBuyer,shipFee,shipSubsidy,final,surcharge,deal,shipChannel,express,pickupTime,deliveredTime]
    // chỉ trả về đơn trong cửa sổ đọc phí hoặc chưa ở trạng thái cuối, đơn cũ đã chốt được giữ nguyên khi merge
    chunk(i) { return S.rows.filter(r => r.t >= S.feeCut || !/^(Đã giao|Đã hủy|Hoàn thành)$/.test(r.s)).slice(i * 5, i * 5 + 5).map(r => JSON.stringify([r.sn, r.t, r.st, r.s, r.q, r.v, r.paid, r.m, r.p, r.prov, r.car, N(r.fx), N(r.sv), N(r.pi), N(r.tx), N(r.sh), N(r.pv), N(r.inc), r.sku, r.ret, r.iid, r.ward, N(r.sb), N(r.sf), N(r.ss), N(r.fin), N(r.surcharge), r.deal || '', r.chan || '', r.exp ? 1 : 0, N(r.tp), N(r.td)])).join('\n'); },
    promo(all) { const c = all ? 0 : S.feeCut - 9 * 86400, P = S.promo; return JSON.stringify({ fs: P.fs.filter(f => f[1] + f[2] >= c), disc: P.disc.filter(d => d[4] >= c), vch: P.vch.filter(v => v[4] >= c), kpi: P.kpi }); },
    // một gói JSON duy nhất cho merge, cắt thành từng phần 900 ký tự để đọc qua javascript_tool (ghép lại theo thứ tự là ra collected.json)
    pack() { const rows = []; for (let i = 0; ; i++) { const c = this.chunk(i); if (!c) break; c.split('\n').forEach(l => rows.push(JSON.parse(l))); }
      S.pack = JSON.stringify({ orders: rows, ads: JSON.parse(this.ads()), products: JSON.parse(this.products()), ledger: JSON.parse(this.ledger()), reviews: JSON.parse(this.reviews()), promo: JSON.parse(this.promo()) });
      return JSON.stringify({ parts: Math.ceil(S.pack.length / 900), chars: S.pack.length, orders: rows.length, audit: this.audit() }); },
    part(i) { return (S.pack || '').slice(i * 900, i * 900 + 900); },
    // đối soát: doanh thu Shopee = giá − voucher shop − 4 loại phí + ship khách trả − phí ship + trợ giá ship; phụ phí = tổng 4 loại phí
    audit() { return S.rows.filter(r => !/hủy/i.test(r.s) && r.inc != null && (Math.round(r.inc - (r.v - r.sh - r.fx - r.sv - r.pi - r.tx + (r.sb || 0) - (r.sf || 0) + (r.ss || 0))) || (r.surcharge != null && Math.round(r.surcharge - r.fx - r.sv - r.pi - r.tx)))).map(r => r.sn); },
    async promoOnly(days = 60) { S.promo = { fs: [], disc: [], vch: [], kpi: [] }; await promo(Math.floor(Date.now() / 1000) - days * 86400); return JSON.stringify({ fs: S.promo.fs.length, disc: S.promo.disc.length, vch: S.promo.vch.length, kpi: S.promo.kpi.length }); },
    // gọn token: chỉ trả về phần mới (đánh giá, Ads, sổ Ads trong 30 ngày) — phần cũ đã có trong file mã hóa
    reviews() { return JSON.stringify(S.reviews.filter(r => r[0] >= S.feeCut - 9 * 86400)); },
    ads() { return JSON.stringify(S.ads.filter(r => r[0] >= S.feeCut - 9 * 86400)); },
    products() { return JSON.stringify(S.prods); },
    ledger() { return JSON.stringify(S.ledger.filter(r => r[0] >= S.feeCut - 9 * 86400)); }
  };
})();
'LG ready';
