import { useCallback } from 'react';

// TTL: 5 minutos en milisegundos
const CACHE_TTL_MS = 5 * 60 * 1_000;

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export interface UseTMDBCacheResult<T> {
  /**
   * Intenta leer desde el cache. Si hay un hit válido, devuelve los datos.
   * Si está expirado/corrupto, elimina la entrada y devuelve null.
   */
  readCache: (cacheKey: string) => T | null;
  /**
   * Persiste datos en sessionStorage bajo la clave dada con timestamp actual.
   */
  writeCache: (cacheKey: string, data: T) => void;
  /**
   * Invalida manualmente una entrada del cache (ej. tras un error de red).
   */
  invalidate: (cacheKey: string) => void;
}

/**
 * Hook de cache-aside genérico sobre sessionStorage con TTL configurable.
 *
 * Diseño deliberado: es completamente stateless — no posee ningún estado React.
 * Devuelve funciones puras de lectura/escritura para que el hook orquestador
 * decida cuándo y cómo usar el cache. Esto lo hace testeable de forma aislada.
 *
 * @template T El tipo de dato a almacenar en cache.
 */
export function useTMDBCache<T>(): UseTMDBCacheResult<T> {
  const readCache = useCallback((cacheKey: string): T | null => {
    const blob = sessionStorage.getItem(cacheKey);
    if (!blob) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(blob);
      const elapsed = Date.now() - entry.timestamp;

      if (elapsed < CACHE_TTL_MS) {
        return entry.data;
      }

      // Entrada expirada: limpieza agresiva
      sessionStorage.removeItem(cacheKey);
      return null;
    } catch {
      // Entrada corrupta: limpieza defensiva
      sessionStorage.removeItem(cacheKey);
      return null;
    }
  }, []);

  const writeCache = useCallback((cacheKey: string, data: T): void => {
    const entry: CacheEntry<T> = { timestamp: Date.now(), data };
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // sessionStorage lleno (QuotaExceededError): ignoramos silenciosamente,
      // el hook degradará a fetch de red en la próxima solicitud.
    }
  }, []);

  const invalidate = useCallback((cacheKey: string): void => {
    sessionStorage.removeItem(cacheKey);
  }, []);

  return { readCache, writeCache, invalidate };
}
