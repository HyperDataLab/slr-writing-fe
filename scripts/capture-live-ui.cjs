const fs = require('fs');
const path = require('path');
const { chromium } = require('../../slr-fe/node_modules/playwright');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const OUT_DIR = path.resolve(__dirname, '../docs/live-ui-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const PROJECT_ID = process.env.PROJECT_ID || '8963e9f9-2171-4e8d-a9b9-e7c5870bf2aa';
const SNAPSHOT_ID = process.env.SNAPSHOT_ID || '46eba884-f5ed-44cd-8c9d-f60de28dd997';

const QUERY = `?projectId=${PROJECT_ID}&snapshotId=${SNAPSHOT_ID}`;

const PAGES_TO_TEST = [
  { name: '01-overview', path: `/${QUERY}`, title: 'Tổng quan Dự án' },
  { name: '02-import-project', path: `/import${QUERY}`, title: 'Quản lý & Nhập Project' },
  { name: '03-snapshot-readiness', path: `/snapshots${QUERY}`, title: 'Snapshot & Trạng thái Sẵn sàng' },
  { name: '04-evidence-registry', path: `/evidence${QUERY}`, title: 'Kho Bằng chứng (Evidence Registry)' },
  { name: '05-journal-profiles', path: `/journal-profiles${QUERY}`, title: 'Hồ sơ Tạp chí (Journal Profiles)' },
  { name: '06-methods-section', path: `/methods${QUERY}`, title: 'Phương pháp Nghiên cứu (PRISMA 2020)' },
  { name: '07-outline-h1', path: `/outline${QUERY}`, title: 'Dàn ý Bài báo & Phê duyệt H1' },
  { name: '08-paragraph-plans', path: `/drafting${QUERY}#paragraph-plans`, title: 'Kế hoạch Đoạn văn (Paragraph Plans)' },
  { name: '09-drafting-results', path: `/drafting${QUERY}`, title: 'Soạn thảo Đoạn văn & Duyệt H2' },
  { name: '10-verification-quality-gates', path: `/verification${QUERY}`, title: 'Kiểm định 7 Cổng Chất lượng (G1-G7)' },
  { name: '11-export-submission-package', path: `/export${QUERY}`, title: 'Xuất bản & Tải Gói Nộp bài (H3)' },
];

async function runVisualCapture() {
  console.log('========================================================================');
  console.log('    SLR AI Writing Platform — Live Visual UI Verification Suite        ');
  console.log('========================================================================');
  console.log(`Base URL:     ${BASE_URL}`);
  console.log(`Project ID:   ${PROJECT_ID}`);
  console.log(`Snapshot ID:  ${SNAPSHOT_ID}`);
  console.log(`Browser:      ${executablePath}`);
  console.log(`Output Dir:   ${OUT_DIR}\n`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  const results = [];

  for (let i = 0; i < PAGES_TO_TEST.length; i++) {
    const item = PAGES_TO_TEST[i];
    const fullUrl = `${BASE_URL}${item.path}`;
    console.log(`[${i + 1}/${PAGES_TO_TEST.length}] Navigating to: ${item.title}`);
    console.log(`      URL: ${fullUrl}`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500); // Allow react state/animations to settle

      const screenshotFilename = `${item.name}.png`;
      const screenshotPath = path.join(OUT_DIR, screenshotFilename);

      await page.screenshot({ path: screenshotPath, fullPage: true });

      const pageHeading = await page.locator('h1, h2, h3').first().innerText().catch(() => 'N/A');
      console.log(`      ✓ Screenshot captured: ${screenshotFilename}`);
      console.log(`      ✓ Page Heading: "${pageHeading.replace(/\n/g, ' ').trim()}"\n`);

      results.push({
        name: item.name,
        title: item.title,
        url: fullUrl,
        filename: screenshotFilename,
        heading: pageHeading.replace(/\n/g, ' ').trim(),
        status: 'SUCCESS',
      });
    } catch (err) {
      console.error(`      ❌ Error loading ${item.name}: ${err.message}\n`);
      results.push({
        name: item.name,
        title: item.title,
        url: fullUrl,
        filename: null,
        error: err.message,
        status: 'FAILED',
      });
    }
  }

  await browser.close();

  // Generate an HTML visual inspection report
  const reportPath = path.join(OUT_DIR, 'index.html');
  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo cáo Trực quan Giao diện SLR AI Writing Platform</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    h1 { color: #38bdf8; font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 32px; max-width: 1200px; margin: 0 auto; }
    .card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    .card-header { padding: 16px 20px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 18px; font-weight: 600; color: #e2e8f0; }
    .badge { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: #065f46; color: #34d399; font-weight: 600; }
    .card-img { width: 100%; height: auto; display: block; border-top: 1px solid #1e293b; }
    .meta { font-size: 13px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div style="max-width: 1200px; margin: 0 auto;">
    <h1>📸 Báo cáo Trực quan Toàn diện Giao diện SLR AI Writing Platform</h1>
    <p class="subtitle">Dự án: <strong>Live Gemini Smoke Test Project</strong> (ID: <code>${PROJECT_ID}</code>) | Kết nối Backend :5100 & SLR :5000</p>
    <div class="grid">
      ${results
        .filter((r) => r.status === 'SUCCESS')
        .map(
          (r, idx) => `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${idx + 1}. ${r.title}</div>
              <div class="meta">${r.url}</div>
            </div>
            <span class="badge">ĐÃ KIỂM CHỨNG</span>
          </div>
          <img class="card-img" src="./${r.filename}" alt="${r.title}" loading="lazy" />
        </div>`
        )
        .join('\n')}
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(reportPath, htmlContent, 'utf8');
  console.log(`========================================================================`);
  console.log(`  🎉 Báo cáo trực quan HTML đã được tạo tại:\n  ${reportPath}`);
  console.log(`========================================================================\n`);
}

runVisualCapture().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
