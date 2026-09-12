/**
 * The sync map: one self-contained page that shows where every copy of the
 * rulebook sits — the canon on its remote, the clone on this machine, the
 * projects that carry a copy, and their worktrees — and what could move
 * between them: take, offer, conflict, publish, refresh.
 *
 * This file only renders. `sync-rulebook.mjs --html` gathers the data and
 * writes the page next to the registry, outside every repository: the page
 * names private working directories, and the canon's repository is public.
 *
 * Like rulebook.html it fetches nothing and runs no script. A flow opens its
 * detail through a fragment link and `:target`, so the page reads the same
 * from disk, from a browser with scripts off, and from a link sent to someone.
 */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* The palette of rulebook.html, so the two pages read as one tool. */
const CSS = `
:root{--bg:#fbfaf7;--fg:#1f1d1a;--dim:#6b665e;--line:#e4e0d8;--card:#ffffff;--code:#f1eee7;
 --take:#5b7a5b;--offer:#b06a1a;--refresh:#3b6ea8;--publish:#7a4fa8;--conflict:#b0332a;--quiet:#8a857c}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#e8e4dc;--dim:#9b958a;--line:#2b2924;--card:#1e1c18;--code:#26231e;
 --take:#8fb98f;--offer:#e0a04e;--refresh:#8fb4e6;--publish:#c39ce8;--conflict:#ef7d74;--quiet:#8a857c}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:inherit;text-decoration:none}
code,.mono{font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
main{max-width:1280px;padding:34px 40px 40px}
h1{font-size:28px;margin:0 0 6px}
.meta{color:var(--dim);font-size:13.5px;margin:0}
.legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:12px 0 0;font-size:12.5px;color:var(--dim)}
.legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;transform:translateY(-1px)}
.map{display:grid;grid-template-columns:210px 90px 230px 100px 290px 90px 1fr;row-gap:16px;margin-top:28px;align-items:start}
.lane{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.card h3{font-size:15px;margin:0 0 2px;font-weight:600}
.card .path{color:var(--dim);font-size:11.5px;overflow-wrap:anywhere}
.card .sub{color:var(--dim);font-size:12px;margin:2px 0 8px}
.card p{color:var(--dim);font-size:12.5px;margin:10px 0 0}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-block;border:1px solid currentColor;border-radius:10px;padding:0 8px;font-size:11.5px;line-height:18px}
.chip.code{background:var(--code);color:var(--dim)}
.k-take{color:var(--take)}.k-offer{color:var(--offer)}.k-conflict{color:var(--conflict)}
.k-publish{color:var(--publish)}.k-refresh{color:var(--refresh)}.k-quiet{color:var(--quiet)}
.clone{align-self:stretch}
.clone .card{height:100%}
.flows{display:flex;flex-direction:column;gap:18px;padding-top:30px}
.flow{display:block;position:relative;height:28px;font-size:11.5px;font-weight:600;text-align:center}
.flow span{display:block;line-height:14px}
.flow::before{content:"";position:absolute;left:0;right:8px;top:21px;border-top:1.5px solid currentColor}
.flow::after{content:"";position:absolute;right:0;top:16.5px;border:5px solid transparent;border-left:9px solid currentColor;border-right:0}
.flow.left::before{left:8px;right:0}
.flow.left::after{left:0;right:auto;border-left:0;border-right:9px solid currentColor}
.flow.both::before{left:8px;right:8px}
.flow.both span::after{content:"";position:absolute;left:0;top:16.5px;border:5px solid transparent;border-right:9px solid currentColor;border-left:0}
.flow.dashed::before{border-top-style:dashed}
.flow.still{color:var(--quiet);font-weight:400}
.flow.still::before{border-top:1.5px dotted var(--line)}
.flow.still::after{display:none}
a.flow:hover span{text-decoration:underline}
.note{display:block;font-size:10.5px;font-weight:400;margin-top:10px}
.trees h4{font-size:13px;margin:0 0 6px;font-weight:600}
.bar{display:flex;gap:2px;height:6px;margin:0 0 6px}
.bar b{display:block;border-radius:3px}
.trees .row{display:flex;justify-content:space-between;gap:8px;font-size:11px;margin:2px 0}
.trees .row .mono{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trees .dim{color:var(--dim);font-size:11.5px}
footer{color:var(--dim);font-size:12.5px;margin-top:28px}
.detail{display:none;position:fixed;top:40px;right:40px;width:520px;max-height:calc(100vh - 80px);overflow:auto;
 background:var(--card);border:1px solid var(--line);border-radius:12px;padding:22px 24px;box-shadow:0 6px 24px rgba(0,0,0,.08)}
.detail:target{display:block}
.detail h2{font-size:17px;margin:0 0 4px}
.detail .kind{font-size:13px;margin:0 0 10px}
.detail .why{color:var(--dim);font-size:12.5px;margin:0 0 14px}
.detail .close{position:absolute;top:18px;right:22px;color:var(--dim);font-size:15px}
.detail ul{list-style:none;margin:0;padding:0}
.detail li{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)}
.detail li i{flex:none;width:8px;height:8px;border-radius:50%;background:currentColor;transform:translateY(-1px)}
.detail li div{flex:1;color:var(--fg)}
.detail li .a{display:block;color:var(--dim)}
.detail li em{font-style:normal;font-size:11.5px}
.detail h5{font-size:12.5px;margin:18px 0 6px}
.detail pre{background:var(--code);border-radius:6px;padding:10px 12px;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
`;

