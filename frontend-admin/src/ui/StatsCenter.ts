import { LocalStorageManager, GameHistoryRecord, AggregatedStats } from '../config/storage';
import { GameMode, AIDifficulty } from '../config/constants';

const DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const MODE_LABELS: Record<GameMode, string> = {
  pve: '人机对战',
  pvp: '双人对战',
};

type TimeFilter = '7d' | '30d' | 'all';

export interface StatsCenterCallbacks {
  onClose: () => void;
}

export class StatsCenter {
  private element: HTMLElement;
  private callbacks: StatsCenterCallbacks;
  private currentFilter: TimeFilter = 'all';
  private filteredHistory: GameHistoryRecord[] = [];

  constructor(callbacks: StatsCenterCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.className = 'stats-center hidden';
    this.buildHTML();
    this.bindEvents();
    document.getElementById('app')!.appendChild(this.element);
  }

  private buildHTML(): void {
    this.element.innerHTML = `
      <div class="stats-container">
        <div class="stats-header">
          <div class="stats-title">📊 战绩中心</div>
          <button class="btn-close" id="stats-close">×</button>
        </div>

        <div class="stats-filters">
          <div class="filter-group">
            <span class="filter-label">时间范围:</span>
            <div class="filter-buttons">
              <button class="filter-btn" data-filter="7d">近7天</button>
              <button class="filter-btn active" data-filter="30d">近30天</button>
              <button class="filter-btn" data-filter="all">全部</button>
            </div>
          </div>
        </div>

        <div class="stats-content">
          <div class="stats-section">
            <div class="section-title">📈 总体统计</div>
            <div class="stats-grid" id="overall-stats"></div>
          </div>

          <div class="stats-section">
            <div class="section-title">🎮 按模式统计</div>
            <div class="stats-tabs" id="mode-tabs">
              <button class="stats-tab active" data-mode="pve">人机对战</button>
              <button class="stats-tab" data-mode="pvp">双人对战</button>
            </div>
            <div class="stats-grid" id="mode-stats"></div>
          </div>

          <div class="stats-section" id="difficulty-section">
            <div class="section-title">⚔️ 按难度统计 (PvE)</div>
            <div class="difficulty-stats" id="difficulty-stats"></div>
          </div>

          <div class="stats-section">
            <div class="section-title">📅 按日期统计</div>
            <div class="date-stats" id="date-stats"></div>
          </div>

          <div class="stats-section">
            <div class="section-title">📜 最近比赛</div>
            <div class="recent-games" id="recent-games"></div>
          </div>
        </div>

        <div class="stats-footer">
          <button class="btn btn-outline" id="reset-stats">🔄 重置数据</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.element.querySelector('#stats-close')!.addEventListener('click', () => {
      this.callbacks.onClose();
    });

    this.element.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter') as TimeFilter;
        this.updateStats();
      });
    });

    this.element.querySelectorAll('.stats-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.element.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.updateModeStats(tab.getAttribute('data-mode') as GameMode);
      });
    });

    this.element.querySelector('#reset-stats')!.addEventListener('click', () => {
      if (confirm('确定要重置所有战绩数据吗？此操作不可恢复！')) {
        LocalStorageManager.resetHistory();
        LocalStorageManager.resetStats();
        this.updateStats();
      }
    });
  }

  private getDaysFromFilter(): number | null {
    switch (this.currentFilter) {
      case '7d': return 7;
      case '30d': return 30;
      case 'all': return null;
    }
  }

  private updateStats(): void {
    const days = this.getDaysFromFilter();
    this.filteredHistory = LocalStorageManager.getHistoryByTimeRange(days);
    this.updateOverallStats();
    this.updateModeStats('pve');
    this.updateDifficultyStats();
    this.updateDateStats();
    this.updateRecentGames();
  }

  private updateOverallStats(): void {
    const stats = LocalStorageManager.aggregateStats(this.filteredHistory);
    const container = this.element.querySelector('#overall-stats')!;
    container.innerHTML = this.renderStatCards(stats);
  }

  private updateModeStats(mode: GameMode): void {
    const modeHistory = this.filteredHistory.filter(h => h.mode === mode);
    const stats = LocalStorageManager.aggregateStats(modeHistory);
    const container = this.element.querySelector('#mode-stats')!;
    container.innerHTML = this.renderStatCards(stats);
  }

  private updateDifficultyStats(): void {
    const pveHistory = this.filteredHistory.filter(h => h.mode === 'pve');
    const difficultyStats = LocalStorageManager.getStatsByDifficulty(pveHistory);
    const container = this.element.querySelector('#difficulty-stats')!;

    container.innerHTML = Object.entries(difficultyStats).map(([diff, stats]) => `
      <div class="difficulty-card">
        <div class="difficulty-name">${DIFFICULTY_LABELS[diff as AIDifficulty]}</div>
        <div class="difficulty-grid">
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.totalGames}</div>
            <div class="mini-stat-label">场次</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.winRate}%</div>
            <div class="mini-stat-label">胜率</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.avgDamage}</div>
            <div class="mini-stat-label">平均伤害</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">${stats.maxCombo}</div>
            <div class="mini-stat-label">最长连击</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  private updateDateStats(): void {
    const dateStats = LocalStorageManager.getStatsByDate(this.filteredHistory);
    const sortedDates = Object.keys(dateStats).sort().reverse().slice(0, 14);
    const container = this.element.querySelector('#date-stats')!;

    if (sortedDates.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无数据</div>';
      return;
    }

    container.innerHTML = sortedDates.map(date => {
      const stats = dateStats[date];
      return `
        <div class="date-row">
          <div class="date-label">${date}</div>
          <div class="date-stats-row">
            <span class="date-stat">${stats.totalGames}场</span>
            <span class="date-stat">${stats.winRate}%胜</span>
            <span class="date-stat">${stats.avgDamage}伤害</span>
            <span class="date-stat">${stats.maxCombo}连击</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private updateRecentGames(): void {
    const recent = this.filteredHistory.slice(0, 10);
    const container = this.element.querySelector('#recent-games')!;

    if (recent.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无比赛记录</div>';
      return;
    }

    container.innerHTML = recent.map(game => {
      const resultClass = game.winner === 1 ? 'win' : game.winner === 2 ? 'lose' : 'draw';
      const resultText = game.winner === 1 ? '胜利' : game.winner === 2 ? '失败' : '平局';
      return `
        <div class="game-row ${resultClass}">
          <div class="game-info">
            <div class="game-mode">${MODE_LABELS[game.mode]} ${game.mode === 'pve' ? `(${DIFFICULTY_LABELS[game.difficulty]})` : ''}</div>
            <div class="game-date">${new Date(game.timestamp).toLocaleString()}</div>
          </div>
          <div class="game-result">${resultText}</div>
          <div class="game-score">${game.p1Wins} - ${game.p2Wins}</div>
          <div class="game-damage">${Math.round(game.p1Damage)} 伤害</div>
        </div>
      `;
    }).join('');
  }

  private renderStatCards(stats: AggregatedStats): string {
    return `
      <div class="stat-card">
        <div class="stat-value">${stats.totalGames}</div>
        <div class="stat-label">总场次</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.wins}</div>
        <div class="stat-label">胜场</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.winRate}%</div>
        <div class="stat-label">胜率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgDamage}</div>
        <div class="stat-label">平均伤害</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.maxCombo}</div>
        <div class="stat-label">最长连击</div>
      </div>
    `;
  }

  show(): void {
    this.element.classList.remove('hidden');
    this.updateStats();
    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });
  }

  hide(): void {
    this.element.classList.remove('visible');
    this.element.classList.add('hidden');
  }
}
