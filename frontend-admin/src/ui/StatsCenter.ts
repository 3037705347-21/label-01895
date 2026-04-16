import { LocalStorageManager, MatchRecord, StatsSummary } from '../config/storage';
import { GameMode, AIDifficulty } from '../config/constants';

export interface StatsCenterCallbacks {
  onClose: () => void;
}

const DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const MODE_LABELS: Record<GameMode, string> = {
  pve: '人机对战',
  pvp: '双人对战',
};

type TimeFilter = 7 | 30 | null;

export class StatsCenter {
  private element: HTMLElement;
  private callbacks: StatsCenterCallbacks;
  private timeFilter: TimeFilter = null;
  private activeTab: 'overview' | 'mode' | 'difficulty' | 'history' = 'overview';

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
          <button class="btn btn-icon" id="stats-close-btn">✕</button>
        </div>

        <div class="stats-filters">
          <div class="filter-group">
            <span class="filter-label">时间范围:</span>
            <button class="filter-btn active" data-days="null">全部</button>
            <button class="filter-btn" data-days="7">近7天</button>
            <button class="filter-btn" data-days="30">近30天</button>
          </div>
        </div>

        <div class="stats-tabs">
          <button class="tab-btn active" data-tab="overview">总览</button>
          <button class="tab-btn" data-tab="mode">按模式</button>
          <button class="tab-btn" data-tab="difficulty">按难度</button>
          <button class="tab-btn" data-tab="history">比赛记录</button>
        </div>

        <div class="stats-content" id="stats-content"></div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.element.querySelector('#stats-close-btn')!.addEventListener('click', () => {
      this.callbacks.onClose();
    });

    this.element.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const days = btn.getAttribute('data-days');
        this.timeFilter = days === 'null' ? null : parseInt(days || '0') as TimeFilter;
        this.updateContent();
      });
    });

    this.element.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.getAttribute('data-tab') as any;
        this.updateContent();
      });
    });
  }

  private getFilteredHistory(): MatchRecord[] {
    return LocalStorageManager.getFilteredHistory(this.timeFilter);
  }

  private updateContent(): void {
    const content = this.element.querySelector('#stats-content')!;
    const history = this.getFilteredHistory();

    switch (this.activeTab) {
      case 'overview':
        content.innerHTML = this.renderOverview(history);
        break;
      case 'mode':
        content.innerHTML = this.renderByMode(history);
        break;
      case 'difficulty':
        content.innerHTML = this.renderByDifficulty(history);
        break;
      case 'history':
        content.innerHTML = this.renderHistory(history);
        break;
    }
  }

  private renderStatCard(stats: StatsSummary, title: string = ''): string {
    return `
      <div class="stats-card">
        ${title ? `<div class="stats-card-title">${title}</div>` : ''}
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">${stats.totalMatches}</div>
            <div class="stat-desc">总场次</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.wins}</div>
            <div class="stat-desc">胜场</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.winRate}%</div>
            <div class="stat-desc">胜率</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.avgDamage}</div>
            <div class="stat-desc">平均伤害</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.maxCombo}</div>
            <div class="stat-desc">最长连击</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderOverview(history: MatchRecord[]): string {
    const stats = LocalStorageManager.calculateStats(history);

    if (history.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <div class="empty-text">暂无比赛记录</div>
          <div class="empty-hint">开始一场战斗来记录你的战绩吧！</div>
        </div>
      `;
    }

    const byDate = LocalStorageManager.getStatsByDate(history);
    const dates = Object.keys(byDate).sort().reverse().slice(0, 7);

    let dailyStats = '';
    dates.forEach(date => {
      const s = byDate[date];
      dailyStats += `
        <div class="daily-row">
          <span class="daily-date">${date}</span>
          <span class="daily-matches">${s.totalMatches}场</span>
          <span class="daily-winrate">${s.winRate}%胜率</span>
          <span class="daily-damage">平均${s.avgDamage}伤害</span>
        </div>
      `;
    });

    return `
      ${this.renderStatCard(stats, '综合统计')}
      <div class="stats-card">
        <div class="stats-card-title">📅 近期战绩</div>
        <div class="daily-list">
          ${dailyStats || '<div class="empty-hint">暂无近期数据</div>'}
        </div>
      </div>
    `;
  }

  private renderByMode(history: MatchRecord[]): string {
    const statsByMode = LocalStorageManager.getStatsByMode(history);

    return `
      ${this.renderStatCard(statsByMode.pve, '🤖 人机对战 (PvE)')}
      ${this.renderStatCard(statsByMode.pvp, '👥 双人对战 (PvP)')}
    `;
  }

  private renderByDifficulty(history: MatchRecord[]): string {
    const statsByDiff = LocalStorageManager.getStatsByDifficulty(history);

    return `
      ${this.renderStatCard(statsByDiff.easy, '😊 简单难度')}
      ${this.renderStatCard(statsByDiff.normal, '😤 普通难度')}
      ${this.renderStatCard(statsByDiff.hard, '👹 困难难度')}
    `;
  }

  private renderHistory(history: MatchRecord[]): string {
    if (history.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📜</div>
          <div class="empty-text">暂无比赛记录</div>
        </div>
      `;
    }

    let records = '';
    history.slice(0, 50).forEach(record => {
      const winnerText = record.winner === 1 ? 'P1胜' : record.winner === 2 ? 'P2胜' : '平局';
      const winnerClass = record.winner === 1 ? 'win' : record.winner === 2 ? 'lose' : 'draw';

      records += `
        <div class="history-row">
          <div class="history-date">${record.date}</div>
          <div class="history-mode">${MODE_LABELS[record.mode]}</div>
          <div class="history-diff">${record.mode === 'pve' ? DIFFICULTY_LABELS[record.difficulty] : '-'}</div>
          <div class="history-result ${winnerClass}">${winnerText}</div>
          <div class="history-damage">${Math.round(record.p1Damage)} vs ${Math.round(record.p2Damage)}</div>
          <div class="history-combo">${record.maxCombo}连击</div>
        </div>
      `;
    });

    return `
      <div class="stats-card">
        <div class="stats-card-title">🎯 比赛记录 (最近${Math.min(history.length, 50)}场)</div>
        <div class="history-header">
          <span>日期</span>
          <span>模式</span>
          <span>难度</span>
          <span>结果</span>
          <span>伤害</span>
          <span>连击</span>
        </div>
        <div class="history-list">
          ${records}
        </div>
      </div>
    `;
  }

  show(): void {
    this.element.classList.remove('hidden');
    this.updateContent();
    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });
  }

  hide(): void {
    this.element.classList.remove('visible');
    this.element.classList.add('hidden');
  }
}
