import * as THREE from 'three';
import { SceneManager } from '../engine/SceneManager';
import { InputManager } from '../engine/InputManager';
import { AnimationSystem } from '../engine/AnimationSystem';
import { Player } from '../engine/Player';
import { CombatSystem } from '../engine/CombatSystem';
import { AIController } from '../engine/AIController';
import { StickmanGenerator, StickmanDNA } from '../engine/StickmanGenerator';
import { HUD } from '../ui/HUD';
import { MenuScreen } from '../ui/MenuScreen';
import { ResultScreen } from '../ui/ResultScreen';
import { StatsCenterScreen } from '../ui/StatsCenterScreen';
import { ToastManager } from '../ui/ToastManager';
import { FPSMonitor } from '../ui/FPSMonitor';
import {
  GAME_CONFIG,
  PERFORMANCE_CONFIG,
  GameMode,
  GameState,
  AIDifficulty,
  P1_KEYS,
  P2_KEYS,
  AttackType,
  QualityLevel,
} from '../config/constants';
import { LocalStorageManager } from '../config/storage';

/**
 * 游戏主控制器 - 管理游戏生命周期
 */
export class Game {
  // 系统
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private animSystem: AnimationSystem;
  private combatSystem: CombatSystem;
  private aiController: AIController;

  // UI
  private hud: HUD;
  private menuScreen: MenuScreen;
  private resultScreen: ResultScreen;
  private statsCenterScreen: StatsCenterScreen;
  private toast: ToastManager;
  private fpsMonitor: FPSMonitor;

  // 玩家
  private player1!: Player;
  private player2!: Player;

  // 智能体 DNA
  private p1DNA!: StickmanDNA;
  private p2DNA!: StickmanDNA;

  // 游戏状态
  private gameState: GameState = 'menu';
  private gameMode: GameMode = 'pve';
  private currentRound = 1;
  private roundTimer: number = GAME_CONFIG.ROUND_TIME;
  private lastFrameTime = 0;
  private animFrameId = 0;
  private roundStartCountdown = 0; // 回合开始倒计时保护期（毫秒）

  // 攻击判定标记 (防止一次攻击多次判定)
  private p1AttackHit = false;
  private p2AttackHit = false;
  private p1LastAction: string = 'idle';
  private p2LastAction: string = 'idle';

  // 帧率自适应
  private lastQualityCheckTime = 0;
  private currentQualityLevel: QualityLevel = 'high';

  constructor(container: HTMLElement) {
    // 初始化系统
    this.sceneManager = new SceneManager(container);
    this.inputManager = new InputManager();
    this.animSystem = new AnimationSystem();
    this.combatSystem = new CombatSystem(this.sceneManager.scene);
    this.aiController = new AIController('normal');
    this.toast = new ToastManager();
    this.fpsMonitor = new FPSMonitor();

    // 初始化UI
    this.hud = new HUD();
    this.statsCenterScreen = new StatsCenterScreen({
      onBack: () => this.closeStatsCenter(),
    });
    this.menuScreen = new MenuScreen({
      onStartGame: (mode, difficulty) => this.startGame(mode, difficulty),
      onOpenStats: () => this.openStatsCenter(),
    });
    this.resultScreen = new ResultScreen({
      onRestart: () => this.restartGame(),
      onMenu: () => this.returnToMenu(),
    });

    // 碰撞回调
    this.combatSystem.setOnHit((attacker, defender, damage, type) => {
      this.onAttackHit(attacker, defender, damage, type);
    });

    // 创建玩家
    this.createPlayers();

    // 资源预加载：预热 WebGL 与着色器，减少首帧卡顿
    this.runPreload();
  }

  /** 预加载：渲染数帧以预热 WebGL/着色器，并预创建一次打击特效后释放以编译粒子着色器 */
  private runPreload(): void {
    let framesLeft = 3;
    const preloadLoop = (): void => {
      this.sceneManager.render();
      framesLeft--;
      if (framesLeft > 0) {
        requestAnimationFrame(preloadLoop);
        return;
      }
      // 预创建并立即释放打击特效，促使粒子着色器提前编译
      const dummyEffect = StickmanGenerator.createHitEffect(new THREE.Vector3(0, 1, 0), 0xe63946, 6);
      dummyEffect.geometry.dispose();
      (dummyEffect.material as THREE.Material).dispose();
      this.lastFrameTime = performance.now();
      requestAnimationFrame(this.gameLoop);
    };
    requestAnimationFrame(preloadLoop);
  }

