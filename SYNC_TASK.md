Daily data refresh for the Living Furniture Shopee dashboard. Everything happens in Chrome on this computer; no git, no repo clone. Keep it lean: few tool calls, no screenshots, no narration. Only READ from Shopee — never change settings, top up ads or act on any order or promotion. Never type passwords. If Seller Centre shows a login page, stop and send the user one Vietnamese line asking them to log in to banhang.shopee.vn in Chrome.

1. One ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_close_mcp. Call tabs_context_mcp, create tab A and navigate it to https://banhang.shopee.vn/portal/sale/order.
2. javascript_tool in tab A:
   await new Promise(r=>setTimeout(r,4000));const sha=(await fetch('https://api.github.com/repos/khoimr11/LF---B2C-Local/commits/main').then(r=>r.json())).sha;(0,eval)(await fetch('https://raw.githubusercontent.com/khoimr11/LF---B2C-Local/'+sha+'/scripts/collector.js').then(r=>r.text()));LG.start(60,21)
3. Poll in tab A: await new Promise(r=>setTimeout(r,28000)); LG.status()  — repeat until phase is "done" (3–8 min). On "error", report err and stop.
4. In tab A: LG.pack()  -> {parts, chars, orders, audit}.
5. Create tab B and navigate it to https://khoimr11.github.io/LF---B2C-Local/sync.html . In tab B run: await new Promise(r=>setTimeout(r,2000)); LFSYNC.ready()  — if key or token is false, stop and tell the user in Vietnamese to open that page and save the data key and GitHub token. Then in tab B: LFSYNC.reset()
6. For i = 0 … parts-1: in tab A run LG.part(i) (it returns a quoted JSON string); then in tab B run LFSYNC.add(<that exact returned text, pasted verbatim as the argument>). Do not alter, trim or re-escape it.
7. In tab B: await LFSYNC.publish()  -> {commit, added, updated, orders, valid, nmvYesterday}. If it throws, report the message.
8. Close tabs A and B. Finish with one short Vietnamese line: số đơn đọc được, số đơn mới / cập nhật, NMV hôm qua (nmvYesterday), commit, và lỗi nếu có (audit khác rỗng = đơn đối soát lệch, liệt kê mã đơn).
