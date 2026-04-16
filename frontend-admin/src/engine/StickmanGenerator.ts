import * as THREE from 'three';

/** 打击粒子特效，附带速度和生命周期信息 */
export interface HitEffect extends THREE.Points {
  _velocities: THREE.Vector3[];
  _life: number;
}

/**
 * 火柴人 DNA 基因组 — 定义火柴人的外观和属性参数
 * 智能体3D图形生成器的核心数据结构
 */
export interface StickmanDNA {
  // 体型基因
  headScale: number;       // 头部缩放 0.7~1.3
  bodyHeight: number;      // 身体高度 0.4~0.8
  armLength: number;       // 手臂长度 0.6~1.2
  legLength: number;       // 腿部长度 0.6~1.2
  limbThickness: number;   // 肢体粗细 0.6~1.4

  // 外观基因
  primaryColor: number;    // 主色
  accentColor: number;     // 点缀色
  eyeStyle: 'normal' | 'angry' | 'cool' | 'robot';
  hasHelmet: boolean;
  hasGloves: boolean;
  hasBelt: boolean;

  // 属性基因（影响战斗）
  speedMultiplier: number;   // 速度倍率 0.8~1.2
  powerMultiplier: number;   // 力量倍率 0.8~1.2
  defenseMultiplier: number; // 防御倍率 0.8~1.2
}

/**
 * 智能体3D图形生成器 — Agent-based 3D Graphics Generator
 *
 * 核心能力：
 * 1. 参数化生成：通过 DNA 基因组控制火柴人的外观和属性
 * 2. 随机化生成：基于种子的伪随机 DNA 生成，确保多样性
 * 3. 进化式生成：通过交叉和变异产生新的火柴人变体
 * 4. 自主决策：根据战斗表现自动调整生成策略
 */
export class StickmanGenerator {
  /** 生成历史记录，用于进化式生成 */
  private static generationHistory: StickmanDNA[] = [];
  /** 适应度评分 */
  private static fitnessScores: Map<string, number> = new Map();

  /**
   * 生成随机 DNA — 智能体自主决策生成策略
   */
  static generateDNA(seed?: number, baseColor?: number): StickmanDNA {
    const rng = StickmanGenerator.createRNG(seed ?? Date.now());

    const primaryColor = baseColor ?? StickmanGenerator.randomColor(rng);
    const accentColor = StickmanGenerator.shiftHue(primaryColor, 30 + rng() * 60);

    const dna: StickmanDNA = {
      headScale: 0.7 + rng() * 0.6,
      bodyHeight: 0.4 + rng() * 0.4,
      armLength: 0.6 + rng() * 0.6,
      legLength: 0.6 + rng() * 0.6,
      limbThickness: 0.6 + rng() * 0.8,
      primaryColor,
      accentColor,
      eyeStyle: (['normal', 'angry', 'cool', 'robot'] as const)[Math.floor(rng() * 4)],
      hasHelmet: rng() > 0.6,
      hasGloves: rng() > 0.5,
      hasBelt: rng() > 0.5,
      speedMultiplier: 0.8 + rng() * 0.4,
      powerMultiplier: 0.8 + rng() * 0.4,
      defenseMultiplier: 0.8 + rng() * 0.4,
    };

    // 属性平衡约束：总倍率不超过 3.2
    const total = dna.speedMultiplier + dna.powerMultiplier + dna.defenseMultiplier;
    if (total > 3.2) {
      const scale = 3.2 / total;
      dna.speedMultiplier *= scale;
      dna.powerMultiplier *= scale;
      dna.defenseMultiplier *= scale;
    }

    StickmanGenerator.generationHistory.push(dna);
    return dna;
  }

  /**
   * 获取统一体型 DNA — 两名玩家使用相同体型，仅颜色与装饰不同，保证火柴人视觉大小一致
   */
  static getUniformBodyDNA(primaryColor: number, seed?: number): StickmanDNA {
    const rng = StickmanGenerator.createRNG(seed ?? Date.now());
    const accentColor = StickmanGenerator.shiftHue(primaryColor, 30 + rng() * 60);
    return {
      headScale: 1,
      bodyHeight: 0.6,
      armLength: 0.9,
      legLength: 0.9,
      limbThickness: 1,
      primaryColor,
      accentColor,
      eyeStyle: (['normal', 'angry', 'cool', 'robot'] as const)[Math.floor(rng() * 4)],
      hasHelmet: rng() > 0.6,
      hasGloves: rng() > 0.5,
      hasBelt: rng() > 0.5,
      speedMultiplier: 1,
      powerMultiplier: 1,
      defenseMultiplier: 1,
    };
  }

