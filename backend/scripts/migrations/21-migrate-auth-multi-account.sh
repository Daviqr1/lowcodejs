#!/bin/sh
# Migration: auth-multi-account
# Marcadora (no-op): as sessões multi-conta são 100% baseadas em cookies indexados
# (accessToken_<id>/refreshToken_<id> + activeAccountId) — não há campo persistido
# no User nem coleção a migrar. Registra o marker MIGRATION_AUTH_MULTI_ACCOUNT_AT
# só para manter a trilha de versão completa.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "21-migrate-auth-multi-account" "$@"
