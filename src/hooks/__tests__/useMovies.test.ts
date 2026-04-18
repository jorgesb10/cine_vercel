import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMovies } from '../useMovies';

// Mock de import.meta.env
vi.mock('../../../node_modules/vite/dist/client/env.mjs', () => ({
  VITE_TMDB_KEY: 'fake-api-key'
}));

// Fallback manual para variables de entorno si el mock de arriba no es suficiente en Vitest
(import.meta.env as any).VITE_TMDB_KEY = 'fake-api-key';

describe('useMovies', () => {
  const mockMoviesResponse = {
    page: 1,
    total_pages: 5,
    results: [
      {
        id: 1,
        title: 'Movie 1',
        release_date: '2024-01-01',
        poster_path: '/path1.jpg',
        vote_average: 8.5
      }
    ]
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.clear();
    // Limpiar mocks de DOM (head para preloads)
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('debe cargar películas exitosamente', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMoviesResponse,
    });

    const { result } = renderHook(() => useMovies());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.movies).toHaveLength(1);
    expect(result.current.movies[0].title).toBe('Movie 1');
    expect(result.current.error).toBeNull();
  });

  it('debe manejar errores de la API (ej. 404)', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useMovies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toContain('Endpoint no hallado');
    expect(result.current.movies).toHaveLength(0);
  });

  it('debe usar el cache si los datos están disponibles', async () => {
    const cacheKey = 'tmdb_q_api_key=fake-api-key&language=es-ES&sort_by=popularity.desc&page=1&include_adult=false&include_video=false';
    const cacheData = {
      timestamp: Date.now(),
      data: {
        movies: [{ id: 99, title: 'Cached Movie', year: 2023, posterUrl: '', rating: 10 }],
        hasMore: true
      }
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

    const { result } = renderHook(() => useMovies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.movies[0].title).toBe('Cached Movie');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('debe cancelar la petición al desmontar el hook (AbortController)', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    
    const { unmount } = renderHook(() => useMovies());
    
    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });

  it('debe cargar más páginas al llamar a loadMore', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMoviesResponse,
    });

    const { result } = renderHook(() => useMovies());

    await waitFor(() => expect(result.current.movies).toHaveLength(1));

    // Mock para la segunda página
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockMoviesResponse, page: 2, results: [{ id: 2, title: 'Movie 2', poster_path: '/p2.jpg' }] }),
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.movies).toHaveLength(2));
    expect(result.current.movies[1].title).toBe('Movie 2');
  });

  it('debe fallar si no hay API Key configurada', async () => {
    const originalKey = (import.meta.env as any).VITE_TMDB_KEY;
    (import.meta.env as any).VITE_TMDB_KEY = '';

    const { result } = renderHook(() => useMovies());

    expect(result.current.error).toContain('clave API para TMDB no está configurada');

    (import.meta.env as any).VITE_TMDB_KEY = originalKey;
  });
});
