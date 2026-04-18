import React, { createContext, useReducer, useEffect, useMemo, useContext, ReactNode, Dispatch } from 'react';
import { Movie } from '../../hooks/useMovies';

// --- TIPOS ---
export type ReactionType = 'like' | 'dislike';

export interface SwipedMovie extends Movie {
  reaction: ReactionType;
  timestamp: number;
}

export interface MovieHistoryState {
  history: SwipedMovie[];
}

export type MovieAction =
  | { type: 'SWIPE_RIGHT'; payload: Movie }
  | { type: 'SWIPE_LEFT'; payload: Movie }
  | { type: 'UNDO_LAST' }
  | { type: 'CLEAR_HISTORY' };

const MAX_HISTORY_ITEMS = 50;
const STORAGE_KEY = 'cineswipe_history';

// --- INICIALIZADOR (Rehidratamiento síncrono al montar) ---
const initializeState = (initialState: MovieHistoryState): MovieHistoryState => {
  if (typeof window === 'undefined') return initialState; // Salvaguardia
  
  try {
    const rawStorage = localStorage.getItem(STORAGE_KEY);
    if (rawStorage) {
      return JSON.parse(rawStorage) as MovieHistoryState;
    }
  } catch (error) {
    console.error('Error parseando historial de localStorage:', error);
  }
  return initialState;
};

// --- REDUCER (Puro y Determínista) ---
export const movieReducer = (state: MovieHistoryState, action: MovieAction): MovieHistoryState => {
  switch (action.type) {
    case 'SWIPE_RIGHT':
    case 'SWIPE_LEFT': {
      const reaction: ReactionType = action.type === 'SWIPE_RIGHT' ? 'like' : 'dislike';
      
      // Eliminamos la película si ya había sido evaluada antes (evitar llaves duplicadas)
      const sanitizedHistory = state.history.filter(m => m.id !== action.payload.id);
      
      const newlySwiped: SwipedMovie = {
        ...action.payload,
        reaction,
        timestamp: Date.now()
      };

      // FIFO Limitado: Añade el nuevo ítem al inicio y corta el array salvando solo 50 elementos
      const updatedHistory = [newlySwiped, ...sanitizedHistory].slice(0, MAX_HISTORY_ITEMS);
      
      return {
        ...state,
        history: updatedHistory
      };
    }
    
    case 'UNDO_LAST': {
      // Elimina el evento más reciente (el que se insertó de primero en el index 0)
      if (state.history.length === 0) return state;
      return {
         ...state,
         history: state.history.slice(1)
      };
    }
    
    case 'CLEAR_HISTORY':
      return { history: [] };
      
    default:
      return state;
  }
};

// --- DOBLE CONTEXTO (Optimizando Renders: Lectura vs Escritura) ---
const MovieHistoryContext = createContext<MovieHistoryState | undefined>(undefined);
const MovieDispatchContext = createContext<Dispatch<MovieAction> | undefined>(undefined);

// --- PROVIDER DE ESTADO ---
export const MovieProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    movieReducer, 
    { history: [] }, 
    initializeState
  );

  // Efecto secundario: Cada vez que el listado cambie, sincroniza con la base local
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Memorización: Evita recrear la caja de provisión para detener re-renders inútiles de componentes hijos
  const memoizedState = useMemo(() => state, [state]);
  const memoizedDispatch = useMemo(() => dispatch, [dispatch]); 

  // Componentes como "Botones" consumen el Dispatch sin someterse a updates cuando cambia "State"
  return (
    <MovieHistoryContext.Provider value={memoizedState}>
      <MovieDispatchContext.Provider value={memoizedDispatch}>
        {children}
      </MovieDispatchContext.Provider>
    </MovieHistoryContext.Provider>
  );
};

// --- HOOKS PÚBLICOS DEL MÓDULO ---
export const useMovieHistory = (): MovieHistoryState => {
  const context = useContext(MovieHistoryContext);
  if (context === undefined) {
    throw new Error('useMovieHistory debe ser usado envolviendo en un <MovieProvider>');
  }
  return context;
};

export const useMovieActions = (): Dispatch<MovieAction> => {
  const context = useContext(MovieDispatchContext);
  if (context === undefined) {
    throw new Error('useMovieActions debe ser usado envolviendo en un <MovieProvider>');
  }
  return context;
};