  private createPlayers(): void {
    // 使用统一体型 DNA，保证两名火柴人大小一致（仅颜色与装饰不同）
    const seed = Date.now();
    this.p1DNA = StickmanGenerator.getUniformBodyDNA(0xe63946, seed);
    this.p2DNA = StickmanGenerator.getUniformBodyDNA(0x457b9d, seed);
    this.player1 = new Player(1, 0xe63946, -3, this.animSystem, this.p1DNA);
    this.player2 = new Player(2, 0x457b9d, 3, this.animSystem, this.p2DNA);
    this.sceneManager.scene.add(this.player1.model);
    this.sceneManager.scene.add(this.player2.model);
  }

  private startGame(mode: GameMode, difficulty: AIDifficulty): void {
    this.gameMode = mode;
    this.aiController.setDifficulty(difficulty);
    this.aiController.resetMemory();
    this.currentRound = 1;
    this.player1.state.wins = 0;
    this.player2.state.wins = 0;
    this.player1.state.totalDamageDealt = 0;
    this.player2.state.totalDamageDealt = 0;

    if (mode === 'pve') {
      LocalStorageManager.setLastDifficulty(difficulty);
    }

    // 智能体进化式生成 — 每次新游戏生成新的火柴人变体
    this.regeneratePlayers();

    this.menuScreen.hide();
    this.hud.show();
    this.hud.setP2Label(mode === 'pvp' ? 'P2 玩家' : 'P2 电脑');

    this.startRound();
    this.toast.show('战斗开始!', 'success');
  }

  /** 重新生成玩家模型 — 统一体型，保证火柴人大小一致 */
  private regeneratePlayers(): void {
    // 移除旧模型
    this.sceneManager.scene.remove(this.player1.model);
    this.sceneManager.scene.remove(this.player2.model);

    // 使用统一体型 DNA（同一 seed 保证体型与装饰一致，仅颜色区分 P1/P2）
    const seed = Date.now();
    this.p1DNA = StickmanGenerator.getUniformBodyDNA(0xe63946, seed);
    this.p2DNA = StickmanGenerator.getUniformBodyDNA(0x457b9d, seed);

    this.player1 = new Player(1, 0xe63946, -3, this.animSystem, this.p1DNA);
    this.player2 = new Player(2, 0x457b9d, 3, this.animSystem, this.p2DNA);
    this.sceneManager.scene.add(this.player1.model);
    this.sceneManager.scene.add(this.player2.model);

    // 重新绑定碰撞系统回调（因为 player 实例变了）
    this.combatSystem.setOnHit((attacker, defender, damage, type) => {
      this.onAttackHit(attacker, defender, damage, type);
    });
  }

  private startRound(): void {
    this.gameState = 'fighting';
    this.roundTimer = GAME_CONFIG.ROUND_TIME;
    this.roundStartCountdown = 1500; // 1.5秒保护期，等FIGHT!显示后再允许操作
    this.player1.reset(-3);
    this.player2.reset(3);
    this.p1AttackHit = false;
    this.p2AttackHit = false;
    this.p1LastAction = 'idle';
    this.p2LastAction = 'idle';
    this.combatSystem.clearEffects();

    this.hud.updateRound(this.currentRound);
    this.hud.updateHealth(this.player1.state.health, this.player2.state.health);
    this.hud.updateTimer(this.roundTimer);
    this.resultScreen.hide();

    this.hud.showFightAnnounce(`第 ${this.currentRound} 回合`);
    setTimeout(() => {
      this.hud.showFightAnnounce('FIGHT!');
    }, 1200);
  }

  private restartGame(): void {
    this.currentRound = 1;
    this.player1.state.wins = 0;
    this.player2.state.wins = 0;
    this.player1.state.totalDamageDealt = 0;
    this.player2.state.totalDamageDealt = 0;
    this.aiController.resetMemory();

    // 进化式重新生成火柴人
    this.regeneratePlayers();

    this.resultScreen.hide();
    this.startRound();
    this.toast.show('新的战斗!', 'info');
  }

  private returnToMenu(): void {
    this.gameState = 'menu';
    this.hud.hide();
    this.resultScreen.hide();
    this.statsCenterScreen.hide();
    this.menuScreen.show();
    this.player1.reset(-3);
    this.player2.reset(3);
    this.combatSystem.clearEffects();
  }

