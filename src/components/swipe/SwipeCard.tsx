import React, { useState, useRef, useEffect } from 'react';

import type { Movie } from '../../types/tmdb.types';

export type SwipeDirection = 'like' | 'dislike';

export interface SwipeCardProps {
  movie: Movie;
  onSwipe: (direction: SwipeDirection) => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ movie, onSwipe }) => {
  // --- ESTADOS LOCALES ---
  // Guardamos la posición inicial X y la posición actual X del puntero en pantalla
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
      { rootMargin: '200px' } // Empezar carga un poco antes de asomarse a pantalla
    );

    if (imgContainerRef.current) observer.observe(imgContainerRef.current);
    
    return () => observer.disconnect();
  }, []);

  const SWIPE_THRESHOLD = 80;

  // --- LOGICA GESTUAL (Manejadores de Eventos SIN useEffect) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Solo permitimos el clic primario (izquierdo) o táctil, evitamos clics derechos
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setStartX(e.clientX);
    setCurrentX(e.clientX);
    // Capturamos el puntero para seguir detectando 'Move' incluso si el ratón/dedo sale del contenedor visual de la tarjeta
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX === null) return;
    setCurrentX(e.clientX);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX === null || currentX === null) return;
    
    const deltaX = currentX - startX;
    
    // Verificamos si pasamos el umbral para determinar el disparo de la acción
    if (deltaX > SWIPE_THRESHOLD) {
      onSwipe('like');
    } else if (deltaX < -SWIPE_THRESHOLD) {
      onSwipe('dislike');
    }
    
    // Reseteamos estados
    setStartX(null);
    setCurrentX(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- LOGICA DE ACCESIBILIDAD ---
  // Fallback para usuarios que utilizan la navegación por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      onSwipe('like');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      onSwipe('dislike');
      e.preventDefault();
    }
  };

  // --- CALCULOS DE PRESENTACION ---
  const deltaX = startX !== null && currentX !== null ? currentX - startX : 0;
  const isDragging = startX !== null;
  
  // Rotación ligera progresiva dependiente del desfase X
  const rotation = deltaX * 0.05; 
  
  // Condicionales para mostrar los sellos visuales al superar los 80px requeridos
  const isLiking = deltaX > SWIPE_THRESHOLD;
  const isDisliking = deltaX < -SWIPE_THRESHOLD;

  // --- ESTILOS DINAMICOS ---
  // Tailwind se usa en las clases, pero `transform` requiere manipulación de estilos en línea basada en estado fluido
  const dynamicStyle: React.CSSProperties = {
    transform: `translate(${deltaX}px, 0) rotate(${rotation}deg)`,
    // Quitamos la transición suave mientras el usuario arrastra (para respuesta instantánea), pero animamos el retorno al centro si suelta antes del umbral
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
    touchAction: 'none' // Clave: Previene que la pantalla scrollee en móvil al hacer swipe horizontal
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
      {/* Contenedor estricto para evitar CLS (Layout Shift) */}
      <div 
        ref={imgContainerRef}
        className="absolute inset-0 w-full h-full bg-gray-900 overflow-hidden" 
      >
        {/* Placeholder: Imagen miniatura w92 ensanchada con blur CSS */}
        <img
          src={movie.posterUrl.replace('/w500/', '/w92/')}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl transition-opacity duration-700 ease-out pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Imagen principal diferida: srcset + lazy nativo HTML5 con alta prioridad de LCP */}
        {isInView && (
          <img
            srcSet={`${movie.posterUrl.replace('/w500/', '/w300/')} 300w, ${movie.posterUrl} 500w`}
            sizes="(max-width: 640px) 300px, 500px"
            src={movie.posterUrl}
            alt={`Póster oficial de ${movie.title}`}
            loading="lazy"
            fetchPriority="high"
            onLoad={() => setIsLoaded(true)} // Dispara transición de blur a nítido
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000 ease-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
      
      {/* Gradiente Oscuro para dar Lecturabilidad al Texto Base */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

      {/* Indicadores Visuales Condicionales (LIKE / NOPE) */}
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

      {/* Bloque Inferior con la Información de la Película */}
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

/*
// =====================================================================
//                             EJEMPLO DE USO
// =====================================================================
// IMPORTANTE: Asegurate de importar SwipeCard donde quieras renderizarlo
// 
// import { SwipeCard } from './components/swipe/SwipeCard';
//
// const DiscoverScreen = () => {
//   const movieMock = {
//     id: 101,
//     title: "Interstellar",
//     year: 2014,
//     posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
//     rating: 8.6
//   };
//
//   const handleSwipe = (direction: 'like' | 'dislike') => {
//     console.log(`Pelicula evaluada! Acción registrada: ${direction}`);
//     // Al ejecutarse esto, podrías descartar `movieMock` de la pantalla local y cargar la siguiente capa
//   };
//
//   return (
//     <div className="flex items-center justify-center min-h-screen bg-black">
//       <SwipeCard movie={movieMock} onSwipe={handleSwipe} />
//     </div>
//   );
// };
*/
