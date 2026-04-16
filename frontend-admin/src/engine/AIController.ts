import { Player } from './Player';
import { GAME_CONFIG, AttackType, AIDifficulty } from '../config/constants';

/**
 * AI 行为节点类型 — 行为树基础
 */
type BehaviorStatus = 'success' | 'failure' | 'running';

interface BehaviorContext {
  ai: Player;
  opponent: Player;
  distance: number;
  healthRatio: number;
  opponentHealthRatio: number;
  opponentAction: string;
  isOpponentAttacking: boolean;
  canSpecial: boolean;
  timeSinceLastHit: number;
}

/**
 * AI 性格特征 — 影响决策权重
 */
interface AIPersonality {
  aggression: number;     // 攻击倾向 0~1
  caution: number;        // 谨慎程度 0~1
  adaptability: number;   // 适应能力 0~1
  comboFocus: number;     // 连击倾向 0~1
}

/**
 * 自适应学习记录
 */
interface LearningMemory {
  totalRounds: number;
  wins: number;
  losses: number;
  avgDamageDealt: number;
  avgDamageTaken: number;
  successfulBlocks: number;
  failedAttacks: number;
  successfulAttacks: number;
  opponentPatterns: Map<string, number>; // 对手行为模式频率
  lastActions: string[];                  // 最近 N 个动作记录
}

/**
 * AI 状态机状态
 */
type AIState = 'aggressive' | 'defensive' | 'balanced' | 'retreating' | 'combo_seeking';

/**
 * AI 控制器 — 基于行为树 + 状态机的自主决策智能体
 *
 * 核心能力：
 * 1. 行为树决策：分层评估攻击/防御/移动策略
 * 2. 有限状态机：根据战况动态切换战斗风格
 * 3. 自适应学习：记录战斗数据，动态调整策略权重
 * 4. 对手模式识别：分析对手行为模式，预测下一步动作
 * 5. 多样化性格：不同 AI 有不同的战斗风格
 */
/** 移动方向：-1 左，0 不动，1 右。每帧应用，使机器人移动速度与玩家相当。 */
type MoveDirection = -1 | 0 | 1;

export class AIController {
  private difficulty: AIDifficulty;
  private decisionTimer = 0;
  private decisionInterval: number;
  private currentState: AIState = 'balanced';
  private personality: AIPersonality;
  private memory: LearningMemory;
  private stateTimer = 0;
  private stateTransitionInterval = 3000; // 状态评估间隔 ms
  private lastHitTime = 0;
  /** 当前移动方向，每帧应用（不再每决策只动一步），避免机器人移动过慢 */
  private moveDirection: MoveDirection = 0;

  constructor(difficulty: AIDifficulty = 'normal') {
    this.difficulty = difficulty;
    this.decisionInterval = this.getDecisionInterval();
    this.personality = this.generatePersonality();
    this.memory = this.createMemory();
  }

  setDifficulty(d: AIDifficulty): void {
    this.difficulty = d;
    this.decisionInterval = this.getDecisionInterval();
    this.personality = this.generatePersonality();
  }

  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  /** 重置学习记忆（新游戏时调用） */
  resetMemory(): void {
    this.memory = this.createMemory();
    this.currentState = 'balanced';
    this.stateTimer = 0;
    this.moveDirection = 0;
  }

  /** 通知 AI 被命中 — 用于学习 */
  notifyHit(): void {
    this.lastHitTime = Date.now();
    this.memory.avgDamageTaken++;
  }

  /** 通知 AI 成功防御 */
  notifyBlockSuccess(): void {
    this.memory.successfulBlocks++;
  }

  /** 通知 AI 攻击结果 */
  notifyAttackResult(hit: boolean): void {
    if (hit) this.memory.successfulAttacks++;
    else this.memory.failedAttacks++;
  }

  /** 通知回合结果 — 用于自适应 */
  notifyRoundResult(won: boolean): void {
    this.memory.totalRounds++;
    if (won) this.memory.wins++;
    else this.memory.losses++;
    this.adaptFromExperience();
  }

  private getDecisionInterval(): number {
    switch (this.difficulty) {
      case 'easy': return 600;
      case 'normal': return 350;
      case 'hard': return 150;
    }
  }