  private openStatsCenter(): void {
    this.menuScreen.hide();
    this.statsCenterScreen.show();
  }

  private closeStatsCenter(): void {
    this.statsCenterScreen.hide();
    this.menuScreen.show();
  }

  private onAttackHit(attacker: Player, defender: Player, _damage: number, type: AttackType): void {
    // 防止同一次攻击多次判定
    if (attacker.id === 1) {
      if (this.p1AttackHit) return;
      this.p1AttackHit = true;
    } else {
      if (this.p2AttackHit) return;
      this.p2AttackHit = true;
    }

    // 确认命中后，由 CombatSystem 执行实际伤害
    const actualDamage = this.combatSystem.applyDamage(attacker, defender, type);

    // 更新HUD
    this.hud.updateHealth(this.player1.state.health, this.player2.state.health);

    // 连击提示
    const name = attacker.id === 1 ? 'P1' : 'P2';
    if (attacker.state.comboCount >= 2) {
      this.hud.showCombo(attacker.state.comboCount, name);
    }
    // 更新最大连击
    if (attacker.state.comboCount > attacker.state.maxCombo) {
      attacker.state.maxCombo = attacker.state.comboCount;
    }

    // 必杀技提示
    if (type === 'special') {
      this.toast.show(`${name} 必杀! -${Math.round(actualDamage)}`, 'info');
    }

    // 检查KO
    if (!defender.isAlive()) {
      this.endRound(attacker.id);
    }
  }

  private endRound(winnerId: number): void {
    // 防止同一回合多次调用 endRound（如KO和时间到同帧触发）
    if (this.gameState !== 'fighting') return;

    this.gameState = 'roundEnd';

    if (winnerId === 1) {
      this.player1.state.wins++;
      this.hud.showFightAnnounce('K.O.!');
      this.toast.show('P1 赢得本回合!', 'success');
    } else if (winnerId === 2) {
      this.player2.state.wins++;
      this.hud.showFightAnnounce('K.O.!');
      this.toast.show('P2 赢得本回合!', 'success');
    } else {
      // 平局，双方都不加分
      this.hud.showFightAnnounce('TIME UP!');
      this.toast.show('本回合平局!', 'info');
    }

    // 设置KO动画（有输家时播放）
    if (winnerId === 1) {
      this.player2.state.action = 'ko';
      this.player2.state.actionTime = Date.now();
      // 通知 AI 学习
      if (this.gameMode === 'pve') this.aiController.notifyRoundResult(false);
    } else if (winnerId === 2) {
      this.player1.state.action = 'ko';
      this.player1.state.actionTime = Date.now();
      if (this.gameMode === 'pve') this.aiController.notifyRoundResult(true);
    }

    setTimeout(() => {
      this.checkGameOver();
    }, 2000);
  }

  private checkGameOver(): void {
    const p1Wins = this.player1.state.wins;
    const p2Wins = this.player2.state.wins;
    const winsNeeded = Math.ceil(GAME_CONFIG.MAX_ROUNDS / 2);

    if (p1Wins >= winsNeeded || p2Wins >= winsNeeded || this.currentRound >= GAME_CONFIG.MAX_ROUNDS) {
      // 游戏结束
      this.gameState = 'gameOver';
      let winner: 1 | 2 | null = null;
      if (p1Wins > p2Wins) {
        winner = 1;
      } else if (p2Wins > p1Wins) {
        winner = 2;
      } else {
        // 回合数相同时，用总伤害决定胜者
        if (this.player1.state.totalDamageDealt > this.player2.state.totalDamageDealt) {
          winner = 1;
        } else if (this.player2.state.totalDamageDealt > this.player1.state.totalDamageDealt) {
          winner = 2;
        }
        // 总伤害也相同则 winner 保持 null（真正平局）
      }

      if (winner === 1) {
        LocalStorageManager.addWin();
      }
      LocalStorageManager.addDamage(this.player1.state.totalDamageDealt);

      // 保存本场战斗记录
      const maxCombo = Math.max(this.player1.state.maxCombo, this.player2.state.maxCombo);
      LocalStorageManager.addMatchRecord({
        mode: this.gameMode,
        difficulty: this.aiController.getDifficulty(),
        winner,
        p1Damage: this.player1.state.totalDamageDealt,
        p2Damage: this.player2.state.totalDamageDealt,
        maxCombo,
        timestamp: Date.now(),
        duration: this.currentRound * GAME_CONFIG.ROUND_TIME - this.roundTimer,
      });

      const stats = LocalStorageManager.getStats();

      this.resultScreen.show(
        winner,
        this.player1.state.totalDamageDealt,
        this.player2.state.totalDamageDealt,
        p1Wins,
        p2Wins,
        stats.totalWins,
        stats.totalDamage,
        stats.lastDifficulty
      );
    } else {
      // 下一回合
      this.currentRound++;
      this.startRound();
    }
  }

