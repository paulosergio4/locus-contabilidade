#!/usr/bin/env bash
# Cria um banco temporário, aplica todas as migrações e roda os testes de acesso.
# Uso: npm run test:banco   (precisa de um Postgres local; no CI o GitHub fornece um)
set -euo pipefail
cd "$(dirname "$0")/../.."
BANCO="locus_teste_$$"
export PGUSER="${PGUSER:-postgres}"
export PGOPTIONS="-c client_min_messages=warning"
createdb "$BANCO"
trap 'dropdb --if-exists "$BANCO"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$BANCO" -f testes/banco/simular-supabase.sql
for arquivo in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$BANCO" -f "$arquivo"
done
psql -q -v ON_ERROR_STOP=1 -d "$BANCO" -o /dev/null -f testes/banco/testes.sql
echo "Banco: todas as migrações e testes de acesso passaram."
