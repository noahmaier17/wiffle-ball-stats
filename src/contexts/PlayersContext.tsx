import { createContext, useContext } from 'react';
import type { Player } from '../types';

const PlayersContext = createContext<Player[]>([]);

export const usePlayers = () => useContext(PlayersContext);
export default PlayersContext;
