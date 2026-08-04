/**
 * Dono de um registro. O campo `creator` chega em formatos diferentes conforme
 * o caminho de leitura (string, ObjectId cru sem populate, ou objeto populado
 * `{ _id }`), e o enforcement "apenas as suas" do perfil contributor precisa de
 * uma unica resposta.
 */
export abstract class RowOwnershipContractService {
  /** Id do criador em string, ou `null` quando ausente. */
  abstract resolveCreatorId(creator: unknown): string | null;
}
