import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckSquare, FolderKanban, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

export default function DashboardPage() {
  const { user } = useUser();

  const { data: todos, isLoading: todosLoading } = useQuery<any[]>({
    queryKey: ['/api/todos'],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });

  if (todosLoading || projectsLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  const completedTodos = todos?.filter(todo => todo.completed).length || 0;
  const totalTodos = todos?.length || 0;
  const todosProgress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  const averageProjectProgress = projects?.length 
    ? projects.reduce((acc, proj) => acc + proj.progress, 0) / projects.length
    : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-6">
        Vítejte, {user?.displayName || user?.username}
      </h1>

      <div className="grid gap-4">
        <Link href="/todo">
          <a>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Úkoly
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={todosProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {completedTodos} z {totalTodos} dokončeno
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>

        <Link href="/projects">
          <a>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Projekty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={averageProjectProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {projects?.length || 0} aktivních projektů
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>

        <Link href="/chat">
          <a>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Komunikujte s týmem v reálném čase
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}
