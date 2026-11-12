# Living Furniture · Shopee Performance

Dashboard bán hàng Shopee của shop **living_furniture** (Kệ đa năng 3 tầng Lignarc Vestra).
Web tĩnh (HTML/CSS/JS thuần), deploy trên Vercel hoặc GitHub Pages, không cần build.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang đăng nhập + dashboard |
| `assets/app.js` | Toàn bộ logic: giải mã dữ liệu, bộ lọc, tính chỉ số, vẽ biểu đồ |
| `assets/styles.css` | Giao diện (font hệ thống Apple SF Pro, Inter cho Windows/Android) |
| `data/data.enc.json` | Dữ liệu đã **mã hóa AES-256-GCM** |
| `scripts/collector.js` | Script chạy trong tab Kênh Người Bán (Chrome) để lấy đơn, phí sàn, Ads, tồn kho |
| `scripts/data-tool.mjs` | Gộp dữ liệu mới vào file mã hóa |

## Bảo mật

Repo đang ở chế độ public nên dữ liệu không bao giờ được lưu dạng đọc được.
Khóa giải mã sinh từ email + mật khẩu đăng nhập (PBKDF2-SHA256, 250.000 vòng), trình duyệt tự giải mã sau khi đăng nhập.
Không có mật khẩu thì file `data/data.enc.json` chỉ là chuỗi mã hóa. Mật khẩu không nằm trong repo.

Muốn đổi mật khẩu: chạy lại `init` với dữ liệu đã export rồi cập nhật khóa mới cho tác vụ đồng bộ.

## Cập nhật dữ liệu

Tác vụ lịch của Claude chạy mỗi ngày trước 16:00 (giờ Việt Nam):

1. Mở Kênh Người Bán trong Chrome (đã đăng nhập), chạy `scripts/collector.js`.
2. Lưu kết quả thành `collected.json` (không commit).
3. `LF_KEY=<khóa> node scripts/data-tool.mjs merge collected.json`
4. Commit `data/data.enc.json` và push. Vercel tự deploy.

## Định nghĩa chỉ số

- **NMV**: giá shop bán (sau giảm giá sản phẩm, trước voucher) × số lượng của đơn không bị hủy (Chờ xác nhận, Chờ lấy hàng, Đang giao, Đã giao). Mọi tỷ lệ % đều chia cho NMV.
- **GMV**: giá bán × số lượng của mọi đơn, kể cả đơn hủy.
- **Phí sàn**: phí cố định + phí dịch vụ + phí xử lý giao dịch + PiShip (theo chi tiết doanh thu từng đơn).
- **Ads LF nạp / Ads Shopee tặng**: tách theo sổ giao dịch tài khoản Ads (mỗi ngày trừ tiền tặng trước, hết mới trừ tiền nạp). Chỉ Ads LF nạp mới tính là chi phí.
- **Mkt fee**: Ads LF nạp tiền + voucher shop.
- **NMV thực nhận**: NMV − phí sàn − voucher shop − Ads LF nạp tiền.
- **Thực thu / sản phẩm**: (giá bán − voucher shop − phí sàn) ÷ số lượng, không tính phí ship khách trả mà Shopee chuyển kèm.
