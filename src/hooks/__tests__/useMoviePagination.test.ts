import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMoviePagination } from '../useMoviePagination';

describe('useMoviePagination', () => {
  it('debe inicializar con página 1 y hasMore true', () => {
    const { result } = renderHook(() => useMoviePagination({}));
    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('debe incrementar la página cuando loadMore es llamado y no está cargando', () => {
    const { result } = renderHook(() => useMoviePagination({}));

    act(() => {
      result.current.loadMore(false);
    });

    expect(result.current.page).toBe(2);
  });

  it('no debe incrementar la página si está cargando', () => {
    const { result } = renderHook(() => useMoviePagination({}));

    act(() => {
      result.current.loadMore(true);
    });

    expect(result.current.page).toBe(1);
  });

  it('no debe incrementar la página si hasMore es false', () => {
    const { result } = renderHook(() => useMoviePagination({}));

    act(() => {
      result.current.setHasMore(false);
    });

    act(() => {
      result.current.loadMore(false);
    });

    expect(result.current.page).toBe(1);
  });

  it('debe resetear la paginación cuando cambian los filtros', () => {
    const { result, rerender } = renderHook(
      (props) => useMoviePagination(props),
      { initialProps: { genreId: '28' } }
    );

    act(() => {
      result.current.loadMore(false);
    });
    expect(result.current.page).toBe(2);

    // Cambiar filtro
    rerender({ genreId: '12' });

    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('debe permitir reset manual', () => {
    const { result } = renderHook(() => useMoviePagination({}));

    act(() => {
      result.current.loadMore(false);
      result.current.resetPagination();
    });

    expect(result.current.page).toBe(1);
  });
});
