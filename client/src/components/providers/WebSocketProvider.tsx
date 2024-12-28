import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useUser } from "@/hooks/use-user";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useUser();
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const maxBackoffTime = 10000; // 10 seconds

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const connect = () => {
      if (!isMounted) return;
      if (reconnectAttemptRef.current >= maxReconnectAttempts) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);

        // Silent reconnect with limited exponential backoff
        const backoffTime = Math.min(
          1000 * Math.pow(1.5, reconnectAttemptRef.current),
          maxBackoffTime
        );

        if (isMounted && reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (document.visibilityState === 'visible' && isMounted) {
              connect();
            }
          }, backoffTime);
        }
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
      };

      setSocket(ws);
    };

    connect();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' && 
        !isConnected && 
        isMounted &&
        reconnectAttemptRef.current < maxReconnectAttempts
      ) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socket) {
        socket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  // Reset reconnect attempts when user changes
  useEffect(() => {
    reconnectAttemptRef.current = 0;
  }, [user]);

  const sendMessage = (message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}