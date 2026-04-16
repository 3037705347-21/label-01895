import { describe, it, expect } from 'vitest';
import {
  GAME_CONFIG,
  PERFORMANCE_CONFIG,
  P1_KEYS,
  P2_KEYS,
} from '../constants';

describe('GAME_CONFIG', () => {
  it('MAX_HEALTH 应为正数', () => {
    expect(GAME_CONFIG.MAX_HEALTH).toBeGreaterThan(0);
  });

  it('伤害值应满足 拳 < 踢 < 必杀', () => {
    expect(GAME_CONFIG.PUNCH_DAMAGE).toBeLessThan(GAME_CONFIG.KICK_DAMAGE);
    expect(GAME_CONFIG.KICK_DAMAGE).toBeLessThan(GAME_CONFIG.SPECIAL_DAMAGE);
  });

  it('攻击范围应满足 拳 < 踢 < 必杀', () => {
    expect(GAME_CONFIG.PUNCH_RANGE).toBeLessThan(GAME_CONFIG.KICK_RANGE);
    expect(GAME_CONFIG.KICK_RANGE).toBeLessThan(GAME_CONFIG.SPECIAL_RANGE);
  });

  it('必杀冷却应大于普通攻击冷却', () => {
    expect(GAME_CONFIG.SPECIAL_COOLDOWN).toBeGreaterThan(GAME_CONFIG.ATTACK_COOLDOWN);
  });

  it('防御减伤应在 0~1 之间', () => {
    expect(GAME_CONFIG.BLOCK_REDUCTION).toBeGreaterThan(0);
    expect(GAME_CONFIG.BLOCK_REDUCTION).toBeLessThanOrEqual(1);
  });

  it('回合时间和回合数应为正整数', () => {
    expect(GAME_CONFIG.ROUND_TIME).toBeGreaterThan(0);
    expect(GAME_CONFIG.MAX_ROUNDS).toBeGreaterThan(0);
    expect(Number.isInteger(GAME_CONFIG.MAX_ROUNDS)).toBe(true);
  });

  it('连击窗口应为正数', () => {
    expect(GAME_CONFIG.COMBO_WINDOW).toBeGreaterThan(0);
  });

  it('重力应为正数', () => {
    expect(GAME_CONFIG.GRAVITY).toBeGreaterThan(0);
  });
});

describe('PERFORMANCE_CONFIG', () => {
  it('低帧率阈值应小于高帧率阈值', () => {
    expect(PERFORMANCE_CONFIG.FPS_LOW_THRESHOLD).toBeLessThan(PERFORMANCE_CONFIG.FPS_HIGH_THRESHOLD);
  });

  it('采样间隔应为正数', () => {
    expect(PERFORMANCE_CONFIG.FPS_SAMPLE_INTERVAL).toBeGreaterThan(0);
  });
});

describe('键位配置', () => {
  it('P1 和 P2 键位不应冲突', () => {
    const p1Values = Object.values(P1_KEYS);
    const p2Values = Object.values(P2_KEYS);
    for (const key of p1Values) {
      expect(p2Values).not.toContain(key);
    }
  });

  it('P1 应有完整的操作键位', () => {
    expect(P1_KEYS).toHaveProperty('LEFT');
    expect(P1_KEYS).toHaveProperty('RIGHT');
    expect(P1_KEYS).toHaveProperty('JUMP');
    expect(P1_KEYS).toHaveProperty('BLOCK');
    expect(P1_KEYS).toHaveProperty('PUNCH');
    expect(P1_KEYS).toHaveProperty('KICK');
    expect(P1_KEYS).toHaveProperty('SPECIAL');
  });

  it('P2 应有完整的操作键位', () => {
    expect(P2_KEYS).toHaveProperty('LEFT');
    expect(P2_KEYS).toHaveProperty('RIGHT');
    expect(P2_KEYS).toHaveProperty('JUMP');
    expect(P2_KEYS).toHaveProperty('BLOCK');
    expect(P2_KEYS).toHaveProperty('PUNCH');
    expect(P2_KEYS).toHaveProperty('KICK');
    expect(P2_KEYS).toHaveProperty('SPECIAL');
  });
});
