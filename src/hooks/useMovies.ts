import { useState, useEffect, useCallback } from 'react';
import { TMDBDiscoverResponse, isTMDBDiscoverResponse } from '../types/tmdb.types';

// Re-exportamos Movie desde el tipo canónico para no romper imports existentes
// que apunten a '../hooks/useMovies'. Migración gradual sin Big Bang.
export type { Movie } from '../types/tmdb.types';

import type { Movie } from '../types/tmdb.types';
import { useTMDBCache } from './useTMDBCache';
import { useMoviePagination } from './useMoviePagination';

export interface UseMoviesOptions {
  genreId?: string;
  year?: number;
}

export interface UseMoviesResult {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
}

// Shape almacenado en cache: el slice de página ya mapeado + metadato de paginación
interface MoviePageCachePayload {
  movies: Movie[];
  hasMore: boolean;
}

/**
 * Hook orquestador de descubrimiento de películas TMDB.
 *
 * Delega:
 *  - Paginación  → useMoviePagination
 *  - Cache I/O   → useTMDBCache
 *
 * Responsabilidades propias:
 *  - Construir la URL y la cacheKey a partir de los parámetros
 *  - Ejecutar el fetch (o consumir el prefetch del HTML inicial)
 *  - Mapear TMDBMovie → Movie (entidad de dominio)
 *  - Pre-cargar posters críticos con <link rel="preload">
 *  - Acumular las páginas en el array `movies`
 *  - Gestionar los estados loading / error
 *
 * @param options Filtros opcionales: id de género y año de lanzamiento.
 * @returns Colección acumulada de películas y controles de paginación.
 */
export const useMovies = (options: UseMoviesOptions = {}): UseMoviesResult => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hook secundario: paginación
  const { page, hasMore, loadMore: advancePage, setHasMore, resetPagination } = useMoviePagination(options);

  // Hook secundario: cache genérico tipado con nuestro payload
  const cache = useTMDBCache<MoviePageCachePayload>();

  // Cuando los filtros cambian, el reset de paginación ya lo hace useMoviePagination.
  // Aquí solo reseteamos el array acumulado de películas y el error.
  useEffect(() => {
    setMovies([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.genreId, options.year]);

  // loadMore público: cierra sobre `loading` para no exponer el flag hacia afuera
  const loadMore = useCallback(() => {
    advancePage(loading);
  }, [advancePage, loading]);

  useEffect(() => {
    const abortController = new AbortController();
    const token = import.meta.env.VITE_TMDB_KEY;

    if (!token) {
      setError('La clave API para TMDB no está configurada (Falta VITE_TMDB_KEY en entorno local).');
      return;
    }

    const fetchDiscoveryData = async () => {
      setLoading(true);
      setError(null);

      // Construimos la URL con el constructor nativo para evitar malformación de strings
      const params = new URLSearchParams({
        api_key: token,
        language: 'es-ES',
        sort_by: 'popularity.desc',
        page: page.toString(),
        include_adult: 'false',
        include_video: 'false',
      });

      if (options.genreId) params.append('with_genres', options.genreId);
      if (options.year) params.append('primary_release_year', options.year.toString());

      const dynamicUrl = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
      const cacheKey = `tmdb_q_${params.toString()}`;

      // ── Intento de cache-hit ──────────────────────────────────────────────
      const cached = cache.readCache(cacheKey);

      if (cached) {
        setMovies((prev) => (page === 1 ? cached.movies : [...prev, ...cached.movies]));
        setHasMore(cached.hasMore);
        // El prefetch se lanza incluso en cache-hit (fix del problema #2 del review)
        schedulePreload(cached.movies, page, options);
        setLoading(false);
        return;
      }

      // ── Solicitud de red ──────────────────────────────────────────────────
      try {
        let payload: unknown;

        // Consumimos la promesa anticipada del documento HTML si coincide exactamente
        if (page === 1 && !options.genreId && !options.year && (window as any).__TMDB_PREFETCH_PAYLOAD__) {
          payload = await (window as any).__TMDB_PREFETCH_PAYLOAD__;
          (window as any).__TMDB_PREFETCH_PAYLOAD__ = null; // Limpieza agresiva
        } else {
          const response = await fetch(dynamicUrl, { signal: abortController.signal });

          if (!response.ok) {
            switch (response.status) {
              case 401: throw new Error('API Key TMDB es inválida o carece de permisos.');
              case 404: throw new Error('Endpoint no hallado (404), revisa la sintaxis TMDB.');
              case 429: throw new Error('Cota superada (Rate limit 429): demasiadas descargas en progreso.');
              default:  throw new Error(`TMDB se colapsó. Estado devuelto: ${response.status}`);
            }
          }

          payload = await response.json();
        }

        // Type guard: detenemos un formato mutante de la API en runtime
        if (!isTMDBDiscoverResponse(payload)) {
          throw new Error('La respuesta de TMDB no encaja con el DTO de interfaz declarado.');
        }

        const domainMovies = mapToDomainEntities(payload);
        const isThereNextPage = payload.page < payload.total_pages;

        // ── Escritura en cache ────────────────────────────────────────────
        cache.writeCache(cacheKey, { movies: domainMovies, hasMore: isThereNextPage });

        // ── Pre-carga de posters críticos (fix problema #2: fuera del bloque fetch) ──
        schedulePreload(domainMovies, page, options);

        setMovies((prev) => (page === 1 ? domainMovies : [...prev, ...domainMovies]));
        setHasMore(isThereNextPage);

      } catch (err: unknown) {
        if (err instanceof Error) {
          // AbortError es ruido de React.StrictMode en dev, no lo mostramos
          if (err.name === 'AbortError') return;
          setError(err.message);
        } else {
          setError('Ocurrió un error desconocido al cargar los datos.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiscoveryData();

    return () => abortController.abort();
  }, [page, options.genreId, options.year]); // eslint-disable-line react-hooks/exhaustive-deps

  return { movies, loading, error, loadMore, hasMore };
};

// ── Helpers puros (sin estado) ─────────────────────────────────────────────────

/**
 * Mapea la respuesta cruda de TMDB a nuestra entidad de dominio Movie.
 * Filtra entradas sin poster para evitar tarjetas rotas en la UI.
 */
function mapToDomainEntities(payload: TMDBDiscoverResponse): Movie[] {
  return payload.results
    .filter((t) => t.poster_path !== null)
    .map((t) => ({
      id: t.id,
      title: t.title,
      year: t.release_date ? Number(t.release_date.split('-')[0]) : new Date().getFullYear(),
      posterUrl: `https://image.tmdb.org/t/p/w500${t.poster_path}`,
      rating: t.vote_average,
    }));
}

/**
 * Inyecta <link rel="preload"> para las primeras 5 películas en página 1 sin filtros.
 * Ejecutado tanto tras fetch de red como tras cache-hit para consistencia.
 */
function schedulePreload(
  movies: Movie[],
  page: number,
  options: UseMoviesOptions
): void {
  if (page !== 1 || options.genreId || options.year) return;

  movies.slice(0, 5).forEach((movie) => {
    const w92 = movie.posterUrl.replace('/w500/', '/w92/');
    [w92, movie.posterUrl].forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  });
}
