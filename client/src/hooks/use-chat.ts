import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  username: string;
  displayName?: string;
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
  const seenMessageIds = new Set<number>();

  // Fetch message history
  const { data: messageHistory } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  useEffect(() => {
    if (messageHistory) {
      messageHistory.forEach(msg => seenMessageIds.add(msg.id));
      setMessages(messageHistory);
    }
  }, [messageHistory]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Chat připojen",
        description: "Úspěšně jste se připojili k chatu",
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message && message.id && message.content && !seenMessageIds.has(message.id)) {
          seenMessageIds.add(message.id);
          setMessages((prev) => [...prev, message]);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      toast({
        title: "Chat odpojen",
        description: "Připojení k chatu bylo přerušeno",
        variant: "destructive",
      });

      setTimeout(() => {
        toast({
          title: "Reconnecting",
          description: "Pokus o znovupřipojení...",
        });
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Chyba chatu",
        description: "Nastala chyba v připojení",
        variant: "destructive",
      });
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = useCallback((content: string, userId: number) => {
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: "chat",
          content,
          userId,
        }));
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Chyba",
          description: "Zprávu se nepodařilo odeslat",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Chyba",
        description: "Nejste připojeni k chatu",
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