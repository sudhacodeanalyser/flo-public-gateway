export enum OnboardingEvent {
  PAIRED = 1,
  INSTALLED = 2,
  SYSTEM_MODE_UNLOCKED = 3
}

export interface OnboardingLog {
  icdId: string;
  createdAt: string;
  event: OnboardingEvent;
}