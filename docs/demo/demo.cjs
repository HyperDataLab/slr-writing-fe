// Live demo of the writing UI in a real, visible Chrome window. Each step shows a caption on the page.
const fs = require("fs");
const path = require("path");

// Playwright is not a dependency of this repo. Use a global/local install, or the one in the sibling slr-fe repo,
// or point PLAYWRIGHT_MODULE at any playwright package directory.
function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", path.resolve(__dirname, "../../../slr-fe/node_modules/playwright")].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try the next one */ }
  }
  throw new Error("Playwright not found. Run `npm i -D playwright` somewhere and set PLAYWRIGHT_MODULE, or see docs/demo/README.md");
}
const { chromium } = loadPlaywright();

const OUT = process.env.DEMO_SHOTS ?? path.join(__dirname, "shots");
const BASE = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:5180";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@12345";
const PACE = Number(process.env.PACE || 1400); // ms to linger on each result so people can read it
const SLOW = Number(process.env.SLOW || 250);
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shot = 0;

async function caption(page, text) {
  console.log("▶", text);
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;max-width:80vw;background:#0f2b3d;color:#fff;padding:10px 18px;border-radius:10px;font:600 15px system-ui;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
async function snap(page, name) {
  shot += 1;
  await page.screenshot({ path: `${OUT}/${String(shot).padStart(2, "0")}-${name}.png` });
}
async function step(page, title, fn) {
  await caption(page, title);
  await fn();
  await sleep(PACE);
}
const btn = (page, re) => page.getByRole("button", { name: re }).first();
async function click(page, re, opts = {}) {
  const b = btn(page, re);
  await b.waitFor({ state: "visible", timeout: opts.timeout ?? 15000 });
  await b.click();
}
async function goto(page, target) {
  if (typeof target === "string" && target.startsWith("/")) {
    const currentUrl = new URL(page.url());
    const projectId = currentUrl.searchParams.get("projectId");
    const snapshotId = currentUrl.searchParams.get("snapshotId");
    const dest = new URL(target, BASE);
    if (projectId && !dest.searchParams.has("projectId")) dest.searchParams.set("projectId", projectId);
    if (snapshotId && !dest.searchParams.has("snapshotId")) dest.searchParams.set("snapshotId", snapshotId);
    await page.goto(dest.toString());
  } else {
    try {
      await page.getByRole("link", { name: target }).first().click({ timeout: 2500 });
    } catch {
      await page.locator(`a:has-text("${target}")`).first().click();
    }
  }
  await page.waitForLoadState("networkidle");
}

let GLOBAL_PAGE = null;
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: false, slowMo: SLOW, args: ["--window-size=1500,950", "--window-position=20,20"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  GLOBAL_PAGE = page;
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  const projectName = `Demo SLR ${stamp}`;

  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  await step(page, "0. Trang đăng nhập (Firebase). Chưa đăng nhập thì mọi trang đều chuyển về đây", async () => { await snap(page, "login"); });
  await page.fill("#login-email", DEMO_EMAIL);
  await page.fill("#login-password", DEMO_PASSWORD);
  await step(page, "0. Đăng nhập bằng tài khoản Firebase (emulator)", async () => { await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); });
  await step(page, "1. Tổng quan: quy trình và các nguyên tắc", async () => { await snap(page, "overview"); });

  // 2. Projects
  await step(page, "2. Projects: tạo project viết bài, liên kết với project SLR", async () => {
    await goto(page, "/import?newProject=1");
    await page.getByLabel(/Tên writing project/).fill(projectName);
    await page.getByLabel(/SLR project ID|ID project/i).fill(`proj_demo_${stamp}`);
    await snap(page, "projects-form");
    await click(page, /Tạo và tiếp tục|Tạo project/);
    await page.getByText(projectName).first().waitFor();
    await snap(page, "projects-created");
  });

  // 3. Snapshots
  await step(page, "3. Snapshot & readiness: chọn run đã duyệt ở SLR, nhập thành snapshot bất biến", async () => {
    await page.getByText("run-20261030101014-gbekjc").first().waitFor();
    await snap(page, "snapshots-run-picker");
  });
  await step(page, "3. Bấm chọn run, rồi Nhập snapshot (BE kiểm tra readiness)", async () => {
    await page.getByRole("button", { name: /run-20261030101014-gbekjc/ }).first().click();
    await click(page, /Import snapshot|Nhập snapshot/);
    await page.getByText(/READY|Sẵn sàng/i).first().waitFor({ timeout: 20000 });
    await snap(page, "snapshots-imported");
  });

  await step(page, "4. Hồ sơ tạp chí: khung IMRaD, luôn ghi rõ chưa xác minh với tạp chí nào", async () => {
    await goto(page, "/journal-profiles");
    await snap(page, "journal-profile");
  });

  await step(page, "5. Methods / PRISMA: sinh bằng mẫu cố định, không dùng AI; số liệu lấy từ snapshot", async () => {
    await goto(page, "/methods");
    await click(page, /Tạo Methods|Tạo lại/);
    await page.waitForTimeout(1500);
    await snap(page, "methods");
  });

  await step(page, "6. Dàn ý / H1: sinh dàn ý, kiểm tra độ phủ câu hỏi nghiên cứu", async () => {
    await goto(page, "/outline");
    await click(page, /Tạo dàn ý từ snapshot|Tạo dàn ý/);
    await page.waitForTimeout(1500);
    await snap(page, "outline");
  });
  await step(page, "6. OWNER duyệt H1", async () => {
    await click(page, /Duyệt H1|Approve H1/);
    await page.waitForTimeout(1500);
    await snap(page, "outline-approved");
  });

  await step(page, "7. Kế hoạch đoạn: chia section thành các đoạn, gắn bằng chứng cho từng đoạn", async () => {
    await goto(page, "/drafting#paragraph-plans");
    await click(page, /Tạo kế hoạch đoạn văn|Tạo kế hoạch/);
    await page.waitForTimeout(1800);
    await snap(page, "plans");
  });


  // 8. Drafting
  const tab = async (label) => { await page.getByRole("button", { name: label }).first().click(); await page.waitForTimeout(700); };
  const draftIfNeeded = async () => {
    const b = page.getByRole("button", { name: /Viết từ kế hoạch|Soạn section bằng AI|Soạn lại section/ }).first();
    await b.waitFor({ state: "visible" });
    if (/Viết từ kế hoạch|Soạn section bằng AI/.test(await b.innerText())) {
      await b.click();
      await page.getByText(/Văn bản đã soạn/).first().waitFor({ timeout: 30000 });
    }
  };
  await step(page, "8. Soạn thảo: AI chỉ viết từ bằng chứng đã gắn ở kế hoạch đoạn (ở demo dùng LLM giả để ổn định)", async () => {
    await goto(page, "/drafting");
    await tab(/Kết quả \(M7\)|Kết quả/); await draftIfNeeded();
    await snap(page, "draft-results");
  });
  await step(page, "8. Bấm vào mã trích dẫn [E-01]: kiểm tra nó có thuộc gói bằng chứng của bản nháp không", async () => {
    await page.getByRole("button", { name: "[E-01]" }).first().click();
    await snap(page, "draft-citation");
  });
  await step(page, "8. Soạn tiếp Thảo luận và Mở đầu", async () => {
    await tab(/Thảo luận/); await draftIfNeeded();
    await tab(/Mở đầu/); await draftIfNeeded();
    await snap(page, "draft-intro");
  });

  // 9. Fail-closed: export is blocked before approvals
  await step(page, "9. Chặn an toàn: chưa duyệt H2 và chưa kiểm chứng thì Xuất bản bị chặn, nêu rõ lý do", async () => {
    await goto(page, "/export");
    await page.getByText(/Chưa đủ điều kiện để xuất/).first().waitFor();
    await snap(page, "export-blocked");
  });

  // 10. Manual edit forces re-verification
  await step(page, "10. Sửa tay bản nháp Kết quả: tạo phiên bản mới, nút Duyệt H2 bị khóa cho tới khi kiểm chứng lại", async () => {
    await goto(page, "/drafting");
    await tab(/Kết quả \(M7\)|Kết quả/);
    await click(page, /Sửa tay/);
    const ta = page.locator("#draft-editor");
    await ta.waitFor();
    await ta.press("Control+End");
    await ta.type("\n\nĐoạn nhận xét này do người nghiên cứu bổ sung.", { delay: 15 });
    await click(page, /Lưu thành phiên bản mới/);
    await page.getByText(/chưa kiểm chứng lại/i).first().waitFor();
    await snap(page, "draft-edited-locked");
  });

  // 11. Verification
  await step(page, "11. Cổng chất lượng G1–G7: chạy kiểm chứng (trích dẫn, trích nguyên văn, PRISMA, số liệu, độ phủ câu hỏi nghiên cứu...)", async () => {
    await goto(page, "/verification");
    await click(page, /Chạy kiểm chứng/);
    await page.getByText(/Đạt/).first().waitFor({ timeout: 30000 });
    await snap(page, "verification");
  });
  await step(page, "11. Danh mục trích dẫn: mỗi trích dẫn khớp một thực thể trong registry của snapshot", async () => {
    await click(page, /Danh mục trích dẫn/);
    await snap(page, "verification-manifest");
  });

  // 12. H2 approvals
  const approveH2 = async () => {
    await click(page, /^Duyệt H2$/);
    await click(page, /Xác nhận duyệt \(H2\)/);
    await page.getByText(/Đã duyệt/).first().waitFor();
  };
  await step(page, "12. OWNER duyệt H2 cho từng section (Kết quả, Thảo luận, Mở đầu, Phương pháp)", async () => {
    await goto(page, "/drafting");
    await tab(/Kết quả \(M7\)|Kết quả/); await approveH2();
    await snap(page, "h2-results");
    await tab(/Thảo luận/); await approveH2();
    await tab(/Mở đầu/); await approveH2();
    await tab(/Phương pháp \(M2\)|Phương pháp/); await approveH2();
    await snap(page, "h2-methods");
  });

  // 12b. Abstract and Conclusion are written last, from the approved sections
  await step(page, "12. Tóm tắt và Kết luận được viết sau cùng, chỉ từ các section đã duyệt H2 (không thêm số liệu hay trích dẫn mới)", async () => {
    await goto(page, "/drafting");
    await tab(/Tóm tắt/); await draftIfNeeded();
    await snap(page, "draft-abstract");
    await approveH2();
    await tab(/Kết luận/); await draftIfNeeded(); await approveH2();
  });
  await step(page, "12. Có section mới nên báo cáo kiểm chứng đã cũ: chạy lại các cổng", async () => {
    await goto(page, "/verification");
    await click(page, /Chạy lại các cổng/);
    await page.getByText(/Đạt/).first().waitFor({ timeout: 30000 });
    await snap(page, "verification-rerun");
  });

  // 13. Export
  await step(page, "13. Xuất bản: danh sách kiểm tra đạt, OWNER duyệt H3", async () => {
    await goto(page, "/export");
    await click(page, /Cho phép duyệt H3/);
    await click(page, /Cho phép và duyệt H3/);
    await page.getByText(/ĐÃ DUYỆT H3/).first().waitFor();
    await snap(page, "h3-approved");
  });
  await step(page, "13. Tạo gói nộp bài (ZIP gồm 7 tệp: bản thảo, danh mục trích dẫn, báo cáo chất lượng, lời khai dùng AI, ...)", async () => {
    await click(page, /Tạo gói v1/);
    await page.getByText(/manuscript\.md/).first().waitFor({ timeout: 30000 });
    await snap(page, "export-package");
  });
  await step(page, "13. Truy vết ngược: từ một câu trong bản thảo về bằng chứng, nghiên cứu và vị trí nguồn", async () => {
    await click(page, /Truy vết ngược nguồn bằng chứng/);
    await page.getByText(/Bằng chứng nguồn đã neo|bằng chứng/i).first().waitFor();
    await snap(page, "lineage");
  });
  await caption(page, "Kết thúc demo. Bản thảo chỉ xuất được khi đủ section, đã duyệt H1/H2/H3 và kiểm chứng còn hiện hành");
  await sleep(4000);
  await browser.close();
})().catch(async (e) => {
  console.error("ERR", String(e.message).slice(0, 300));
  try { await GLOBAL_PAGE.screenshot({ path: OUT + "/ERROR.png" }); console.log("url at error:", GLOBAL_PAGE.url()); console.log((await GLOBAL_PAGE.locator("body").innerText()).slice(0, 900)); } catch {}
  process.exit(1);
});
