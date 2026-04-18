import React, { useState, useRef, useEffect, memo } from 'react';

import type { Movie } from '../../types/tmdb.types';

export type SwipeDirection = 'like' | 'dislike';

export interface SwipeCardProps {
  movie: Movie;
  onSwipe: (direction: SwipeDirection) => void;
}

const SwipeCardBase: React.FC<SwipeCardProps> = ({ movie, onSwipe }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // --- LAZY LOADING & BLUR EFFECT ESTADOS ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para disparar carga solo si está en pantalla
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } 
    );

    if (imgContainerRef.current) observer.observe(imgContainerRef.current);
    
    return () => observer.disconnect();
  }, []);

  const SWIPE_THRESHOLD = 80;

  // --- LOGICA GESTUAL ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setStartX(e.clientX);
    setCurrentX(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX === null) return;
    setCurrentX(e.clientX);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX === null || currentX === null) return;
    const deltaX = currentX - startX;
    
    if (deltaX > SWIPE_THRESHOLD) {
      onSwipe('like');
    } else if (deltaX < -SWIPE_THRESHOLD) {
      onSwipe('dislike');
    }
    
    setStartX(null);
    setCurrentX(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      onSwipe('like');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      onSwipe('dislike');
      e.preventDefault();
    }
  };

  const deltaX = startX !== null && currentX !== null ? currentX - startX : 0;
  const isDragging = startX !== null;
  const rotation = deltaX * 0.05; 
  
  const isLiking = deltaX > SWIPE_THRESHOLD;
  const isDisliking = deltaX < -SWIPE_THRESHOLD;

  const dynamicStyle: React.CSSProperties = {
    transform: `translate(${deltaX}px, 0) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
    touchAction: 'none' 
  };

  return (
    <div
      ref={cardRef}
      className={`relative w-80 h-[28rem] rounded-2xl overflow-hidden shadow-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500 will-change-transform select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={dynamicStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Película: ${movie.title}. Presiona la flecha izquierda para Dislike o flecha derecha para Like, o arrastra visualmente.`}
    >
      <div 
        ref={imgContainerRef}
        className="absolute inset-0 w-full h-full bg-gray-900 overflow-hidden" 
      >
        <img
          src={movie.posterUrl.replace('/w500/', '/w92/')}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl transition-opacity duration-700 ease-out pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {isInView && (
          <img
            srcSet={`${movie.posterUrl.replace('/w500/', '/w300/')} 300w, ${movie.posterUrl} 500w`}
            sizes="(max-width: 640px) 300px, 500px"
            src={movie.posterUrl}
            alt={`Póster oficial de ${movie.title}`}
            loading="lazy"
            onLoad={() => setIsLoaded(true)} 
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000 ease-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

      {isLiking && (
        <div className="absolute top-8 left-6 border-4 border-emerald-500 rounded-md px-3 py-1 text-emerald-500 font-extrabold text-3xl uppercase tracking-widest transform -rotate-12 pointer-events-none shadow-lg">
          Like
        </div>
      )}
      {isDisliking && (
        <div className="absolute top-8 right-6 border-4 border-rose-500 rounded-md px-3 py-1 text-rose-500 font-extrabold text-3xl uppercase tracking-widest transform rotate-12 pointer-events-none shadow-lg">
          Nope
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full p-6 text-white pointer-events-none">
        <h2 className="text-2xl font-bold mb-2 truncate drop-shadow-md">
          {movie.title}
        </h2>
        <div className="flex items-center space-x-3 text-sm font-medium drop-shadow-md">
          <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">
             {movie.year}
          </span>
          <span className="flex items-center">
            <span className="text-yellow-400 mr-1 text-lg">★</span>
            <span className="pt-0.5">{movie.rating.toFixed(1)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
//                            OPTIMIZACIONES DE RENDER
// ==============================================================================

// 1. POR QUÉ USAMOS React.memo AQUÍ:
// Cuando nuestro Context de Historial (likes/dislikes) emite un update, todos 
// los consumidores re-renderizan. Componentes "Dumb" (estúpidos) como SwipeCard no 
// tienen por qué ejecutarse otra vez si la película subyacente que le pasaron (sus props) 
// sigue siendo la misma. React.memo crea una barda que aborta la renderización.
export const SwipeCardOptimized = memo(SwipeCardBase);


/*
// 2. CÓMO DEBES MEMOIZAR EL COMPONENTE PADRE AL USAR ESTE ARCHIVO:
// React.memo utiliza comprobación superficial (`Object.is`). Si envías una función en línea
// `<SwipeCard onSwipe={(action) => handle(action)} />`, estarás ROMPIENDO el memo porque 
// cada render del padre alojará una nueva referencia de la función en memoria.

// PADRE (ej. DiscoverView en App.tsx):
// import { useCallback } from 'react';
// import { SwipeCardOptimized } from './SwipeCard.optimized';
// 
// const DiscoverView = () => {
//    // ...
//    // POR QUÉ USAMOS useCallback: Congela la referencia del handler de memoria, garantizando
//    // que SwipeCard vea exactamente las mismas dependencias de memoria (los mismos Props) 
//    // tras un render y lo ignore exitosamente.
//    const memoizedSwipe = useCallback((direction: 'like' | 'dislike') => {
//        dispatch({ type: direction === 'like' ? 'SWIPE_RIGHT' : 'SWIPE_LEFT' });
//    }, [dispatch]); // Dependencias estables
//
//    return <SwipeCardOptimized movie={currentMovie} onSwipe={memoizedSwipe} />
// }


// ==============================================================================
//             LO QUE DELIBERADAMENTE **NO** SE DEBE MEMOIZAR
// ==============================================================================

// -> NO MEMOIZAMOS useCallback en: handlePointerMove, handleKeyDown.
// ¿Por qué? Se entregan estrictamente a elementos nativos del DOM (ej. <div onPointerDown>). 
// Al ser React quien abstrae todos los eventos del navegador al root DOM (Event Delegation), 
// entregar siempre una función "fresca" a divs primitivos NO causa reinicios en el browser. 
// Hacerles un useCallback añadiría penalizaciones de arrays sintéticos para cero beneficio.

// -> NO MEMOIZAMOS useMemo en: dynamicStyle, rotation, ni deltaX.
// ¿Por qué? Un usuario podría arrastrar y generar 60 eventos MouseMove por segundo. Esto 
// estallaría la caché del `useMemo` haciéndola rotar cada 16 milisegundos, añadiendo pesadez. 
// "Recalcular la matemática pura de variables base es inmensamente más barato en los V8 engines 
// que consultar una cache fallida iterando deps array."
*/