  private handleInput(): void {
    if (this.gameState !== 'fighting') return;

    let p1Moving = false;

    // P1 输入
    if (this.inputManager.isDown(P1_KEYS.LEFT)) {
      this.player1.moveLeft();
      p1Moving = true;
    }
    if (this.inputManager.isDown(P1_KEYS.RIGHT)) {
      this.player1.moveRight();
      p1Moving = true;
    }
    if (this.inputManager.justPressed(P1_KEYS.JUMP)) {
      this.player1.jump();
    }
    this.player1.block(this.inputManager.isDown(P1_KEYS.BLOCK));

    if (this.inputManager.justPressed(P1_KEYS.PUNCH)) {
      this.player1.attack('punch');
    }
    if (this.inputManager.justPressed(P1_KEYS.KICK)) {
      this.player1.attack('kick');
    }
    if (this.inputManager.justPressed(P1_KEYS.SPECIAL)) {
      this.player1.attack('special');
    }

    if (!p1Moving && this.player1.state.isGrounded && this.player1.state.action === 'walk') {
      this.player1.state.action = 'idle';
    }

    // P2 输入 (PVP模式) 或 AI
    if (this.gameMode === 'pvp') {
      let p2Moving = false;
      if (this.inputManager.isDown(P2_KEYS.LEFT)) {
        this.player2.moveLeft();
        p2Moving = true;
      }
      if (this.inputManager.isDown(P2_KEYS.RIGHT)) {
        this.player2.moveRight();
        p2Moving = true;
      }
      if (this.inputManager.justPressed(P2_KEYS.JUMP)) {
        this.player2.jump();
      }
      this.player2.block(this.inputManager.isDown(P2_KEYS.BLOCK));

      if (this.inputManager.justPressed(P2_KEYS.PUNCH)) {
        this.player2.attack('punch');
      }
      if (this.inputManager.justPressed(P2_KEYS.KICK)) {
        this.player2.attack('kick');
      }
      if (this.inputManager.justPressed(P2_KEYS.SPECIAL)) {
        this.player2.attack('special');
      }

      if (!p2Moving && this.player2.state.isGrounded && this.player2.state.action === 'walk') {
        this.player2.state.action = 'idle';
      }
    }
  }

  private updateFacing(): void {
    // 玩家始终面向对方
    if (this.player1.state.position.x < this.player2.state.position.x) {
      this.player1.state.facing = 1;
      this.player2.state.facing = -1;
    } else {
      this.player1.state.facing = -1;
      this.player2.state.facing = 1;
    }
  }

  /**
   * 玩家碰撞推开 — 防止两个角色模型重叠
   */
  private separatePlayers(): void {
    const minDist = 0.8; // 最小间距（火柴人身体宽度）
    const p1 = this.player1.state.position;
    const p2 = this.player2.state.position;
    const dx = p1.x - p2.x;
    const dist = Math.abs(dx);

    if (dist < minDist) {
      const overlap = (minDist - dist) / 2;
      const sign = dx >= 0 ? 1 : -1;
      p1.x += sign * overlap;
      p2.x -= sign * overlap;

      // 确保不超出边界
      p1.x = Math.max(-GAME_CONFIG.ARENA_BOUNDARY, Math.min(GAME_CONFIG.ARENA_BOUNDARY, p1.x));
      p2.x = Math.max(-GAME_CONFIG.ARENA_BOUNDARY, Math.min(GAME_CONFIG.ARENA_BOUNDARY, p2.x));
    }
  }

  /**
   * 将角色位置限制在相机可见范围内，防止跑出画面
   */
  private clampPlayersToView(): void {
    const boundary = Math.min(
      this.sceneManager.getVisibleBoundaryX(),
      GAME_CONFIG.ARENA_BOUNDARY
    );
    const p1 = this.player1.state.position;
    const p2 = this.player2.state.position;
    p1.x = Math.max(-boundary, Math.min(boundary, p1.x));
    p2.x = Math.max(-boundary, Math.min(boundary, p2.x));
  }

