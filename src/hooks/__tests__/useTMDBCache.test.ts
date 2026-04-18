import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTMDBCache } from '../useTMDBCache';

describe('useTMDBCache', () => {
  const cacheKey = 'test-key';
  const testData = { name: 'Interstellar', year: 2014 };

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe escribir y leer datos correctamente', () => {
    const { result } = renderHook(() => useTMDBCache<typeof testData>());

    act(() => {
      result.current.writeCache(cacheKey, testData);
    });

    const cached = result.current.readCache(cacheKey);
    expect(cached).toEqual(testData);
  });

  it('debe devolver null si la entrada no existe', () => {
    const { result } = renderHook(() => useTMDBCache());
    expect(result.current.readCache('non-existent')).toBeNull();
  });

  it('debe devolver null y limpiar si el cache ha expirado', () => {
    const { result } = renderHook(() => useTMDBCache<typeof testData>());

    act(() => {
      result.current.writeCache(cacheKey, testData);
    });

    // Avanzar 6 minutos (TTL es 5)
    vi.advanceTimersByTime(6 * 60 * 1000);

    const cached = result.current.readCache(cacheKey);
    expect(cached).toBeNull();
    expect(sessionStorage.getItem(cacheKey)).toBeNull();
  });

  it('debe manejar JSON corrupto y limpiar la entrada', () => {
    sessionStorage.setItem(cacheKey, 'invalid-json{');
    const { result } = renderHook(() => useTMDBCache());

    const cached = result.current.readCache(cacheKey);
    expect(cached).toBeNull();
    expect(sessionStorage.getItem(cacheKey)).toBeNull();
  });

  it('debe invalidar una entrada manualmente', () => {
    const { result } = renderHook(() => useTMDBCache<typeof testData>());

    act(() => {
      result.current.writeCache(cacheKey, testData);
      result.current.invalidate(cacheKey);
    });

    expect(result.current.readCache(cacheKey)).toBeNull();
  });

  it('debe fallar silenciosamente si sessionStorage está lleno', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useTMDBCache<typeof testData>());

    expect(() => {
      act(() => {
        result.current.writeCache(cacheKey, testData);
      });
    }).not.toThrow();

    spy.mockRestore();
  });
});
