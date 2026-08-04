import type { Server as HttpServer } from 'node:http';
import type { Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';

/**
 * Servidor Socket.IO raiz — o assistente de IA. Alem da autenticacao, exige a
 * capacidade `MANAGE_CHAT` pelo fecho de grupos (MASTER bypassa) e que o
 * assistente esteja habilitado e configurado no Setting.
 *
 * E o servidor, nao um namespace: os demais namespaces sao criados a partir do
 * `SocketIOServer` que este metodo devolve.
 */
export abstract class ChatSocketContractService {
  abstract init(httpServer: HttpServer, decode: JwtDecoder): SocketIOServer;
}
