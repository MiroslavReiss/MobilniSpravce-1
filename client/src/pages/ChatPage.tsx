import { useState, useRef, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useChat } from "@/hooks/use-chat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Check, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function ChatPage() {
  const { user } = useUser();
  const { messages, sendMessage, isConnected, onlineUsers, readReceipts, markAsRead } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Mark new messages as read
    if (user && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markAsRead(lastMessage.id, user.id);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user) {
      sendMessage(newMessage.trim(), user.id);
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Online uživatelé:</h2>
          <div className="flex gap-1">
            {onlineUsers.length === 0 ? (
              <Badge variant="secondary">Nikdo není online</Badge>
            ) : (
              <Badge variant="success">{onlineUsers.length} online</Badge>
            )}
          </div>
        </div>
      </div>

      <ScrollArea 
        ref={scrollRef}
        className="flex-1 p-4"
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.userId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              {message.userId !== user?.id && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.displayName?.[0] || message.username[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col ${
                message.userId === user?.id ? "items-end" : "items-start"
              }`}>
                <span className="text-xs text-muted-foreground mb-1">
                  {message.displayName || message.username}
                  {onlineUsers.includes(message.userId) && (
                    <Badge variant="success" className="ml-2">online</Badge>
                  )}
                </span>
                <Card className={`p-3 max-w-[75%] ${
                  message.userId === user?.id ? "bg-primary text-primary-foreground" : ""
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </Card>
                {message.userId === user?.id && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {readReceipts[message.id]?.length > 0 ? (
                        <>
                          <CheckCheck className="h-3 w-3 inline mr-1" />
                          Přečteno ({readReceipts[message.id].length})
                        </>
                      ) : (
                        <Check className="h-3 w-3 inline mr-1" />
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište zprávu..."
            disabled={!isConnected}
          />
          <Button type="submit" disabled={!isConnected}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}