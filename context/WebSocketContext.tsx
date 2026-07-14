// "use client";

// import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
// import { getAccessToken } from "@/lib/api";
// import toast from "react-hot-toast";

// interface Notification {
//   id: string;
//   type: string;
//   message: string;
//   data?: any;
//   timestamp: Date;
//   read: boolean;
// }

// interface WebSocketContextType {
//   notifications: Notification[];
//   unreadCount: number;
//   markAsRead: (id: string) => void;
//   markAllAsRead: () => void;
//   clearAll: () => void;
//   isConnected: boolean;
// }

// const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// export function WebSocketProvider({ children }: { children: React.ReactNode }) {
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const socketRef = useRef<WebSocket | null>(null);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const isIntentionalClose = useRef(false);
//   // Guard against StrictMode double-mount creating two connections
//   const isConnecting = useRef(false);

//   const connect = useCallback(() => {
//     const token = getAccessToken();
//     if (!token) return;

//     // Prevent duplicate connections (React StrictMode double-mount)
//     if (isConnecting.current) return;
//     if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

//     // Close any lingering socket before creating a new one
//     if (socketRef.current) {
//       socketRef.current.onclose = null; // prevent reconnect trigger
//       socketRef.current.close();
//       socketRef.current = null;
//     }

//     isConnecting.current = true;

//     const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`;
//     const socket = new WebSocket(wsUrl);
//     socketRef.current = socket;

//     socket.onopen = () => {
//       isConnecting.current = false;
//       setIsConnected(true);
//       console.log("🔗 WebSocket connected");
//     };

//     socket.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         const newNotification: Notification = {
//           id: `${Date.now()}-${Math.random()}`,
//           type: data.type || "notification",
//           message: data.message || "New notification",
//           data: data.data || {},
//           timestamp: new Date(),
//           read: false,
//         };
//         setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
//         // Show toast for new notifications
//         toast.success(data.message || "New notification");
//       } catch (e) {
//         console.error("Failed to parse notification:", e);
//       }
//     };

//     socket.onclose = () => {
//       isConnecting.current = false;
//       setIsConnected(false);
//       console.log("🔌 WebSocket disconnected");

//       if (isIntentionalClose.current) return;

//       // Attempt reconnect after 3 seconds
//       if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
//       reconnectTimeoutRef.current = setTimeout(() => {
//         connect();
//       }, 3000);
//     };

//     socket.onerror = (error) => {
//       isConnecting.current = false;
//       console.error("WebSocket error:", error);
//     };
//   }, []);

//   useEffect(() => {
//     isIntentionalClose.current = false;
//     connect();
//     return () => {
//       isIntentionalClose.current = true;
//       isConnecting.current = false;
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }
//       if (socketRef.current) {
//         socketRef.current.onclose = null; // prevent reconnect on cleanup
//         socketRef.current.close();
//         socketRef.current = null;
//       }
//     };
//   }, [connect]);

//   const markAsRead = (id: string) => {
//     setNotifications((prev) =>
//       prev.map((n) => (n.id === id ? { ...n, read: true } : n))
//     );
//   };

//   const markAllAsRead = () => {
//     setNotifications((prev) =>
//       prev.map((n) => ({ ...n, read: true }))
//     );
//   };

//   const clearAll = () => {
//     setNotifications([]);
//   };

//   const unreadCount = notifications.filter((n) => !n.read).length;

//   return (
//     <WebSocketContext.Provider
//       value={{
//         notifications,
//         unreadCount,
//         markAsRead,
//         markAllAsRead,
//         clearAll,
//         isConnected,
//       }}
//     >
//       {children}
//     </WebSocketContext.Provider>
//   );
// }

// export function useWebSocket() {
//   const context = useContext(WebSocketContext);
//   if (context === undefined) {
//     throw new Error("useWebSocket must be used within a WebSocketProvider");
//   }
//   return context;
// }