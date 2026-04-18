import React, { useState } from 'react';
import { MovieProvider } from './context/movie/MovieContext';
import { useMovies } from './hooks/useMovies';
import { SwipeCard, type Movie } from './components/swipe/SwipeCard';

// Componente temporal tipo "Discover" para probar el entorno
const DiscoverView = () => {
  const { movies, loading, error, loadMore } = useMovies();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loading && movies.length === 0) return <div className="text-white">Cargando catálogo...</div>;
  if (error) return <div className="text-red-500 bg-red-900/30 p-4 rounded-lg">{error}</div>;

  const currentMovie = movies[currentIndex];

  const handleSwipe = (direction: 'like' | 'dislike') => {
    console.log(`Evaluada como ${direction}:`, currentMovie.title);
    setCurrentIndex(prev => prev + 1);
    
    // Si estamos llegando al final del catálogo actual, pedimos más
    if (currentIndex > movies.length - 3) {
      loadMore();
    }
  };

  return (
    <main className="flex flex-col items-center w-full" aria-label="Motor de descubrimiento">
      <header className="w-full text-center">
        {/* SEO: La app siempre debe constar de un encabezado primario H1 por página antes de cualquier H2 */}
        <h1 className="text-xl text-gray-300 font-medium mb-6 mt-4 opacity-50 tracking-widest uppercase">
           CineSwipe Beta
        </h1>
      </header>

      {/* Usar tags descriptivos "section" y proveer directrices de accesibilidad (aria-live) a lectores de pantalla */}
      <section className="relative flex justify-center w-full" aria-live="polite">
        {currentMovie ? (
          <SwipeCard key={currentMovie.id} movie={currentMovie as Movie} onSwipe={handleSwipe} />
        ) : (
          <p className="text-white text-lg">¡Te has quedado sin películas!</p>
        )}
      </section>
    </main>
  );
};

export default function App() {
  return (
    <MovieProvider>
      <div className="min-h-screen bg-gray-950 flex justify-center py-10 overflow-hidden">
         <DiscoverView />
      </div>
    </MovieProvider>
  );
}
