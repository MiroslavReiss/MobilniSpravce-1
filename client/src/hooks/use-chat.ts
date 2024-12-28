import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
}

interface ChatHook {
  messages: Message[];
  sendMessage: (content: string, userId: number) => void;
  isConnected: boolean;
}

export function useChat(): ChatHook {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Chat připojen",
        description: "Úspěšně jste se připojili k chatu",
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onclose = () => {
      setIsConnected(false);
      toast({
        title: "Chat odpojen",
        description: "Připojení k chatu bylo přerušeno",
        variant: "destructive",
      });
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback((content: string, userId: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "chat",
        content,
        userId,
      }));
    } else {
      toast({
        title: "Chyba",
        description: "Zprávu se nepodařilo odeslat",
        variant: "destructive",
      });
    }
  }, [socket]);

  return {
    messages,
    sendMessage,
    isConnected,
  };
}
