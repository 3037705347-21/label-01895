import * as THREE from 'three';
import { StickmanGenerator, HitEffect } from './StickmanGenerator';
import { Player } from './Player';
import { AttackType } from '../config/constants';

/** 画质等级对应的打击粒子数量（帧率自适应时由 Game 设置） */
const HIT_PARTICLE_COUNT: Record<string, number> = { high: 15, medium: 10, low: 6 };

/**
 * 格斗系统 - 碰撞检测与伤害计算
 * 支持按画质等级调节打击粒子数量以配合帧率自适应
 */
export class CombatSystem {
  private hitEffects: HitEffect[] = [];
  private scene: THREE.Scene;
  private onHit?: (attacker: Player, defender: Player, damage: number, type: AttackType) => void;
  private hitParticleCount = 15;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** 设置画质等级，用于调节打击粒子数量（帧率自适应时调用） */
  setQualityLevel(level: 'high' | 'medium' | 'low'): void {
    this.hitParticleCount = HIT_PARTICLE_COUNT[level] ?? 15;
  }

  setOnHit(callback: (attacker: Player, defender: Player, damage: number, type: AttackType) => void): void {
    this.onHit = callback;
  }

  /**
   * 检测攻击碰撞
   */
  checkAttack(attacker: Player, defender: Player): void {
    // 死亡的玩家不能攻击，也不能被攻击
    if (!attacker.isAlive() || !defender.isAlive()) return;

    const action = attacker.state.action;
    if (action !== 'punch' && action !== 'kick' && action !== 'special') return;

    const now = Date.now();
    const elapsed = now - attacker.state.actionTime;

    // 只在攻击动画的中间帧判定
    const hitWindowStart = action === 'punch' ? 100 : action === 'kick' ? 120 : 200;
    const hitWindowEnd = hitWindowStart + 100;

    if (elapsed < hitWindowStart || elapsed > hitWindowEnd) return;

    // 距离检测
    const dist = Math.abs(attacker.state.position.x - defender.state.position.x);
    const range = attacker.getAttackRange(action);

    if (dist > range) return;

    // 方向检测 - 攻击者必须面向防御者
    const dirToDefender = defender.state.position.x - attacker.state.position.x;
    if (Math.sign(dirToDefender) !== attacker.state.facing && Math.abs(dirToDefender) > 0.3) return;

    // 先通知 Game 层检查是否允许本次命中（防重复判定）
    // 如果回调返回前已标记过，CombatSystem 不应扣血
    // 改为：先回调询问，再由回调决定是否扣血
    this.onHit?.(attacker, defender, 0, action);
  }

  /**
   * 执行实际伤害（由 Game 层确认后调用）
   */
  applyDamage(attacker: Player, defender: Player, type: AttackType): number {
    const baseDamage = attacker.getAttackDamage(type);
    const actualDamage = defender.takeDamage(baseDamage);

    // 连击
    attacker.addCombo();
    attacker.state.totalDamageDealt += actualDamage;

    // 特效（粒子数随画质等级变化）
    const hitPos = new THREE.Vector3(
      (attacker.state.position.x + defender.state.position.x) / 2,
      1.2 + Math.random() * 0.3,
      0
    );
    const effectColor = type === 'special' ? 0xf4a261 : attacker.id === 1 ? 0xe63946 : 0x457b9d;
    this.spawnHitEffect(hitPos, effectColor, this.hitParticleCount);

    return actualDamage;
  }

  private spawnHitEffect(position: THREE.Vector3, color: number, particleCount?: number): void {
    const effect = StickmanGenerator.createHitEffect(position, color, particleCount ?? this.hitParticleCount);
    this.scene.add(effect);
    this.hitEffects.push(effect);
  }

  /**
   * 更新特效
   */
  updateEffects(): void {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const effect = this.hitEffects[i];
      const velocities = effect._velocities;
      let life = effect._life;

      life -= 0.03;
      effect._life = life;

      const positions = effect.geometry.attributes.position;
      for (let j = 0; j < velocities.length; j++) {
        (positions.array as Float32Array)[j * 3] += velocities[j].x;
        (positions.array as Float32Array)[j * 3 + 1] += velocities[j].y;
        (positions.array as Float32Array)[j * 3 + 2] += velocities[j].z;
        velocities[j].y -= 0.002;
      }
      positions.needsUpdate = true;

      (effect.material as THREE.PointsMaterial).opacity = Math.max(0, life);

      if (life <= 0) {
        this.scene.remove(effect);
        effect.geometry.dispose();
        (effect.material as THREE.Material).dispose();
        this.hitEffects.splice(i, 1);
      }
    }
  }

  clearEffects(): void {
    this.hitEffects.forEach(e => {
      this.scene.remove(e);
      e.geometry.dispose();
      (e.material as THREE.Material).dispose();
    });
    this.hitEffects = [];
  }
}
