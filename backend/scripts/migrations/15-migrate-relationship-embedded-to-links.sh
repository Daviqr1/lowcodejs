#!/bin/sh
# Migration: relationship-embedded-to-links
# Converte relacionamentos embedded (array de ObjectIds em row[field.slug]) para
# o modelo de pivô: cria RelationshipDefinition + campo-espelho no target + um
# RelationshipLink por ObjectId, valida contagem por row e faz $unset do array.
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT setado;
# campos já com relationship.relationshipId são pulados.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "15-migrate-relationship-embedded-to-links" "$@"
