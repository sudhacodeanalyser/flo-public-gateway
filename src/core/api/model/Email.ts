
export interface BatchUnsubscribePreferences {
  emailType: number;
  unSubscribed: string[];
  allowed: string[];
};

export interface UnsubscribePreferences {
  email: string;
  emailTypes: number[];
}
