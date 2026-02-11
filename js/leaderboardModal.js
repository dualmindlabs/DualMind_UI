/**
 * Leaderboard Modal
 * - Mirrors the UX from DualMind_UI: skeleton, cached results, refresh
 * - Reads stats from GET /api/arena/model-stats (requires auth)
 */

const CACHE_KEY = 'dualmind.leaderboard.cache';
const DEFAULT_EXPIRY_MS = 5 * 60 * 1000;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCached(expiryMs = DEFAULT_EXPIRY_MS) {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed?.timestamp || !Array.isArray(parsed?.items)) return null;
  if (Date.now() - parsed.timestamp > expiryMs) return null;
  return parsed.items;
}

function setCached(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items }));
  } catch {
    // ignore
  }
}

export class LeaderboardModal {
  constructor({ api, isApiEnabled } = {}) {
    this.api = api;
    this.isApiEnabled = typeof isApiEnabled === 'function' ? isApiEnabled : () => true;

    this._open = false;
    this._els = null;
    this._onKeyDown = null;
    this._onClick = null;

    this.mount();
  }

  mount() {
    const root = document.createElement('div');
    root.id = 'leaderboard-modal-root';
    root.innerHTML = `
      <div class="dm-modal-overlay" data-role="overlay" hidden></div>
      <div class="dm-modal" role="dialog" aria-modal="true" aria-label="Leaderboard" hidden>
        <div class="dm-modal-head">
          <div class="dm-modal-title-row">
            <span class="dm-modal-icon">🏆</span>
            <h2 class="dm-modal-title">Model Leaderboard</h2>
          </div>
          <div class="dm-modal-actions">
            <button class="dm-modal-btn" type="button" data-action="refresh" title="Refresh leaderboard">
              <span class="refresh-icon">↻</span>
              <span>Refresh</span>
            </button>
            <button class="dm-modal-close" type="button" data-action="close" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="dm-modal-body" data-role="content"></div>
      </div>
    `;

    document.body.appendChild(root);

    const overlay = root.querySelector('[data-role="overlay"]');
    const modal = root.querySelector('.dm-modal');
    const content = root.querySelector('[data-role="content"]');

    this._els = { root, overlay, modal, content };

    this._onClick = (e) => {
      const action = e.target.closest?.('[data-action]')?.getAttribute('data-action');
      if (action === 'close') return this.close();
      if (action === 'refresh') return this.load({ force: true });
      if (e.target === overlay) return this.close();
    };
    root.addEventListener('click', this._onClick);

    this._onKeyDown = (e) => {
      if (!this._open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  isOpen() {
    return this._open;
  }

  open() {
    this._open = true;
    this._els.overlay.hidden = false;
    this._els.modal.hidden = false;
    this._els.modal.classList.add('open');
    this.load({ force: false });
  }

  close() {
    this._open = false;
    this._els.overlay.hidden = true;
    this._els.modal.hidden = true;
    this._els.modal.classList.remove('open');
  }

  renderState({ title, subtitle, actionLabel } = {}) {
    const safeTitle = escapeHtml(title || '');
    const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';

    this._els.content.innerHTML = `
      <div class="dm-lb-shell">
        <div class="dm-lb-state">
          <div class="dm-lb-state-title">${safeTitle}</div>
          ${safeSubtitle ? `<div class="dm-lb-state-subtitle">${safeSubtitle}</div>` : ''}
          ${actionLabel ? `<div class="dm-lb-state-subtitle">${escapeHtml(actionLabel)}</div>` : ''}
        </div>
      </div>
    `;
  }

  renderSkeleton() {
    this._els.content.innerHTML = `
      <div class="dm-lb-shell">
        <div class="dm-lb-top">
          <div>
            <div class="dm-lb-title">Leaderboard</div>
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
              ${Array.from({ length: 6 }).map(() => `
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

  renderData(items) {
    if (!Array.isArray(items) || items.length === 0) {
      this.renderState({
        title: 'No stats yet',
        subtitle: 'Vote in Battle mode to populate the leaderboard.',
        actionLabel: 'Refresh',
      });
      return;
    }

    const totals = items.reduce((acc, it) => {
      acc.wins += Number(it.wins || it.totalWins || 0);
      acc.responses += Number(it.times_compared || it.totalResponses || 0);
      return acc;
    }, { wins: 0, responses: 0 });

    this._els.content.innerHTML = `
      <div class="dm-lb-shell">
        <div class="dm-lb-stats-bar">
          <div class="dm-lb-stat">
            <span class="stat-value">${escapeHtml(String(items.length))}</span>
            <span class="stat-label">Models</span>
          </div>
          <div class="dm-lb-stat">
            <span class="stat-value">${escapeHtml(String(totals.wins))}</span>
            <span class="stat-label">Total Wins</span>
          </div>
          <div class="dm-lb-stat">
            <span class="stat-value">${escapeHtml(String(totals.responses))}</span>
            <span class="stat-label">Responses</span>
          </div>
        </div>

        <div class="dm-lb-table-wrap">
          <table class="dm-lb-table">
            <thead>
              <tr>
                <th class="th-rank">Rank</th>
                <th class="th-model">Model</th>
                <th class="th-winrate">Win Rate</th>
                <th class="th-wins">Wins</th>
                <th class="th-responses">Battles</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => {
      const rank = i + 1;
      const modelName = item.model_name || item.modelName || 'Unknown';
      const provider = item.provider || item.providerName || '';
      const winRate = Number(item.win_rate || item.winRate || 0);
      const wins = Number(item.wins || item.totalWins || 0);
      const responses = Number(item.times_compared || item.totalResponses || 0);

      const medal = rank <= 3 ? ` rank-${rank}` : '';
      const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      
      return `
                  <tr class="dm-lb-row${medal}">
                    <td class="dm-lb-rank">
                      <span class="dm-lb-rank-pill">${medalEmoji || `#${rank}`}</span>
                    </td>
                    <td class="dm-lb-model-cell">
                      <div class="dm-lb-model">
                        <div class="dm-lb-model-name">${escapeHtml(modelName)}</div>
                        ${provider ? `<div class="dm-lb-model-provider">${escapeHtml(provider)}</div>` : ''}
                      </div>
                    </td>
                    <td class="dm-lb-winrate">
                      <div class="winrate-container">
                        <span class="dm-lb-win-pill">${escapeHtml(winRate.toFixed(1))}%</span>
                        <div class="winrate-bar">
                          <div class="winrate-fill" style="width: ${winRate}%"></div>
                        </div>
                      </div>
                    </td>
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

  async load({ force = false } = {}) {
    if (!this._open) return;

    if (!this.isApiEnabled()) {
      this.renderState({
        title: 'Leaderboard unavailable',
        subtitle: 'API is OFF. Enable API to load stats from the backend.',
      });
      return;
    }

    if (!this.api?.arena?.getLeaderboard) {
      this.renderState({
        title: 'Leaderboard unavailable',
        subtitle: 'Missing API client. Please refresh the page.',
      });
      return;
    }

    const cached = !force ? getCached() : null;
    if (cached) {
      this.renderData(cached);
      // background refresh only when opened manually (keep it simple for now)
      return;
    }

    this.renderSkeleton();

    try {
      const data = await this.api.arena.getLeaderboard();
      const items = data?.items || data || [];
      this.renderData(items);
      if (Array.isArray(items) && items.length) setCached(items);
    } catch (err) {
      this.renderState({
        title: 'Failed to load leaderboard',
        subtitle: err?.message || 'Unknown error',
        actionLabel: 'Retry',
      });
    }
  }
}

export default LeaderboardModal;