const KINDS = [
  ["take", "take — the canon moved, this copy did not"],
  ["offer", "offer — this copy moved, the canon did not"],
  ["conflict", "conflict — both moved: read both texts"],
  ["publish", "publish — a push to the public canon, the owner’s call"],
  ["refresh", "refresh — worktree copies behind their project"],
];

const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* A stamp date as the page speaks it: 2026-09-05 → 5 Sep. */
const day = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : (iso || ""); };
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function flow(kind, label, dir, target, extra = "") {
  const cls = ["flow", `k-${kind}`, dir === "left" ? "left" : dir === "both" ? "both" : "", kind === "publish" ? "dashed" : ""]
    .filter(Boolean).join(" ");
  return `<a class="${cls}" href="#${esc(target)}"><span>${esc(label)}</span>${extra}</a>`;
}

function detail(id, { title, kind, kindText, why, items = [], commandTitle, command }) {
  const rows = items.map((it) => `<li class="k-${esc(it.kind || kind)}"><i></i><div>${esc(it.title)}<span class="a mono">${esc(it.sub || "")}</span></div>${it.tag ? `<em>${esc(it.tag)}</em>` : ""}</li>`).join("");
  return `<section class="detail" id="${esc(id)}"><a class="close" href="#" aria-label="close">✕</a>
<h2>${esc(title)}</h2><p class="kind k-${esc(kind)}">${esc(kindText)}</p>${why ? `<p class="why">${esc(why)}</p>` : ""}
${rows ? `<ul>${rows}</ul>` : ""}${command ? `<h5>${esc(commandTitle || "The command")}</h5><pre class="mono">${esc(command)}</pre>` : ""}</section>`;
}

/**
 * data = {
 *   checkedAt, canon: { name, url, head, cloneHead, clonePath, standing: {ahead, behind, dirty}|null,
 *     aheadCommits: [], behindCommits: [] },
 *   projects: [{ name, path, error?, missing?, stamp: {commit, stamped}, rows: [{id, verdict, title}],
 *     trees: { tracked, list: [{ name, state }] } }],
 *   skillPath
 * }
 */
