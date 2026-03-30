# Documentación del Sistema de Diseño: Hunger Car Wash

## 1. Visión General y North Star Creativo: "Precisión Aerodinámica"

Este sistema de diseño no es simplemente una interfaz de gestión; es una extensión de la ingeniería automotriz de alto rendimiento. Nuestra "North Star" creativa es la **Precisión Aerodinámica**. Al igual que el flujo de aire sobre la carrocería de un deportivo, la interfaz debe sentirse fluida, sin fricciones y técnica.

Para alejarnos del aspecto de "plantilla genérica", este sistema rompe la rigidez del grid tradicional mediante el uso de **asimetría intencional** y **jerarquía editorial**. Los elementos no solo se sientan uno al lado del otro; se superponen y respiran, utilizando el espacio negativo como una herramienta de enfoque, no solo como un vacío. La experiencia debe sentirse como el tablero de un vehículo premium: oscura, envolvente y lista para la acción inmediata.

---

### 2. Paleta de Colores y Textura Visual

La paleta se aleja de los grises planos para abrazar el **Azul Acero** y el **Cian profundo**, creando una atmósfera de "limpieza tecnológica".

#### Colores Core (Material Design Tokens)
- **Background (Fondo):** `#0b1326` — Un azul noche profundo que reduce la fatiga visual del cajero.
- **Primary (Acción):** `#8ed5ff` — El "brillo" del acabado final. Se usa para llamadas a la acción principales.
- **Primary Container:** `#38bdf8` — Para estados activos y superficies que requieren atención.
- **Surface Variants:** Desde `surface-container-lowest` (#060e20) hasta `highest` (#2d3449).

#### La Regla de "No-Line" (Sin Bordes)
Queda estrictamente prohibido el uso de bordes de 1px para separar secciones. La arquitectura visual debe definirse mediante:
1.  **Cambios Tonalidades de Superficie:** Un `surface-container-low` descansando sobre el `background` genera una división natural y sofisticada.
2.  **Espaciado Generoso:** El blanco (o espacio vacío) es nuestro principal separador.

#### Regla de "Cristal y Gradiente"
Para inyectar alma al sistema, los elementos flotantes (modales, menús rápidos) deben utilizar **Glassmorphism**: fondo semi-transparente con `backdrop-blur` de 16px. Los botones principales deben llevar un sutil gradiente lineal desde `primary` a `primary_container` para simular profundidad y volumen metálico.

---

### 3. Tipografía: El Contraste Editorial

Combinamos la tecnicidad de una fuente de exhibición con la legibilidad humana.

- **Display & Headline (Space Grotesk):** Una fuente geométrica y moderna que evoca velocidad. Usamos escalas grandes (Display-LG: 3.5rem) con tracking negativo (-2%) para títulos de secciones, creando un impacto visual de revista de autos.
- **Body & Label (Manrope):** Una sans-serif humanista optimizada para lectura rápida de datos técnicos. Todo el texto de interfaz de usuario (labels de inputs, tablas de precios) utiliza Manrope para garantizar que el cajero no cometa errores bajo presión.

---

### 4. Elevación y Profundidad: Capas Tonales

En lugar de sombras paralelas genéricas, utilizamos el **Principio de Apilamiento Tonal**:

- **Nesting (Anidación):** Para crear jerarquía, coloca una tarjeta de color `surface-container-highest` dentro de una sección `surface-container-low`. Esto crea una elevación visual orgánica.
- **Sombras Ambientales:** Si un elemento debe "flotar" (ej. un botón flotante de nuevo servicio), la sombra debe ser extra-difusa (Blur: 24px) con una opacidad del 8%, usando una versión tintada de `on_surface` (azulada) en lugar de negro puro.
- **Ghost Border Fallback:** Solo si es crítico para la accesibilidad, usa un borde sutil con el token `outline_variant` al 15% de opacidad.

---

### 5. Componentes de Alto Rendimiento

#### Botones (Touch-First)
Dado que la interfaz es táctil para cajeros, el tamaño mínimo de los botones es de **4rem (64px)** de altura.
- **Primario:** Gradiente de cian, esquinas redondeadas `xl` (0.75rem), texto en `title-md` negrita.
- **Secundario:** Fondo `surface-container-highest` con texto `primary`. Sin borde.
- **Estado de Error:** `error_container` con texto `on_error_container` para cancelaciones críticas.

#### Tarjetas (Cards) de Servicio
- Prohibido el uso de líneas divisorias.
- El contenido se separa mediante bloques de color o el uso de `title-lg` para encabezados de tarjeta.
- Al interactuar (hover/touch), la tarjeta debe escalar ligeramente (1.02x) y cambiar su superficie a `surface_bright`.

#### Inputs y Selección
- **Inputs:** Fondo `surface_container_lowest`. El estado de foco debe iluminar el "Ghost Border" a un 100% de opacidad de `primary`.
- **Chips de Filtro:** Forma `full` (9999px). Ideales para seleccionar tipos de lavado (Express, Premium, Integral).

---

### 6. Do's & Don'ts (Qué hacer y qué no)

**✅ Sí (Do):**
- Usar el espaciado `16` (5.5rem) para separar secciones principales.
- Aplicar `backdrop-blur` en la barra de navegación superior para que el contenido pase por debajo con elegancia.
- Usar el contraste alto (`on_background` sobre `background`) para asegurar que el cajero vea la pantalla bajo luz solar directa o nocturna.

**❌ No (Don't):**
- No usar bordes negros o grises de alto contraste.
- No amontonar elementos; si hay duda, añade más espacio de la escala de espaciado (ej. de `4` a `6`).
- No usar sombras oscuras y pesadas que ensucien la interfaz.
- No usar tipografías con serifa o decorativas; la claridad es prioridad.

---

### 7. Paleta para Personalización del Cliente

Para que el cliente pueda ajustar la identidad sin romper el sistema, se definen estos tres "Accent Slots":

1.  **Color de Poder (Primary):** `#8ed5ff` (Cian por defecto). Cambiar este token actualiza botones y estados activos.
2.  **Color de Superficie (Surface):** `#0b1326` (Azul noche). Puede tornarse a un gris carbón profundo si el cliente lo prefiere.
3.  **Radio de Curvatura (Rounding):** El cliente puede elegir entre el estilo `xl` (moderno/suave) o `none` (brutalista/técnico) para todos los contenedores.

---
*Este sistema de diseño está construido para ser escalable, accesible y, sobre todo, para proyectar la imagen de un servicio de limpieza automotriz de primer nivel.*