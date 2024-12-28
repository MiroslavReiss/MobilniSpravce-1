import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, FolderKanban, CheckSquare, Activity } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  createdAt: string;
  username: string;
  displayName?: string;
}

function getActivityIcon(entityType: string) {
  switch (entityType) {
    case 'chat':
      return <MessageSquare className="h-5 w-5" />;
    case 'project':
      return <FolderKanban className="h-5 w-5" />;
    case 'todo':
      return <CheckSquare className="h-5 w-5" />;
    default:
      return <Activity className="h-5 w-5" />;
  }
}

export default function ActivityLogPage() {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Historie aktivit</h1>
      <div className="space-y-2">
        {!logs?.length ? (
          <p className="text-center text-muted-foreground py-8">
            Žádné záznamy
          </p>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary">
                    {getActivityIcon(log.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {log.displayName || log.username}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), 'HH:mm dd.MM.yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.details}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
