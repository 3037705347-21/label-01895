import { describe, it, expect, beforeEach } from 'vitest';
import { StickmanGenerator, StickmanDNA } from '../StickmanGenerator';

describe('StickmanGenerator', () => {
  // ===== DNA 生成 =====
  describe('generateDNA', () => {
    it('应生成包含所有必要字段的 DNA', () => {
      const dna = StickmanGenerator.generateDNA(42);
      expect(dna).toHaveProperty('headScale');
      expect(dna).toHaveProperty('bodyHeight');
      expect(dna).toHaveProperty('armLength');
      expect(dna).toHaveProperty('legLength');
      expect(dna).toHaveProperty('limbThickness');
      expect(dna).toHaveProperty('eyeStyle');
      expect(dna).toHaveProperty('hasHelmet');
      expect(dna).toHaveProperty('hasGloves');
      expect(dna).toHaveProperty('hasBelt');
      expect(dna).toHaveProperty('speedMultiplier');
      expect(dna).toHaveProperty('powerMultiplier');
      expect(dna).toHaveProperty('defenseMultiplier');
      expect(dna).toHaveProperty('primaryColor');
      expect(dna).toHaveProperty('accentColor');
    });

    it('体型基因应在合理范围内', () => {
      for (let seed = 0; seed < 20; seed++) {
        const dna = StickmanGenerator.generateDNA(seed);
        expect(dna.headScale).toBeGreaterThanOrEqual(0.7);
        expect(dna.headScale).toBeLessThanOrEqual(1.3);
        expect(dna.bodyHeight).toBeGreaterThanOrEqual(0.4);
        expect(dna.bodyHeight).toBeLessThanOrEqual(0.8);
        expect(dna.armLength).toBeGreaterThanOrEqual(0.6);
        expect(dna.armLength).toBeLessThanOrEqual(1.2);
        expect(dna.legLength).toBeGreaterThanOrEqual(0.6);
        expect(dna.legLength).toBeLessThanOrEqual(1.2);
        expect(dna.limbThickness).toBeGreaterThanOrEqual(0.6);
        expect(dna.limbThickness).toBeLessThanOrEqual(1.4);
      }
    });

    it('属性倍率总和应 ≤ 3.2（平衡约束）', () => {
      for (let seed = 0; seed < 50; seed++) {
        const dna = StickmanGenerator.generateDNA(seed);
        const total = dna.speedMultiplier + dna.powerMultiplier + dna.defenseMultiplier;
        expect(total).toBeLessThanOrEqual(3.2 + 0.01); // 浮点容差
      }
    });

    it('相同种子应生成相同 DNA', () => {
      const dna1 = StickmanGenerator.generateDNA(12345);
      const dna2 = StickmanGenerator.generateDNA(12345);
      expect(dna1.headScale).toBe(dna2.headScale);
      expect(dna1.bodyHeight).toBe(dna2.bodyHeight);
      expect(dna1.speedMultiplier).toBe(dna2.speedMultiplier);
      expect(dna1.eyeStyle).toBe(dna2.eyeStyle);
    });

    it('不同种子应生成不同 DNA', () => {
      const dna1 = StickmanGenerator.generateDNA(1);
      const dna2 = StickmanGenerator.generateDNA(999);
      // 至少有一个体型属性不同
      const allSame =
        dna1.headScale === dna2.headScale &&
        dna1.bodyHeight === dna2.bodyHeight &&
        dna1.armLength === dna2.armLength;
      expect(allSame).toBe(false);
    });

    it('eyeStyle 应为有效枚举值', () => {
      const validStyles = ['normal', 'angry', 'cool', 'robot'];
      for (let seed = 0; seed < 30; seed++) {
        const dna = StickmanGenerator.generateDNA(seed);
        expect(validStyles).toContain(dna.eyeStyle);
      }
    });

    it('可指定 baseColor', () => {
      const dna = StickmanGenerator.generateDNA(42, 0xff0000);
      expect(dna.primaryColor).toBe(0xff0000);
    });
  });

  // ===== DNA 进化 =====
  describe('evolveDNA', () => {
    let parent1: StickmanDNA;
    let parent2: StickmanDNA;

    beforeEach(() => {
      parent1 = StickmanGenerator.generateDNA(100);
      parent2 = StickmanGenerator.generateDNA(200);
    });

    it('进化后的 DNA 应包含所有必要字段', () => {
      const child = StickmanGenerator.evolveDNA(parent1, parent2);
      expect(child).toHaveProperty('headScale');
      expect(child).toHaveProperty('speedMultiplier');
      expect(child).toHaveProperty('eyeStyle');
    });

    it('子代数值基因应来自父代之一或变异范围内', () => {
      // 多次进化，验证子代值在合理范围
      for (let i = 0; i < 20; i++) {
        const child = StickmanGenerator.evolveDNA(parent1, parent2, 0.2);
        // 变异后值应在 0.5~1.5 范围内（代码中的 clamp）
        expect(child.headScale).toBeGreaterThanOrEqual(0.5);
        expect(child.headScale).toBeLessThanOrEqual(1.5);
        expect(child.speedMultiplier).toBeGreaterThanOrEqual(0.5);
        expect(child.speedMultiplier).toBeLessThanOrEqual(1.5);
      }
    });

    it('变异率为 0 时子代应完全来自父代交叉', () => {
      const child = StickmanGenerator.evolveDNA(parent1, parent2, 0);
      const numericKeys: (keyof StickmanDNA)[] = [
        'headScale', 'bodyHeight', 'armLength', 'legLength', 'limbThickness',
        'speedMultiplier', 'powerMultiplier', 'defenseMultiplier',
      ];
      for (const key of numericKeys) {
        const val = child[key] as number;
        const p1Val = parent1[key] as number;
        const p2Val = parent2[key] as number;
        expect(val === p1Val || val === p2Val).toBe(true);
      }
    });
  });

  // ===== 适应度记录 =====
  describe('recordFitness', () => {
    it('应能记录适应度分数', () => {
      // recordFitness 不应抛出异常
      expect(() => {
        StickmanGenerator.recordFitness('test-dna-1', 0.85);
        StickmanGenerator.recordFitness('test-dna-2', 0.42);
      }).not.toThrow();
    });
  });
});
