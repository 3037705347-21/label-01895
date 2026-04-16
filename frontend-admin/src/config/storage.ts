import { AIDifficulty, MatchRecord } from './constants';

export interface GameStats {
  totalWins: number;
  totalDamage: number;
  lastDifficulty: AIDifficulty;
  matchHistory: MatchRecord[];
}

const STORAGE_KEY = 'stickman_fighter_stats';

const DEFAULT_STATS: GameStats = {
  totalWins: 0,
  totalDamage: 0,
  lastDifficulty: 'normal',
  matchHistory: [],
};

export class LocalStorageManager {
  static getStats(): GameStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_STATS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
    }
    return { ...DEFAULT_STATS };
  }

  static saveStats(stats: Partial<GameStats>): void {
    try {
      const current = this.getStats();
      const updated = { ...current, ...stats };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  static addWin(): void {
    const stats = this.getStats();
    this.saveStats({ totalWins: stats.totalWins + 1 });
  }

  static addDamage(damage: number): void {
    const stats = this.getStats();
    this.saveStats({ totalDamage: stats.totalDamage + Math.round(damage) });
  }

  static setLastDifficulty(difficulty: AIDifficulty): void {
    this.saveStats({ lastDifficulty: difficulty });
  }

  static resetStats(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset localStorage:', e);
    }
  }

  static addMatchRecord(record: Omit<MatchRecord, 'id'>): void {
    const stats = this.getStats();
    const newRecord: MatchRecord = {
      ...record,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    const matchHistory = [newRecord, ...stats.matchHistory].slice(0, 1000); // 最多保存1000条记录
    this.saveStats({ matchHistory });
  }

  static getMatchHistory(): MatchRecord[] {
    return this.getStats().matchHistory || [];
  }
}
