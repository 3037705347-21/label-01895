import * as THREE from 'three';
import { PlayerAction } from '../config/constants';

/**
 * 火柴人动画系统 - 程序化骨骼动画
 *
 * 核心原则：每帧先 resetPose 恢复所有部件到初始位置/旋转，
 * 然后在此基础上叠加当前动作的偏移量。
 *
 * 重要：所有位移偏移使用模型本地坐标系（+z = 模型正前方），
 * 不使用 facing 参数来决定位移方向，因为 group.rotation.y 已经处理了朝向。
 */
export class AnimationSystem {
  private time = 0;

  update(delta: number): void {
    this.time += delta;
  }

  applyAnimation(model: THREE.Group, action: PlayerAction, facing: number, animProgress: number): void {
    this.resetPose(model);

    switch (action) {
      case 'idle':   this.applyIdle(model); break;
      case 'walk':   this.applyWalk(model); break;
      case 'jump':   this.applyJump(model); break;
      case 'punch':  this.applyPunch(model, animProgress); break;
      case 'kick':   this.applyKick(model, animProgress); break;
      case 'special': this.applySpecial(model, animProgress); break;
      case 'block':  this.applyBlock(model); break;
      case 'hit':    this.applyHit(model, animProgress); break;
      case 'ko':     this.applyKO(model, animProgress); break;
    }
  }

  private resetPose(model: THREE.Group): void {
    model.children.forEach(child => {
      const initPos = child.userData.initPos as THREE.Vector3 | undefined;
      const initRot = child.userData.initRot as THREE.Euler | undefined;
      if (initPos) child.position.copy(initPos);
      if (initRot) child.rotation.copy(initRot);
    });
  }

  private get(model: THREE.Group, name: string): THREE.Object3D | undefined {
    return model.children.find(c => c.name === name);
  }

  // ===== 动画 =====
  // 所有 position 偏移使用本地坐标：+z = 正前方（模型面朝的方向）
  // group.rotation.y 由 Player.update 控制朝向，动画不需要关心 facing

  private applyIdle(model: THREE.Group): void {
    const b = Math.sin(this.time * 2) * 0.02;
    const head = this.get(model, 'head');
    if (head) head.position.y += b;
    const body = this.get(model, 'body');
    if (body) body.position.y += b * 0.5;

    const swing = Math.sin(this.time * 1.5) * 0.05;
    const la = this.get(model, 'leftUpperArm');
    if (la) la.rotation.z = swing;
    const ra = this.get(model, 'rightUpperArm');
    if (ra) ra.rotation.z = -swing;
  }

  private applyWalk(model: THREE.Group): void {
    const c1 = Math.sin(this.time * 8);
    const c2 = Math.cos(this.time * 8);

    const lt = this.get(model, 'leftThigh');
    if (lt) lt.rotation.x = c1 * 0.3;
    const rt = this.get(model, 'rightThigh');
    if (rt) rt.rotation.x = -c1 * 0.3;
    const ls = this.get(model, 'leftShin');
    if (ls) ls.rotation.x = c2 * 0.15;
    const rs = this.get(model, 'rightShin');
    if (rs) rs.rotation.x = -c2 * 0.15;

    const la = this.get(model, 'leftUpperArm');
    if (la) la.rotation.x = -c1 * 0.25;
    const ra = this.get(model, 'rightUpperArm');
    if (ra) ra.rotation.x = c1 * 0.25;

    const body = this.get(model, 'body');
    if (body) body.rotation.z = c1 * 0.03;
  }

  private applyJump(model: THREE.Group): void {
    const lt = this.get(model, 'leftThigh');
    if (lt) lt.rotation.x = -0.3;
    const rt = this.get(model, 'rightThigh');
    if (rt) rt.rotation.x = -0.3;
    const la = this.get(model, 'leftUpperArm');
    if (la) la.rotation.z = -0.5;
    const ra = this.get(model, 'rightUpperArm');
    if (ra) ra.rotation.z = 0.5;
  }

