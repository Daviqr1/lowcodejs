export abstract class PasswordContractService {
  /** Hash da senha em texto plano. */
  abstract hash(password: string): Promise<string>;

  /** `true` quando o texto plano corresponde ao hash. */
  abstract compare(plain: string, hashed: string): Promise<boolean>;

  /**
   * `true` quando o valor ja e um hash — evita re-hashear um valor que veio de
   * volta do banco num update parcial.
   */
  abstract isHashed(value: string): boolean;
}
