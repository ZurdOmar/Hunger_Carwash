#!/usr/bin/env bash
# ============================================================================
# set-trial.sh — fija/extiende/quita la vigencia del trial del demo.
#   ./set-trial.sh --days 14        → vence en 14 días desde ahora
#   ./set-trial.sh '2026-08-31'     → vence en esa fecha (timestamptz)
#   ./set-trial.sh '2026-08-31 23:59:00-06'
#   ./set-trial.sh --off            → sin límite (trial ilimitado)
# ============================================================================
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_env.sh"

usage() { echo "Uso: $0 --days N | <timestamp> | --off" >&2; exit 1; }
[[ $# -ge 1 ]] || usage

case "$1" in
  --days)
    [[ "${2:-}" =~ ^[0-9]+$ ]] || usage
    "${PG[@]}" -c \
      "update public.demo_config set trial_expires_at = now() + make_interval(days => $2) where id;"
    ;;
  --off)
    "${PG[@]}" -c \
      "update public.demo_config set trial_expires_at = null where id;"
    ;;
  -*)
    usage
    ;;
  *)
    "${PG[@]}" -v ts="$1" -c \
      "update public.demo_config set trial_expires_at = (:'ts')::timestamptz where id;"
    ;;
esac

"${PG[@]}" -c \
  "select trial_expires_at,
          (trial_expires_at is null or trial_expires_at > now()) as vigente
     from public.demo_config;"
echo "✓ Vigencia del trial actualizada."