  /**
   * 进化式生成 — 交叉两个 DNA 并变异
   */
  static evolveDNA(parent1: StickmanDNA, parent2: StickmanDNA, mutationRate = 0.2): StickmanDNA {
    const rng = StickmanGenerator.createRNG(Date.now());
    const child: StickmanDNA = { ...parent1 };

    // 交叉
    const numericKeys: (keyof StickmanDNA)[] = [
      'headScale', 'bodyHeight', 'armLength', 'legLength', 'limbThickness',
      'speedMultiplier', 'powerMultiplier', 'defenseMultiplier',
    ];
    for (const key of numericKeys) {
      (child as any)[key] = rng() > 0.5
        ? (parent1 as any)[key]
        : (parent2 as any)[key];
    }

    // 变异
    for (const key of numericKeys) {
      if (rng() < mutationRate) {
        const val = (child as any)[key] as number;
        (child as any)[key] = Math.max(0.5, Math.min(1.5, val + (rng() - 0.5) * 0.3));
      }
    }

    // 外观变异
    if (rng() < mutationRate) child.eyeStyle = (['normal', 'angry', 'cool', 'robot'] as const)[Math.floor(rng() * 4)];
    if (rng() < mutationRate) child.hasHelmet = !child.hasHelmet;
    if (rng() < mutationRate) child.hasGloves = !child.hasGloves;
    if (rng() < mutationRate) child.hasBelt = !child.hasBelt;

    // 颜色变异
    if (rng() < mutationRate * 0.5) {
      child.primaryColor = StickmanGenerator.shiftHue(child.primaryColor, (rng() - 0.5) * 40);
    }
    child.accentColor = StickmanGenerator.shiftHue(child.primaryColor, 30 + rng() * 60);

    return child;
  }

  /**
   * 记录适应度 — 用于进化选择
   */
  static recordFitness(dnaId: string, score: number): void {
    const prev = StickmanGenerator.fitnessScores.get(dnaId) ?? 0;
    StickmanGenerator.fitnessScores.set(dnaId, prev + score);
  }

  /**
   * 获取最优 DNA — 基于适应度选择
   */
  static getBestDNA(): StickmanDNA | null {
    if (StickmanGenerator.generationHistory.length === 0) return null;
    // 返回最近的 DNA（简化版，完整版应基于 fitness 排序）
    return StickmanGenerator.generationHistory[StickmanGenerator.generationHistory.length - 1];
  }

