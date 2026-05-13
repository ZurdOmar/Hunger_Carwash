import * as React from "react";
import { supabase } from "@/lib/supabase";
import {
  abrirTurno,
  getDiasDesdeApertura,
  getTurnoActivo,
  type Turno,
} from "@/lib/turnosService";

export interface UseTurnoActualOptions {
  // Si está presente, el hook abrirá automáticamente un turno cuando no exista
  // uno activo (usando el fondo_caja_default de la sucursal matriz).
  // Lo usa el dashboard. POS y Operations lo dejan undefined → solo lectura.
  autoOpenForUserId?: string | null;
}

export interface UseTurnoActualResult {
  turno: Turno | null;
  diasDesdeApertura: number;
  tieneOrdenes: boolean;
  loaded: boolean;
  refresh: () => void;
  clear: () => void;
}

// Centraliza la detección del turno activo + días + count de órdenes.
// Antes esta lógica vivía duplicada en pos/page.tsx y dashboard/page.tsx
// con riesgo de divergir.
export function useTurnoActual(
  options: UseTurnoActualOptions = {}
): UseTurnoActualResult {
  const { autoOpenForUserId } = options;
  const [turno, setTurno] = React.useState<Turno | null>(null);
  const [tieneOrdenes, setTieneOrdenes] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: matriz } = await supabase
        .from("sucursales")
        .select("id, fondo_caja_default")
        .eq("es_matriz", true)
        .single();

      if (!matriz || cancelled) {
        if (!cancelled) setLoaded(true);
        return;
      }

      let activo = await getTurnoActivo(matriz.id);

      if (!activo && autoOpenForUserId) {
        const fondoInicial = Number(matriz.fondo_caja_default ?? 0);
        const nuevoId = await abrirTurno(matriz.id, autoOpenForUserId, fondoInicial);
        if (nuevoId && !cancelled) {
          activo = await getTurnoActivo(matriz.id);
        }
      }

      if (cancelled) return;
      setTurno(activo);

      if (activo) {
        const { count } = await supabase
          .from("ordenes_servicio")
          .select("id", { count: "exact", head: true })
          .eq("turno_id", activo.id);
        if (!cancelled) setTieneOrdenes((count ?? 0) > 0);
      } else {
        if (!cancelled) setTieneOrdenes(false);
      }

      if (!cancelled) setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [autoOpenForUserId, refreshKey]);

  const diasDesdeApertura = React.useMemo(
    () => getDiasDesdeApertura(turno),
    [turno]
  );

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const clear = React.useCallback(() => {
    setTurno(null);
    setTieneOrdenes(false);
  }, []);

  return { turno, diasDesdeApertura, tieneOrdenes, loaded, refresh, clear };
}