  /** 生成 AI 性格 — 每个 AI 实例都有独特的战斗风格 */
  private generatePersonality(): AIPersonality {
    const base = this.difficulty === 'hard' ? 0.7 : this.difficulty === 'normal' ? 0.5 : 0.3;
    return {
      aggression: base + (Math.random() - 0.5) * 0.3,
      caution: 1 - base + (Math.random() - 0.5) * 0.2,
      adaptability: this.difficulty === 'hard' ? 0.8 : this.difficulty === 'normal' ? 0.5 : 0.2,
      comboFocus: base * 0.8 + Math.random() * 0.2,
    };
  }

  private createMemory(): LearningMemory {
    return {
      totalRounds: 0,
      wins: 0,
      losses: 0,
      avgDamageDealt: 0,
      avgDamageTaken: 0,
      successfulBlocks: 0,
      failedAttacks: 0,
      successfulAttacks: 0,
      opponentPatterns: new Map(),
      lastActions: [],
    };
  }

  /** 自适应学习 — 根据战斗经验调整性格 */
  private adaptFromExperience(): void {
    if (this.memory.totalRounds < 1) return;
    const adapt = this.personality.adaptability;

    const winRate = this.memory.wins / this.memory.totalRounds;

    // 输多了 → 变得更谨慎
    if (winRate < 0.4) {
      this.personality.caution = Math.min(1, this.personality.caution + 0.1 * adapt);
      this.personality.aggression = Math.max(0.1, this.personality.aggression - 0.05 * adapt);
    }
    // 赢多了 → 变得更激进
    if (winRate > 0.6) {
      this.personality.aggression = Math.min(1, this.personality.aggression + 0.05 * adapt);
    }

    // 攻击命中率低 → 增加连击倾向（更精准的攻击时机）
    const hitRate = this.memory.successfulAttacks / Math.max(1, this.memory.successfulAttacks + this.memory.failedAttacks);
    if (hitRate < 0.3) {
      this.personality.comboFocus = Math.min(1, this.personality.comboFocus + 0.1 * adapt);
    }
  }

  update(ai: Player, opponent: Player, delta: number): void {
    if (!ai.isAlive()) return;

    this.decisionTimer += delta;
    this.stateTimer += delta;

    // 记录对手行为模式
    this.recordOpponentPattern(opponent);

    // 定期评估状态转换
    if (this.stateTimer >= this.stateTransitionInterval) {
      this.stateTimer = 0;
      this.evaluateStateTransition(ai, opponent);
    }

    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0;
      const ctx = this.buildContext(ai, opponent);
      this.executeBehaviorTree(ctx);
    }

