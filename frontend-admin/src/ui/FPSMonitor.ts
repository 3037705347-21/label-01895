/**
 * FPS 帧率监控面板
 * 实时显示帧率、帧时间，用于性能分析
 */
export class FPSMonitor {
  private element: HTMLElement;
  private fpsText: HTMLElement;
  private frameTimeText: HTMLElement;
  private graphCanvas: HTMLCanvasElement;
  private graphCtx: CanvasRenderingContext2D;

  private frames = 0;
  private lastTime = performance.now();
  private frameStart = 0;
  private fpsHistory: number[] = [];
  private readonly maxHistory = 60;
  private visible = true;
  /** 当前 FPS（每 500ms 更新），供帧率自适应使用 */
  private currentFps = 60;
  /** 近期 FPS 采样，用于平滑判定 */
  private recentFpsSamples: number[] = [];
  private readonly maxSamples = 4;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'fps-monitor';
    this.element.innerHTML = `
      <div class="fps-value" id="fps-value">60 FPS</div>
      <div class="fps-frametime" id="fps-frametime">16.7ms</div>
      <canvas id="fps-graph" width="80" height="30"></canvas>
    `;
    document.getElementById('app')!.appendChild(this.element);

    this.fpsText = this.element.querySelector('#fps-value')!;
    this.frameTimeText = this.element.querySelector('#fps-frametime')!;
    this.graphCanvas = this.element.querySelector('#fps-graph')!;
    this.graphCtx = this.graphCanvas.getContext('2d')!;

    // 初始化历史
    for (let i = 0; i < this.maxHistory; i++) this.fpsHistory.push(60);

    // 注入样式
    this.injectStyles();
  }

  begin(): void {
    this.frameStart = performance.now();
  }

  end(): void {
    this.frames++;
    const now = performance.now();
    const frameTime = now - this.frameStart;

    if (now - this.lastTime >= 500) {
      const fps = Math.round(this.frames / ((now - this.lastTime) / 1000));
      this.frames = 0;
      this.lastTime = now;

      this.currentFps = fps;
      this.recentFpsSamples.push(fps);
      if (this.recentFpsSamples.length > this.maxSamples) this.recentFpsSamples.shift();

      this.fpsText.textContent = `${fps} FPS`;
      this.frameTimeText.textContent = `${frameTime.toFixed(1)}ms`;

      // 颜色指示
      if (fps >= 50) {
        this.fpsText.style.color = '#2a9d8f';
      } else if (fps >= 30) {
        this.fpsText.style.color = '#e9c46a';
      } else {
        this.fpsText.style.color = '#e63946';
      }

      // 更新图表
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.maxHistory) this.fpsHistory.shift();
      this.drawGraph();
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    this.element.style.display = this.visible ? '' : 'none';
  }

  /** 当前 FPS（约 500ms 更新一次），供帧率自适应使用 */
  getFPS(): number {
    return this.currentFps;
  }

  /** 平滑 FPS（近期采样均值），避免单帧波动触发频繁切换画质 */
  getSmoothedFPS(): number {
    if (this.recentFpsSamples.length === 0) return this.currentFps;
    const sum = this.recentFpsSamples.reduce((a, b) => a + b, 0);
    return sum / this.recentFpsSamples.length;
  }

  private drawGraph(): void {
    const ctx = this.graphCtx;
    const w = this.graphCanvas.width;
    const h = this.graphCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, h);

    // 60fps 参考线
    const y60 = h - (60 / 120) * h;
    ctx.strokeStyle = 'rgba(42, 157, 143, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, y60);
    ctx.lineTo(w, y60);
    ctx.stroke();

    // FPS 曲线
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.fpsHistory.length; i++) {
      const x = (i / this.maxHistory) * w;
      const y = h - (Math.min(this.fpsHistory[i], 120) / 120) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private injectStyles(): void {
    if (document.getElementById('fps-monitor-styles')) return;
    const style = document.createElement('style');
    style.id = 'fps-monitor-styles';
    style.textContent = `
      .fps-monitor {
        position: fixed;
        bottom: 8px;
        left: 8px;
        z-index: 10000;
        background: rgba(11, 14, 23, 0.85);
        border: 1px solid rgba(37, 45, 61, 0.6);
        border-radius: 6px;
        padding: 6px 10px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #8d99ae;
        pointer-events: none;
        user-select: none;
        min-width: 90px;
      }
      .fps-value {
        font-weight: 700;
        font-size: 13px;
        color: #2a9d8f;
      }
      .fps-frametime {
        font-size: 10px;
        color: #5a6478;
        margin-bottom: 2px;
      }
      #fps-graph {
        display: block;
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }
}
