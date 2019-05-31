export interface PasswordResetService {
  requestReset(email: string): Promise<void>
}