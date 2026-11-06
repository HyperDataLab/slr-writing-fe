# Demo trực tiếp trên Chrome

Bộ script này mở một cửa sổ **Chrome thật** và tự thao tác toàn bộ luồng viết bài (đăng nhập, import snapshot, dàn ý H1, soạn thảo, duyệt H2, kiểm chứng G1–G7, duyệt H3, xuất gói, truy vết). Mỗi bước có chú thích ở cuối màn hình để vừa chạy vừa thuyết trình.

Môi trường demo **tách biệt** với môi trường dev thường ngày:

| Thành phần | Cổng | Ghi chú |
| --- | --- | --- |
| Firebase Auth emulator | 9099 | Tài khoản demo tạo bằng một lệnh `curl` |
| `slr-be` giả (`demo-slr.mjs`) | 5001 | Cấp một run đã duyệt từ fixture thật của repo BE, có thêm evidence |
| Writing BE chế độ demo (`demo-be.mts`) | 5120 | Chế độ Firebase, **LLM giả** để kết quả ổn định, không gọi `slr-be` thật |
| Writing FE | 5180 | Trỏ tới BE 5120 và Auth emulator |

> **Lưu ý khi trình bày.** AI trong demo là LLM giả (tất định) nên không cần khóa Gemini. Dữ liệu mẫu chưa có evidence thật, nên đây không phải bằng chứng về chất lượng của Gemini. Lý do chặn từ BE (ví dụ ở bước 9) hiện bằng tiếng Anh vì do server trả về.

## Chuẩn bị

- Ba repo nằm cạnh nhau: `slr-writing-fe` (repo này), `slr-writing-be`, và (tùy chọn) `slr-be`.
- Docker Desktop đang chạy và Postgres của BE đã lên: trong `slr-writing-be` chạy `npm run db:up` rồi `npm run db:deploy`.
- Đã `npm install` ở `slr-writing-fe` và `slr-writing-be`.
- Chrome cài trên máy, và Playwright có sẵn ở một trong các nơi: cài toàn cục / cục bộ (`require("playwright")`), thư mục `slr-fe/node_modules/playwright` cạnh repo này, hoặc đặt `PLAYWRIGHT_MODULE` trỏ tới thư mục gói `playwright`.
- Công cụ `firebase` (Firebase CLI) để chạy Auth emulator, ví dụ `slr-be/node_modules/.bin/firebase` hoặc `npx firebase-tools`. Auth emulator chạy bằng Node, không cần Java.

## Khởi động (mỗi lệnh một terminal)

Các đường dẫn tính từ thư mục chứa ba repo.

**1. Auth emulator**

```bash
cd slr-writing-fe/docs/demo/auth-emulator
../../../../slr-be/node_modules/.bin/firebase emulators:start --only auth --project slr-system-dev
```

**2. `slr-be` giả**

```bash
node slr-writing-fe/docs/demo/demo-slr.mjs
```

**3. Writing BE chế độ demo** (chạy trong `slr-writing-be` để dùng đúng `node_modules`)

```bash
cd slr-writing-be
npx tsx ../slr-writing-fe/docs/demo/demo-be.mts
```

**4. Writing FE** (chạy trong `slr-writing-fe`)

Bash:

```bash
cd slr-writing-fe
VITE_AUTH_MODE=firebase VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_PROJECT_ID=slr-system-dev \
VITE_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099 VITE_API_PROXY_TARGET=http://localhost:5120 \
npx vite --port 5180 --strictPort --host 127.0.0.1
```

PowerShell:

```powershell
cd slr-writing-fe
$env:VITE_AUTH_MODE="firebase"; $env:VITE_FIREBASE_API_KEY="demo-key"; $env:VITE_FIREBASE_PROJECT_ID="slr-system-dev"
$env:VITE_FIREBASE_AUTH_EMULATOR_URL="http://localhost:9099"; $env:VITE_API_PROXY_TARGET="http://localhost:5120"
npx vite --port 5180 --strictPort --host 127.0.0.1
```

**5. Tạo tài khoản demo trong emulator** (một lần mỗi lần emulator khởi động, vì emulator không lưu dữ liệu)

```bash
curl -s -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Demo@12345","displayName":"Demo Owner"}'
```

## Chạy demo

```bash
node slr-writing-fe/docs/demo/demo.cjs
```

Tốc độ chỉnh bằng biến môi trường: `PACE` (mili giây dừng sau mỗi bước, mặc định 1400) và `SLOW` (độ trễ mỗi thao tác, mặc định 250). Trình diễn trước khán giả nên dùng `PACE=2600 SLOW=300`; chạy kiểm tra nhanh dùng `PACE=500 SLOW=100`. Mỗi lần chạy tạo một project mới có tên theo giờ nên chạy lại được nhiều lần. Ảnh chụp từng bước nằm ở `docs/demo/shots/` (bị git bỏ qua); đổi nơi lưu bằng `DEMO_SHOTS`.

