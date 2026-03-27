/**
 * Local admin web control panel for TableTennisDB.
 *
 * Provides a browser UI for viewing and editing bot settings/data:
 *   - User profiles (view, edit, delete)
 *   - Command statistics (view)
 *   - User install notices (view, remove)
 *
 * No authentication – intended to run locally only.
 *
 *   bun run panel
 *
 * Then open http://localhost:3000 in your browser.
 */

import {sqlite, db, getProfile, setProfile, aggregateStats} from "../src/db";
import * as schema from "../src/schema";
import {eq} from "drizzle-orm";

const PORT = 3000;

// ── helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {"Content-Type": "application/json"},
    });
}

function html(body: string): Response {
    return new Response(body, {headers: {"Content-Type": "text/html; charset=utf-8"}});
}

// ── API handlers ───────────────────────────────────────────────────────────

function listProfiles() {
    const rows = db.select().from(schema.profiles).all();
    return json(rows);
}

function updateProfile(userId: string, data: Record<string, string | undefined>) {
    const allowed = ["forehand", "backhand", "blade", "strengths", "weaknesses", "playstyle"] as const;
    const existing = getProfile(userId) ?? {};
    const merged = {...existing};
    for (const field of allowed) {
        if (field in data) merged[field] = data[field] || undefined;
    }
    setProfile(userId, merged);
    return json({ok: true});
}

function deleteProfile(userId: string) {
    db.delete(schema.profiles).where(eq(schema.profiles.userId, userId)).run();
    return json({ok: true});
}

function listStats() {
    const rows = db.select().from(schema.commandStats).all();
    return json(rows);
}

function getAggregatedStats() {
    return json(aggregateStats());
}

function listNotices() {
    const rows = db.select().from(schema.userInstallNotices).all();
    return json(rows);
}

function deleteNotice(userId: string) {
    db.delete(schema.userInstallNotices).where(eq(schema.userInstallNotices.userId, userId)).run();
    return json({ok: true});
}

// ── router ─────────────────────────────────────────────────────────────────

async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const {method} = req;
    const path = url.pathname;

    // Static HTML panel
    if (method === "GET" && path === "/") return html(PANEL_HTML);

    // REST: profiles
    if (method === "GET"  && path === "/api/profiles") return listProfiles();
    if (method === "PUT"  && path.startsWith("/api/profiles/")) {
        const userId = decodeURIComponent(path.slice("/api/profiles/".length));
        let body: Record<string, string | undefined>;
        try {
            body = await req.json() as Record<string, string | undefined>;
        }
        catch {
            return json({error: "Invalid JSON body"}, 400);
        }
        return updateProfile(userId, body);
    }
    if (method === "DELETE" && path.startsWith("/api/profiles/")) {
        const userId = decodeURIComponent(path.slice("/api/profiles/".length));
        return deleteProfile(userId);
    }

    // REST: stats
    if (method === "GET" && path === "/api/stats") return listStats();
    if (method === "GET" && path === "/api/stats/aggregate") return getAggregatedStats();

    // REST: notices
    if (method === "GET"  && path === "/api/notices") return listNotices();
    if (method === "DELETE" && path.startsWith("/api/notices/")) {
        const userId = decodeURIComponent(path.slice("/api/notices/".length));
        return deleteNotice(userId);
    }

    return new Response("Not Found", {status: 404});
}

// ── embedded HTML/CSS/JS panel ─────────────────────────────────────────────

