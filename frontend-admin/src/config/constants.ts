/**
 * 游戏常量配置
 */
export const GAME_CONFIG = {
  // 场景（ARENA_BOUNDARY 由相机视锥动态计算，此值仅作为最大上限）
  ARENA_WIDTH: 20,
  ARENA_DEPTH: 10,
  ARENA_BOUNDARY: 8,

  // 玩家
  MAX_HEALTH: 100,
  MOVE_SPEED: 0.08,
  JUMP_FORCE: 0.2,
  GRAVITY: 0.008,
  GROUND_Y: 0,

  // 攻击
  PUNCH_DAMAGE: 8,
  KICK_DAMAGE: 12,
  SPECIAL_DAMAGE: 20,
  PUNCH_RANGE: 1.5,
  KICK_RANGE: 1.8,
  SPECIAL_RANGE: 2.2,
  ATTACK_COOLDOWN: 400,
  SPECIAL_COOLDOWN: 2000,

  // 防御
  BLOCK_REDUCTION: 0.7,

  // 回合
  ROUND_TIME: 60,
  MAX_ROUNDS: 3,

  // 连击
  COMBO_WINDOW: 800,
  COMBO_BONUS_MULTIPLIER: 0.15,
} as const;

/** 性能与帧率自适应配置 */
export const PERFORMANCE_CONFIG = {
  /** FPS 低于此值持续一段时间则降级画质 */
  FPS_LOW_THRESHOLD: 28,
  /** FPS 高于此值持续一段时间则升级画质 */
  FPS_HIGH_THRESHOLD: 48,
  /** 判定稳定 FPS 的采样间隔（ms） */
  FPS_SAMPLE_INTERVAL: 800,
  /** 平滑 FPS 的历史帧数 */
  FPS_SMOOTH_SAMPLES: 4,
} as const;

export type QualityLevel = 'high' | 'medium' | 'low';

/** 玩家1键位 */
export const P1_KEYS = {
  LEFT: 'KeyA',
  RIGHT: 'KeyD',
  JUMP: 'KeyW',
  BLOCK: 'KeyS',
  PUNCH: 'KeyF',
  KICK: 'KeyG',
  SPECIAL: 'KeyR',
} as const;

/** 玩家2键位 */
export const P2_KEYS = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  JUMP: 'ArrowUp',
  BLOCK: 'ArrowDown',
  PUNCH: 'Comma',       // , 键 — 拳击
  KICK: 'Period',       // . 键 — 踢击
  SPECIAL: 'Slash',     // / 键 — 必杀技
} as const;

/** AI 难度 */
export type AIDifficulty = 'easy' | 'normal' | 'hard';

/** 游戏模式 */
export type GameMode = 'pvp' | 'pve';

/** 游戏状态 */
export type GameState = 'menu' | 'fighting' | 'roundEnd' | 'gameOver';

/** 攻击类型 */
export type AttackType = 'punch' | 'kick' | 'special';

/** 玩家动作状态 */
export type PlayerAction = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'special' | 'block' | 'hit' | 'ko';
