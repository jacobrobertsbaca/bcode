export enum ConnectionStatus {
  /**
   * We are fully connected to the service.
   */
  Connected = "0:connected",

  /**
   * We successfully disconnected from the service without error.
   */
  Disconnected = "1:disconnected",

  /**
   * We are currently connecting to the service.
   */
  Connecting = "2:connecting",

  /**
   * We disconnected from the service due to a fatal error.
   */
  DisconnectedError = "3:disconnected-error",
}

export function mergeStatuses(a: ConnectionStatus, b: ConnectionStatus): ConnectionStatus {
  if (a > b) return a;
  return b;
}