  private gameLoop = (time: number): void => {
    this.animFrameId = requestAnimationFrame(this.gameLoop);

    // FPS 监控
    this.fpsMonitor.begin();

    // WebGL 上下文丢失时跳过逻辑更新
    if (this.sceneManager.isContextLost) {
      this.fpsMonitor.end();
      return;
    }

    const delta = Math.min(time - this.lastFrameTime, 50);
    this.lastFrameTime = time;

    // 更新动画系统时间
    this.animSystem.update(delta * 0.001);

    if (this.gameState === 'fighting') {
      // 回合开始倒计时保护期
      if (this.roundStartCountdown > 0) {
        this.roundStartCountdown -= delta;
        // 保护期内只更新动画渲染，不处理输入和碰撞
        this.player1.update(delta);
        this.player2.update(delta);
      } else {
        // 输入处理
        this.handleInput();

        // AI
        if (this.gameMode === 'pve') {
          this.aiController.update(this.player2, this.player1, delta);
        }

        // 面向更新
        this.updateFacing();

        // 玩家更新
        this.player1.update(delta);
        this.player2.update(delta);

        // 玩家碰撞推开（防止重叠）
        this.separatePlayers();

        // 将角色位置限制在相机可见范围内
        this.clampPlayersToView();

        // 碰撞检测前：检查是否有新攻击动作，重置命中标记
        if (this.player1.state.action !== this.p1LastAction) {
          if (['punch', 'kick', 'special'].includes(this.player1.state.action)) {
            this.p1AttackHit = false;
          }
          this.p1LastAction = this.player1.state.action;
        }
        if (this.player2.state.action !== this.p2LastAction) {
          if (['punch', 'kick', 'special'].includes(this.player2.state.action)) {
            this.p2AttackHit = false;
          }
          this.p2LastAction = this.player2.state.action;
        }

        // 碰撞检测
        this.combatSystem.checkAttack(this.player1, this.player2);
        this.combatSystem.checkAttack(this.player2, this.player1);

        // 计时器
        this.roundTimer -= delta * 0.001;
        if (this.roundTimer < 0) this.roundTimer = 0;
        this.hud.updateTimer(this.roundTimer);
        this.hud.updateHealth(this.player1.state.health, this.player2.state.health);

        if (this.roundTimer <= 0) {
          // 时间到，血量多的获胜
          if (this.player1.state.health > this.player2.state.health) {
            this.endRound(1);
          } else if (this.player2.state.health > this.player1.state.health) {
            this.endRound(2);
          } else {
            // 血量相同则为平局，双方都不加分
            this.endRound(0);
          }
        }
      }
    }

    // 更新特效
    this.combatSystem.updateEffects();

    // 所有状态下都更新玩家动画（确保 reset 后姿态正确渲染）
    if (this.gameState !== 'fighting') {
      this.player1.update(delta);
      this.player2.update(delta);
    }

    // 帧率自适应：按采样间隔检查平滑 FPS，调节画质以稳定帧率
    const now = time;
    if (now - this.lastQualityCheckTime >= PERFORMANCE_CONFIG.FPS_SAMPLE_INTERVAL) {
      this.lastQualityCheckTime = now;
      const smoothed = this.fpsMonitor.getSmoothedFPS();
      const levelOrder: QualityLevel[] = ['high', 'medium', 'low'];
      const currentIndex = levelOrder.indexOf(this.currentQualityLevel);
      if (smoothed < PERFORMANCE_CONFIG.FPS_LOW_THRESHOLD && currentIndex < 2) {
        this.currentQualityLevel = levelOrder[currentIndex + 1];
        this.sceneManager.setQualityLevel(this.currentQualityLevel);
        this.combatSystem.setQualityLevel(this.currentQualityLevel);
      } else if (smoothed > PERFORMANCE_CONFIG.FPS_HIGH_THRESHOLD && currentIndex > 0) {
        this.currentQualityLevel = levelOrder[currentIndex - 1];
        this.sceneManager.setQualityLevel(this.currentQualityLevel);
        this.combatSystem.setQualityLevel(this.currentQualityLevel);
      }
    }

    // 渲染
    this.sceneManager.render();

    // FPS 监控结束
    this.fpsMonitor.end();

    // 清除帧输入
    this.inputManager.clearFrame();
  };

  dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.inputManager.dispose();
    this.sceneManager.dispose();
  }
}
