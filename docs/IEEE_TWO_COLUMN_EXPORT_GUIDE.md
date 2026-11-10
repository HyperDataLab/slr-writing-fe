# Hướng Dẫn Xuất Bản Bài Báo Chuẩn IEEE 2 Cột từ Frontend

Tài liệu này hướng dẫn cách kích hoạt và xuất bản bài báo khoa học định dạng 2 cột chuẩn IEEE Conference từ phân hệ **SLR Writing Frontend**.

---

## 1. Các Lệnh Khởi Chạy Xuất Bản

Từ thư mục `slr-writing-fe`, bạn có thể chạy một trong các lệnh sau:

```bash
# 1. Xuất cả 2 định dạng (IEEE 2 cột + IMRaD 1 cột)
npm run export:pdf

# 2. Xuất định dạng IEEE Conference Two-Column chuyên nghiệp
npm run export:pdf:ieee

# 3. Xuất định dạng Generic IMRaD Single-Column
npm run export:pdf:imrad
```

---

## 2. Kết Quả Đầu Ra

Các file PDF được tạo ra tức thời tại thư mục giải pháp và thư mục demo:
- [`paper.pdf`](file:///d:/FPTU-Semester5/SWP391/ScientificJournalPublicationTrendTrackingSystem/paper.pdf) — File hoàn chỉnh chuẩn IEEE 2 cột tại thư mục gốc.
- `slr-writing-be/docs/demo-export/paper-ieee.pdf` — Bản IEEE 2 cột.
- `slr-writing-be/docs/demo-export/paper-imrad.pdf` — Bản IMRaD 1 cột.

---

## 3. Đặc Điểm Nổi Bật của Bản In IEEE

1. **Bố cục 2 Cột Chuẩn Mực:** Căn đều 2 bên, độ rộng cột 5mm, ngắt dòng tự động chuẩn quốc tế.
2. **Tiêu đề Băng Ngang (Full-Width Header):** Tiêu đề 24pt đậm, tên nhóm nghiên cứu, cơ quan chủ quản (FPT University).
3. **Abstract & Index Terms:** Dẫn đề in nghiêng đậm chuẩn hội thảo IEEE/ACM.
4. **Đánh Số Đề Mục La Mã:** `I. INTRODUCTION`, `II. METHODOLOGY`, `III. RESULTS`, `IV. DISCUSSION`, `V. CONCLUSION`.
5. **Trích Dẫn Số:** Tự động chuyển đổi các trích dẫn thành dạng số `[1]`, `[2]`, `[3]-[5]`.
6. **Bảng Biểu TABLE I:** Trình bày PRISMA 2020 Flow theo phong cách bảng 2 dòng kẻ chuẩn mực của IEEE.
7. **Tuyên bố Đạo đức AI:** Tuân thủ hướng dẫn bản quyền và tác giả AI của IEEE và COPE.

---

## 4. Tải và Xem Trực Tiếp Trên Web UI

Người dùng và Giám khảo không cần thao tác dòng lệnh, có thể tải hoặc xem bản thảo trực tiếp ngay trên giao diện web:

1. **Vào màn hình Gói nộp bài (H3):** Đi tới menu **Xuất bản thảo** (`/export`).
2. **Nút "Tải bài báo PDF (IEEE)":** Nằm ngay trên thanh công cụ của thẻ "Gói nộp bài và tệp PKZIP". Nhấp vào để tải ngay file PDF chuẩn IEEE 2 cột về máy.
3. **Nút "Xem PDF (IEEE)":** Mở trực tiếp tab mới trên trình duyệt để duyệt toàn bộ 8 trang bản thảo dạng PDF 2 cột sắc nét.
4. **Thao tác nhanh trong bảng Manifest:** Tại dòng tệp `manuscript.md`, có sẵn các nút `[ PDF (IEEE) ]` và `[ Xem PDF (IEEE) ]` để thao tác trực tiếp.