const PANEL_HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TableTennisDB Control Panel</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  header { background: #1e293b; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid #334155; }
  header h1 { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; }
  header span { font-size: 0.8rem; background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 999px; }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid #334155; background: #1e293b; padding: 0 2rem; }
  .tab { padding: 0.75rem 1.25rem; cursor: pointer; border-bottom: 2px solid transparent; color: #94a3b8; font-size: 0.9rem; transition: all .15s; }
  .tab:hover { color: #e2e8f0; }
  .tab.active { color: #38bdf8; border-bottom-color: #38bdf8; }
  .panel { display: none; padding: 2rem; }
  .panel.active { display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; padding: 0.6rem 0.75rem; background: #1e293b; color: #94a3b8; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  tr:hover td { background: #1e293b55; }
  .btn { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.7rem; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 500; transition: opacity .15s; }
  .btn:hover { opacity: 0.85; }
  .btn-edit { background: #0284c7; color: #fff; }
  .btn-del  { background: #dc2626; color: #fff; }
  .btn-save { background: #16a34a; color: #fff; }
  .btn-cancel { background: #475569; color: #fff; }
  .empty { color: #475569; font-style: italic; padding: 1rem 0; }
  /* modal */
  .overlay { display: none; position: fixed; inset: 0; background: #00000088; z-index: 100; align-items: center; justify-content: center; }
  .overlay.open { display: flex; }
  .modal { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; width: 480px; max-width: 95vw; }
  .modal h2 { font-size: 1rem; margin-bottom: 1rem; color: #f1f5f9; }
  .field { margin-bottom: 0.75rem; }
  .field label { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.3rem; }
  .field input, .field textarea { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #e2e8f0; padding: 0.4rem 0.6rem; font-size: 0.875rem; }
  .field textarea { resize: vertical; min-height: 60px; }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
  .badge { display: inline-block; background: #0f172a; border: 1px solid #334155; border-radius: 999px; padding: 1px 8px; font-size: 0.75rem; color: #94a3b8; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; padding: 1rem; }
  .stat-card .cmd { font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem; }
  .stat-card .num { font-size: 1.75rem; font-weight: 700; color: #38bdf8; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .section-header h2 { font-size: 1rem; font-weight: 600; }
  .refresh-btn { background: none; border: 1px solid #334155; color: #94a3b8; border-radius: 0.375rem; padding: 0.3rem 0.7rem; cursor: pointer; font-size: 0.8rem; }
  .refresh-btn:hover { color: #e2e8f0; border-color: #475569; }
</style>
</head>
<body>
<header>
  <h1>🏓 TableTennisDB Control Panel</h1>
  <span>Local Admin</span>
</header>

<nav class="tabs">
  <div class="tab active" data-tab="profiles">👤 Profiles</div>
  <div class="tab" data-tab="stats">📊 Command Stats</div>
  <div class="tab" data-tab="notices">🔔 Install Notices</div>
</nav>

<!-- Profiles panel -->
<section id="profiles" class="panel active">
  <div class="section-header">
    <h2>User Profiles</h2>
    <button class="refresh-btn" onclick="loadProfiles()">↺ Refresh</button>
  </div>
  <table>
    <thead>
      <tr>
        <th>User ID</th><th>Forehand</th><th>Backhand</th><th>Blade</th>
        <th>Playstyle</th><th>Strengths</th><th>Weaknesses</th><th>Actions</th>
      </tr>
    </thead>
    <tbody id="profiles-body"><tr><td colspan="8" class="empty">Loading…</td></tr></tbody>
  </table>
</section>

<!-- Stats panel -->
<section id="stats" class="panel">
  <div class="section-header">
    <h2>Command Usage (aggregated across all guilds)</h2>
    <button class="refresh-btn" onclick="loadStats()">↺ Refresh</button>
  </div>
  <div class="stat-grid" id="stats-grid"></div>
</section>

<!-- Notices panel -->
<section id="notices" class="panel">
  <div class="section-header">
    <h2>User Install Notices</h2>
    <button class="refresh-btn" onclick="loadNotices()">↺ Refresh</button>
  </div>
  <table>
    <thead><tr><th>User ID</th><th>Actions</th></tr></thead>
    <tbody id="notices-body"><tr><td colspan="2" class="empty">Loading…</td></tr></tbody>
  </table>
</section>

<!-- Edit profile modal -->
<div class="overlay" id="edit-overlay">
  <div class="modal">
    <h2>Edit Profile</h2>
    <input type="hidden" id="edit-userId">
    <div class="field"><label>Forehand</label><input id="edit-forehand" placeholder="e.g. DHS Hurricane 3"></div>
    <div class="field"><label>Backhand</label><input id="edit-backhand" placeholder="e.g. Butterfly Tenergy 05"></div>
    <div class="field"><label>Blade</label><input id="edit-blade" placeholder="e.g. Stiga Infinity VPS V"></div>
    <div class="field"><label>Playstyle</label><input id="edit-playstyle" placeholder="e.g. Aggressive looper"></div>
    <div class="field"><label>Strengths</label><textarea id="edit-strengths" placeholder="e.g. Forehand loop, footwork"></textarea></div>
    <div class="field"><label>Weaknesses</label><textarea id="edit-weaknesses" placeholder="e.g. Short game, backhand flick"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-save" onclick="saveProfile()">Save</button>
    </div>
  </div>
</div>

<script>
// ── tab navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const id = tab.dataset.tab;
    document.getElementById(id).classList.add('active');
    if (id === 'profiles') loadProfiles();
    else if (id === 'stats') loadStats();
    else if (id === 'notices') loadNotices();
  });
});

// ── profiles ────────────────────────────────────────────────────────────────
async function loadProfiles() {
  const tbody = document.getElementById('profiles-body');
  tbody.innerHTML = '<tr><td colspan="8" class="empty">Loading…</td></tr>';
  const rows = await fetch('/api/profiles').then(r => r.json());
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">No profiles found.</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => \`
    <tr>
      <td><span class="badge">\${r.user_id}</span></td>
      <td>\${r.forehand ?? '–'}</td>
      <td>\${r.backhand ?? '–'}</td>
      <td>\${r.blade ?? '–'}</td>
      <td>\${r.playstyle ?? '–'}</td>
      <td>\${r.strengths ?? '–'}</td>
      <td>\${r.weaknesses ?? '–'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-edit" onclick='openEditModal(\${JSON.stringify(r)})'>✏ Edit</button>
        <button class="btn btn-del"  onclick="deleteProfile('\${r.user_id}')">✕ Delete</button>
      </td>
    </tr>
  \`).join('');
}

function openEditModal(row) {
  document.getElementById('edit-userId').value    = row.user_id;
  document.getElementById('edit-forehand').value  = row.forehand  ?? '';
  document.getElementById('edit-backhand').value  = row.backhand  ?? '';
  document.getElementById('edit-blade').value     = row.blade     ?? '';
  document.getElementById('edit-playstyle').value = row.playstyle ?? '';
  document.getElementById('edit-strengths').value = row.strengths ?? '';
  document.getElementById('edit-weaknesses').value= row.weaknesses?? '';
  document.getElementById('edit-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('edit-overlay').classList.remove('open');
}

async function saveProfile() {
  const userId = document.getElementById('edit-userId').value;
  const body = {
    forehand:   document.getElementById('edit-forehand').value  || undefined,
    backhand:   document.getElementById('edit-backhand').value  || undefined,
    blade:      document.getElementById('edit-blade').value     || undefined,
    playstyle:  document.getElementById('edit-playstyle').value || undefined,
    strengths:  document.getElementById('edit-strengths').value || undefined,
    weaknesses: document.getElementById('edit-weaknesses').value|| undefined,
  };
  await fetch('/api/profiles/' + encodeURIComponent(userId), {
    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
  });
  closeModal();
  loadProfiles();
}

async function deleteProfile(userId) {
  if (!confirm('Delete profile for ' + userId + '?')) return;
  await fetch('/api/profiles/' + encodeURIComponent(userId), {method: 'DELETE'});
  loadProfiles();
}

// ── stats ───────────────────────────────────────────────────────────────────
async function loadStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '<p class="empty">Loading…</p>';
  const data = await fetch('/api/stats/aggregate').then(r => r.json());
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { grid.innerHTML = '<p class="empty">No stats yet.</p>'; return; }
  grid.innerHTML = entries.map(([cmd, count]) => \`
    <div class="stat-card">
      <div class="cmd">/ \${cmd}</div>
      <div class="num">\${count.toLocaleString()}</div>
    </div>
  \`).join('');
}

// ── notices ─────────────────────────────────────────────────────────────────
async function loadNotices() {
  const tbody = document.getElementById('notices-body');
  tbody.innerHTML = '<tr><td colspan="2" class="empty">Loading…</td></tr>';
  const rows = await fetch('/api/notices').then(r => r.json());
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="2" class="empty">No notices recorded.</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => \`
    <tr>
      <td><span class="badge">\${r.user_id}</span></td>
      <td><button class="btn btn-del" onclick="deleteNotice('\${r.user_id}')">✕ Remove</button></td>
    </tr>
  \`).join('');
}

async function deleteNotice(userId) {
  if (!confirm('Remove install notice record for ' + userId + '?')) return;
  await fetch('/api/notices/' + encodeURIComponent(userId), {method: 'DELETE'});
  loadNotices();
}

// ── init ─────────────────────────────────────────────────────────────────────
loadProfiles();
</script>
</body>
</html>`;

// ── server ─────────────────────────────────────────────────────────────────

Bun.serve({
    port: PORT,
    fetch: handleRequest,
});

console.log(`\n🏓 TableTennisDB Control Panel running at http://localhost:${PORT}\n`);
console.log("  Profiles  → http://localhost:" + PORT + "/#profiles");
console.log("  Stats     → http://localhost:" + PORT + "/#stats");
console.log("  Notices   → http://localhost:" + PORT + "/#notices");
console.log("\nPress Ctrl+C to stop.\n");
