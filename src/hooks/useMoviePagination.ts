import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseMoviePaginationOptions {
  genreId?: string;
  year?: number;
}

export interface UseMoviePaginationResult {
  /** Página actual (1-indexed). */
  page: number;
  /** Hay más páginas disponibles según la última respuesta de la API. */
  hasMore: boolean;
  /**
   * Avanza a la siguiente página. No-op si ya está cargando o no hay más.
   * El flag `loading` lo provee el hook orquestador para evitar doble-disparo.
   */
  loadMore: (loading: boolean) => void;
  /**
   * Marca que la API confirmó si existe una siguiente página.
   * Debe ser llamado por el hook orquestador tras cada fetch exitoso.
   */
  setHasMore: (hasMore: boolean) => void;
  /**
   * Reinicia la paginación a la página 1.
   * Expuesto para que el hook orquestador pueda forzar un reset explícito.
   */
  resetPagination: () => void;
}

/**
 * Gestiona exclusivamente el estado de paginación: página actual, si hay más
 * páginas, y el reset ante cambios de filtro.
 *
 * Responsabilidad única: saber EN QUÉ PÁGINA estamos y si podemos avanzar.
 * No sabe nada de fetch, cache ni del tipo Movie.
 *
 * @param options Filtros que, al cambiar, disparan un reset de paginación.
 */
export function useMoviePagination(
  options: UseMoviePaginationOptions
): UseMoviePaginationResult {
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Ref para distinguir el primer mount del cambio real de filtros.
  // Necesario porque un useEffect que depende de las opciones se ejecuta también
  // en el primer render, lo que causaría un reset innecesario.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Filtros cambiaron → reseteo estricto del pipeline de paginación
    setPage(1);
    setHasMore(true);
  }, [options.genreId, options.year]);

  const loadMore = useCallback((loading: boolean) => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const resetPagination = useCallback(() => {
    setPage(1);
    setHasMore(true);
  }, []);

  return { page, hasMore, loadMore, setHasMore, resetPagination };
}
