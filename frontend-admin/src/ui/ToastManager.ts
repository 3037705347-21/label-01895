/**
 * Toast 通知系统
 */
export type ToastType = 'success' | 'error' | 'info';

export class ToastManager {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.getElementById('app')!.appendChild(this.container);
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);
  }
}
