// Cập nhật dashboard 1 chạm: chạy trong tab Kênh Người Bán Shopee (bookmark "⚡ Cập nhật dashboard").
// Tự nhận shop đang đăng nhập, lấy dữ liệu bằng collector trong SYNC_TASK.md, gửi sang sync.html để mã hoá và đẩy lên GitHub.
// Chỉ ĐỌC dữ liệu Shopee. Không lưu khoá/mã ở đây — khoá và mã GitHub nằm trong sync.html của trình duyệt này.
(async () => {
  const BASE = 'https://khoimr11.github.io/LF---B2C-Local/', ORIGIN = 'https://khoimr11.github.io';
  if (!/banhang\.shopee\.vn$/.test(location.hostname)) { alert('Hãy bấm bookmark này khi đang ở trang Kênh Người Bán Shopee (banhang.shopee.vn).'); return; }
  if (window.__lfAuto) { window.__lfAuto.box.style.display = 'block'; return; }
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:2147483647;top:16px;right:16px;width:320px;padding:14px 16px;border-radius:14px;background:#2b2233;color:#f6eefb;font:13px/1.5 system-ui,Segoe UI,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
  box.innerHTML = '<b style="font-size:14px">⚡ Cập nhật dashboard</b><div id="lfa-msg" style="margin-top:6px;white-space:pre-wrap"></div><button id="lfa-x" style="margin-top:10px;border:0;border-radius:8px;padding:5px 10px;background:#c4b1f2;color:#2b2233;font-weight:600;cursor:pointer">Ẩn</button>';
  document.body.appendChild(box); box.querySelector('#lfa-x').onclick = () => box.style.display = 'none';
  window.__lfAuto = { box };
  const say = (m, bad) => { const el = box.querySelector('#lfa-msg'); el.textContent = m; el.style.color = bad ? '#ffb4b4' : ''; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 1. Tìm trang sync.html: nếu tab này do sync.html mở thì dùng nó, không thì mở mới (ngay trong lượt bấm để không bị chặn popup)
  let target = null, pong = false;
  const onMsg = e => { if (e.origin !== ORIGIN || !e.data) return; if (e.data.type === 'lfsync-pong') pong = true; if (e.data.type === 'lfsync-result') done(e.data); };
  addEventListener('message', onMsg);
  if (window.opener && !window.opener.closed) { try { window.opener.postMessage({ type: 'lfsync-ping' }, ORIGIN); } catch (e) {} for (let i = 0; i < 8 && !pong; i++) await sleep(100); if (pong) target = window.opener; }
  if (!target) { target = window.open(BASE + 'sync.html?auto=1', 'lfsync-auto'); if (!target) { say('Trình duyệt chặn cửa sổ mới. Cho phép popup cho banhang.shopee.vn rồi bấm lại.', true); return; } }

  try {
    // 2. Shop nào đang đăng nhập
    const c = (document.cookie.match(/SPC_CDS=([^;]+)/) || [])[1];
    const info = await (await fetch('/api/selleraccount/shop_info/?SPC_CDS=' + c + '&SPC_CDS_VER=2', { credentials: 'include' })).json();
    const name = info && info.data && info.data.name;
    if (!name) { say('Chưa đăng nhập Kênh Người Bán. Đăng nhập rồi bấm lại.', true); return; }
    if (!/living|nikon/i.test(name)) { say('Shop "' + name + '" không thuộc dashboard này.', true); return; }
    say('Shop: ' + name + '\nĐang tải bộ lấy dữ liệu…');
    // 3. Collector (cùng bản với tác vụ hằng ngày)
    const md = await (await fetch('https://raw.githubusercontent.com/khoimr11/LF---B2C-Local/main/SYNC_TASK.md?t=' + Date.now())).text();
    (0, eval)(md.split('```js\n')[1].split('\n```')[0]);
    window.LG.start(60, 60);
    const t0 = Date.now(); let st = {};
    while (true) {
      await sleep(4000); st = JSON.parse(window.LG.status());
      const min = Math.round((Date.now() - t0) / 60000);
      say('Shop: ' + name + '\nĐang lấy: ' + st.phase + ' · ' + st.orders + ' đơn · phí ' + st.fees + ' · ' + min + ' phút\nĐừng đóng tab này và tab "LF Sync".');
      if (st.phase === 'done') break;
      if (st.phase === 'error') throw new Error(st.err);
    }
    const p = JSON.parse(window.LG.pack());
    if (target.closed) throw new Error('Tab LF Sync đã bị đóng — bấm lại bookmark.');
    say('Shop: ' + name + '\nĐã lấy ' + p.orders + ' đơn. Đang mã hoá và đẩy lên dashboard…');
    // gói đã nằm trong LG; gửi sang sync.html, sync.html tự nhận shop theo tên và đẩy lên
    target.postMessage({ type: 'lfsync-pack', auto: true, json: (() => { let s = ''; for (let i = 0; i < p.parts; i++) s += JSON.parse(window.LG.part(i)); return s; })() }, ORIGIN);
    window.__lfAudit = p.audit;
    setTimeout(() => { if (!window.__lfDone) say('Đã gửi dữ liệu nhưng chưa thấy LF Sync trả lời. Xem tab "LF Sync" — nếu báo thiếu khoá/mã thì lưu lại khoá và mã GitHub ở đó.', true); }, 90000);
  } catch (e) { say('Lỗi: ' + (e.message || e), true); }

  function done(r) {
    window.__lfDone = 1;
    if (!r.ok) { say('Không đẩy được: ' + r.msg, true); return; }
    const o = r.out, a = window.__lfAudit || [];
    say('✅ Xong (' + r.shop + ')\n' + o.added + ' đơn mới · ' + o.updated + ' đơn cập nhật · NMV hôm qua ' + Number(o.nmvYesterday).toLocaleString('vi-VN') + ' ₫\ncommit ' + o.commit + (a.length ? '\nĐơn lệch đối soát: ' + a.join(', ') : '') + '\nMở dashboard và tải lại trang để xem.');
  }
})();
