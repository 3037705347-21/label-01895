import { MatchRecord, GameMode, AIDifficulty } from '../config/constants';
import { LocalStorageManager } from '../config/storage';

const DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const MODE_LABELS: Record<GameMode, string> = {
  pve: '人机对战',
  pvp: '双人对战',
};

export interface StatsCenterCallbacks {
  onBack: () => void;
}

type TimeRange = '7d' | '30d' | 'all';

interface StatsSummary {
  totalMatches: number;
  winRate: number;
  totalWins: number;
  totalLosses: number;
  averageDamage: number;
  maxCombo: number;
}

/**
 * 战绩中心界面
 */
export class StatsCenterScreen {
  private element: HTMLElement;
  private callbacks: StatsCenterCallbacks;
  private matchHistory: MatchRecord[] = [];
  private selectedTimeRange: TimeRange = 'all';
  private selectedMode: GameMode | 'all' = 'all';
  private selectedDifficulty: AIDifficulty | 'all' = 'all';

  constructor(callbacks: StatsCenterCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.className = 'stats-center-screen hidden';
    this.matchHistory = LocalStorageManager.getMatchHistory();
    this.buildHTML();
    this.bindEvents();
    document.getElementById('app')!.appendChild(this.element);
    this.updateStats();
  }

  private buildHTML(): void {
    this.element.innerHTML = `
      <div class="stats-header">
        <button class="btn btn-outline btn-back" id="back-btn">← 返回</button>
        <div class="stats-title">📊 战绩中心</div>
      </div>

      <div class="stats-filters">
        <div class="filter-group">
          <div class="filter-label">时间范围</div>
          <div class="filter-buttons">
            <button class="filter-btn" data-range="7d">近7天</button>
            <button class="filter-btn" data-range="30d">近30天</button>
            <button class="filter-btn selected" data-range="all">全部</button>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-label">游戏模式</div>
          <div class="filter-buttons">
            <button class="filter-btn selected" data-mode="all">全部</button>
            <button class="filter-btn" data-mode="pve">人机对战</button>
            <button class="filter-btn" data-mode="pvp">双人对战</button>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-label">难度</div>
          <div class="filter-buttons">
            <button class="filter-btn selected" data-diff="all">全部</button>
            <button class="filter-btn" data-diff="easy">简单</button>
            <button class="filter-btn" data-diff="normal">普通</button>
            <button class="filter-btn" data-diff="hard">困难</button>
          </div>
        </div>
      </div>

      <div class="stats-summary" id="stats-summary">
        ${this.buildSummaryCards(this.calculateStats())}
      </div>

      <div class="stats-history">
        <div class="history-header">
          <div class="history-title">对战记录</div>
          <div class="history-count">共 ${this.matchHistory.length} 场</div>
        </div>
        <div class="history-list" id="history-list">
          ${this.buildHistoryList(this.filterRecords())}
        </div>
      </div>
    `;
  }

  private buildSummaryCards(stats: StatsSummary): string {
    return `
      <div class="stat-card">
        <div class="stat-value">${stats.totalMatches}</div>
        <div class="stat-label">总场次</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.winRate.toFixed(1)}%</div>
        <div class="stat-label">胜率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalWins} / ${stats.totalLosses}</div>
        <div class="stat-label">胜/负</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round(stats.averageDamage)}</div>
        <div class="stat-label">平均伤害</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.maxCombo}</div>
        <div class="stat-label">最高连击</div>
      </div>
    `;
  }

  private buildHistoryList(records: MatchRecord[]): string {
    if (records.length === 0) {
      return `<div class="empty-state">暂无对战记录</div>`;
    }

    return records
      .slice(0, 50) // 最多显示50条
      .map(record => {
        const date = new Date(record.timestamp);
        const dateStr = date.toLocaleDateString('zh-CN');
        const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        let resultClass = '';
        let resultText = '';
        if (record.winner === 1) {
          resultClass = 'win';
          resultText = '胜利';
        } else if (record.winner === 2) {
          resultClass = 'loss';
          resultText = '失败';
        } else {
          resultClass = 'draw';
          resultText = '平局';
        }

        return `
          <div class="history-item ${resultClass}">
            <div class="history-item-left">
              <div class="history-mode">${MODE_LABELS[record.mode]}</div>
              <div class="history-diff">${DIFFICULTY_LABELS[record.difficulty]}</div>
            </div>
            <div class="history-item-center">
              <div class="history-result ${resultClass}">${resultText}</div>
              <div class="history-damage">${Math.round(record.p1Damage)} / ${Math.round(record.p2Damage)} 伤害</div>
            </div>
            <div class="history-item-right">
              <div class="history-date">${dateStr}</div>
              <div class="history-time">${timeStr}</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private filterRecords(): MatchRecord[] {
    let filtered = [...this.matchHistory];

    // 时间范围过滤
    const now = Date.now();
    if (this.selectedTimeRange === '7d') {
      filtered = filtered.filter(r => now - r.timestamp < 7 * 24 * 60 * 60 * 1000);
    } else if (this.selectedTimeRange === '30d') {
      filtered = filtered.filter(r => now - r.timestamp < 30 * 24 * 60 * 60 * 1000);
    }

    // 模式过滤
    if (this.selectedMode !== 'all') {
      filtered = filtered.filter(r => r.mode === this.selectedMode);
    }

    // 难度过滤
    if (this.selectedDifficulty !== 'all') {
      filtered = filtered.filter(r => r.difficulty === this.selectedDifficulty);
    }

    return filtered;
  }

  private calculateStats(): StatsSummary {
    const records = this.filterRecords();
    const totalMatches = records.length;
    
    if (totalMatches === 0) {
      return {
        totalMatches: 0,
        winRate: 0,
        totalWins: 0,
        totalLosses: 0,
        averageDamage: 0,
        maxCombo: 0,
      };
    }

    const totalWins = records.filter(r => r.winner === 1).length;
    const totalLosses = records.filter(r => r.winner === 2).length;
    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
    const totalDamage = records.reduce((sum, r) => sum + r.p1Damage, 0);
    const averageDamage = totalDamage / totalMatches;
    const maxCombo = Math.max(...records.map(r => r.maxCombo), 0);

    return {
      totalMatches,
      winRate,
      totalWins,
      totalLosses,
      averageDamage,
      maxCombo,
    };
  }

  private updateStats(): void {
    const stats = this.calculateStats();
    const summaryEl = this.element.querySelector('#stats-summary')!;
    summaryEl.innerHTML = this.buildSummaryCards(stats);

    const filteredRecords = this.filterRecords();
    const listEl = this.element.querySelector('#history-list')!;
    listEl.innerHTML = this.buildHistoryList(filteredRecords);

    const countEl = this.element.querySelector('.history-count')!;
    countEl.textContent = `共 ${filteredRecords.length} 场`;
  }

  private bindEvents(): void {
    // 返回按钮
    this.element.querySelector('#back-btn')!.addEventListener('click', () => {
      this.callbacks.onBack();
    });

    // 时间范围筛选
    this.element.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('[data-range]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTimeRange = btn.getAttribute('data-range') as TimeRange;
        this.updateStats();
      });
    });

    // 模式筛选
    this.element.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMode = btn.getAttribute('data-mode') as GameMode | 'all';
        this.updateStats();
      });
    });

    // 难度筛选
    this.element.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedDifficulty = btn.getAttribute('data-diff') as AIDifficulty | 'all';
        this.updateStats();
      });
    });
  }

  show(): void {
    this.matchHistory = LocalStorageManager.getMatchHistory();
    this.updateStats();
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
