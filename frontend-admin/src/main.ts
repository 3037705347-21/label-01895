import './styles/global.css';
import './styles/hud.css';
import './styles/menu.css';
import { Game } from './game/Game';

/**
 * 应用入口 — 包含全局错误处理
 */

// 全局未捕获错误处理
window.addEventListener('error', (event: ErrorEvent) => {
  console.error('[全局错误]', event.message, event.filename, event.lineno);
  showErrorOverlay(`运行时错误: ${event.message}`);
});

// 全局 Promise 未捕获拒绝处理
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('[未处理的 Promise 拒绝]', event.reason);
  showErrorOverlay(`异步错误: ${event.reason?.message ?? event.reason}`);
});

/** 显示错误遮罩 — 用户友好的错误提示 */
function showErrorOverlay(message: string): void {
  // 避免重复创建
  if (document.getElementById('error-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(11, 14, 23, 0.95); color: #edf2f4;
    font-family: 'Segoe UI', sans-serif; text-align: center; padding: 32px;
  `;
  overlay.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">出现了一些问题</div>
    <div style="font-size: 14px; color: #8d99ae; max-width: 480px; word-break: break-word; margin-bottom: 24px;">${message}</div>
    <button id="error-reload-btn" style="
      padding: 10px 24px; border: none; border-radius: 8px;
      background: #e63946; color: #fff; font-size: 14px; cursor: pointer;
    ">刷新页面</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('error-reload-btn')?.addEventListener('click', () => location.reload());
}

// 检测 WebGL 支持
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

// 启动应用
function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) {
    showErrorOverlay('找不到 #app 容器元素');
    return;
  }

  if (!checkWebGLSupport()) {
    showErrorOverlay('您的浏览器不支持 WebGL，无法运行 3D 游戏。请使用最新版 Chrome / Firefox / Edge。');
    return;
  }

  try {
    new Game(app);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[启动失败]', err);
    showErrorOverlay(`游戏启动失败: ${msg}`);
  }
}

bootstrap();
