import * as THREE from 'three';
import type { QualityLevel } from '../config/constants';

/**
 * 3D场景管理器 - 负责场景、相机、渲染器、灯光
 * 包含 WebGL 上下文丢失恢复和渲染错误处理
 * 支持帧率自适应：根据当前画质等级调节阴影、抗锯齿与像素比
 */
export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private _contextLost = false;
  private _onContextRestored?: () => void;
  /** 主方向光（用于动态调整阴影贴图分辨率） */
  private dirLight!: THREE.DirectionalLight;
  private _qualityLevel: QualityLevel = 'high';

  /** 是否处于 WebGL 上下文丢失状态 */
  get isContextLost(): boolean { return this._contextLost; }

  /** 设置上下文恢复回调 */
  set onContextRestored(cb: (() => void) | undefined) { this._onContextRestored = cb; }

  constructor(container: HTMLElement) {
    this.container = container;

    // 场景 — 深蓝灰色调，无紫色
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e17);
    this.scene.fog = new THREE.Fog(0x0b0e17, 15, 30);

    // 相机
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1.2, 0);

    // 渲染器（画质由 setQualityLevel 统一设置）
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // WebGL 上下文丢失/恢复处理
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredHandler);

    this.setupLights();
    this.setupArena();
    this.applyQualityLevel('high');

    window.addEventListener('resize', this.onResize);
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this._contextLost = true;
    console.warn('[SceneManager] WebGL 上下文丢失，等待恢复...');
  };

  private onContextRestoredHandler = (): void => {
    this._contextLost = false;
    console.info('[SceneManager] WebGL 上下文已恢复');
    // 重新设置渲染器参数
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._onContextRestored?.();
  };

  private setupLights(): void {
    // 环境光 — 冷蓝灰调
    const ambient = new THREE.AmbientLight(0x3a4560, 0.6);
    this.scene.add(ambient);

    // 主方向光（保存引用以便帧率自适应时调整阴影分辨率）
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 30;
    this.dirLight.shadow.camera.left = -10;
    this.dirLight.shadow.camera.right = 10;
    this.dirLight.shadow.camera.top = 10;
    this.dirLight.shadow.camera.bottom = -5;
    this.applyShadowMapSize(2048);
    this.scene.add(this.dirLight);

    // 红色点光 (P1侧)
    const redLight = new THREE.PointLight(0xe63946, 0.5, 15);
    redLight.position.set(-5, 3, 2);
    this.scene.add(redLight);

    // 蓝色点光 (P2侧)
    const blueLight = new THREE.PointLight(0x457b9d, 0.5, 15);
    blueLight.position.set(5, 3, 2);
    this.scene.add(blueLight);

    // 背光 — 冷蓝调
    const backLight = new THREE.DirectionalLight(0x4a6080, 0.3);
    backLight.position.set(0, 5, -5);
    this.scene.add(backLight);
  }

  private setupArena(): void {
    // 地面
    const floorGeo = new THREE.PlaneGeometry(24, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x151b28,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 格斗场边界线
    const ringGeo = new THREE.RingGeometry(0.02, 0.04, 4);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x252d3d, side: THREE.DoubleSide });

    // 画格斗场线条
    for (let i = -8; i <= 8; i += 2) {
      const lineGeo = new THREE.PlaneGeometry(0.02, 14);
      const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({
        color: 0x1c2435,
        transparent: true,
        opacity: 0.3,
      }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(i, 0.001, 0);
      this.scene.add(line);
    }

    // 中心线
    const centerLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 14),
      new THREE.MeshBasicMaterial({ color: 0xe63946, transparent: true, opacity: 0.3 })
    );
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.002;
    this.scene.add(centerLine);

    // 边界墙 (透明发光)
    const wallGeo = new THREE.PlaneGeometry(0.05, 4);
    const wallMatLeft = new THREE.MeshBasicMaterial({
      color: 0xe63946,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const wallMatRight = new THREE.MeshBasicMaterial({
      color: 0x457b9d,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    const leftWall = new THREE.Mesh(wallGeo, wallMatLeft);
    leftWall.position.set(-8.5, 2, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMatRight);
    rightWall.position.set(8.5, 2, 0);
    this.scene.add(rightWall);

    // 地面网格装饰
    const gridHelper = new THREE.GridHelper(24, 24, 0x252d3d, 0x151b28);
    gridHelper.position.y = 0.001;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /** 根据画质等级设置阴影贴图分辨率（下一帧渲染时会使用新尺寸） */
  private applyShadowMapSize(size: number): void {
    const map = this.dirLight.shadow.map;
    if (map) map.dispose();
    this.dirLight.shadow.mapSize.width = size;
    this.dirLight.shadow.mapSize.height = size;
    (this.dirLight.shadow as any).map = null;
  }

  /** 应用画质等级：像素比、阴影分辨率（抗锯齿在创建时已固定） */
  private applyQualityLevel(level: QualityLevel): void {
    this._qualityLevel = level;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (level === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.applyShadowMapSize(2048);
    } else if (level === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.applyShadowMapSize(1024);
    } else {
      this.renderer.setPixelRatio(1);
      this.applyShadowMapSize(512);
    }
    this.renderer.setSize(w, h);
  }

  /** 设置画质等级（帧率自适应时调用） */
  setQualityLevel(level: QualityLevel): void {
    if (level === this._qualityLevel) return;
    this.applyQualityLevel(level);
  }

  get qualityLevel(): QualityLevel {
    return this._qualityLevel;
  }

  /**
   * 根据相机视锥计算地面 (y=0) 上的可见 X 半宽。
   * 留 0.5 的安全边距，确保角色模型不会被裁到画面外。
   */
  getVisibleBoundaryX(): number {
    const cam = this.camera;
    // 相机到地面的 Z 距离（相机看向 z=0 附近，角色在 z=0）
    const dist = cam.position.z;
    // 垂直半角
    const vFov = THREE.MathUtils.degToRad(cam.fov / 2);
    // 水平半角
    const hFov = Math.atan(Math.tan(vFov) * cam.aspect);
    // 地面上可见的水平半宽
    const halfWidth = Math.tan(hFov) * dist;
    // 留安全边距，防止角色模型边缘超出
    return Math.max(halfWidth - 0.5, 2);
  }

  render(): void {
    if (this._contextLost) return; // 上下文丢失时跳过渲染
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[SceneManager] 渲染错误:', err);
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredHandler);
    this.renderer.dispose();
  }
}
