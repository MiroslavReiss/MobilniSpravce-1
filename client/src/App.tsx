import { Switch, Route, useLocation } from "wouter";
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
import { WebSocketProvider } from "./components/providers/WebSocketProvider";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/layout/PageTransition";

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
  const [location] = useLocation();

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
    <WebSocketProvider>
      <MobileLayout>
        <AnimatePresence mode="wait">
          <Switch location={location} key={location}>
            <Route path="/">
              <PageTransition>
                <DashboardPage />
              </PageTransition>
            </Route>
            <Route path="/profile">
              <PageTransition>
                <ProfilePage />
              </PageTransition>
            </Route>
            <Route path="/todo">
              <PageTransition>
                <TodoPage />
              </PageTransition>
            </Route>
            <Route path="/chat">
              <PageTransition>
                <ChatPage />
              </PageTransition>
            </Route>
            <Route path="/projects">
              <PageTransition>
                <ProjectsPage />
              </PageTransition>
            </Route>
            <Route path="/projects/:id">
              <PageTransition>
                <ProjectDetailPage />
              </PageTransition>
            </Route>
            <Route path="/notifications">
              <PageTransition>
                <NotificationsPage />
              </PageTransition>
            </Route>
            <Route path="/activity-log">
              <PageTransition>
                <ActivityLogPage />
              </PageTransition>
            </Route>
            <Route>
              <PageTransition>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                  <h1 className="text-2xl font-bold">404 - Stránka nenalezena</h1>
                  <p className="text-muted-foreground">Tato stránka neexistuje</p>
                </div>
              </PageTransition>
            </Route>
          </Switch>
        </AnimatePresence>
      </MobileLayout>
    </WebSocketProvider>
  );
}

export default App;