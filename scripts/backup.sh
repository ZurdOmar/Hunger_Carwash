#!/bin/bash

# Script de respaldo automático para Hunger CarWash
# Project Ref: mmarhgfumtzsmppntylh

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}== Supabase Backup Tool - Hunger CarWash ==${NC}"

# Cargar variables desde .env.local si existe
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Verificar si la contraseña está definida en el entorno
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}Error: SUPABASE_DB_PASSWORD no encontrada en el entorno.${NC}"
    read -sp "Introduce la contraseña de la base de datos de Supabase: " SUPABASE_DB_PASSWORD
    echo ""
fi

PROJECT_REF="mmarhgfumtzsmppntylh"
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.com:5432/postgres"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="backups/backup_${DATE}"
ZIP_NAME="backups/backup_hunger_carwash_${DATE}.zip"

# Crear directorio de respaldo
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}[1/4] Respaldando Roles...${NC}"
npx supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/roles.sql" --role-only

echo -e "${BLUE}[2/4] Respaldando Esquema...${NC}"
npx supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/schema.sql"

echo -e "${BLUE}[3/4] Respaldando Datos...${NC}"
npx supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/data.sql" --data-only --use-copy

echo -e "${BLUE}[4/4] Comprimiendo en ZIP...${NC}"
zip -j "$ZIP_NAME" "$BACKUP_DIR/roles.sql" "$BACKUP_DIR/schema.sql" "$BACKUP_DIR/data.sql" > /dev/null

# Limpiar archivos temporales
rm -rf "$BACKUP_DIR"

echo -e "${GREEN}✅ Respaldo completado con éxito!${NC}"
echo -e "${GREEN}Archivo generado: ${ZIP_NAME}${NC}"
