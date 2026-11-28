import { io, type Socket } from "socket.io-client";
import { getStoredAccessToken } from "@/lib/api";
import { wsBaseUrl } from "@/lib/config";

export const NOTIFICATION_SOCKET_NAMESPACE = "/notifications";
export const NOTIFICATION_SOCKET_PATH = "/ws/notifications";

export function createNotificationSocket(): Socket {
  return io(`${wsBaseUrl}${NOTIFICATION_SOCKET_NAMESPACE}`, {
    path: NOTIFICATION_SOCKET_PATH,
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
    auth: (cb) => {
      cb({ token: getStoredAccessToken() ?? "" });
    },
  });
}
