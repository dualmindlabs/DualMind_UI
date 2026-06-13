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
        <div class="leaderboard-skeleton-container">
          ${Array.from({ length: 6 }).map(() => `
            <div class="leaderboard-skeleton-row">
              <div class="leaderboard-skeleton-cell skeleton-shimmer" style="width: 30px;"></div>
              <div class="leaderboard-skeleton-cell skeleton-shimmer" style="width: 140px;"></div>
              <div class="leaderboard-skeleton-cell skeleton-shimmer" style="width: 60px;"></div>
              <div class="leaderboard-skeleton-cell skeleton-shimmer" style="width: 100px;"></div>
              <div class="leaderboard-skeleton-cell skeleton-shimmer" style="width: 50px;"></div>
            </div>
          `).join('')}
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

    this._els.content.innerHTML = `
      <div class="dm-lb-shell">
        <div class="dm-lb-top">
          <div>
            <div class="dm-lb-title" style="color: #ffffff;">Model Leaderboard</div>
            <div class="dm-lb-subtitle" style="color: rgba(255,255,255,0.7);">${escapeHtml(String(sorted.length))} models · ${escapeHtml(String(totals.responses))} total matches</div>
          </div>
        </div>

        <div class="dm-lb-grid-wrap">
          <div class="dm-lb-grid-header">
            <div>Rank</div>
            <div>Model</div>
            <div>Elo Rating</div>
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
                    <div class="lb-winrate-bar-fill" style="width: ${barWidth}%"></div>
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