export function renderSyncPage(data) {
  const { canon, projects } = data;
  const details = [];
  const treeCount = projects.reduce((n, p) => n + (p.trees?.list.length || 0), 0);
  const rows = Math.max(projects.length, 1);

  // ---- canon ⇄ clone
  const st = canon.standing;
  let canonFlows = "";
  if (st && st.behind) {
    canonFlows += flow("take", `take ${st.behind} →`, "right", "d-canon-take");
    details.push(detail("d-canon-take", { title: `${canon.name} → this machine`, kind: "take",
      kindText: `take · ${plural(st.behind, "commit")} on the remote, not in this clone`,
      why: "Every project below is compared with this clone. Until these arrive, the verdicts are checked against an old canon.",
      items: canon.behindCommits.map((c) => ({ title: c.subject, sub: c.sha })), commandTitle: "Take them", command: `git -C ${data.skillPath} pull` }));
  }
  if (st && st.ahead) {
    canonFlows += flow("publish", `← publish ${st.ahead}`, "left", "d-canon-publish", `<span class="note">owner’s call</span>`);
    details.push(detail("d-canon-publish", { title: `this machine → ${canon.name}`, kind: "publish",
      kindText: `publish · ${plural(st.ahead, "commit")} only this machine has`,
      why: "The canon’s repository is public: a push is a publication. Read what goes out — messages and diff — before running it.",
      items: canon.aheadCommits.map((c) => ({ title: c.subject, sub: c.sha })), commandTitle: "Publish them — the owner runs this", command: `git -C ${data.skillPath} push` }));
  }
  if (st && !st.ahead && !st.behind) canonFlows += `<span class="flow still"><span>in step</span></span>`;
  if (!st) canonFlows += `<span class="flow still"><span>not checked</span></span>`;

  const standingChips = !st ? `<span class="chip k-quiet">not checked against the remote</span>`
    : [st.ahead ? `<span class="chip k-offer">${st.ahead} ahead</span>` : "", st.behind ? `<span class="chip k-refresh">${st.behind} behind</span>` : "",
      st.dirty ? `<span class="chip k-conflict">uncommitted</span>` : "", !st.ahead && !st.behind && !st.dirty ? `<span class="chip k-take">in step</span>` : ""].join(" ");

  // ---- projects, their flows and their worktrees
  const cells = projects.map((p, i) => {
    const row = i + 1;
    const key = slug(p.name) || `p${i}`;
    const at = (col, html) => `<div style="grid-column:${col};grid-row:${row}">${html}</div>`;
    if (p.missing || p.error) {
      return at(5, `<div class="card"><h3>${esc(p.name)}</h3><div class="path mono">${esc(p.path)}</div><p>${esc(p.missing ? "not on this machine — skipped" : p.error)}</p></div>`);
    }
    const by = (v) => p.rows.filter((r) => v.includes(r.verdict));
    const take = by(["update", "new"]), offer = by(["ours"]), conflict = by(["conflict"]), over = by(["override"]);
    const chips = [take.length ? `<span class="chip k-take">${take.length} take</span>` : "", offer.length ? `<span class="chip k-offer">${offer.length} offer</span>` : "",
      conflict.length ? `<span class="chip k-conflict">${conflict.length} conflict</span>` : "", over.length ? `<span class="chip k-publish">${over.length} override</span>` : "",
      !take.length && !offer.length && !conflict.length ? `<span class="chip k-take">in sync</span>` : ""].join(" ");
    const card = `<div class="card"><h3>${esc(p.name)}</h3><div class="path mono">${esc(p.path)}</div><div class="sub">stamped ${esc(p.stamp.commit.slice(0, 7))} · ${esc(day(p.stamp.stamped))}</div><div class="chips">${chips}</div></div>`;

    let f = "";
    const item = (r, tag) => ({ title: r.title || r.id, sub: `rule:${r.id}`, tag });
    if (offer.length) {
      f += flow("offer", `← offer ${offer.length}`, "left", `d-${key}-offer`);
      details.push(detail(`d-${key}-offer`, { title: `${p.name} → canon`, kind: "offer", kindText: `offer · ${plural(offer.length, "section")} this copy moved and the canon did not`,
        why: `Offering is a pull request on ${canon.name}, a public repository. Nothing leaves this machine until you open it, and a section may just as well stay local.`,
        items: offer.map((r) => item(r, "edited here")), commandTitle: "See both texts side by side", command: `node ${data.skillPath}/scripts/sync-rulebook.mjs --diff` }));
    }
    if (take.length) {
      f += flow("take", `take ${take.length} →`, "right", `d-${key}-take`);
      details.push(detail(`d-${key}-take`, { title: `canon → ${p.name}`, kind: "take", kindText: `take · ${plural(take.length, "section")} the canon moved or grew since the stamp`,
        why: "--apply writes only these, and never over a declared override or a section this copy changed.",
        items: take.map((r) => item(r, r.verdict === "new" ? "new in canon" : "canon moved")), commandTitle: "Take them", command: `node ${data.skillPath}/scripts/sync-rulebook.mjs --apply` }));
    }
    if (conflict.length) {
      f += flow("conflict", `conflict ${conflict.length}`, "both", `d-${key}-conflict`);
      details.push(detail(`d-${key}-conflict`, { title: `${p.name} ⇄ canon`, kind: "conflict", kindText: `conflict · ${plural(conflict.length, "section")} both sides moved`,
        why: "Nothing here is applied by a tool: read both texts and decide which survives, or merge them by hand.",
        items: conflict.map((r) => item(r, "both moved")), commandTitle: "See both texts side by side", command: `node ${data.skillPath}/scripts/sync-rulebook.mjs --diff` }));
    }
    if (!f) f = `<span class="flow still"><span>in sync</span></span>`;

    // worktrees
    const t = p.trees || { list: [] };
    let trees = "";
    let tf = "";
    if (!t.list.length) trees = `<div class="trees"><div class="dim">no worktrees</div></div>`;
    else if (t.tracked) {
      trees = `<div class="trees"><h4>${plural(t.list.length, "worktree")}</h4><div class="dim">tracked by git — each follows its own branch</div></div>`;
    } else {
      const n = (s) => t.list.filter((x) => x.state === s).length;
      const linked = n("linked"), fresh = n("fresh"), stale = n("stale"), missing = n("missing");
      const total = t.list.length;
      const seg = (k, c) => (k ? `<b style="flex:${k};background:var(--${c})"></b>` : "");
      const shown = t.list.filter((x) => x.state !== "linked" && x.state !== "fresh").slice(0, 2);
      const rest = total - shown.length;
      trees = `<div class="trees"><h4>${plural(total, "worktree")}</h4><div class="bar">${seg(linked + fresh, "take")}${seg(stale, "offer")}${seg(missing, "quiet")}</div>
<div class="dim">${[linked && `${linked} linked`, fresh && `${fresh} fresh`, stale && `${stale} stale copies`, missing && `${missing} missing`].filter(Boolean).join(" · ")}</div>
${shown.map((x) => `<div class="row"><span class="mono">${esc(x.name)}</span><span class="k-${x.state === "stale" ? "offer" : "quiet"}">${esc(x.state)}</span></div>`).join("")}
${rest > 0 && shown.length ? `<div class="dim">+${rest} more</div>` : ""}</div>`;
      if (stale + missing) {
        tf = flow("refresh", `refresh ${stale + missing} →`, "right", `d-${key}-refresh`);
        details.push(detail(`d-${key}-refresh`, { title: `${p.name} → its worktrees`, kind: "refresh",
          kindText: `refresh · ${plural(stale + missing, "worktree")} behind the project copy`,
          why: "The rulebook is not tracked by git here, so a worktree carries a copy made when it was created. A link to the project copy never goes stale.",
          items: t.list.filter((x) => x.state === "stale" || x.state === "missing").map((x) => ({ title: x.name, sub: x.path, tag: x.state, kind: x.state === "stale" ? "offer" : "quiet" })) }));
      } else tf = `<span class="flow still k-take"><span>${linked === total ? "linked" : "fresh"}</span></span>`;
    }
    return at(5, card) + at(4, `<div class="flows">${f}</div>`) + at(6, `<div class="flows">${tf}</div>`) + at(7, trees);
  }).join("\n");

  const legend = KINDS.map(([k, t]) => `<span><i style="background:var(--${k})"></i>${esc(t)}</span>`).join("");
  const lanes = [["CANON · REMOTE", 1], ["THIS MACHINE", 3], ["PROJECTS", 5], ["WORKTREES", 7]]
    .map(([n, c]) => `<div class="lane" style="grid-column:${c};grid-row:1">${n}</div>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rulebook sync</title><style>${CSS}</style></head><body><main>
<h1>Rulebook sync</h1>
<p class="meta">canon ${esc(canon.name)} · checked ${esc(data.checkedAt)} · ${plural(projects.length, "project")} · ${plural(treeCount, "worktree")} · this page only reads</p>
<div class="legend">${legend}</div>
<div class="map" style="grid-template-rows:auto repeat(${rows},auto)">${lanes}
<div style="grid-column:1;grid-row:2"><div class="card"><h3>${esc(canon.name)}</h3><div class="chips" style="margin:6px 0"><span class="chip code">${esc(canon.head ? "main · " + canon.head : "remote not reached")}</span></div><div class="chips"><span class="chip k-quiet">${esc(canon.visibility || "remote")}</span></div></div></div>
<div style="grid-column:2;grid-row:2"><div class="flows">${canonFlows}</div></div>
<div class="clone" style="grid-column:3;grid-row:2 / span ${rows}"><div class="card"><h3 class="mono" style="font-size:12px">${esc(canon.clonePath)}</h3><div class="chips" style="margin:6px 0"><span class="chip code">main · ${esc(canon.cloneHead)}</span></div><div class="chips">${standingChips}</div>
<p>Projects are compared with this clone, not with the remote.${st && st.behind ? ` ${plural(st.behind, "commit")} behind means the report is checking against an old canon — take ${st.behind === 1 ? "it" : "them"} first.` : ""}</p></div></div>
${cells.replace(/grid-row:(\d+)/g, (_, n) => `grid-row:${Number(n) + 1}`)}
</div>
<footer>Read-only. Every arrow opens what exactly would move and the command that moves it; nothing on this page writes, and publishing stays a command the owner runs.</footer>
</main>
${details.join("\n")}
</body></html>
`;
}
