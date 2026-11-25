/* Newt Fantasy: Kickers & Defenses waiver tabs
 * Loaded by <script src="./waivers-addon.js"></script>
 * Uses the app's existing Sleeper globals: leagues, sel, uid, state,
 * API, PRJ, POS, $, j, esc, rows, scoringKey, and out.
 */
(() => {
  const CSS = `
  #waiver-tabs{display:flex;gap:6px;margin:10px 0 14px}
  #waiver-tabs button{background:transparent;color:var(--mute);border-color:var(--line);padding:8px 14px;min-height:38px}
  #waiver-tabs button.active{background:var(--accent);border-color:var(--accent);color:#fff}
  .waiver-subtitle{color:var(--mute);font-size:13px;margin:-4px 0 12px}
  .stream-label{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:var(--bg);color:var(--mute);font-size:12px;font-weight:700}
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  let waiverView = 'K';

  function rosterDefense(mine, db) {
    const starters = new Set(mine.starters || []);
    for (const id of mine.players || []) {
      if (starters.has(id)) {
        const p = db[id];
        if (p && p.p === 'DEF') return { id, ...p, starter: true };
      }
    }
    return null;
  }

  function cardHtml(current, options, position, week, byTeam) {
    const currentHtml = current
      ? `<div class="card" data-p="${position}"><div class="top"><span class="chip">${position}</span><div class="who"><b>${esc(current.n)}</b><small><span>${esc(current.t || 'No team')}</span><span>${current.starter ? 'Starter' : 'Rostered'}</span></small></div><div class="pts">${current.pts ? current.pts.toFixed(1) : '—'}<small>proj</small></div></div></div>`
      : `<div class="card" data-p="${position}"><div class="top"><span class="chip">${position}</span><div class="who"><b>Empty slot</b><small><span>No ${position === 'DEF' ? 'defense' : 'kicker'} on your roster</span></small></div></div></div>`;

    const rowsHtml = options.length
      ? options.map((x, i) => `<li><div class="who"><b>${esc(x.n)}</b><small><span>${esc(x.t || '')}</span><span class="stream-label">${i === 0 ? 'Top stream' : 'Option ' + (i + 1)}</span></small></div><span class="pts">${x.pts.toFixed(1)}<small>proj</small></span></li>`).join('')
      : `<li><div class="who"><b>No available options found</b><small><span>Check back after lineups and waivers update</span></small></div></li>`;

    return `${currentHtml}<div class="msec"><span>${position === 'DEF' ? 'Top Streaming Defenses' : 'Top Available Kickers'}</span><span>Week ${week}</span></div><article class="card" data-p="${position}"><ul>${rowsHtml}</ul></article>`;
  }

  async function renderWaiverTabs() {
    const panel = document.querySelector('#p-waiver');
    const output = document.querySelector('#out');
    if (!panel || !output || typeof leagues === 'undefined' || !leagues.length) return;

    const league = leagues[document.querySelector('#l')?.value || 0];
    if (!league) return;

    const week = Math.max(1, state?.week || 1);
    const key = scoringKey(league);

    output.innerHTML = `
      <div id="waiver-tabs" role="tablist" aria-label="Waiver position tabs">
        <button type="button" role="tab" data-pos="K" class="${waiverView === 'K' ? 'active' : ''}" aria-selected="${waiverView === 'K'}">Kickers</button>
        <button type="button" role="tab" data-pos="DEF" class="${waiverView === 'DEF' ? 'active' : ''}" aria-selected="${waiverView === 'DEF'}">Defenses</button>
      </div>
      <p class="waiver-subtitle">${waiverView === 'DEF' ? 'Compare your defense with the top projected free-agent streaming options.' : 'See the top projected free-agent kicker options.'}</p>
      <p class="status">Loading projections…</p>`;

    try {
      const [db, rosters, projections] = await Promise.all([
        (typeof players === 'function' ? players() : Promise.resolve({})),
        j(`${API}/league/${league.league_id}/rosters`),
        (typeof getProj === 'function' ? getProj(state.season, week, key) : Promise.resolve(null))
      ]);

      if (!projections) {
        output.querySelector('.status').textContent = 'Sleeper projections are not available right now.';
        return;
      }

      const mine = rosters.find(r => r.owner_id === uid || (r.co_owners || []).includes(uid));
      if (!mine) {
        output.querySelector('.status').textContent = 'Could not find your team in this league.';
        return;
      }

      const taken = new Set();
      rosters.forEach(r => {
        [...(r.players || []), ...(r.reserve || []), ...(r.taxi || [])].forEach(id => taken.add(id));
      });

      const options = [];
      for (const id in db) {
        const p = db[id];
        if (p.p !== waiverView || taken.has(id) || p.a !== 'Active' || !projections[id]) continue;
        options.push({ id, n: p.n, t: p.t || '', pts: projections[id], starter: false });
      }
      options.sort((a, b) => b.pts - a.pts);

      let current = null;
      if (waiverView === 'DEF') {
        current = rosterDefense(mine, db);
        if (current) current.pts = projections[current.id] || 0;
      } else {
        const starters = new Set(mine.starters || []);
        for (const id of mine.players || []) {
          const p = db[id];
          if (p && p.p === 'K' && starters.has(id)) {
            current = { id, ...p, pts: projections[id] || 0, starter: true };
            break;
          }
        }
      }

      const top = options.slice(0, 5);
      output.innerHTML = `
        <div id="waiver-tabs" role="tablist" aria-label="Waiver position tabs">
          <button type="button" role="tab" data-pos="K" class="${waiverView === 'K' ? 'active' : ''}" aria-selected="${waiverView === 'K'}">Kickers</button>
          <button type="button" role="tab" data-pos="DEF" class="${waiverView === 'DEF' ? 'active' : ''}" aria-selected="${waiverView === 'DEF'}">Defenses</button>
        </div>
        <p class="waiver-subtitle">${waiverView === 'DEF' ? 'Compare your defense with the top projected free-agent streaming options.' : 'See the top projected free-agent kicker options.'}</p>
        ${cardHtml(current, top, waiverView, week)}
        <div class="bar"><button type="button" class="ghost" id="waiver-addon-refresh">Refresh</button></div>`;

      bindWaiverTabs();
      const refresh = document.querySelector('#waiver-addon-refresh');
      if (refresh) refresh.addEventListener('click', () => renderWaiverTabs());
    } catch (error) {
      const status = output.querySelector('.status') || output;
      status.innerHTML = '<p class="err">Could not load waiver options. Try again in a moment.</p>';
    }
  }

  function bindWaiverTabs() {
    document.querySelectorAll('#waiver-tabs button').forEach(button => {
      button.addEventListener('click', () => {
        waiverView = button.dataset.pos;
        renderWaiverTabs();
      });
    });
  }

  function start() {
    const waiverButton = document.querySelector('#t-waiver');
    if (waiverButton) {
      waiverButton.addEventListener('click', () => setTimeout(renderWaiverTabs, 0));
    }

    const leagueSelect = document.querySelector('#l');
    if (leagueSelect) leagueSelect.addEventListener('change', () => setTimeout(renderWaiverTabs, 0));

    const observer = new MutationObserver(() => {
      const panel = document.querySelector('#p-waiver');
      if (panel && !panel.hidden && !document.querySelector('#waiver-tabs')) {
        renderWaiverTabs();
      }
    });
    observer.observe(document.querySelector('#app') || document.body, { attributes: true, childList: true, subtree: true });

    if (window.location.hash === '#waiver') renderWaiverTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
