import type { PlayerGameData } from '../types';

// Running streak state, advanced one game at a time by stepStreak.
// current is signed: >0 win streak, <0 loss streak, 0 = none yet.
export type StreakState = {
    runWin: number;
    runLoss: number;
    longestWin: number;
    longestLoss: number;
    current: number;
};

export function initStreakState(): StreakState {
    return { runWin: 0, runLoss: 0, longestWin: 0, longestLoss: 0, current: 0 };
}

// Advances the streak state by one game.
// Returns true if the game had a decision (win or loss); false if it was skipped
// (player recorded neither a win nor a loss, e.g. left early — neither extends nor breaks a streak).
export function stepStreak(s: StreakState, win: number, loss: number): boolean {
    if (win === 1) {
        s.runWin += 1; s.runLoss = 0;
        s.longestWin = Math.max(s.longestWin, s.runWin);
        s.current = s.runWin;
        return true;
    }
    if (loss === 1) {
        s.runLoss += 1; s.runWin = 0;
        s.longestLoss = Math.max(s.longestLoss, s.runLoss);
        s.current = -s.runLoss;
        return true;
    }
    return false;
}

// Computes win/loss streaks from a player's per-game rows.
// Games where the player recorded neither a win nor a loss (left early) are skipped:
// they neither extend nor break a streak.
export function calculateStreaks(entries: PlayerGameData[]): {
    current_streak: number;       // signed: >0 win streak, <0 loss streak, 0 = none
    longest_win_streak: number;
    longest_loss_streak: number;
} {
    // game_id increases with time, so ascending game_id is chronological order
    const ordered = [...entries].sort((a, b) => a.game_id - b.game_id);
    const s = initStreakState();
    for (const e of ordered) {
        stepStreak(s, e.win, e.loss);
    }
    return { current_streak: s.current, longest_win_streak: s.longestWin, longest_loss_streak: s.longestLoss };
}
