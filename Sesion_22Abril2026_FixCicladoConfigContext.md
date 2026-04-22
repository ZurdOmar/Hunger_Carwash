# Hunger Carwash — Sesión Técnica: 22 de Abril 2026
## Fix: Ciclado de peticiones en ConfigContext.tsx

---

## 1. Problema

Al iniciar sesión (especialmente con el rol de cajero), la aplicación disparaba las mismas consultas a Supabase una y otra vez en bucle infinito. Se podían ver docenas de peticiones repetidas en la pestaña Network del navegador.

**Síntoma**: Pestaña Network mostraba peticiones repetitivas a `precios_base`, `servicios`, `lavadores`, `cajones`, `reglas_promocion`, `ordenes_servicio` y `vehiculos` sin parar.

**Impacto**: Consumo excesivo de ancho de banda, lentitud en la interfaz, y carga innecesaria al servidor de Supabase. La app funcionaba pero era lenta.

---

## 2. Causa Raíz

El `useEffect` principal en `ConfigContext.tsx` tenía como dependencias `[user?.id, authLoading]`. Cada vez que el estado de autenticación "parpadeaba" (cosa que React y Supabase Auth hacen internamente con frecuencia), el efecto se volvía a ejecutar y descargaba **todos** los datos de nuevo, sin verificar si ya lo había hecho antes.

No existía ningún mecanismo para decir "ya descargué todo, no lo hagas otra vez".

---

## 3. Solución Aplicada

Se añadieron **dos guardas** (refs de React) que controlan cuándo se permite sincronizar:

### A. `lastSyncedUserId` (useRef)
- Almacena el `user.id` del último usuario para el que se descargaron datos.
- Si el usuario actual es el mismo que ya se sincronizó → **se salta la descarga**.
- Si es un usuario diferente (por ejemplo, se cerró sesión y entró otro) → **permite re-sincronizar**.

### B. `syncInProgress` (useRef)
- Bandera booleana que indica si hay una descarga en curso.
- Previene que dos descargas se ejecuten al mismo tiempo (condición de carrera).
- Se pone en `true` al iniciar y se limpia en `finally` al terminar (exitosa o no).

### Flujo corregido:
```
useEffect se ejecuta
  → ¿Auth cargando o sin usuario? → SALIR
  → ¿Ya sincronizado para este usuario? → SALIR
  → ¿Sincronización en curso? → SALIR
  → Marcar syncInProgress = true
  → Descargar todos los datos de Supabase
  → Marcar lastSyncedUserId = user.id
  → Limpiar syncInProgress = false
```

---

## 4. Archivo Modificado

### `src/lib/ConfigContext.tsx`

| Línea | Cambio |
|-------|--------|
| **3** | Añadido `useRef` al import de React |
| **71-72** | Nuevas variables: `lastSyncedUserId` y `syncInProgress` (useRef) |
| **87-90** | Guard anti-ciclado: verifica si ya se sincronizó o si hay sync en curso |
| **245-251** | `syncWithSupabase()` ahora usa `.then()` para marcar éxito y `.finally()` para limpiar la bandera |

**Total**: ~12 líneas añadidas, 1 línea modificada.

---

## 5. Qué NO se tocó

- El bug del cajero (redirect del middleware) ya estaba resuelto en un commit anterior (`1cdffba`).
- La lógica de negocio (órdenes, precios, lavadores, etc.) no fue modificada.
- Las funciones `addOrder`, `updateOrderStatus`, etc. siguen funcionando igual.

---

## 6. Pendiente

- [ ] Hacer commit y push a `produccion` → merge a `main` para que Vercel lo despliegue.
- [ ] Verificar en producción que la pestaña Network solo muestre UNA ronda de peticiones al iniciar sesión.
