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
  readBy?: number[];
}

interface ChatState {
  messages: Message[];
  onlineUsers: number[];
  readReceipts: Record<number, number[]>; // messageId -> userIds who read it
}

interface ChatHook {
  messages: Message[];
  sendMessage: (content: string, userId: number) => void;
  isConnected: boolean;
  onlineUsers: number[];
  readReceipts: Record<number, number[]>;
  markAsRead: (messageId: number, userId: number) => void;
}

export function useChat(): ChatHook {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    onlineUsers: [],
    readReceipts: {},
  });
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const seenMessageIds = new Set<number>();

  // Fetch message history
  const { data: messageHistory } = useQuery<{ messages: Message[], onlineUsers: number[] }>({
    queryKey: ['/api/messages'],
  });

  useEffect(() => {
    if (messageHistory) {
      messageHistory.messages.forEach(msg => seenMessageIds.add(msg.id));
      setChatState(prev => ({
        ...prev,
        messages: messageHistory.messages,
        onlineUsers: messageHistory.onlineUsers,
      }));
    }
  }, [messageHistory]);

  const markAsRead = useCallback((messageId: number, userId: number) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "read",
        messageId,
        userId,
      }));
    }
  }, [socket]);

  useEffect(() => {
    // Use the current host and protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Chat připojen",
        description: "Úspěšně jste se připojili k chatu",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            if (data.data && data.data.id && !seenMessageIds.has(data.data.id)) {
              seenMessageIds.add(data.data.id);
              setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, data.data],
                onlineUsers: data.data.onlineUsers,
              }));
            }
            break;

          case "read":
            setChatState(prev => ({
              ...prev,
              readReceipts: {
                ...prev.readReceipts,
                [data.messageId]: [
                  ...(prev.readReceipts[data.messageId] || []),
                  data.userId
                ]
              }
            }));
            break;

          case "userOffline":
            setChatState(prev => ({
              ...prev,
              onlineUsers: data.onlineUsers,
            }));
            break;
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
    messages: chatState.messages,
    sendMessage,
    isConnected,
    onlineUsers: chatState.onlineUsers,
    readReceipts: chatState.readReceipts,
    markAsRead,
  };
}