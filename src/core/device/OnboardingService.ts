
export interface OnboardingService {
  markDeviceInstalled(macAddress: string): Promise<void>;
}