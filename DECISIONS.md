# Registro de Decisiones Arquitectónicas (ADR) - CineSwipe

Este documento consolida las decisiones técnicas significativas tomadas durante la **Fase 1** del desarrollo de CineSwipe. Su propósito es proveer contexto al equipo y servir de justificación para la revisión del Capstone.

## Resumen de Decisiones

| ADR ID | Título | Estado | Fecha de Adopción |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Gestión de Estado Global con React Context | Aceptada | Abril 2026 |
| **ADR-002** | Implementación Manual de Gestos vía Pointer Events | Aceptada | Abril 2026 |
| **ADR-003** | Consumo de TMDB API como Fuente Principal de Datos | Aceptada | Abril 2026 |
| **ADR-004** | División de Responsabilidades: Inteligencia Artificial vs. Codificación Manual | Aceptada | Abril 2026 |

---

## ADR-001: Gestión de Estado Global con React Context

**Contexto:**
La aplicación necesita persistir la lista de películas descubiertas y las preferencias del usuario (Likes/Dislikes) a través de distintas pantallas (Discover vs. Favorites) y guardar esto en caché para recuperarlo inter-sesiones. 

**Decisión:**
Se decidió utilizar reactividades nativas en forma de `Context API` separando las emisiones de lectura/escritura (`MovieHistoryContext` y `MovieDispatchContext`), comandado por el hook `useReducer`. 

**Consecuencias Positivas:**
- Cero dependencias añadidas al proyecto (menor bundle final).
- Se adhiere al paradigma de librerías base proveído por el entorno React 18.
- La separación del Data y Dispatch Contexto detiene cascadas molestas de renders en componentes que solo necesitan inyectar acciones.

**Consecuencias Negativas:**
- Afrontaremos desafíos de optimización (Main Thread Blocking) si los nodos del historial sobrepasan ciertos límites y forzamos su escritura síncrona en LocalStorage.
- El código en sí tiene mayor grado de repetitividad que algunos micro-managers globales modernos.

**Alternativas Consideradas:**
- **Zustand:** Excelente, pero hubiese demandado sobre-ingeniería inicial para una fase 1 tan controlada.
- **Redux Toolkit:** Demasiado boilerplate y overkill para dos ramas de estado planas. 

---

## ADR-002: Implementación Manual de Gestos (Pointer Events)

**Contexto:**
El diferenciador core de CineSwipe radica en la mecánica tipo "Tinder" de elegir arrastrando tarjetas fotográficas sin colisionar el scroll natural o la selección de texto.

**Decisión:**
Escribir manualmente la interceptación algorítmica de gestos utilizando las interfaces de browser nativas como `onPointerDown`, `onPointerMove` y `onPointerUp`, validando por límites de pixeles (Math Thresholds).

**Consecuencias Positivas:**
- Independencia total de librerías extra, haciéndolo ultra liviano.
- Abstracción absoluta personalizable (como el umbral de disparo local - 80px).
- Evita el arrastre de configuraciones opacas e inflexibles propias de herramientas pesadas orientadas a drag & drop clásicos.

**Consecuencias Negativas:**
- Se excluyen del alcance comportamientos físicos avanzados "gratuitos" como Inercia/Momentum, Velocidad del Fling en eje dinámico, y resortes elásticos (rubber banding).
- Obligó a asumir limitaciones (por ejemplo, omitir tracking diagonal preciso).

**Alternativas Consideradas:**
- **`react-use-gesture` + `react-spring`:** Brindaría fluidez física estelar de nivel nativo, pero al coste exponencial en pesos de empaquetado y curva de aprendizaje estricta para el equipo.

---

## ADR-003: Uso de TMDB API como Fuente de Datos

**Contexto:**
Se requiere ingestar de una biblioteca expansiva comercial, categorizada eficientemente, de la cual se puedan requerir carátulas de alta calidad e info sin costos masivos.

**Decisión:**
Adoptar **The Movie Database (TMDB API v3)**. 

**Consecuencias Positivas:**
- Capacidad de usar parámetros complejos por URL como paginado dinámico y filtrado cruzado por géneros/años (`/discover/movie`).
- Provee un CDN de imágenes robusto y escalable (resoluciones adaptativas `w500`, original, etc).
- Coste cero garantizado en la barrera tier 1 y excelente localización hispana nativa en sinopsis.

**Consecuencias Negativas:**
- Límite de carga estricta (Http 429 - Rate limit) puede dispararse al realizar múltiples pre-fetches en entornos locales React `Strict Mode`.
- Implica que en front puro tendremos que exponer la `import.meta.env.VITE_TMDB_KEY` si no contamos internamente con un endpoint que actúe de Proxy intercesor.

**Alternativas Consideradas:**
- **OMDB API:** Carece de mecanismos nativos de "Descubrimiento de tendencias" de igual amplitud, su búsqueda es meramente textual, y las imágenes de los posters son muy reducidas y de baja calidad.

---

## ADR-004: División de Roles (Agente AI vs Humano)

**Contexto:**
El modo de compilación general fluye dentro de una colaboración tipo Pair-Programming entre un Asistente Antigravity (LLM) y un Desarrollador Principal.

**Decisión:**
Mapear que las mecánicas estructurales repetitivas pero de alto tecnicismo fuesen delegadas al Agente, mientras la dirección y el contexto quedaba al lado del humano. 
**Delegado al Agente AI:** Construcción del motor de persistencia reductor, generación limpia de los types a partir de un API de caja negra, algorítmica matemática CSS inyectada para gestos 2D. 
**Realizado por el Humano:** Toma direccional arquitectónica (límite a context), restricciones productivas (Tailwind limitación inline), y carga de variables privadas/exclusión de git de la capa secret local `.env.local`. 

**Consecuencias Positivas:**
- Prototipado 10 veces más rápido para poder enfocarse rápidamente en refinado.
- Documento vivo automático dictado a la par de la escritura del código.

**Consecuencias Negativas:**
- Posibles puntos ciegos si el programador no audita las dependencias semánticas inyectadas por el Agente.

**Alternativas Consideradas:**
- Carga manual tradicional; descartada por el corto límite de tiempo para cumplir el milestone Fase 1.

---

## Próximas Decisiones Pendientes (Para Fase 2)

El desarrollo inicial provee una gran viga fundacional, dejando abierta las siguientes cuestiones para discutir:

1. **Escalabilidad de Almacenamiento Local:** Actualmente limitado a 50 records por `localStorage`. Si el producto abarca Power Users (sobre 1000 swipes), será imperativo debatir una refactorización hacia `IndexedDB` asíncrono para prevenir interrupciones (jank) y cuellos de botella del Main Thread.
2. **Back-end For Frontend (BFF) Proxy:** Definir la infraestructura de red para ocultar el Access Key (VITE_TMDB_KEY).
3. **PWA & Capacidades Offline:** Debatir la posible implementación de Web Workers para servir peticiones cacheadas de la lista principal en caso de baja o nula conexión móvil del usuario en el metro o viajes.
4. **Fluidé Física de Gestualidad Acorde:** Afrontar refinamientos sobre las matemáticas del Swipe actual con Físicas nativas (`react-spring`) si el feedback de Test de Usuario refleja rigidez en interacciones móviles rápidas de Flick.
