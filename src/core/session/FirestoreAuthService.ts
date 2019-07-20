export type FirestoreAssests = {
  [asset: string]: string[]
}

export interface FirestoreTokenResponse {
  token: string
}

export interface FirestoreAuthService { 
  issueToken(assests: FirestoreAssests): Promise<FirestoreTokenResponse>;
} 