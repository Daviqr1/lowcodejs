import 'fastify';

declare module 'fastify' {
  export interface FastifyRequest {
    table?: import('@application/core/entity.core').ITable;
    ownership?: {
      isOwner: boolean;
      isAdministrator: boolean;
      // Convidado com perfil que só pode agir sobre os próprios registros
      // (perfil contributor). O use-case da row valida row.creator.
      ownOnly?: boolean;
    };
  }
}
