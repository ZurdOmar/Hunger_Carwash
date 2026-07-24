#!/usr/bin/env bash
# ============================================================================
# demo-reset.sh — restaura el demo al baseline y poda usuarios de la demo.
#   1. Trunca todas las tablas de public (menos perfiles y demo_config).
#   2. Recarga demo_baseline.sql (FKs desactivadas con session_replication_role).
#   3. Borra los auth.users cuyo email no esté en DEMO_KEEP_EMAILS
#      (cascada elimina también su fila en perfiles).
# Pide confirmación escribiendo el project ref. No toca la fecha del trial.
# ============================================================================
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_env.sh"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "ERROR: no existe $BASELINE_FILE. Corre demo-snapshot.sh primero." >&2
  exit 1
fi

echo "⚠️  RESET DESTRUCTIVO del proyecto DEMO"
echo "    Host: $DEMO_DB_HOST"
echo "    Ref:  $DEMO_PROJECT_REF"
echo "    - Trunca y recarga las tablas de negocio desde el baseline."
echo "    - Conserva solo estos usuarios: $DEMO_KEEP_EMAILS"
echo "      (cualquier otro usuario creado durante la demo será eliminado)."
read -r -p "Para confirmar, escribe el project ref del demo: " CONFIRM
if [[ "$CONFIRM" != "$DEMO_PROJECT_REF" ]]; then
  echo "Cancelado (no coincide)." >&2
  exit 1
fi

# Lista de tablas a truncar: todas las de public menos perfiles y demo_config.
TABLES=$("${PG[@]}" -t -A -c \
  "select string_agg(format('%I.%I', schemaname, tablename), ', ')
     from pg_tables
    where schemaname='public'
      and tablename <> 'perfiles';")

if [[ -z "${TABLES// /}" ]]; then
  echo "ERROR: no se encontraron tablas de negocio en public. Abortando." >&2
  exit 1
fi

echo "→ Restaurando datos desde el baseline…"
"${PG[@]}" <<SQL
begin;
set session_replication_role = replica;
truncate table $TABLES restart identity cascade;
\i $BASELINE_FILE
set session_replication_role = default;
commit;
SQL

echo "→ Podando usuarios creados durante la demo…"
"${PG[@]}" -v keep="$DEMO_KEEP_EMAILS" -c \
  "delete from auth.users
     where lower(email) <> all (
       array(select trim(x) from unnest(string_to_array(lower(:'keep'), ',')) as x)
     );"

echo "✓ Demo restaurada al baseline y usuarios podados."
