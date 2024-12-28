import { Link, useLocation } from "wouter";
import { Home, User, CheckSquare, MessageSquare, FolderKanban, Menu, Bell, Activity } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
    { icon: User, label: "Profil", href: "/profile" },
    { icon: CheckSquare, label: "ToDo", href: "/todo" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: FolderKanban, label: "Projekty", href: "/projects" },
    { icon: Bell, label: "Oznámení", href: "/notifications" },
    { icon: Activity, label: "Historie aktivit", href: "/activity-log" },
  ];

  const NavContent = () => (
    <nav className="flex flex-col gap-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isNotifications = item.href === "/notifications";
        return (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative",
              location === item.href 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent"
            )}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isNotifications && unreadCount > 0 && (
                <Badge className="absolute right-2" variant="destructive">
                  {unreadCount}
                </Badge>
              )}
            </a>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center justify-between px-4 h-full">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="mt-6">
                <NavContent />
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">
            {menuItems.find(item => item.href === location)?.label || "App"}
          </h1>
          <Link href="/notifications">
            <a className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                    variant="destructive"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </a>
          </Link>
        </div>
      </header>
      <main className="pt-14 pb-safe-bottom container max-w-lg">
        {children}
      </main>
    </div>
  );
}