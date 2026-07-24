#!/usr/bin/env bash
# ============================================================================
# demo-snapshot.sh — congela el estado ACTUAL del demo como "fecha del respaldo".
# Genera demo_baseline.sql (data-only de public, sin perfiles ni demo_config).
# Corre esto cuando quieras fijar un nuevo punto de restauración.
# ============================================================================
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_env.sh"

echo "Snapshot del proyecto DEMO ($DEMO_PROJECT_REF)"
echo "  → $BASELINE_FILE"

"${PGDUMP[@]}" \
  --data-only --schema=public \
  --exclude-table=public.perfiles \
  --no-owner --no-privileges \
  -f "$BASELINE_FILE"

echo "✓ Baseline generado ($(wc -l < "$BASELINE_FILE") líneas)."
echo "  Este es el estado al que 'demo-reset.sh' restaurará."
