/// <reference types="node" />

declare function sendwithus(apiKey: string): SendWithUsApi

declare interface SendWithUsApi {
  send(
    args: {
      template: string,
      recipient: {
        address: string,
        name?: string
      },
      template_data?: Record<string, any>,
      sender?: {
        address: string,
        reply_to?: string,
        name?: string
      },
      cc?: { address: string }[],
      bcc?: { address: string }[],
      headers?: Record<string, any>,
      esp_account?: string,
      locale?: string,
      version_name?: string
    },
    callback: (err: Error, response: any) => void
  ): void
}

export default sendwithus;

export { SendWithUsApi };