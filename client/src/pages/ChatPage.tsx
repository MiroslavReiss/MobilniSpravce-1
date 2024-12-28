import { useState, useRef, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useChat } from "@/hooks/use-chat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatPage() {
  const { user } = useUser();
  const { messages = [], sendMessage, isConnected, onlineUsers = [], readReceipts = {}, markAsRead } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark new messages as read
    if (user && messages?.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.id) {
        markAsRead(lastMessage.id, user.id);
      }
    }
  }, [messages, user, markAsRead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user) {
      sendMessage(newMessage.trim(), user.id);
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b bg-background"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Online uživatelé:</h2>
          <AnimatePresence mode="wait">
            {!onlineUsers || onlineUsers.length === 0 ? (
              <motion.div
                key="no-online"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="secondary">Nikdo není online</Badge>
              </motion.div>
            ) : (
              <motion.div
                key="online-count"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="secondary">{onlineUsers.length} online</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <ScrollArea 
        ref={scrollRef}
        className="flex-1 p-4"
      >
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence initial={false}>
            {messages?.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: message.userId === user?.id ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 500 }}
                className={`flex gap-2 ${
                  message.userId === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                {message.userId !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.displayName?.[0] || message.username?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${
                  message.userId === user?.id ? "items-end" : "items-start"
                }`}>
                  <motion.span 
                    className="text-xs text-muted-foreground mb-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {message.displayName || message.username}
                    <AnimatePresence>
                      {onlineUsers?.includes(message.userId) && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Badge variant="secondary" className="ml-2">online</Badge>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <motion.div
                    layout
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 25, stiffness: 500 }}
                  >
                    <Card className={`p-3 max-w-[75%] ${
                      message.userId === user?.id ? "bg-primary text-primary-foreground" : ""
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </Card>
                  </motion.div>
                  {message.userId === user?.id && (
                    <motion.div 
                      className="flex items-center gap-1 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="text-xs text-muted-foreground">
                        <AnimatePresence mode="wait">
                          {readReceipts[message.id]?.length > 0 ? (
                            <motion.span
                              key="read"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <CheckCheck className="h-3 w-3 inline mr-1" />
                              Přečteno ({readReceipts[message.id].length})
                            </motion.span>
                          ) : (
                            <motion.span
                              key="sent"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <Check className="h-3 w-3 inline mr-1" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </motion.div>
      </ScrollArea>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-t bg-background"
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište zprávu..."
            disabled={!isConnected}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="submit" disabled={!isConnected}>
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}