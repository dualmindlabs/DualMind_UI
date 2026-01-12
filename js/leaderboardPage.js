import { DualMindApiClient, getApiBaseUrl } from './apiClient.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getAuthToken() {
  try {
    if (window.DualMindAuthReady) {
      try {
        await window.DualMindAuthReady;
      } catch {
        // ignore
      }
    }

    if (window.DualMindAuth && window.DualMindAuth.isLoggedIn?.()) {
      const token = await window.DualMindAuth.getAccessToken();
      return token || null;
    }

    const stored = localStorage.getItem('dualmind.auth.token');
    if (stored && stored.startsWith('eyJ')) return stored;

    // Supabase-js persists sessions under keys like: sb-<project-ref>-auth-token
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('sb-') || !k.endsWith('-auth-token')) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          parsed?.session?.access_token ||
          parsed?.data?.session?.access_token;
        if (typeof token === 'string' && token.trim()) return token.trim();
      }
    } catch {
      // ignore
    }

    return null;
  } catch {
    return null;
  }
}

function renderSkeleton(root) {
  root.innerHTML = `
    <div class="dm-lb-shell">
      <div class="dm-lb-top">
        <div>
          <div class="dm-lb-title">Model Leaderboard</div>
          <div class="dm-lb-subtitle">Loading stats…</div>
        </div>
      </div>
      <div class="dm-lb-table-wrap">
        <table class="dm-lb-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Win rate</th>
              <th>Wins</th>
              <th>Responses</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: 10 }).map(() => `
              <tr class="dm-lb-row-skel">
                <td><div class="dm-skel w-30"></div></td>
                <td><div class="dm-skel w-70"></div></td>
                <td><div class="dm-skel w-40"></div></td>
                <td><div class="dm-skel w-30"></div></td>
                <td><div class="dm-skel w-40"></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderState(root, { title, subtitle } = {}) {
  root.innerHTML = `
    <div class="dm-lb-shell">
      <div class="dm-lb-state">
        <div class="dm-lb-state-title">${escapeHtml(title || '')}</div>
        ${subtitle ? `<div class="dm-lb-state-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
    </div>
  `;
}

function normalizeItems(data) {
  const items = data?.items || data || [];
  if (!Array.isArray(items)) return [];
  return items;
}

function renderData(root, items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderState(root, {
      title: 'No stats yet',
      subtitle: 'Vote in Battle mode to populate the leaderboard.'
    });
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const ar = Number(a.win_rate ?? a.winRate ?? 0);
    const br = Number(b.win_rate ?? b.winRate ?? 0);
    if (br !== ar) return br - ar;
    const aw = Number(a.wins ?? a.totalWins ?? 0);
    const bw = Number(b.wins ?? b.totalWins ?? 0);
    return bw - aw;
  });

  const totals = sorted.reduce((acc, it) => {
    acc.wins += Number(it.wins || it.totalWins || 0);
    acc.responses += Number(it.times_compared || it.totalResponses || 0);
    return acc;
  }, { wins: 0, responses: 0 });

  root.innerHTML = `
    <div class="dm-lb-shell">
      <div class="dm-lb-top">
        <div>
          <div class="dm-lb-title">Model Leaderboard</div>
          <div class="dm-lb-subtitle">${escapeHtml(String(sorted.length))} models · ${escapeHtml(String(totals.wins))} wins · ${escapeHtml(String(totals.responses))} responses</div>
        </div>
      </div>

      <div class="dm-lb-table-wrap">
        <table class="dm-lb-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Win rate</th>
              <th>Wins</th>
              <th>Responses</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((item, i) => {
              const rank = i + 1;
              const modelName = item.model_name || item.modelName || 'Unknown';
              const provider = item.provider || item.providerName || '';
              const winRate = Number(item.win_rate || item.winRate || 0);
              const wins = Number(item.wins || item.totalWins || 0);
              const responses = Number(item.times_compared || item.totalResponses || 0);
              const medal = rank <= 3 ? ` rank-${rank}` : '';
              return `
                <tr class="dm-lb-row">
                  <td class="dm-lb-rank${medal}"><span class="dm-lb-rank-pill">#${rank}</span></td>
                  <td>
                    <div class="dm-lb-model">
                      <div class="dm-lb-model-name">${escapeHtml(modelName)}</div>
                      ${provider ? `<div class="dm-lb-model-provider">${escapeHtml(provider)}</div>` : ''}
                    </div>
                  </td>
                  <td><span class="dm-lb-win-pill">${escapeHtml(winRate.toFixed(1))}%</span></td>
                  <td class="dm-lb-num">${escapeHtml(String(wins))}</td>
                  <td class="dm-lb-num">${escapeHtml(String(responses))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function init() {
  const root = document.getElementById('leaderboard-root');
  if (!root) return;

  const refreshBtn = document.getElementById('leaderboard-refresh');

  const api = new DualMindApiClient({
    baseUrl: getApiBaseUrl(),
    getAuthToken,
  });

  const load = async () => {
    renderSkeleton(root);
    try {
      const token = await getAuthToken();
      if (!token) {
        renderState(root, {
          title: 'Login required',
          subtitle: 'Please login in the main app first, then refresh this page.'
        });
        return;
      }
      const data = await api.getLeaderboard();
      const items = normalizeItems(data);
      renderData(root, items);
    } catch (e) {
      renderState(root, {
        title: 'Failed to load leaderboard',
        subtitle: e?.message || 'Please try again.'
      });
    }
  };

  refreshBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    load();
  });

  await load();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
