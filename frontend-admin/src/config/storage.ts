import { AIDifficulty, GameMode } from './constants';

export interface GameStats {
  totalWins: number;
  totalDamage: number;
  lastDifficulty: AIDifficulty;
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  date: string;
  mode: GameMode;
  difficulty: AIDifficulty;
  winner: number | null;
  p1Damage: number;
  p2Damage: number;
  maxCombo: number;
  rounds: number;
}

export interface StatsSummary {
  totalMatches: number;
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

  static getMatchHistory(): MatchRecord[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read match history:', e);
    }
    return [];
  }

  static saveMatchRecord(record: Omit<MatchRecord, 'id' | 'timestamp' | 'date'>): void {
    try {
      const history = this.getMatchHistory();
      const newRecord: MatchRecord = {
        ...record,
        id: Date.now().toString(),
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
      };
      history.unshift(newRecord);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save match record:', e);
    }
  }

  static getFilteredHistory(days: number | null): MatchRecord[] {
    const history = this.getMatchHistory();
    if (days === null) return history;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter(r => r.timestamp >= cutoff);
  }

  static calculateStats(history: MatchRecord[]): StatsSummary {
    if (history.length === 0) {
      return {
        totalMatches: 0,
        wins: 0,
        winRate: 0,
        avgDamage: 0,
        maxCombo: 0,
      };
    }

    const wins = history.filter(r => r.winner === 1).length;
    const totalDamage = history.reduce((sum, r) => sum + r.p1Damage, 0);
    const maxCombo = Math.max(...history.map(r => r.maxCombo), 0);

    return {
      totalMatches: history.length,
      wins,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      avgDamage: history.length > 0 ? Math.round(totalDamage / history.length) : 0,
      maxCombo,
    };
  }

  static getStatsByMode(history: MatchRecord[]): Record<GameMode, StatsSummary> {
    const pveHistory = history.filter(r => r.mode === 'pve');
    const pvpHistory = history.filter(r => r.mode === 'pvp');

    return {
      pve: this.calculateStats(pveHistory),
      pvp: this.calculateStats(pvpHistory),
    };
  }

  static getStatsByDifficulty(history: MatchRecord[]): Record<AIDifficulty, StatsSummary> {
    const pveHistory = history.filter(r => r.mode === 'pve');

    return {
      easy: this.calculateStats(pveHistory.filter(r => r.difficulty === 'easy')),
      normal: this.calculateStats(pveHistory.filter(r => r.difficulty === 'normal')),
      hard: this.calculateStats(pveHistory.filter(r => r.difficulty === 'hard')),
    };
  }

  static getStatsByDate(history: MatchRecord[]): Record<string, StatsSummary> {
    const grouped: Record<string, MatchRecord[]> = {};

    history.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });

    const result: Record<string, StatsSummary> = {};
    Object.keys(grouped).forEach(date => {
      result[date] = this.calculateStats(grouped[date]);
    });

    return result;
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }
}
