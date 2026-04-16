import { GAME_CONFIG } from '../config/constants';

/**
 * HUD 界面 - 血条、计时器、连击显示、操作提示
 */
export class HUD {
  private overlay: HTMLElement;
  private p1HealthFill!: HTMLElement;
  private p2HealthFill!: HTMLElement;
  private p1HealthText!: HTMLElement;
  private p2HealthText!: HTMLElement;
  private timerText!: HTMLElement;
  private roundText!: HTMLElement;
  private comboDisplay!: HTMLElement;
  private fightAnnounce!: HTMLElement;
  private comboTimeout: number | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'hud-overlay';
    this.overlay.style.display = 'none';
    this.buildHTML();
    document.getElementById('app')!.appendChild(this.overlay);
  }

  private buildHTML(): void {
    this.overlay.innerHTML = `
      <div class="health-bar-container">
        <div class="player-info">
          <span class="player-name p1">P1 玩家</span>
          <div class="health-bar-wrapper">
            <div class="health-bar-fill p1" id="p1-health-fill" style="width:100%"></div>
            <span class="health-text p1" id="p1-health-text">100</span>
          </div>
        </div>
        <div class="round-indicator">
          <span class="round-text" id="round-text">第 1 回合</span>
          <span class="timer-text" id="timer-text">60</span>
        </div>
        <div class="player-info right">
          <span class="player-name p2">P2 电脑</span>
          <div class="health-bar-wrapper">
            <div class="health-bar-fill p2" id="p2-health-fill" style="width:100%"></div>
            <span class="health-text p2" id="p2-health-text">100</span>
          </div>
        </div>
      </div>
      <div class="combo-display" id="combo-display"></div>
      <div class="fight-announce" id="fight-announce">FIGHT!</div>
      <div class="controls-hint">
        <div class="control-group">
          <span class="control-group-title">P1 移动</span>
          <div class="control-keys">
            <span class="key-badge">A</span>
            <span class="key-badge">D</span>
            <span class="key-badge">W</span>
            <span class="key-badge">S</span>
          </div>
        </div>
        <div class="control-group">
          <span class="control-group-title">P1 攻击</span>
          <div class="control-keys">
            <span class="key-badge">F</span>
            <span class="key-badge">G</span>
            <span class="key-badge">R</span>
          </div>
        </div>
        <div class="control-group">
          <span class="control-group-title">P2 移动</span>
          <div class="control-keys">
            <span class="key-badge">←</span>
            <span class="key-badge">→</span>
            <span class="key-badge">↑</span>
            <span class="key-badge">↓</span>
          </div>
        </div>
        <div class="control-group">
          <span class="control-group-title">P2 攻击</span>
          <div class="control-keys">
            <span class="key-badge">,</span>
            <span class="key-badge">.</span>
            <span class="key-badge">/</span>
          </div>
        </div>
      </div>
    `;

    this.p1HealthFill = this.overlay.querySelector('#p1-health-fill')!;
    this.p2HealthFill = this.overlay.querySelector('#p2-health-fill')!;
    this.p1HealthText = this.overlay.querySelector('#p1-health-text')!;
    this.p2HealthText = this.overlay.querySelector('#p2-health-text')!;
    this.timerText = this.overlay.querySelector('#timer-text')!;
    this.roundText = this.overlay.querySelector('#round-text')!;
    this.comboDisplay = this.overlay.querySelector('#combo-display')!;
    this.fightAnnounce = this.overlay.querySelector('#fight-announce')!;
  }

  show(): void {
    this.overlay.style.display = '';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  updateHealth(p1Health: number, p2Health: number): void {
    const p1Pct = (p1Health / GAME_CONFIG.MAX_HEALTH) * 100;
    const p2Pct = (p2Health / GAME_CONFIG.MAX_HEALTH) * 100;
    this.p1HealthFill.style.width = `${p1Pct}%`;
    this.p2HealthFill.style.width = `${p2Pct}%`;
    this.p1HealthText.textContent = Math.ceil(p1Health).toString();
    this.p2HealthText.textContent = Math.ceil(p2Health).toString();
  }

  updateTimer(seconds: number): void {
    this.timerText.textContent = Math.ceil(seconds).toString();
    if (seconds <= 10) {
      this.timerText.style.color = 'var(--color-danger)';
    } else {
      this.timerText.style.color = 'var(--color-accent)';
    }
  }

  updateRound(round: number): void {
    this.roundText.textContent = `第 ${round} 回合`;
  }

  setP2Label(label: string): void {
    const p2Name = this.overlay.querySelector('.player-name.p2');
    if (p2Name) p2Name.textContent = label;
  }

  showCombo(count: number, playerName: string): void {
    if (count < 2) return;
    this.comboDisplay.textContent = `${playerName} ${count} 连击!`;
    this.comboDisplay.classList.add('active');

    if (this.comboTimeout) clearTimeout(this.comboTimeout);
    this.comboTimeout = window.setTimeout(() => {
      this.comboDisplay.classList.remove('active');
    }, 1000);
  }

  showFightAnnounce(text: string): void {
    this.fightAnnounce.textContent = text;
    this.fightAnnounce.classList.remove('show');
    // 强制 reflow
    void this.fightAnnounce.offsetWidth;
    this.fightAnnounce.classList.add('show');
  }
}
