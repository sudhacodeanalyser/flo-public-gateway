export default interface EmailClient {
  send(email: string, templateId: string, data: Record<string, any>): Promise<void>;
}