import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { StatsGameRow } from '../../contexts/StatsDataContext';
import { PARK_DISPLAY_NAMES } from '../../constants';

type GameFilterProps = {
    games: StatsGameRow[];
    selectedGameIds: Set<number> | null;
    setSelectedGameIds: Dispatch<SetStateAction<Set<number> | null>>;
};

function formatDate(yyyyMmDd: string): string {
    const [year, month, day] = yyyyMmDd.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function formatDateMeta(dateGames: StatsGameRow[]): string {
    const fields = [...new Set(dateGames.map(g => g.field))]
        .map(f => PARK_DISPLAY_NAMES[f] ?? f)
        .join(' and ');

    const counts = [...new Set(dateGames.map(g => g.number_of_fielders))].sort((a, b) => a - b);
    const fielderStr = counts.length === 1
        ? `${counts[0]} Fielders`
        : `${counts[0]}-${counts[counts.length - 1]} Fielders`;

    return `${fields} · ${fielderStr}`;
}

function GameFilter({ games, selectedGameIds, setSelectedGameIds }: GameFilterProps) {
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    // Group games by date, preserving chronological order
    const byDate = new Map<string, StatsGameRow[]>();
    for (const game of [...games].sort((a, b) => a.id - b.id)) {
        const group = byDate.get(game.date) ?? [];
        group.push(game);
        byDate.set(game.date, group);
    }

    const isGameChecked = (gameId: number) =>
        selectedGameIds === null || selectedGameIds.has(gameId);

    const toggleGame = (gameId: number) => {
        setSelectedGameIds(prev => {
            const current = prev === null ? new Set(games.map(g => g.id)) : new Set(prev);
            current.has(gameId) ? current.delete(gameId) : current.add(gameId);
            return current.size === games.length ? null : current;
        });
    };

    const toggleDate = (dateGames: StatsGameRow[]) => {
        setSelectedGameIds(prev => {
            const current = prev === null ? new Set(games.map(g => g.id)) : new Set(prev);
            const allChecked = dateGames.every(g => current.has(g.id));
            allChecked
                ? dateGames.forEach(g => current.delete(g.id))
                : dateGames.forEach(g => current.add(g.id));
            return current.size === games.length ? null : current;
        });
    };

    const toggleExpanded = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            next.has(date) ? next.delete(date) : next.add(date);
            return next;
        });
    };

    return (
        <div>
            <span>Games:</span>
            &nbsp;
            <button onClick={() => setSelectedGameIds(null)}>Select All</button>
            &nbsp;
            <button onClick={() => setSelectedGameIds(new Set())}>Select None</button>
            &nbsp;
            <button onClick={() => {
                const mostRecentDate = Array.from(byDate.keys()).at(-1);
                if (mostRecentDate) setSelectedGameIds(new Set(byDate.get(mostRecentDate)!.map(g => g.id)));
            }}>Select Most Recent Day</button>
            {Array.from(byDate.entries()).map(([date, dateGames]) => {
                const allChecked = dateGames.every(g => isGameChecked(g.id));
                const someChecked = dateGames.some(g => isGameChecked(g.id));
                const isExpanded = expandedDates.has(date);
                return (
                    <div key={date}>
                        <label>
                            <input
                                type="checkbox"
                                checked={allChecked}
                                ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                                onChange={() => toggleDate(dateGames)}
                            />
                        </label>
                        <span
                            onClick={() => toggleExpanded(date)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            <span>{isExpanded ? '▾' : '▸'}</span>
                            {' '}{formatDate(date)} · {formatDateMeta(dateGames)}
                        </span>
                        {isExpanded && (
                            <div style={{ marginLeft: 16 }}>
                                {dateGames.map(game => (
                                    <label key={game.id} style={{ display: 'block' }}>
                                        <input
                                            type="checkbox"
                                            checked={isGameChecked(game.id)}
                                            onChange={() => toggleGame(game.id)}
                                        />
                                        {PARK_DISPLAY_NAMES[game.field] ?? game.field}, {game.number_of_fielders} Fielders: {game.away_score} - {game.home_score}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default GameFilter;
