import { AIDifficulty, GameMode } from './constants';

export interface GameStats {
  totalWins: number;
  totalDamage: number;
  lastDifficulty: AIDifficulty;
}

export interface GameHistoryRecord {
  id: string;
  timestamp: number;
  date: string;
  mode: GameMode;
  difficulty: AIDifficulty;
  winner: number | null;
  p1Damage: number;
  p2Damage: number;
  p1Wins: number;
  p2Wins: number;
  maxCombo: number;
  rounds: number;
}

export interface AggregatedStats {
  totalGames: number;
  wins: number;
  winRate: number;
  avgDamage: number;
  maxCombo: number;
}

const STORAGE_KEY = 'stickman_fighter_stats';
const HISTORY_KEY = 'stickman_fighter_history';

const DEFAULT_STATS: GameStats = {
  totalWins: 0,
  totalDamage: 0,
  lastDifficulty: 'normal',
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

  static getHistory(): GameHistoryRecord[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read history from localStorage:', e);
    }
    return [];
  }

  static saveHistory(history: GameHistoryRecord[]): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }

  static addHistoryRecord(record: Omit<GameHistoryRecord, 'id' | 'timestamp' | 'date'>): void {
    const history = this.getHistory();
    const newRecord: GameHistoryRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };
    history.unshift(newRecord);
    if (history.length > 1000) {
      history.pop();
    }
    this.saveHistory(history);
  }

  static getHistoryByTimeRange(days: number | null): GameHistoryRecord[] {
    const history = this.getHistory();
    if (days === null) {
      return history;
    }
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter(r => r.timestamp >= cutoff);
  }

  static aggregateStats(history: GameHistoryRecord[]): AggregatedStats {
    if (history.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        winRate: 0,
        avgDamage: 0,
        maxCombo: 0,
      };
    }
    const wins = history.filter(r => r.winner === 1).length;
    const totalDamage = history.reduce((sum, r) => sum + r.p1Damage, 0);
    const maxCombo = history.reduce((max, r) => Math.max(max, r.maxCombo), 0);
    return {
      totalGames: history.length,
      wins,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      avgDamage: history.length > 0 ? Math.round(totalDamage / history.length) : 0,
      maxCombo,
    };
  }

  static getStatsByMode(history: GameHistoryRecord[]): Record<GameMode, AggregatedStats> {
    const pveHistory = history.filter(r => r.mode === 'pve');
    const pvpHistory = history.filter(r => r.mode === 'pvp');
    return {
      pve: this.aggregateStats(pveHistory),
      pvp: this.aggregateStats(pvpHistory),
    };
  }

  static getStatsByDifficulty(history: GameHistoryRecord[]): Record<AIDifficulty, AggregatedStats> {
    const pveHistory = history.filter(r => r.mode === 'pve');
    return {
      easy: this.aggregateStats(pveHistory.filter(r => r.difficulty === 'easy')),
      normal: this.aggregateStats(pveHistory.filter(r => r.difficulty === 'normal')),
      hard: this.aggregateStats(pveHistory.filter(r => r.difficulty === 'hard')),
    };
  }

  static getStatsByDate(history: GameHistoryRecord[]): Record<string, AggregatedStats> {
    const grouped: Record<string, GameHistoryRecord[]> = {};
    history.forEach(r => {
      if (!grouped[r.date]) {
        grouped[r.date] = [];
      }
      grouped[r.date].push(r);
    });
    const result: Record<string, AggregatedStats> = {};
    Object.keys(grouped).forEach(date => {
      result[date] = this.aggregateStats(grouped[date]);
    });
    return result;
  }

  static resetHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Failed to reset history:', e);
    }
  }
}
