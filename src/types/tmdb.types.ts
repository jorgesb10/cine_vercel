/**
 * Entidad de Dominio UI - Independiente de la forma cruda de la API externa.
 * Única fuente de verdad para el tipo Movie en toda la app.
 */
export interface Movie {
  id: number;
  title: string;
  year: number;
  posterUrl: string;
  rating: number;
}

export interface TMDBMovie {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

/**
 * Type Guard Protector de tiempo de ejecución (Runtime validation).
 * Esto asegura con TypeScript duro que lo que escupa el `fetch`
 * tenga la forma mínima viable que necesitamos antes de setearlo al estado.
 */
export function isTMDBDiscoverResponse(data: unknown): data is TMDBDiscoverResponse {
  const rs = data as TMDBDiscoverResponse;

  if (!rs || typeof rs !== 'object') return false;
  if (typeof rs.page !== 'number') return false;
  if (!Array.isArray(rs.results)) return false;

  // Realizamos una validación rápida del primer slot si existe para garantizar el contrato
  if (rs.results.length > 0) {
    const movie = rs.results[0];
    if (typeof movie !== 'object' || movie === null) return false;
    if (typeof movie.id !== 'number') return false;
    if (typeof movie.title !== 'string') return false;
  }

  return true;
}
