export interface PasswordResetService {
  requestReset(email: string, locale?: string, app?: string): Promise<void>

  resetPassword(authToken: string, userId: string, oldPassword: string, newPassword: string): Promise<void>
}