import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useWebSocket() {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnecting = useRef(false);

  const connect = useCallback(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token') || localStorage.getItem('token') || null
      : null;

    if (!isAuthenticated || !token) {
      return;
    }

    // Avoid creating multiple connections
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;
    if (isConnecting.current) return;

    isConnecting.current = true;

    // const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`;
    // hooks/useWebSocket.ts
    const backendHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:8000';
    const protocol = process.env.NEXT_PUBLIC_WS_PROTOCOL || 'ws';
    const wsUrl = `${protocol}://${backendHost}/ws/notifications/?token=${token}`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] ✅ Connected');
      reconnectAttempts.current = 0;
      isConnecting.current = false;
    };

    ws.onmessage = (event) => {
      console.log('[WebSocket] 📩 Raw message:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] 📩 Parsed:', data);
        setMessages(prev => [...prev, data]);
      } catch (e) {
        console.error('[WebSocket] Parse error:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] ❌ Error:', err);
      isConnecting.current = false;
    };

    ws.onclose = (ev) => {
      console.log('[WebSocket] ❌ Closed:', ev.code, ev.reason);
      wsRef.current = null;
      isConnecting.current = false;

      // Auto-reconnect on abnormal close
      if (ev.code !== 1000 && reconnectAttempts.current < 5 && isAuthenticated) {
        reconnectAttempts.current += 1;
        const delay = Math.min(2000 * reconnectAttempts.current, 10000);
        console.log(`[WebSocket] Reconnecting attempt ${reconnectAttempts.current} in ${delay}ms...`);
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    wsRef.current = ws;
  }, [isAuthenticated]);

  useEffect(() => {
    connect();

    return () => {
      console.log('[WebSocket] Cleaning up...');
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmount');
      }
      wsRef.current = null;
      isConnecting.current = false;
    };
  }, [connect]);

  const removeMessage = (orderId: number) => {
    setMessages(prev => prev.filter(msg => msg.order_id !== orderId));
  };

  return { messages, removeMessage, socket: wsRef.current };
}