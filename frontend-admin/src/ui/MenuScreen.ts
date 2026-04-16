import { GameMode, AIDifficulty } from '../config/constants';

export interface MenuCallbacks {
  onStartGame: (mode: GameMode, difficulty: AIDifficulty) => void;
}

/**
 * 主菜单界面
 */
export class MenuScreen {
  private element: HTMLElement;
  private selectedMode: GameMode = 'pve';
  private selectedDifficulty: AIDifficulty = 'normal';
  private callbacks: MenuCallbacks;

  constructor(callbacks: MenuCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.className = 'menu-screen';
    this.buildHTML();
    this.bindEvents();
    document.getElementById('app')!.appendChild(this.element);
  }

  private buildHTML(): void {
    this.element.innerHTML = `
      <div class="menu-header">
        <div class="menu-title">🔥 火柴人格斗 3D</div>
        <div class="menu-subtitle">Stickman Fighter 3D — 使用智能体3D图形生成器构建</div>
      </div>

      <div class="menu-row">
        <div class="menu-card menu-card-flex">
          <div class="menu-card-title">选择模式</div>
          <div class="mode-select">
            <div class="mode-card selected" data-mode="pve">
              <div class="mode-icon">🤖</div>
              <div class="mode-name">人机对战</div>
              <div class="mode-desc">挑战AI对手</div>
            </div>
            <div class="mode-card" data-mode="pvp">
              <div class="mode-icon">👥</div>
              <div class="mode-name">双人对战</div>
              <div class="mode-desc">本地双人</div>
            </div>
          </div>
        </div>

        <div class="menu-card menu-card-flex" id="difficulty-card">
          <div class="menu-card-title">AI 难度</div>
          <div class="mode-select">
            <div class="mode-card" data-diff="easy">
              <div class="mode-icon">😊</div>
              <div class="mode-name">简单</div>
            </div>
            <div class="mode-card selected" data-diff="normal">
              <div class="mode-icon">😤</div>
              <div class="mode-name">普通</div>
            </div>
            <div class="mode-card" data-diff="hard">
              <div class="mode-icon">👹</div>
              <div class="mode-name">困难</div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-large" id="start-btn">
        ⚔️ 开始战斗
      </button>

      <div class="menu-card menu-card-wide">
        <div class="menu-card-title">操作说明</div>
        <div class="controls-compact">
          <div class="controls-player">
            <span class="controls-label p1">P1</span>
            <span class="key-pair">移动 <kbd>A</kbd><kbd>D</kbd></span>
            <span class="key-pair">跳跃 <kbd>W</kbd></span>
            <span class="key-pair">防御 <kbd>S</kbd></span>
            <span class="key-pair">拳 <kbd>F</kbd></span>
            <span class="key-pair">踢 <kbd>G</kbd></span>
            <span class="key-pair">必杀 <kbd>R</kbd></span>
          </div>
          <div class="controls-player">
            <span class="controls-label p2">P2</span>
            <span class="key-pair">移动 <kbd>←</kbd><kbd>→</kbd></span>
            <span class="key-pair">跳跃 <kbd>↑</kbd></span>
            <span class="key-pair">防御 <kbd>↓</kbd></span>
            <span class="key-pair">拳 <kbd>,</kbd></span>
            <span class="key-pair">踢 <kbd>.</kbd></span>
            <span class="key-pair">必杀 <kbd>/</kbd></span>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // 模式选择
    this.element.querySelectorAll('[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        this.element.querySelectorAll('[data-mode]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.getAttribute('data-mode') as GameMode;

        const diffCard = this.element.querySelector('#difficulty-card') as HTMLElement;
        diffCard.style.display = this.selectedMode === 'pvp' ? 'none' : '';
      });
    });

    // 难度选择
    this.element.querySelectorAll('[data-diff]').forEach(card => {
      card.addEventListener('click', () => {
        this.element.querySelectorAll('[data-diff]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDifficulty = card.getAttribute('data-diff') as AIDifficulty;
      });
    });

    // 开始按钮
    const startBtn = this.element.querySelector('#start-btn')!;
    startBtn.addEventListener('click', () => {
      startBtn.classList.add('loading');
      setTimeout(() => {
        startBtn.classList.remove('loading');
        this.callbacks.onStartGame(this.selectedMode, this.selectedDifficulty);
      }, 300);
    });
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