Biến khác: `DEMO_BASE_URL` (mặc định `http://127.0.0.1:5180`), `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_SLR_PORT`, `DEMO_BE_PORT`, `DEMO_AUTH_EMULATOR_HOST`, `DEMO_FIXTURE`, `DEMO_BE_SRC`.

## Kịch bản và lời dẫn

Mở đầu: "Hệ thống biến kết quả tổng quan SLR đã duyệt thành bản thảo truy vết được. AI chỉ viết văn, không đổi số liệu. Con người duyệt ở 3 điểm: H1 dàn ý, H2 nội dung, H3 bản cuối."

| # | Thao tác trên giao diện | Nội dung cần nói |
| --- | --- | --- |
| 0 | Mở trang, bị chuyển về **Đăng nhập**, đăng nhập | Phải đăng nhập mới vào được mọi trang; token Firebase được BE xác minh |
| 1 | **Tổng quan** | Bốn giai đoạn và các nguyên tắc |
| 2 | **Projects**: tạo project, liên kết project SLR | Chỉ liên kết được project SLR mà mình có quyền |
| 3 | **Snapshot**: chọn run trong danh sách (A1/A2/A7/A10 đã duyệt), Nhập snapshot | Snapshot **bất biến**, có kiểm tra readiness |
| 4 | **Hồ sơ tạp chí** | Khung IMRaD, luôn ghi "chưa xác minh với tạp chí nào" |
| 5 | **Methods / PRISMA**: Tạo Methods | Mẫu cố định, không AI, số liệu lấy từ snapshot |
| 6 | **Dàn ý / H1**: Tạo dàn ý, **Duyệt H1** | Độ phủ câu hỏi nghiên cứu, OWNER duyệt |
| 7 | **Kế hoạch đoạn**: Tạo kế hoạch | 9/12 đoạn sẵn sàng; 3 đoạn thiếu bằng chứng **không được soạn** |
| 8 | **Soạn thảo**: AI soạn Kết quả, Thảo luận, Mở đầu; bấm mã `[E-01]` | Chỉ viết từ bằng chứng đã gắn; trích dẫn chỉ lấy từ registry |
| 9 | **Xuất bản** (lần đầu) | **Bị chặn**, nêu lý do: chưa duyệt H2, chưa kiểm chứng |
| 10 | **Sửa tay** bản nháp Kết quả | Tạo phiên bản mới; nút Duyệt H2 **bị khóa** tới khi kiểm chứng lại |
| 11 | **Cổng chất lượng**: chạy G1–G7, xem danh mục trích dẫn | 7/7 đạt, mọi trích dẫn khớp registry |
| 12 | Quay lại Soạn thảo, **Duyệt H2** Kết quả, Thảo luận, Mở đầu, Phương pháp; rồi soạn **Tóm tắt** và **Kết luận** từ các section đã duyệt và duyệt H2; chạy lại kiểm chứng | Abstract/Conclusion viết sau cùng, không thêm số liệu hay trích dẫn mới; có section mới nên báo cáo cũ phải chạy lại |
| 13 | **Xuất bản**: Duyệt H3, Tạo gói v1, tab Truy vết ngược | Gói ZIP 7 tệp; truy từ một câu về bằng chứng, nghiên cứu và vị trí nguồn |

Câu chốt: "Không thể xuất bản thảo thiếu section, chưa duyệt đủ H1/H2/H3 hoặc có kiểm chứng đã cũ. Hệ thống dừng và nói rõ lý do."

Gói nộp có đủ sáu section (Tóm tắt, Mở đầu, Phương pháp, Kết quả, Thảo luận, Kết luận) cùng phần tài liệu tham khảo.

## Dọn dẹp

- Dừng năm tiến trình ở trên (Ctrl+C từng terminal).
- Mỗi lần chạy để lại vài project "Demo SLR ..." của `demo@example.com` trong Postgres dev của BE (tách theo chủ sở hữu, không lẫn với project của bạn). Xóa hết cùng dữ liệu dev bằng `docker compose down -v` trong `slr-writing-be`.

## Khi script báo lỗi

Script chụp `shots/ERROR.png` và in nội dung trang hiện tại. Nguyên nhân thường gặp: một trong năm tiến trình chưa chạy; chưa tạo tài khoản demo (bước 5); cổng bị chiếm; giao diện đổi nhãn nút (các bước tìm nút theo chữ tiếng Việt trong `demo.cjs`).
