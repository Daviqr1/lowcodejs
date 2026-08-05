export type RefreshTokenPayload = {
  _id: string;
  /** Geracao gravada no refresh token. Ausente nos tokens anteriores = 0. */
  sessionVersion?: number;
};