  private applyPunch(model: THREE.Group, progress: number): void {
    const t = progress < 0.4 ? progress / 0.4 : 1 - (progress - 0.4) / 0.6;

    const ra = this.get(model, 'rightUpperArm');
    if (ra) {
      ra.rotation.x = -t * 1.2;
      ra.position.z += t * 0.4;
    }
    const rf = this.get(model, 'rightForearm');
    if (rf) {
      rf.rotation.x = -t * 0.8;
      rf.position.z += t * 0.5;
    }
    const rFist = this.get(model, 'rightFist');
    if (rFist) rFist.position.z += t * 0.6;

    const body = this.get(model, 'body');
    if (body) body.rotation.x = -t * 0.15;
  }

  private applyKick(model: THREE.Group, progress: number): void {
    const t = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;

    const rt = this.get(model, 'rightThigh');
    if (rt) {
      rt.rotation.x = -t * 1.4;
      rt.position.z += t * 0.3;
    }
    const rs = this.get(model, 'rightShin');
    if (rs) {
      rs.rotation.x = -t * 0.6;
      rs.position.z += t * 0.5;
    }
    const rf = this.get(model, 'rightFoot');
    if (rf) rf.position.z += t * 0.6;

    const body = this.get(model, 'body');
    if (body) body.rotation.x = t * 0.2;

    const la = this.get(model, 'leftUpperArm');
    if (la) la.rotation.z = -t * 0.5;
  }

  private applySpecial(model: THREE.Group, progress: number): void {
    const t = progress < 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;

    const la = this.get(model, 'leftUpperArm');
    if (la) {
      la.rotation.x = -t * 1.3;
      la.position.z += t * 0.5;
    }
    const ra = this.get(model, 'rightUpperArm');
    if (ra) {
      ra.rotation.x = -t * 1.3;
      ra.position.z += t * 0.5;
    }
    const lf = this.get(model, 'leftForearm');
    if (lf) lf.position.z += t * 0.6;
    const rf = this.get(model, 'rightForearm');
    if (rf) rf.position.z += t * 0.6;

    const body = this.get(model, 'body');
    if (body) body.rotation.x = -t * 0.3;

    const lt = this.get(model, 'leftThigh');
    if (lt) lt.rotation.x = t * 0.4;
  }

  private applyBlock(model: THREE.Group): void {
    const la = this.get(model, 'leftUpperArm');
    if (la) { la.rotation.x = -0.8; la.rotation.z = 0.4; }
    const ra = this.get(model, 'rightUpperArm');
    if (ra) { ra.rotation.x = -0.8; ra.rotation.z = -0.4; }
    const lf = this.get(model, 'leftForearm');
    if (lf) { lf.rotation.x = -0.6; lf.rotation.z = 0.3; }
    const rf = this.get(model, 'rightForearm');
    if (rf) { rf.rotation.x = -0.6; rf.rotation.z = -0.3; }

    const body = this.get(model, 'body');
    if (body) body.position.y += -0.05;
    const head = this.get(model, 'head');
    if (head) head.position.y += -0.05;
  }

  private applyHit(model: THREE.Group, progress: number): void {
    const t = 1 - progress;
    const body = this.get(model, 'body');
    if (body) body.rotation.x = t * 0.3;
    const head = this.get(model, 'head');
    if (head) head.rotation.x = t * 0.2;

    // 后仰：本地 -z 方向（向后退）
    model.children.forEach(child => {
      if (child.name) {
        child.position.z += -t * 0.1;
      }
    });
  }

  private applyKO(model: THREE.Group, progress: number): void {
    const t = Math.min(progress * 2, 1);
    // 向后倒地：整体绕 x 轴旋转 + 下沉
    model.children.forEach(child => {
      if (child.name) {
        child.rotation.x += t * (Math.PI / 3);
        child.position.y += -t * 0.6;
        child.position.z += -t * 0.3;
      }
    });
  }
}
