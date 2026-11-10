const fs = require('fs');
const path = require('path');
const { chromium } = require('../../slr-fe/node_modules/playwright');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
// Use the live project that has the complete full pipeline data
const PROJECT_ID = process.env.PROJECT_ID || '8963e9f9-2171-4e8d-a9b9-e7c5870bf2aa';
const SNAPSHOT_ID = process.env.SNAPSHOT_ID || '46eba884-f5ed-44cd-8c9d-f60de28dd997';

const QUERY = `?projectId=${PROJECT_ID}&snapshotId=${SNAPSHOT_ID}`;

async function showGuideBanner(page, stepNum, totalSteps, title, description) {
  await page.evaluate(
    ({ stepNum, totalSteps, title, description }) => {
      let banner = document.getElementById('slr-live-guide-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'slr-live-guide-banner';
        banner.style.position = 'fixed';
        banner.style.bottom = '24px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.zIndex = '999999';
        banner.style.maxWidth = '880px';
        banner.style.width = 'calc(100% - 48px)';
        banner.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
        banner.style.color = '#ffffff';
        banner.style.padding = '18px 24px';
        banner.style.borderRadius = '16px';
        banner.style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)';
        banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        banner.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        document.body.appendChild(banner);
      }

      banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="background: #0284c7; color: white; font-weight: bold; font-size: 13px; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(2,132,199,0.4);">
              ${stepNum}/${totalSteps}
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                ${title}
              </div>
              <div style="font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
                ${description}
              </div>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #94a3b8; white-space: nowrap;">
            Interactive Walkthrough
          </div>
        </div>
      `;
    },
    { stepNum, totalSteps, title, description }
  );
}

async function runLiveWalkthrough() {
  console.log('========================================================================');
  console.log('    SLR AI Writing Platform — Mở Trình Duyệt Tương Tác Trực Quan       ');
  console.log('========================================================================');
  console.log(`URL:          ${BASE_URL}`);
  console.log(`Browser:      ${executablePath} (Headless: FALSE - Cửa sổ nổi trên màn hình!)`);
  console.log(`Project ID:   ${PROJECT_ID}\n`);

  const browser = await chromium.launch({
    executablePath,
    headless: false, // Opens visible browser on the user's screen!
    slowMo: 400,     // Smooth, human-like speed
    args: ['--start-maximized', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: null, // Full-screen
  });

  const page = await context.newPage();

  const STEPS = [
    {
      url: `${BASE_URL}/${QUERY}`,
      title: 'Bước 1: Trang Tổng Quan & Dự Án (Overview)',
      desc: 'Quản lý toàn bộ vòng đời bài báo. Dự án này đã nhập snapshot từ 6 công trình khoa học thật nổi tiếng thế giới (Codex, Copilot, SWE-bench...).',
      waitMs: 4000,
    },
    {
      url: `${BASE_URL}/snapshots${QUERY}`,
      title: 'Bước 2: Snapshot Bất Biến & Chống Giả Mạo Dữ Liệu',
      desc: 'Dữ liệu 6 bài báo gốc được đóng băng bằng mã băm mật mã học (Corpus Hash). Cả AI và người dùng đều không thể tự ý sửa đổi dữ liệu gốc.',
      waitMs: 4500,
    },
    {
      url: `${BASE_URL}/evidence${QUERY}`,
      title: 'Bước 3: Kho Bằng Chứng Thực Tế (Evidence Registry)',
      desc: 'Danh mục 6 bài báo khoa học đỉnh cao kèm các trích đoạn nguyên văn. Mọi câu khẳng định sau này sẽ được gắn mã neo bằng chứng E-01, E-02.',
      waitMs: 4000,
    },
    {
      url: `${BASE_URL}/methods${QUERY}`,
      title: 'Bước 4: Phương Pháp Nghiên Cứu Tất Định (PRISMA 2020 Flow)',
      desc: 'ĐIỂM SÁNG: Phần Methods hoàn toàn KHÔNG DÙNG AI! Động cơ toán học tự đếm: N=6 bài, 0 trùng lặp, 6 đủ điều kiện, loại bỏ 100% ảo giác số liệu.',
      waitMs: 4500,
    },
    {
      url: `${BASE_URL}/outline${QUERY}`,
      title: 'Bước 5: Dàn Ý Bài Báo (Blueprint) & Chốt Chặn H1',
      desc: 'Dàn ý theo chuẩn IMRaD trả lời 3 câu hỏi RQ1, RQ2, RQ3. Chốt chặn H1 (Human-in-the-loop) bắt buộc tác giả phải duyệt dàn ý trước khi AI viết.',
      waitMs: 4000,
    },
    {
      url: `${BASE_URL}/drafting${QUERY}`,
      title: 'Bước 6: Soạn Thảo Có Ràng Buộc Bằng Gemini 3.5 Flash & Duyệt H2',
      desc: 'AI bị giam trong "Lồng bằng chứng", chỉ được viết dựa trên dữ kiện đã cấp. Tác giả đọc từng đoạn, có thể sửa trực tiếp và bấm Phê duyệt H2.',
      waitMs: 5000,
    },
    {
      url: `${BASE_URL}/verification${QUERY}`,
      title: 'Bước 7: Bảng Điểm 7 Cổng Kiểm Định Chất Lượng (Quality Gates G1-G7)',
      desc: 'Hệ thống tự động kiểm tra: 100% trích dẫn thật (không có trích dẫn ma), văn phong học thuật, suy luận ngữ nghĩa NLI và epistemic hedging.',
      waitMs: 5000,
    },
    {
      url: `${BASE_URL}/export${QUERY}`,
      title: 'Bước 8: Chốt Duyệt H3 & Xuất Gói Nộp Bài Chuẩn IEEE 2 Cột',
      desc: 'Ký duyệt H3, xuất file .zip gồm 7 tệp tin có mã băm SHA-256, bản tuyên ngôn đạo đức AI (ICMJE/COPE) và file PDF chuẩn IEEE 2 cột!',
      waitMs: 5000,
    },
  ];

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    console.log(`>>> [${i + 1}/${STEPS.length}] ${step.title}`);
    await page.goto(step.url, { waitUntil: 'networkidle' });
    await showGuideBanner(page, i + 1, STEPS.length, step.title, step.desc);
    await page.waitForTimeout(step.waitMs);
  }

  // Final success banner
  await page.evaluate(() => {
    const banner = document.getElementById('slr-live-guide-banner');
    if (banner) {
      banner.style.background = 'linear-gradient(135deg, #065f46 0%, #047857 100%)';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div>
            <div style="font-size: 17px; font-weight: 700; color: #a7f3d0; margin-bottom: 4px;">
              🎉 HOÀN THÀNH TOÀN BỘ FLOW DEMO TƯƠNG TÁC!
            </div>
            <div style="font-size: 13.5px; line-height: 1.5; color: #ecfdf5;">
              Cửa sổ trình duyệt này vẫn đang mở để bạn tự do click chuột, xem từng tab và thực hành trước khi trình chiếu cho giảng viên.
            </div>
          </div>
          <button onclick="document.getElementById('slr-live-guide-banner').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">
            Đóng bảng
          </button>
        </div>
      `;
    }
  });

  console.log('\n========================================================================');
  console.log('  🎉 ĐÃ HOÀN THÀNH TOUR HƯỚNG DẪN TRỰC QUAN TRÊN MÀN HÌNH!');
  console.log('  Cửa sổ trình duyệt đang mở để bạn tự do tương tác trực tiếp.');
  console.log('========================================================================\n');

  // Keep browser open indefinitely until user manually closes it
  await page.waitForEvent('close', { timeout: 0 });
}

runLiveWalkthrough().catch((err) => {
  console.error('Lỗi khi chạy walkthrough:', err);
  process.exit(1);
});

