import * as THREE from 'three';
import { GAME_CONFIG, PlayerAction, AttackType } from '../config/constants';
import { StickmanGenerator, StickmanDNA } from './StickmanGenerator';
import { AnimationSystem } from './AnimationSystem';

export interface PlayerState {
  health: number;
  position: THREE.Vector3;
  velocityY: number;
  facing: number; // 1 = right, -1 = left
  action: PlayerAction;
  actionTime: number;
  isGrounded: boolean;
  isBlocking: boolean;
  lastAttackTime: number;
  lastSpecialTime: number;
  comboCount: number;
  maxCombo: number;
  lastComboTime: number;
  totalDamageDealt: number;
  wins: number;
}

/**
 * 玩家角色控制器
 */
export class Player {
  public model: THREE.Group;
  public state: PlayerState;
  public id: number;
  public dna: StickmanDNA | null;
  private animSystem: AnimationSystem;
  private animProgress = 0;

  constructor(id: number, color: number, startX: number, animSystem: AnimationSystem, dna?: StickmanDNA) {
    this.id = id;
    this.animSystem = animSystem;
    this.dna = dna ?? null;
    this.model = StickmanGenerator.create(color, dna);
    this.model.position.set(startX, 0, 0);

    this.state = {
      health: GAME_CONFIG.MAX_HEALTH,
      position: new THREE.Vector3(startX, 0, 0),
      velocityY: 0,
      facing: id === 1 ? 1 : -1,
      action: 'idle',
      actionTime: 0,
      isGrounded: true,
      isBlocking: false,
      lastAttackTime: 0,
      lastSpecialTime: 0,
      comboCount: 0,
      maxCombo: 0,
      lastComboTime: 0,
      totalDamageDealt: 0,
      wins: 0,
    };
  }

  reset(startX: number): void {
    this.state.health = GAME_CONFIG.MAX_HEALTH;
    this.state.position.set(startX, 0, 0);
    this.state.velocityY = 0;
    this.state.action = 'idle';
    this.state.actionTime = 0;
    this.state.isGrounded = true;
    this.state.isBlocking = false;
    this.state.comboCount = 0;
    this.state.maxCombo = 0;
    this.state.lastComboTime = 0;
    this.state.lastAttackTime = 0;
    this.state.lastSpecialTime = 0;
    this.animProgress = 0;

    // 恢复模型 group 位置和旋转
    this.model.position.set(startX, 0, 0);
    this.model.rotation.set(0, 0, 0);

    // 恢复所有子部件到初始位置
    this.model.children.forEach(child => {
      const initPos = child.userData.initPos as THREE.Vector3 | undefined;
      const initRot = child.userData.initRot as THREE.Euler | undefined;
      if (initPos) child.position.copy(initPos);
      if (initRot) child.rotation.copy(initRot);
    });
  }

  moveLeft(): void {
    if (!this.isAlive() || this.isActionLocked()) return;
    const speedMul = this.dna?.speedMultiplier ?? 1;
    this.state.position.x -= GAME_CONFIG.MOVE_SPEED * speedMul;
    this.state.position.x = Math.max(this.state.position.x, -GAME_CONFIG.ARENA_BOUNDARY);
    if (this.state.isGrounded) this.state.action = 'walk';
  }

  moveRight(): void {
    if (!this.isAlive() || this.isActionLocked()) return;
    const speedMul = this.dna?.speedMultiplier ?? 1;
    this.state.position.x += GAME_CONFIG.MOVE_SPEED * speedMul;
    this.state.position.x = Math.min(this.state.position.x, GAME_CONFIG.ARENA_BOUNDARY);
    if (this.state.isGrounded) this.state.action = 'walk';
  }

  jump(): void {
    if (!this.isAlive() || !this.state.isGrounded || this.isActionLocked()) return;
    this.state.velocityY = GAME_CONFIG.JUMP_FORCE;
    this.state.isGrounded = false;
    this.state.action = 'jump';
  }

  block(active: boolean): void {
    if (!this.isAlive()) return;
    if (this.isActionLocked() && this.state.action !== 'block') return;
    // 空中不能防御
    if (!this.state.isGrounded) {
      this.state.isBlocking = false;
      return;
    }
    this.state.isBlocking = active;
    if (active && this.state.isGrounded) {
      this.state.action = 'block';
    }
  }

  attack(type: AttackType): boolean {
    if (!this.isAlive()) return false;
    const now = Date.now();
    if (this.isActionLocked()) return false;

    if (type === 'special') {
      if (now - this.state.lastSpecialTime < GAME_CONFIG.SPECIAL_COOLDOWN) return false;
      this.state.lastSpecialTime = now;
    } else {
      if (now - this.state.lastAttackTime < GAME_CONFIG.ATTACK_COOLDOWN) return false;
    }

    this.state.lastAttackTime = now;
    this.state.action = type;
    this.state.actionTime = now;
    this.animProgress = 0;
    return true;
  }

