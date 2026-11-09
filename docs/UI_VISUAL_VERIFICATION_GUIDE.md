# Hướng dẫn Kiểm tra Trực quan Giao diện (UI Visual Verification Guide)

> **Repository:** `slr-writing-fe`  
> **Backend tương thích:** `slr-writing-be` cổng 5100  
> **SLR Upstream:** `demo-slr` cổng 5000  
> **Trạng thái:** Toàn bộ 11 màn hình đã được kiểm tra trực quan và chụp ảnh chứng thực  

---

## 1. Tổng quan Bộ ảnh Minh chứng (11 Màn hình)

Tất cả ảnh chụp màn hình độ phân giải cao được lưu tại thư mục [`docs/live-ui-screenshots/`](./live-ui-screenshots/):

| STT | Màn hình | Đường dẫn Route | Tệp Ảnh Minh chứng |
|:---:|---|---|---|
| **01** | Tổng quan Dự án | `/?projectId=...` | [`01-overview.png`](./live-ui-screenshots/01-overview.png) |
| **02** | Nhập & Liên kết Project | `/import?projectId=...` | [`02-import-project.png`](./live-ui-screenshots/02-import-project.png) |
| **03** | Snapshot & Trạng thái Sẵn sàng | `/snapshots?projectId=...` | [`03-snapshot-readiness.png`](./live-ui-screenshots/03-snapshot-readiness.png) |
| **04** | Kho Bằng chứng (Evidence Registry) | `/evidence?projectId=...` | [`04-evidence-registry.png`](./live-ui-screenshots/04-evidence-registry.png) |
| **05** | Hồ sơ Tạp chí (Journal Profiles) | `/journal-profiles?projectId=...` | [`05-journal-profiles.png`](./live-ui-screenshots/05-journal-profiles.png) |
| **06** | Phương pháp Nghiên cứu (PRISMA 2020) | `/methods?projectId=...` | [`06-methods-section.png`](./live-ui-screenshots/06-methods-section.png) |
| **07** | Dàn ý Bài báo & Phê duyệt H1 | `/outline?projectId=...` | [`07-outline-h1.png`](./live-ui-screenshots/07-outline-h1.png) |
| **08** | Kế hoạch Đoạn văn (Paragraph Plans) | `/drafting?projectId=...#paragraph-plans` | [`08-paragraph-plans.png`](./live-ui-screenshots/08-paragraph-plans.png) |
| **09** | Soạn thảo Đoạn văn & Duyệt H2 | `/drafting?projectId=...` | [`09-drafting-results.png`](./live-ui-screenshots/09-drafting-results.png) |
| **10** | Kiểm định 7 Cổng Chất lượng (G1–G7) | `/verification?projectId=...` | [`10-verification-quality-gates.png`](./live-ui-screenshots/10-verification-quality-gates.png) |
| **11** | Xuất bản & Tải Gói Nộp bài (H3) | `/export?projectId=...` | [`11-export-submission-package.png`](./live-ui-screenshots/11-export-submission-package.png) |

---

## 2. Cách xem Báo cáo Trực quan HTML

Bạn có thể mở trực tiếp file báo cáo tổng hợp:
[`docs/live-ui-screenshots/index.html`](./live-ui-screenshots/index.html) bằng bất kỳ trình duyệt nào (Chrome, Edge) để duyệt qua toàn bộ các màn hình trên một trang duy nhất.

---

## 3. Cách chạy Lại Kịch bản Chụp ảnh Tự động

### Yêu cầu tiên quyết:
1. SLR Mock đang chạy trên cổng 5000:
   ```bash
   $env:DEMO_SLR_PORT="5000"; node docs/demo/demo-slr.mjs
   ```
2. Writing Backend đang chạy trên cổng 5100:
   ```bash
   cd ../slr-writing-be && node dist/server.js
   ```
3. Vite Frontend đang chạy trên cổng 5173:
   ```bash
   npm run dev
   ```

### Lệnh thực thi:
```bash
node scripts/capture-live-ui.cjs
```
Script sẽ khởi động trình duyệt Chrome/Edge, tự động truy cập 11 route với ID dự án live và lưu ảnh mới vào `docs/live-ui-screenshots/`.