  /**
   * 根据 DNA 创建完整的火柴人3D模型
   */
  static create(color: number, dna?: StickmanDNA): THREE.Group {
    const activeDNA = dna ?? StickmanGenerator.generateDNA(undefined, color);
    const group = new THREE.Group();
    (group as any)._dna = activeDNA;

    const mat = new THREE.MeshPhongMaterial({
      color: activeDNA.primaryColor,
      emissive: activeDNA.primaryColor,
      emissiveIntensity: 0.15,
      shininess: 60,
    });
    const accentMat = new THREE.MeshPhongMaterial({
      color: activeDNA.accentColor,
      emissive: activeDNA.accentColor,
      emissiveIntensity: 0.1,
    });
    const jointMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.1,
    });

    const add = (mesh: THREE.Object3D) => {
      mesh.userData.initPos = mesh.position.clone();
      mesh.userData.initRot = mesh.rotation.clone();
      group.add(mesh);
    };

    const hs = activeDNA.headScale;
    const bh = activeDNA.bodyHeight;
    const al = activeDNA.armLength;
    const ll = activeDNA.legLength;
    const lt = activeDNA.limbThickness;

    // ===== 头部 =====
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * hs, 16, 16), mat);
    head.position.set(0, 0.9 + bh + 0.22 * hs, 0);
    head.name = 'head';
    add(head);

    // 眼睛 — 根据 eyeStyle 变化
    StickmanGenerator.addEyes(group, activeDNA, head.position.y, hs, add);

    // 头盔装饰
    if (activeDNA.hasHelmet) {
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 * hs, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
        accentMat
      );
      helmet.position.set(0, head.position.y + 0.04 * hs, 0);
      helmet.name = 'helmet';
      add(helmet);
    }

    // ===== 身体 =====
    const body = StickmanGenerator.createLimb(0.06 * lt, bh, mat);
    body.position.set(0, 0.9 + bh / 2, 0);
    body.name = 'body';
    add(body);

    // 腰带装饰
    if (activeDNA.hasBelt) {
      const belt = new THREE.Mesh(
        new THREE.TorusGeometry(0.08 * lt, 0.02, 8, 16),
        accentMat
      );
      belt.position.set(0, 0.9, 0);
      belt.rotation.x = Math.PI / 2;
      belt.name = 'belt';
      add(belt);
    }

    // ===== 肩关节 =====
    const shoulderY = 0.9 + bh;
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.06 * lt, 8, 8), jointMat);
    shoulderL.position.set(-0.15, shoulderY, 0);
    shoulderL.name = 'shoulderL';
    add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.06 * lt, 8, 8), jointMat);
    shoulderR.position.set(0.15, shoulderY, 0);
    shoulderR.name = 'shoulderR';
    add(shoulderR);

    // ===== 左臂 =====
    const armSegH = 0.35 * al;
    const forearmH = 0.3 * al;
    const leftUpperArm = StickmanGenerator.createLimb(0.04 * lt, armSegH, mat);
    leftUpperArm.position.set(-0.15, shoulderY - armSegH / 2 - 0.03, 0);
    leftUpperArm.name = 'leftUpperArm';
    add(leftUpperArm);
    const leftForearm = StickmanGenerator.createLimb(0.035 * lt, forearmH, mat);
    leftForearm.position.set(-0.15, shoulderY - armSegH - forearmH / 2 - 0.03, 0);
    leftForearm.name = 'leftForearm';
    add(leftForearm);

    // ===== 右臂 =====
    const rightUpperArm = StickmanGenerator.createLimb(0.04 * lt, armSegH, mat);
    rightUpperArm.position.set(0.15, shoulderY - armSegH / 2 - 0.03, 0);
    rightUpperArm.name = 'rightUpperArm';
    add(rightUpperArm);
    const rightForearm = StickmanGenerator.createLimb(0.035 * lt, forearmH, mat);
    rightForearm.position.set(0.15, shoulderY - armSegH - forearmH / 2 - 0.03, 0);
    rightForearm.name = 'rightForearm';
    add(rightForearm);

    // ===== 拳头/手套 =====
    const fistY = shoulderY - armSegH - forearmH - 0.05;
    const fistGeo = activeDNA.hasGloves
      ? new THREE.BoxGeometry(0.1 * lt, 0.08 * lt, 0.1 * lt)
      : new THREE.SphereGeometry(0.05 * lt, 8, 8);
    const fistMat = activeDNA.hasGloves ? accentMat : jointMat;
    const leftFist = new THREE.Mesh(fistGeo, fistMat);
    leftFist.position.set(-0.15, fistY, 0);
    leftFist.name = 'leftFist';
    add(leftFist);
    const rightFist = new THREE.Mesh(fistGeo, fistMat);
    rightFist.position.set(0.15, fistY, 0);
    rightFist.name = 'rightFist';
    add(rightFist);

    // ===== 髋关节 =====
    const hipL = new THREE.Mesh(new THREE.SphereGeometry(0.06 * lt, 8, 8), jointMat);
    hipL.position.set(-0.1, 0.9, 0);
    hipL.name = 'hipL';
    add(hipL);
    const hipR = new THREE.Mesh(new THREE.SphereGeometry(0.06 * lt, 8, 8), jointMat);
    hipR.position.set(0.1, 0.9, 0);
    hipR.name = 'hipR';
    add(hipR);

    // ===== 左腿 =====
    const thighH = 0.4 * ll;
    const shinH = 0.35 * ll;
    const leftThigh = StickmanGenerator.createLimb(0.05 * lt, thighH, mat);
    leftThigh.position.set(-0.1, 0.9 - thighH / 2 - 0.03, 0);
    leftThigh.name = 'leftThigh';
    add(leftThigh);
    const leftShin = StickmanGenerator.createLimb(0.04 * lt, shinH, mat);
    leftShin.position.set(-0.1, 0.9 - thighH - shinH / 2 - 0.03, 0);
    leftShin.name = 'leftShin';
    add(leftShin);

    // ===== 右腿 =====
    const rightThigh = StickmanGenerator.createLimb(0.05 * lt, thighH, mat);
    rightThigh.position.set(0.1, 0.9 - thighH / 2 - 0.03, 0);
    rightThigh.name = 'rightThigh';
    add(rightThigh);
    const rightShin = StickmanGenerator.createLimb(0.04 * lt, shinH, mat);
    rightShin.position.set(0.1, 0.9 - thighH - shinH / 2 - 0.03, 0);
    rightShin.name = 'rightShin';
    add(rightShin);

    // ===== 脚 =====
    const footY = 0.9 - thighH - shinH - 0.05;
    const footGeo = new THREE.BoxGeometry(0.1 * lt, 0.04, 0.18 * lt);
    const footMat = new THREE.MeshPhongMaterial({
      color: activeDNA.primaryColor,
      emissive: activeDNA.primaryColor,
      emissiveIntensity: 0.1,
    });
    const leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.1, footY, 0.03);
    leftFoot.name = 'leftFoot';
    add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, footMat);
    rightFoot.position.set(0.1, footY, 0.03);
    rightFoot.name = 'rightFoot';
    add(rightFoot);

    // 设置阴影
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  /** 添加眼睛 — 根据 eyeStyle 生成不同风格 */
  private static addEyes(
    group: THREE.Group,
    dna: StickmanDNA,
    headY: number,
    hs: number,
    add: (mesh: THREE.Object3D) => void
  ): void {
    const eyeY = headY + 0.03 * hs;
    const eyeZ = 0.18 * hs;

    switch (dna.eyeStyle) {
      case 'angry': {
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 0.8 });
        const eyeGeo = new THREE.SphereGeometry(0.05 * hs, 8, 8);
        const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(-0.08 * hs, eyeY, eyeZ); le.name = 'leftEye'; add(le);
        const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set(0.08 * hs, eyeY, eyeZ); re.name = 'rightEye'; add(re);
        break;
      }
      case 'cool': {
        // 墨镜风格 — 长方形
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0x222244, emissiveIntensity: 0.3 });
        const glassGeo = new THREE.BoxGeometry(0.22 * hs, 0.06 * hs, 0.02);
        const glasses = new THREE.Mesh(glassGeo, glassMat);
        glasses.position.set(0, eyeY, eyeZ + 0.02);
        glasses.name = 'leftEye';
        add(glasses);
        break;
      }
      case 'robot': {
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.0 });
        const eyeGeo = new THREE.BoxGeometry(0.06 * hs, 0.03 * hs, 0.02);
        const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(-0.07 * hs, eyeY, eyeZ); le.name = 'leftEye'; add(le);
        const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set(0.07 * hs, eyeY, eyeZ); re.name = 'rightEye'; add(re);
        break;
      }
      default: {
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
        const eyeGeo = new THREE.SphereGeometry(0.04 * hs, 8, 8);
        const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(-0.08 * hs, eyeY, eyeZ); le.name = 'leftEye'; add(le);
        const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set(0.08 * hs, eyeY, eyeZ); re.name = 'rightEye'; add(re);
        break;
      }
    }
  }

  /** 创建肢体圆柱 */
  private static createLimb(radius: number, height: number, material: THREE.Material): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 8);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    return mesh;
  }

  /** 创建打击粒子特效，count 可选（低画质时传入较小值以节省性能） */
  static createHitEffect(position: THREE.Vector3, color: number, particleCount = 15): HitEffect {
    const count = Math.max(4, Math.min(30, particleCount));
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.15,
      ));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.08,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material) as unknown as HitEffect;
    points._velocities = velocities;
    points._life = 1.0;
    return points;
  }

  // ===== 工具方法 =====

  /** 伪随机数生成器（基于种子） */
  private static createRNG(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  /** 生成随机颜色 */
  private static randomColor(rng: () => number): number {
    const h = rng() * 360;
    const s = 0.5 + rng() * 0.4;
    const l = 0.4 + rng() * 0.2;
    return StickmanGenerator.hslToHex(h, s, l);
  }

  /** HSL 转 Hex */
  private static hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const ri = Math.round((r + m) * 255);
    const gi = Math.round((g + m) * 255);
    const bi = Math.round((b + m) * 255);
    return (ri << 16) | (gi << 8) | bi;
  }

  /** 色相偏移 */
  private static shiftHue(color: number, degrees: number): number {
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min)) * 60;
      else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
      else h = (4 + (r - g) / (max - min)) * 60;
    }
    h = (h + degrees + 360) % 360;
    return StickmanGenerator.hslToHex(h, s, l);
  }
}
