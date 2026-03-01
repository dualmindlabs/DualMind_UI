import { api } from './apiInstance.js';
import { isAuthenticated } from './api/utils/authProvider.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderSkeleton(root) {
  root.innerHTML = `
    <div class="dm-lb-stats-bar">
      <div class="dm-lb-stat-card"><div class="dm-skel w-40" style="margin: 0 auto 12px; height: 36px;"></div><div class="dm-skel w-70" style="margin: 0 auto; height: 12px;"></div></div>
      <div class="dm-lb-stat-card"><div class="dm-skel w-40" style="margin: 0 auto 12px; height: 36px;"></div><div class="dm-skel w-70" style="margin: 0 auto; height: 12px;"></div></div>
      <div class="dm-lb-stat-card"><div class="dm-skel w-40" style="margin: 0 auto 12px; height: 36px;"></div><div class="dm-skel w-70" style="margin: 0 auto; height: 12px;"></div></div>
    </div>
    <div class="dm-lb-shell">
      <div class="dm-lb-top">
        <div>
          <div class="dm-lb-title">Leaderboard</div>
          <div class="dm-lb-subtitle">Loading stats…</div>
        </div>
      </div>
      <div class="dm-lb-grid-wrap">
        <div class="dm-lb-grid-header">
          <div>Rank</div>
          <div>Model</div>
          <div>Elo Rating</div>
          <div>Win Rate</div>
          <div>Responses</div>
        </div>
        ${Array.from({ length: 10 }).map(() => `
          <div class="dm-lb-grid-skel">
            <div class="dm-skel w-30"></div>
            <div class="dm-skel w-70"></div>
            <div class="dm-skel w-40"></div>
            <div class="dm-skel w-70"></div>
            <div class="dm-skel w-40"></div>
          </div>
        `).join('')}
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
    const aElo = Number(a.eloScore ?? a.elo_score ?? 0);
    const bElo = Number(b.eloScore ?? b.elo_score ?? 0);
    if (bElo !== aElo) return bElo - aElo;

    const aWinRate = Number(a.winRate ?? a.win_rate ?? 0);
    const bWinRate = Number(b.winRate ?? b.win_rate ?? 0);
    return bWinRate - aWinRate;
  });

  const totals = sorted.reduce((acc, it) => {
    acc.responses += Number(it.totalResponses || it.total_responses || 0);
    return acc;
  }, { responses: 0 });

  root.innerHTML = `
    <div class="dm-lb-stats-bar">
      <div class="dm-lb-stat-card">
        <div class="dm-lb-stat-value">${sorted.length}</div>
        <div class="dm-lb-stat-label">AI Models</div>
      </div>
      <div class="dm-lb-stat-card">
        <div class="dm-lb-stat-value">${escapeHtml(String(totals.responses))}</div>
        <div class="dm-lb-stat-label">Total Matches</div>
      </div>
      <div class="dm-lb-stat-card">
        <div class="dm-lb-stat-value">${escapeHtml(sorted[0]?.displayName || sorted[0]?.modelName || sorted[0]?.model_name || 'Unknown')}</div>
        <div class="dm-lb-stat-label">Top Model</div>
      </div>
    </div>
    <div class="dm-lb-shell">
      <div class="dm-lb-top">
        <div>
          <div class="dm-lb-title" style="color: #ffffff !important;">Leaderboard</div>
          <div class="dm-lb-subtitle" style="color: rgba(255,255,255,0.7) !important;">Real-time rankings based on arena battles</div>
        </div>
      </div>

      <div class="dm-lb-grid-wrap">
        <div class="dm-lb-grid-header">
          <div>Rank</div>
          <div>Model</div>
          <div>Elo</div>
          <div>Win Rate</div>
          <div>Matches</div>
        </div>
        
        ${sorted.map((item, i) => {
          const rank = i + 1;
          const modelName = item.displayName || item.display_name || item.modelName || item.model_name || 'Unknown';
          const provider = item.providerName || item.provider_name || '';
          const eloScore = Number(item.eloScore || item.elo_score || 0);
          const winRate = Number(item.winRate || item.win_rate || 0);
          const responses = Number(item.totalResponses || item.total_responses || 0);
          
          const topClass = rank <= 3 ? ' lb-row-top3' : '';
          const barWidth = Math.min(100, winRate).toFixed(1);

          return `
            <div class="dm-lb-grid-row${topClass}">
              <div class="lb-cell-rank">${String(rank).padStart(2, '0')}</div>
              <div class="lb-cell-model">
                <div class="lb-model-name" title="${escapeHtml(modelName)}">${escapeHtml(modelName)}</div>
                ${provider ? `<div class="lb-model-provider">${escapeHtml(provider)}</div>` : ''}
              </div>
              <div class="lb-cell-elo">${escapeHtml(String(eloScore))}</div>
              <div class="lb-cell-winrate">
                <span class="lb-winrate-text">${escapeHtml(winRate.toFixed(1))}%</span>
                <div class="lb-winrate-bar-track">
                  <div class="lb-winrate-bar-fill" style="width: 0%" data-width="${barWidth}%"></div>
                </div>
              </div>
              <div class="lb-cell-responses">${escapeHtml(String(responses))}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function init() {
  const root = document.getElementById('leaderboard-root');
  if (!root) return;

  const refreshBtn = document.getElementById('leaderboard-refresh');

  const load = async () => {
    renderSkeleton(root);
    try {
      const loggedIn = await isAuthenticated();
      if (!loggedIn) {
        renderState(root, {
          title: 'Login required',
          subtitle: 'Please login in the main app first, then refresh this page.'
        });
        return;
      }
      
      const data = await api.arena.getLeaderboard();
      const items = normalizeItems(data);
      renderData(root, items);

      // Animate win rate bars after render
      setTimeout(() => {
        const bars = root.querySelectorAll('.lb-winrate-bar-fill');
        bars.forEach(bar => {
          bar.style.width = bar.getAttribute('data-width');
        });
      }, 50);
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
