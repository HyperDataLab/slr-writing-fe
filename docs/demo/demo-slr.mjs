// A stand-in for slr-be for the live demo: serves one approved run (the repo's real demo fixture, with evidence added).
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The repos are expected side by side (slr-writing-fe next to slr-writing-be). Override with DEMO_FIXTURE.
const FIXTURE = process.env.DEMO_FIXTURE ?? fileURLToPath(new URL("../../../slr-writing-be/tests/fixtures/real/slr-be-demo-run.json", import.meta.url));
const PORT = Number(process.env.DEMO_SLR_PORT ?? 5001);
const base = JSON.parse(readFileSync(FIXTURE, "utf8"));

function forProject(pid) {
  const raw = structuredClone(base);
  raw.run.project_id = pid;
  raw.corpus.project_id = pid;
  raw.supplements.prisma_writing_export.project.id = pid;
  raw.corpus.documents = [
    { document_id: "doc_copilot", study_id: "demo_paper_copilot_2022", kind: "pdf", source_revisions: ["1"], source_hashes: ["sha256-mock-doc-1"] },
    { document_id: "doc_repair", study_id: "demo_paper_repair_2024", kind: "pdf", source_revisions: ["1"], source_hashes: ["sha256-mock-doc-2"] },
  ];
  raw.corpus.evidence = [
    { evidence_id: "E-01", study_id: "demo_paper_copilot_2022", field_id: "fld_title_proj_slr_artifacts_demo", finding_ids: ["F:demo_paper_copilot_2022:fld_title_proj_slr_artifacts_demo"], document_id: "doc_copilot", source_revision: "1", source_hash: "sha256-mock-1", source_location: { page: 1, section: "Results", paragraph: 2, table_or_figure: null }, quote: "Copilot achieved high accuracy in code generation benchmarks.", quote_hash: null, quote_hash_verified: true, consensus_value_match: "match" },
    { evidence_id: "E-02", study_id: "demo_paper_repair_2024", field_id: "fld_title_proj_slr_artifacts_demo", finding_ids: ["F:demo_paper_repair_2024:fld_title_proj_slr_artifacts_demo"], document_id: "doc_repair", source_revision: "1", source_hash: "sha256-mock-2", source_location: { page: 3, section: "Discussion", paragraph: 1, table_or_figure: null }, quote: "Program repair accuracy improved significantly with automated sampling.", quote_hash: null, quote_hash_verified: true, consensus_value_match: "match" },
  ];
  for (const f of raw.corpus.findings) {
    if (f.study_id === "demo_paper_copilot_2022") f.evidence_ids = ["E-01"];
    if (f.study_id === "demo_paper_repair_2024") f.evidence_ids = ["E-02"];
  }
  return raw;
}

const wrap = (data) => ({ success: true, isSuccess: true, data, message: "ok" });
const send = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(body)); };

createServer((req, res) => {
  const url = (req.url ?? "").split("?")[0];
  if (url === "/api/health" || url === "/health") return send(res, 200, wrap({ status: "ok" }));
  const m = url.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
  if (!m) return send(res, 404, {});
  const pid = decodeURIComponent(m[1]);
  const rest = m[2] ?? "";
  const raw = forProject(pid);
  const runBase = `/synthesis/artifacts/runs/${raw.run.run_id}`;
  console.log(new Date().toISOString().slice(11, 19), req.method, url, req.headers.authorization ? "(token)" : "(no token)");

  if (rest === "") return send(res, 200, wrap({ id: pid, name: "Demo SLR project", role: "OWNER", roleText: "OWNER" }));
  if (rest === "/synthesis/artifacts/runs") {
    return send(res, 200, wrap([{ ...raw.run, generated_at: raw.run.generated_at ?? "2026-11-06T09:00:00.000Z", generated_by: raw.run.generated_by ?? "leader_user" }]));
  }
  if (rest === runBase) return send(res, 200, wrap(raw.run));
  if (rest === `${runBase}/artifacts/corpus`) return send(res, 200, wrap(raw.corpus));
  const art = rest.match(new RegExp(`^${runBase}/artifacts/(A\\d+)$`));
  if (art && raw.artifacts[art[1]]) return send(res, 200, wrap(raw.artifacts[art[1]]));
  if (rest === "/prisma/writing-export.json") return send(res, 200, wrap(raw.supplements.prisma_writing_export));
  if (rest === "/synthesis/findings") return send(res, 200, wrap(raw.supplements.rq_findings));
  return send(res, 404, { success: false, message: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`fake slr-be on ${PORT}`));
