import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, FolderKanban, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type) {
    case 'chat':
      return <MessageSquare className="h-5 w-5" />;
    case 'project':
      return <FolderKanban className="h-5 w-5" />;
    case 'todo':
      return <CheckSquare className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
}

export default function NotificationsPage() {
  const { notifications, markAsRead } = useNotifications();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Oznámení</h1>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Žádná oznámení
          </p>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "transition-colors hover:bg-accent/50",
                !notification.read && "bg-accent/20"
              )}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{notification.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(notification.createdAt), 'HH:mm dd.MM.yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.read && (
                    <Badge variant="secondary" className="shrink-0">
                      Nové
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}