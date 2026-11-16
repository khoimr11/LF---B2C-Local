// Lấy đơn hàng CŨ (trước giới hạn 24 tháng của danh sách đơn) bằng "Xuất báo cáo" của Shopee, từng tháng một.
// Chạy trong tab Kênh Người Bán do sync.html mở (có window.opener). Không lưu tên/SĐT/địa chỉ chi tiết người mua.
//   EX.run('2018-01', '2024-11-16')  -> chạy nền;  EX.status()  -> tiến độ;  EX.send()  -> gửi sang sync.html
(() => {
  const S = { phase: 'idle', months: [], done: 0, rows: new Map(), log: [], err: null };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const J = async u => (await fetch(u, { credentials: 'include' })).json();
  const num = v => v == null || v === '' ? 0 : typeof v === 'number' ? v : Number(String(v).replace(/[^\d-]/g, '')) || 0;  // số kiểu VN: 1.140.000
  const ts = v => { if (!v) return null; if (typeof v === 'number') return Math.round((v - 25569) * 86400 - 7 * 3600); const m = String(v).match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) / 1000 - 7 * 3600) : null; };
  const pad = n => String(n).padStart(2, '0');
  async function xlsx() { if (!window.XLSX) (0, eval)(await fetch('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').then(r => r.text())); }
  async function month(a, b) {
    const q = `/api/v3/order/request_order_report?start_date=${a}&end_date=${b}&language=vn&screening_condition=order_creation_date&parcel_level_filter=0`;
    const r = await J(q); const d = r && r.data; if (!d || r.code !== 0) throw new Error('request ' + a + ': ' + JSON.stringify(r).slice(0, 120));
    if (!d.record_numbers) return 0;
    for (let i = 0; i < 40; i++) { await sleep(1500); const g = await J('/api/v3/settings/get_report/?report_id=' + d.report_id); if (g.data && g.data.status === 2) break; if (g.data && g.data.status > 2) throw new Error('report ' + a + ' status ' + g.data.status); }
    const buf = await (await fetch('/api/v3/settings/download_report/?report_id=' + d.report_id, { credentials: 'include' })).arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
    const H = rows[0], c = n => H.indexOf(n);
    const I = { sn: c('Mã đơn hàng'), t: c('Ngày đặt hàng'), s: c('Trạng Thái Đơn Hàng'), car: c('Đơn Vị Vận Chuyển'), ship: c('Phương thức giao hàng'), tp: c('Ngày gửi hàng'), ret: c('Trạng thái Trả hàng/Hoàn tiền'),
      psku: c('SKU sản phẩm'), vsku: c('SKU phân loại hàng'), vname: c('Tên phân loại hàng'), price: c('Giá ưu đãi'), qty: c('Số lượng'), paid: c('Tổng số tiền Người mua thanh toán'),
      vch: c('Mã giảm giá của Shop'), sf: c('Phí vận chuyển (dự kiến)'), sb: c('Phí vận chuyển mà người mua trả'), ss: c('Phí vận chuyển tài trợ bởi Shopee (dự kiến)'), td: c('Thời gian hoàn thành đơn hàng'),
      fx: c('Phí cố định'), sv: c('Phí Dịch Vụ'), tx: c('Phí xử lý giao dịch'), prov: c('Tỉnh/Thành phố'), ward: c('TP / Quận / Huyện') };
    let n = 0;
    for (const x of rows.slice(1)) {
      const sn = x[I.sn]; if (!sn) continue; let o = S.rows.get(sn);
      if (!o) { n++; o = { sn, t: ts(x[I.t]), s: x[I.s] || '', car: String(x[I.car] || '').split(' ')[0] || null, chan: x[I.car] || '', exp: /h[oỏ]a\s*t[oố]c|instant|2h/i.test((x[I.car] || '') + ' ' + (x[I.ship] || '')) ? 1 : 0,
        tp: ts(x[I.tp]), td: ts(x[I.td]), ret: x[I.ret] ? 1 : 0, paid: num(x[I.paid]), sh: num(x[I.vch]), sf: num(x[I.sf]), sb: num(x[I.sb]), ss: num(x[I.ss]),
        fx: num(x[I.fx]), sv: num(x[I.sv]), tx: num(x[I.tx]), prov: String(x[I.prov] || '').replace('Thành phố ', '').replace('Tỉnh ', ''), ward: x[I.ward] || '', items: [] }; S.rows.set(sn, o); }
      const sku = x[I.vsku] || x[I.psku] || '', q = num(x[I.qty]), p = num(x[I.price]);
      o.items.push([sku, q, p, null, null, '']); o.m = (o.m ? o.m + '/' : '') + (x[I.vname] || '');
      // phí là số theo đơn, Shopee có thể lặp ở mỗi dòng sản phẩm: giữ giá trị lớn nhất
      o.fx = Math.max(o.fx, num(x[I.fx])); o.sv = Math.max(o.sv, num(x[I.sv])); o.tx = Math.max(o.tx, num(x[I.tx]));
    }
    return n;
  }
  const toRow = o => { const q = o.items.reduce((s, i) => s + i[1], 0), v = o.items.reduce((s, i) => s + i[1] * i[2], 0), cx = /hủy/i.test(o.s), fee = o.fx + o.sv + o.tx;
    return [o.sn, o.t, null, o.s, q, v, o.paid, o.m || '', (o.items[0] || [])[2] || 0, o.prov, o.car, cx ? null : o.fx, cx ? null : o.sv, cx ? null : 0, cx ? null : o.tx, o.sh, null,
      cx ? null : v - o.sh - fee, o.items.map(i => i[0]).join('/'), o.ret, null, o.ward, o.sb, o.sf, o.ss, /hoàn thành/i.test(o.s) ? 1 : 0, cx ? null : fee, '', o.chan, o.exp, o.tp, o.td, o.items]; };
  async function run(from = '2018-01', until = '2024-11-16') {
    try {
      S.phase = 'running'; await xlsx(); const [fy, fm] = from.split('-').map(Number), end = new Date(until + 'T00:00:00Z');
      for (let y = fy, m = fm; ; m++) { if (m > 12) { m = 1; y++; } const a = new Date(Date.UTC(y, m - 1, 1)); if (a > end) break;
        const last = new Date(Date.UTC(y, m, 0)), b = last > end ? end : last; S.months.push([`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(b.getUTCDate())}`]); }
      for (const [a, b] of S.months) { let n = 0; try { n = await month(a, b); } catch (e) { await sleep(3000); n = await month(a, b); } S.log.push(a.slice(0, 7) + ':' + n); S.done++; await sleep(800); }
      S.phase = 'done';
    } catch (e) { S.err = String(e.message || e); S.phase = 'error'; }
  }
  window.EX = {
    run(a, b) { run(a, b); return 'started'; },
    status() { return JSON.stringify({ phase: S.phase, months: S.done + '/' + S.months.length, orders: S.rows.size, err: S.err, last: S.log.slice(-6) }); },
    log() { return S.log.join(' '); },
    pack() { return { orders: [...S.rows.values()].map(toRow) }; },
    send() { if (!window.opener) return 'no opener'; const json = JSON.stringify(this.pack()); window.opener.postMessage({ type: 'lfsync-pack', json }, 'https://khoimr11.github.io'); return 'sent ' + json.length; }
  };
})();