  takeDamage(amount: number): number {
    let finalDamage = amount;
    if (this.state.isBlocking) {
      const defMul = this.dna?.defenseMultiplier ?? 1;
      finalDamage *= (1 - GAME_CONFIG.BLOCK_REDUCTION * Math.min(defMul, 1.3));
    }
    this.state.health = Math.max(0, this.state.health - finalDamage);

    if (!this.state.isBlocking) {
      this.state.action = 'hit';
      this.state.actionTime = Date.now();
      this.animProgress = 0;
    }

    return finalDamage;
  }

  getAttackRange(type: AttackType): number {
    switch (type) {
      case 'punch': return GAME_CONFIG.PUNCH_RANGE;
      case 'kick': return GAME_CONFIG.KICK_RANGE;
      case 'special': return GAME_CONFIG.SPECIAL_RANGE;
    }
  }

  getAttackDamage(type: AttackType): number {
    let base: number;
    switch (type) {
      case 'punch': base = GAME_CONFIG.PUNCH_DAMAGE; break;
      case 'kick': base = GAME_CONFIG.KICK_DAMAGE; break;
      case 'special': base = GAME_CONFIG.SPECIAL_DAMAGE; break;
    }
    // DNA 力量倍率
    const powerMul = this.dna?.powerMultiplier ?? 1;
    // 连击加成（上限5连击）
    const effectiveCombo = Math.min(this.state.comboCount, 5);
    const comboBonus = effectiveCombo * GAME_CONFIG.COMBO_BONUS_MULTIPLIER;
    return base * powerMul * (1 + comboBonus);
  }

  addCombo(): void {
    const now = Date.now();
    if (now - this.state.lastComboTime < GAME_CONFIG.COMBO_WINDOW) {
      this.state.comboCount++;
    } else {
      this.state.comboCount = 1;
    }
    this.state.lastComboTime = now;
  }

  update(delta: number): void {
    // 重力
    if (!this.state.isGrounded) {
      this.state.velocityY -= GAME_CONFIG.GRAVITY;
      this.state.position.y += this.state.velocityY;

      if (this.state.position.y <= GAME_CONFIG.GROUND_Y) {
        this.state.position.y = GAME_CONFIG.GROUND_Y;
        this.state.velocityY = 0;
        this.state.isGrounded = true;
        if (this.state.action === 'jump') {
          this.state.action = 'idle';
        }
      }
    }

    // 动作计时
    const now = Date.now();
    const actionDuration = this.getActionDuration();
    if (this.state.actionTime > 0 && this.isAttackAction()) {
      this.animProgress = Math.min((now - this.state.actionTime) / actionDuration, 1);
      if (this.animProgress >= 1) {
        this.state.action = 'idle';
        this.state.actionTime = 0;
        this.animProgress = 0;
      }
    } else if (this.state.action === 'hit') {
      this.animProgress = Math.min((now - this.state.actionTime) / 300, 1);
      if (this.animProgress >= 1) {
        this.state.action = 'idle';
        this.state.actionTime = 0;
        this.animProgress = 0;
      }
    } else if (this.state.action === 'ko') {
      // KO 动画持续播放，不自动回到 idle，由 reset() 恢复
      this.animProgress = Math.min((now - this.state.actionTime) / 800, 1);
    }

    // 如果没有移动输入且在地面上，回到idle
    if (this.state.isGrounded && this.state.action === 'walk') {
      // walk状态会在下一帧被重新设置或回到idle
    }

    // 应用动画（会先 resetPose 恢复所有部件）
    this.animSystem.applyAnimation(this.model, this.state.action, this.state.facing, this.animProgress);

    // 动画之后再设置 group 的世界位置和面向
    this.model.position.x = this.state.position.x;
    this.model.position.y = this.state.position.y;
    this.model.rotation.y = this.state.facing > 0 ? 0 : Math.PI;
  }

  isAlive(): boolean {
    return this.state.health > 0;
  }

  private isActionLocked(): boolean {
    return this.isAttackAction() || this.state.action === 'hit' || this.state.action === 'ko';
  }

  private isAttackAction(): boolean {
    return this.state.action === 'punch' || this.state.action === 'kick' || this.state.action === 'special';
  }

  private getActionDuration(): number {
    switch (this.state.action) {
      case 'punch': return 350;
      case 'kick': return 450;
      case 'special': return 600;
      default: return 300;
    }
  }
}
