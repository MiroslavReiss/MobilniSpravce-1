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

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const connect = () => {
      if (!isMounted) return;

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

        // Silent reconnect with exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;

        if (isMounted) {
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

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    };

    // Initial connection
    connect();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && isMounted) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
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
  }, [user, isConnected]);

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