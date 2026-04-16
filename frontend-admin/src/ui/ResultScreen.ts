import { AIDifficulty } from '../config/constants';

export interface ResultCallbacks {
  onRestart: () => void;
  onMenu: () => void;
}

const DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

/**
 * 战斗结果界面
 */
export class ResultScreen {
  private element: HTMLElement;
  private callbacks: ResultCallbacks;

  constructor(callbacks: ResultCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.className = 'result-overlay hidden';
    this.buildHTML();
    document.getElementById('app')!.appendChild(this.element);
  }

  private buildHTML(): void {
    this.element.innerHTML = `
      <div class="result-title" id="result-title"></div>
      <div class="result-stats" id="result-stats"></div>
      <div class="result-history" id="result-history"></div>
      <div class="result-stats-actions">
        <button class="btn btn-primary btn-large" id="restart-btn">🔄 再来一局</button>
        <button class="btn btn-outline btn-large" id="menu-btn">🏠 返回菜单</button>
      </div>
    `;

    this.element.querySelector('#restart-btn')!.addEventListener('click', () => {
      this.callbacks.onRestart();
    });
    this.element.querySelector('#menu-btn')!.addEventListener('click', () => {
      this.callbacks.onMenu();
    });
  }

  show(
    winner: number | null,
    p1Damage: number,
    p2Damage: number,
    p1Wins: number,
    p2Wins: number,
    totalWins: number,
    totalDamage: number,
    lastDifficulty: AIDifficulty
  ): void {
    const title = this.element.querySelector('#result-title')!;
    title.className = 'result-title';

    if (winner === 1) {
      title.textContent = '🏆 P1 玩家 获胜!';
      title.classList.add('p1-win');
    } else if (winner === 2) {
      title.textContent = '🏆 P2 获胜!';
      title.classList.add('p2-win');
    } else {
      title.textContent = '⚔️ 平局!';
      title.classList.add('draw');
    }

    const stats = this.element.querySelector('#result-stats')!;
    stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${Math.round(p1Damage)}</div>
        <div class="stat-label">P1 总伤害</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${p1Wins} - ${p2Wins}</div>
        <div class="stat-label">总比分</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round(p2Damage)}</div>
        <div class="stat-label">P2 总伤害</div>
      </div>
    `;

    const history = this.element.querySelector('#result-history')!;
    history.innerHTML = `
      <div class="history-title">📊 历史记录</div>
      <div class="history-stats">
        <div class="stat-card stat-card-history">
          <div class="stat-value">${totalWins}</div>
          <div class="stat-label">总胜场</div>
        </div>
        <div class="stat-card stat-card-history">
          <div class="stat-value">${totalDamage}</div>
          <div class="stat-label">累计伤害</div>
        </div>
        <div class="stat-card stat-card-history">
          <div class="stat-value">${DIFFICULTY_LABELS[lastDifficulty]}</div>
          <div class="stat-label">最近难度</div>
        </div>
      </div>
    `;

    this.element.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });
  }

  hide(): void {
    this.element.classList.remove('visible');
    this.element.classList.add('hidden');
  }
}
