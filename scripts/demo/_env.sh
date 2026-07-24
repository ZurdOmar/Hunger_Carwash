#!/usr/bin/env bash
# ============================================================================
# _env.sh — carga .env.demo y valida que apuntamos al proyecto DEMO.
# Sourced por demo-snapshot.sh, demo-reset.sh y set-trial.sh.
# El password se pasa por PGPASSWORD (env), NUNCA en la línea de comandos.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.demo"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: falta $ENV_FILE (copia .env.demo.example a .env.demo y rellénalo)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DEMO_PROJECT_REF:?falta DEMO_PROJECT_REF en .env.demo}"
: "${DEMO_DB_HOST:?falta DEMO_DB_HOST en .env.demo}"
: "${DEMO_DB_PORT:=5432}"
: "${DEMO_DB_USER:=postgres}"
: "${DEMO_DB_NAME:=postgres}"
: "${DEMO_DB_PASSWORD:?falta DEMO_DB_PASSWORD en .env.demo}"
: "${DEMO_KEEP_EMAILS:?falta DEMO_KEEP_EMAILS en .env.demo}"

# Guarda de seguridad: el host DEBE contener el project ref del demo. Evita que
# un .env.demo mal configurado apunte a producción y corramos un reset destructivo.
# (Usa la conexión DIRECTA db.<ref>.supabase.co para estos scripts, no el pooler.)
if [[ "$DEMO_DB_HOST" != *"$DEMO_PROJECT_REF"* ]]; then
  echo "ERROR: DEMO_DB_HOST ('$DEMO_DB_HOST') no contiene DEMO_PROJECT_REF ('$DEMO_PROJECT_REF')." >&2
  echo "       Rechazando por seguridad: no vaya a ser producción." >&2
  exit 1
fi

export PGPASSWORD="$DEMO_DB_PASSWORD"
export PGSSLMODE=require

PG=(psql -h "$DEMO_DB_HOST" -p "$DEMO_DB_PORT" -U "$DEMO_DB_USER" -d "$DEMO_DB_NAME" -v ON_ERROR_STOP=1)
PGDUMP=(pg_dump -h "$DEMO_DB_HOST" -p "$DEMO_DB_PORT" -U "$DEMO_DB_USER" -d "$DEMO_DB_NAME")
BASELINE_FILE="$SCRIPT_DIR/demo_baseline.sql"
