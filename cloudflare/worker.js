/**
 * Cloudflare Worker para iniciar e acompanhar a varredura do GitHub Actions.
 * Secrets: GH_TOKEN, TURNSTILE_SECRET
 * Variables: GH_OWNER, GH_REPO, GH_WORKFLOW_FILE=atualizar.yml, GH_REF=main,
 *            SITE_ORIGIN=https://SEU_USUARIO.github.io
 */
const response = (data, status, origin) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin || "null",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  }
});

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.SITE_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}
function configReady(env) {
  return Boolean(env.GH_TOKEN && env.GH_OWNER && env.GH_REPO && env.GH_WORKFLOW_FILE && env.TURNSTILE_SECRET && env.SITE_ORIGIN);
}
function ghHeaders(env) {
  return {
    "Authorization": `Bearer ${env.GH_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Opcoes-B3-Cloudflare-Worker"
  };
}
async function github(url, env, options = {}) {
  const r = await fetch(url, { ...options, headers: { ...ghHeaders(env), ...(options.headers || {}) } });
  const raw = await r.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch {}
  if (!r.ok) throw new Error(`GitHub API HTTP ${r.status}: ${body?.message || raw.slice(0, 180)}`);
  return body;
}
async function verifyTurnstile(token, request, env) {
  if (!token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!r.ok) return false;
  const result = await r.json();
  const allowedHosts = (env.SITE_ORIGIN || "").split(",").map(s => {
    try { return new URL(s.trim()).hostname; } catch { return ""; }
  });
  return result.success === true && (!result.hostname || allowedHosts.includes(result.hostname));
}
async function getRecentRun(env, since) {
  const endpoint = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/workflows/${encodeURIComponent(env.GH_WORKFLOW_FILE)}/runs?per_page=10`;
  const data = await github(endpoint, env);
  const runs = data.workflow_runs || [];
  return runs.find(run => new Date(run.created_at).getTime() >= since - 10000) || null;
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }});
    }
    if (!origin) return response({ error: "Origem não autorizada. Confira SITE_ORIGIN no Worker." }, 403, null);
    if (!configReady(env)) return response({ error: "Worker não configurado. Verifique GH_TOKEN, TURNSTILE_SECRET, GH_OWNER, GH_REPO, GH_WORKFLOW_FILE e SITE_ORIGIN." }, 500, origin);
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return response({ ok: true, service: "opcoes-b3-worker" }, 200, origin);
      }
      if (request.method === "POST" && url.pathname === "/scan") {
        let body;
        try { body = await request.json(); } catch { return response({ error: "Corpo JSON inválido." }, 400, origin); }
        if (!(await verifyTurnstile(body.turnstileToken, request, env))) {
          return response({ error: "Validação de segurança inválida ou expirada. Tente novamente." }, 403, origin);
        }
        const since = Date.now();
        const ref = env.GH_REF || "main";
        const dispatch = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/workflows/${encodeURIComponent(env.GH_WORKFLOW_FILE)}/dispatches`;
        await github(dispatch, env, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref }) });
        // workflow_dispatch responde 204; localizar o ID da execução recém-criada.
        let run = null;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          run = await getRecentRun(env, since);
          if (run) break;
        }
        if (!run) return response({ accepted: true, run_id: null, status: "queued", message: "GitHub aceitou a solicitação, mas o ID da execução ainda não apareceu. Confira Actions." }, 202, origin);
        return response({ accepted: true, run_id: run.id, status: run.status, html_url: run.html_url, created_at: run.created_at }, 202, origin);
      }
      if (request.method === "GET" && url.pathname === "/status") {
        const runId = url.searchParams.get("run_id");
        if (!runId || !/^\d+$/.test(runId)) return response({ error: "Informe run_id numérico." }, 400, origin);
        const base = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/runs/${runId}`;
        const [run, jobsData] = await Promise.all([
          github(base, env),
          github(`${base}/jobs?per_page=20`, env)
        ]);
        const jobs = (jobsData.jobs || []).map(job => ({ name: job.name, status: job.status, conclusion: job.conclusion }));
        return response({ run_id: run.id, status: run.status, conclusion: run.conclusion, html_url: run.html_url, created_at: run.created_at, updated_at: run.updated_at, jobs }, 200, origin);
      }
      return response({ error: "Rota não encontrada. Use POST /scan, GET /status?run_id=123 ou GET /health." }, 404, origin);
    } catch (e) {
      return response({ error: String(e.message || e) }, 502, origin);
    }
  }
};
