import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';

// Contexto de visibilidade de um campo: a lista, o formulario (adicionar/editar)
// e a tela de detalhe.
export type FieldVisibilityContext = 'list' | 'form' | 'detail';

export type FieldVisibilityInput = {
  fields: IField[];
  context: FieldVisibilityContext;
  // Visitante => undefined/null.
  userId?: string | null;
  // Sinais de privilegio vindos do TableAccessMiddleware (request.ownership).
  isOwner?: boolean;
  isAdministrator?: boolean;
};

@Service()
export abstract class FieldVisibilityContractService {
  /**
   * Slugs dos campos NAO nativos que devem ficar ocultos no contexto para o
   * usuario. Vazio quando o usuario e privilegiado (MASTER/ADMINISTRATOR/dono/
   * admin da tabela). Avalia o binding `field.permissions[context]`
   * (PUBLIC libera, NOBODY oculta, GROUP libera se o grupo estiver no fecho do
   * usuario) com fallback ao boolean legado `showIn*` quando o campo ainda nao
   * tem o novo mapa.
   */
  abstract hiddenSlugs(input: FieldVisibilityInput): Promise<Set<string>>;

  /**
   * Remove de `target` as chaves listadas em `hidden`. Usado tanto para
   * projetar rows na resposta (list/detail) quanto para descartar escritas em
   * campos ocultos no formulario (form).
   */
  abstract project<T extends Record<string, unknown>>(
    target: T,
    hidden: Set<string>,
  ): T;
}
