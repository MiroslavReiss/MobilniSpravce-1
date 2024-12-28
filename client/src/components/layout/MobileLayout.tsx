import { Link, useLocation } from "wouter";
import { Home, User, CheckSquare, MessageSquare, FolderKanban, Bell, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const { unreadCount } = useNotifications();

  const menuItems = [
    { icon: Home, label: "Nástěnka", href: "/" },
    { icon: CheckSquare, label: "ToDo", href: "/todo" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: FolderKanban, label: "Projekty", href: "/projects" },
    { icon: Bell, label: "Oznámení", href: "/notifications", badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around h-full px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative">
                  <div className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded-lg transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                      variant="destructive"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}