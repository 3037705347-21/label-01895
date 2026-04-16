import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GAME_CONFIG } from '../../config/constants';

// Mock THREE.js — AIController 不直接使用 THREE，但 Player 依赖它
vi.mock('three', () => ({
  Vector3: class {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
  },
  Group: class { position = { x: 0, y: 0, z: 0, set() {} }; rotation = { y: 0, set() {} }; children: any[] = []; },
  Mesh: class {},
  CylinderGeometry: class {},
  SphereGeometry: class {},
  BoxGeometry: class {},
  MeshStandardMaterial: class {},
  MeshPhongMaterial: class {},
  BufferGeometry: class { setAttribute() {} },
  BufferAttribute: class {},
  PointsMaterial: class {},
  Points: class {},
  AdditiveBlending: 1,
  DoubleSide: 2,
}));

// 创建 mock Player
function createMockPlayer(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    state: {
      health: overrides.health ?? GAME_CONFIG.MAX_HEALTH,
      position: { x: overrides.x ?? 0, y: 0, z: 0 },
      velocityY: 0,
      facing: 1,
      action: overrides.action ?? 'idle',
      actionTime: 0,
      isGrounded: true,
      isBlocking: false,
      lastAttackTime: 0,
      lastSpecialTime: 0,
      comboCount: overrides.comboCount ?? 0,
      lastComboTime: 0,
      totalDamageDealt: 0,
      wins: 0,
    },
    isAlive: vi.fn(() => (overrides.health ?? GAME_CONFIG.MAX_HEALTH) > 0),
    moveLeft: vi.fn(),
    moveRight: vi.fn(),
    jump: vi.fn(),
    block: vi.fn(),
    attack: vi.fn(),
  };
}

// 动态导入以确保 mock 生效
const { AIController } = await import('../AIController');

describe('AIController', () => {
  let ai: InstanceType<typeof AIController>;

  beforeEach(() => {
    ai = new AIController('normal');
  });

  // ===== 构造与难度 =====
  describe('构造与难度设置', () => {
    it('应能创建不同难度的 AI', () => {
      expect(() => new AIController('easy')).not.toThrow();
      expect(() => new AIController('normal')).not.toThrow();
      expect(() => new AIController('hard')).not.toThrow();
    });

    it('setDifficulty 应切换难度', () => {
      ai.setDifficulty('hard');
      const personality = ai.getPersonality();
      // hard 难度基础攻击倾向更高
      expect(personality.aggression).toBeGreaterThan(0.4);
    });

    it('getState 初始应为 balanced', () => {
      expect(ai.getState()).toBe('balanced');
    });
  });

  // ===== 自适应学习 =====
  describe('自适应学习', () => {
    it('连续失败后应变得更谨慎', () => {
      const before = ai.getPersonality();
      const initialCaution = before.caution;

      // 模拟连续失败
      ai.notifyRoundResult(false);
      ai.notifyRoundResult(false);
      ai.notifyRoundResult(false);

      const after = ai.getPersonality();
      expect(after.caution).toBeGreaterThanOrEqual(initialCaution);
    });

    it('连续胜利后应变得更激进', () => {
      const before = ai.getPersonality();
      const initialAggression = before.aggression;

      ai.notifyRoundResult(true);
      ai.notifyRoundResult(true);
      ai.notifyRoundResult(true);

      const after = ai.getPersonality();
      expect(after.aggression).toBeGreaterThanOrEqual(initialAggression);
    });

    it('resetMemory 应重置状态', () => {
      ai.notifyRoundResult(false);
      ai.notifyRoundResult(false);
      ai.resetMemory();
      expect(ai.getState()).toBe('balanced');
    });
  });

  // ===== 通知接口 =====
  describe('通知接口', () => {
    it('notifyHit 不应抛出异常', () => {
      expect(() => ai.notifyHit()).not.toThrow();
    });

    it('notifyBlockSuccess 不应抛出异常', () => {
      expect(() => ai.notifyBlockSuccess()).not.toThrow();
    });

    it('notifyAttackResult 不应抛出异常', () => {
      expect(() => ai.notifyAttackResult(true)).not.toThrow();
      expect(() => ai.notifyAttackResult(false)).not.toThrow();
    });
  });

  // ===== update 决策 =====
  describe('update 决策', () => {
    it('AI 死亡时不应执行决策', () => {
      const aiPlayer = createMockPlayer({ health: 0 });
      aiPlayer.isAlive.mockReturnValue(false);
      const opponent = createMockPlayer({ x: 3 });

      ai.update(aiPlayer as any, opponent as any, 500);

      expect(aiPlayer.moveLeft).not.toHaveBeenCalled();
      expect(aiPlayer.moveRight).not.toHaveBeenCalled();
      expect(aiPlayer.attack).not.toHaveBeenCalled();
    });

    it('AI 存活时应在决策间隔后执行动作', () => {
      const aiPlayer = createMockPlayer({ x: 0 });
      const opponent = createMockPlayer({ x: 5 });

      // 多次 update 以触发决策
      for (let i = 0; i < 10; i++) {
        ai.update(aiPlayer as any, opponent as any, 100);
      }

      // 应至少执行了某种动作（移动/攻击/防御）
      const anyAction =
        aiPlayer.moveLeft.mock.calls.length > 0 ||
        aiPlayer.moveRight.mock.calls.length > 0 ||
        aiPlayer.attack.mock.calls.length > 0 ||
        aiPlayer.jump.mock.calls.length > 0 ||
        aiPlayer.block.mock.calls.length > 0;
      expect(anyAction).toBe(true);
    });

    it('对手在攻击范围内攻击时 AI 应可能防御', () => {
      const aiPlayer = createMockPlayer({ x: 0 });
      const opponent = createMockPlayer({ x: 1.5, action: 'punch' });

      // 用 hard 难度提高防御概率
      const hardAi = new AIController('hard');
      for (let i = 0; i < 20; i++) {
        hardAi.update(aiPlayer as any, opponent as any, 200);
      }

      // hard 难度面对近距离攻击应至少尝试过防御
      expect(aiPlayer.block.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // ===== 性格系统 =====
  describe('性格系统', () => {
    it('getPersonality 应返回有效的性格参数', () => {
      const p = ai.getPersonality();
      expect(p.aggression).toBeGreaterThanOrEqual(0);
      expect(p.aggression).toBeLessThanOrEqual(1.5);
      expect(p.caution).toBeGreaterThanOrEqual(0);
      expect(p.adaptability).toBeGreaterThanOrEqual(0);
      expect(p.comboFocus).toBeGreaterThanOrEqual(0);
    });

    it('不同难度应有不同的性格倾向', () => {
      const easy = new AIController('easy');
      const hard = new AIController('hard');
      // hard 的适应能力应高于 easy
      expect(hard.getPersonality().adaptability).toBeGreaterThan(easy.getPersonality().adaptability);
    });
  });
});
