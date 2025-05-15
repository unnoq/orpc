export interface experimental_ExposedORPCHandlerChannel {
  send(message: string | ArrayBufferLike): void
  receive(callback: (message: string | ArrayBufferLike) => void): void
}
