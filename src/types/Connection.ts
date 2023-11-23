export enum ConnectionStatus {
  /**
   * The provider is fully connected.
   */
  Connected = "0:connected",

  /**
   * The provider successfully disconnected from the server.
   */
  Disconnected = "1:disconnected",

  /**
   * The provider is in the process of connecting to the server.
   */
  Connecting = "2:connecting",

  /**
   * The provider disconnected due to an error.
   */
  DisconnectedError = "3:disconnected-error",
}

export function mergeStatuses(a: ConnectionStatus, b: ConnectionStatus): ConnectionStatus {
  if (a > b) return a;
  return b;
}