    // 每帧按当前方向移动，使机器人移动速度与玩家相当（不再每决策只动一步）
    if (this.moveDirection === -1) ai.moveLeft();
    else if (this.moveDirection === 1) ai.moveRight();
  }

  /** 记录对手行为模式 */
  private recordOpponentPattern(opponent: Player): void {
    const action = opponent.state.action;
    if (action !== 'idle' && action !== 'walk') {
      const count = this.memory.opponentPatterns.get(action) ?? 0;
      this.memory.opponentPatterns.set(action, count + 1);
    }
    this.memory.lastActions.push(action);
    if (this.memory.lastActions.length > 20) {
      this.memory.lastActions.shift();
    }
  }

  /** 预测对手下一步动作 */
  private predictOpponentAction(): string {
    if (this.memory.lastActions.length < 5) return 'unknown';

    // 简单的频率分析
    const recent = this.memory.lastActions.slice(-10);
    const freq = new Map<string, number>();
    for (const a of recent) {
      freq.set(a, (freq.get(a) ?? 0) + 1);
    }

    let maxAction = 'idle';
    let maxCount = 0;
    for (const [action, count] of freq) {
      if (count > maxCount && action !== 'idle' && action !== 'walk') {
        maxAction = action;
        maxCount = count;
      }
    }
    return maxAction;
  }

  /** 状态机 — 评估是否需要切换战斗风格 */
  private evaluateStateTransition(ai: Player, opponent: Player): void {
    const healthRatio = ai.state.health / GAME_CONFIG.MAX_HEALTH;
    const opponentHealthRatio = opponent.state.health / GAME_CONFIG.MAX_HEALTH;
    const timeSinceHit = Date.now() - this.lastHitTime;

    // 血量低 → 防御/撤退
    if (healthRatio < 0.25) {
      this.currentState = 'retreating';
      return;
    }
    if (healthRatio < 0.4 && healthRatio < opponentHealthRatio) {
      this.currentState = 'defensive';
      return;
    }

    // 对手血量低 → 激进追击
    if (opponentHealthRatio < 0.3 && healthRatio > 0.4) {
      this.currentState = 'aggressive';
      return;
    }

    // 连击机会
    if (ai.state.comboCount >= 2 && timeSinceHit < 1000) {
      this.currentState = 'combo_seeking';
      return;
    }

    // 默认平衡
    this.currentState = 'balanced';
  }

  /** 构建行为上下文 */
  private buildContext(ai: Player, opponent: Player): BehaviorContext {
    return {
      ai,
      opponent,
      distance: Math.abs(ai.state.position.x - opponent.state.position.x),
      healthRatio: ai.state.health / GAME_CONFIG.MAX_HEALTH,
      opponentHealthRatio: opponent.state.health / GAME_CONFIG.MAX_HEALTH,
      opponentAction: opponent.state.action,
      isOpponentAttacking: ['punch', 'kick', 'special'].includes(opponent.state.action),
      canSpecial: Date.now() - ai.state.lastSpecialTime >= GAME_CONFIG.SPECIAL_COOLDOWN,
      timeSinceLastHit: Date.now() - this.lastHitTime,
    };
  }

  /** 行为树根节点 — 按优先级评估各子树 */
  private executeBehaviorTree(ctx: BehaviorContext): void {
    this.moveDirection = 0; // 默认本决策周期不移动，由各策略按需设置
    // 优先级 1：紧急防御
    if (this.tryEmergencyDefense(ctx) === 'success') return;

    // 优先级 2：根据状态机执行对应策略
    switch (this.currentState) {
      case 'aggressive':
        this.executeAggressiveStrategy(ctx);
        break;
      case 'defensive':
        this.executeDefensiveStrategy(ctx);
        break;
      case 'retreating':
        this.executeRetreatStrategy(ctx);
        break;
      case 'combo_seeking':
        this.executeComboStrategy(ctx);
        break;
      default:
        this.executeBalancedStrategy(ctx);
        break;
    }
  }

  /** 紧急防御子树 */
  private tryEmergencyDefense(ctx: BehaviorContext): BehaviorStatus {
    this.moveDirection = 0;
    if (ctx.isOpponentAttacking && ctx.distance < 2.5) {
      const blockChance = this.personality.caution * (this.difficulty === 'hard' ? 0.85 : 0.6);
      if (Math.random() < blockChance) {
        ctx.ai.block(true);
        return 'success';
      }
    }
    ctx.ai.block(false);
    return 'failure';
  }

  /** 激进策略 */
  private executeAggressiveStrategy(ctx: BehaviorContext): void {
    const { ai, opponent, distance } = ctx;
    const dirToOpponent = opponent.state.position.x > ai.state.position.x ? 1 : -1;
    ai.state.facing = dirToOpponent;

    if (distance < 2.0) {
      this.moveDirection = 0;
      // 在攻击范围内 → 高频攻击
      if (Math.random() < 0.7) {
        this.performSmartAttack(ctx);
      } else if (Math.random() < 0.3) {
        ai.jump();
      }
    } else {
      this.moveDirection = dirToOpponent > 0 ? 1 : -1;
      if (distance > 3 && Math.random() < 0.05) ai.jump();
    }
  }

  /** 防御策略 */
  private executeDefensiveStrategy(ctx: BehaviorContext): void {
    const { ai, opponent, distance } = ctx;
    const dirToOpponent = opponent.state.position.x > ai.state.position.x ? 1 : -1;
    ai.state.facing = dirToOpponent;

    if (ctx.isOpponentAttacking && distance < 2.5) {
      this.moveDirection = 0;
      ai.block(true);
    } else if (distance < 1.5) {
      this.moveDirection = dirToOpponent > 0 ? -1 : 1;
    } else if (distance > 3.5) {
      this.moveDirection = dirToOpponent > 0 ? 1 : -1;
    } else {
      this.moveDirection = 0;
      if (!ctx.isOpponentAttacking && Math.random() < 0.3) {
        this.performSmartAttack(ctx);
      }
    }
  }

  /** 撤退策略 */
  private executeRetreatStrategy(ctx: BehaviorContext): void {
    const { ai, opponent, distance } = ctx;
    const dirToOpponent = opponent.state.position.x > ai.state.position.x ? 1 : -1;
    ai.state.facing = dirToOpponent;

    if (distance < 2.0) {
      this.moveDirection = dirToOpponent > 0 ? -1 : 1;
      if (ctx.isOpponentAttacking) {
        this.moveDirection = 0;
        ai.block(true);
      }
    } else {
      this.moveDirection = 0;
      if (Math.random() < 0.15) {
        this.performSmartAttack(ctx);
      }
    }
  }

  /** 连击策略 */
  private executeComboStrategy(ctx: BehaviorContext): void {
    const { ai, opponent, distance } = ctx;
    const dirToOpponent = opponent.state.position.x > ai.state.position.x ? 1 : -1;
    ai.state.facing = dirToOpponent;

    if (distance < 2.0) {
      this.moveDirection = 0;
      this.performSmartAttack(ctx);
    } else {
      this.moveDirection = dirToOpponent > 0 ? 1 : -1;
    }
  }

  /** 平衡策略 */
  private executeBalancedStrategy(ctx: BehaviorContext): void {
    const { ai, opponent, distance } = ctx;
    const dirToOpponent = opponent.state.position.x > ai.state.position.x ? 1 : -1;
    ai.state.facing = dirToOpponent;

    if (distance < 2.0) {
      if (Math.random() < this.personality.aggression) {
        this.moveDirection = 0;
        this.performSmartAttack(ctx);
      } else if (Math.random() < this.personality.caution * 0.5) {
        this.moveDirection = 0;
        ai.block(true);
      } else {
        this.moveDirection = dirToOpponent > 0 ? -1 : 1;
      }
    } else if (distance > 3.0) {
      this.moveDirection = dirToOpponent > 0 ? 1 : -1;
      if (Math.random() < 0.02) ai.jump();
    } else {
      if (Math.random() < this.personality.aggression * 0.6) {
        this.moveDirection = dirToOpponent > 0 ? 1 : -1;
      } else {
        this.moveDirection = 0;
      }
    }
  }

  /** 智能攻击选择 — 根据距离、对手状态、预测选择最优攻击 */
  private performSmartAttack(ctx: BehaviorContext): void {
    const { ai, distance, canSpecial } = ctx;
    const predicted = this.predictOpponentAction();

    // 对手在防御 → 用必杀技破防
    if (predicted === 'block' && canSpecial && distance < GAME_CONFIG.SPECIAL_RANGE) {
      ai.attack('special');
      return;
    }

    // 对手在攻击 → 用踢击（更远距离）反击
    if (ctx.isOpponentAttacking && distance < GAME_CONFIG.KICK_RANGE) {
      ai.attack('kick');
      return;
    }

    // 必杀技可用且在范围内
    if (canSpecial && Math.random() < 0.2 && distance < GAME_CONFIG.SPECIAL_RANGE) {
      ai.attack('special');
      return;
    }

    // 近距离用拳，中距离用踢
    let attackType: AttackType;
    if (distance < GAME_CONFIG.PUNCH_RANGE * 0.8) {
      attackType = Math.random() < 0.6 ? 'punch' : 'kick';
    } else {
      attackType = Math.random() < 0.4 ? 'punch' : 'kick';
    }

    ai.attack(attackType);
  }

  /** 获取当前 AI 状态（用于 HUD 显示） */
  getState(): AIState {
    return this.currentState;
  }

  /** 获取性格信息（用于调试/显示） */
  getPersonality(): AIPersonality {
    return { ...this.personality };
  }
}
