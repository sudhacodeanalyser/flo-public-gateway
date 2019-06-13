export interface PasswordResetService {
  requestReset(email: string): Promise<void>

  resetPassword(authToken: string, userId: string, oldPassword: string, newPassword: string): Promise<void>
}