#!/bin/sh
# Migration: relationship-links-to-fk
# Converte vínculos (RelationshipLink) de relacionamentos 1:1 e 1:N para FK
# single inline na própria row (modelo FK-inline). N:N segue no pivô (links
# preservados). Roda DEPOIS da 15 (embedded → links) e 16 (endpoint flags).
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "17-migrate-relationship-links-to-fk" "$@"
