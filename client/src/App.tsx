import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "./hooks/use-user";
import { Loader2 } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import TodoPage from "./pages/TodoPage";
import ChatPage from "./pages/ChatPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import { MobileLayout } from "./components/layout/MobileLayout";
import NotificationsPage from "./pages/NotificationsPage";
import ActivityLogPage from "./pages/ActivityLogPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <MobileLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/todo" component={TodoPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/projects/:id" component={ProjectDetailPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/activity-log" component={ActivityLogPage} />
        <Route>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <h1 className="text-2xl font-bold">404 - Stránka nenalezena</h1>
            <p className="text-muted-foreground">Tato stránka neexistuje</p>
          </div>
        </Route>
      </Switch>
    </MobileLayout>
  );
}

export default App;