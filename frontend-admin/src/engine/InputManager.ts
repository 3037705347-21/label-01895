/**
 * 键盘输入管理器
 */
export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysDown.add(e.code);
    e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  /** 当前是否按住 */
  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** 本帧是否刚按下 */
  justPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  /** 每帧结束后清除 justPressed */
  clearFrame(): void {
    this.keysJustPressed.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
