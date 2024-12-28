import { Link, useLocation } from "wouter";
import { Home, User, CheckSquare, MessageSquare, FolderKanban, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: "Nástěnka", href: "/" },
    { icon: User, label: "Profil", href: "/profile" },
    { icon: CheckSquare, label: "ToDo", href: "/todo" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: FolderKanban, label: "Projekty", href: "/projects" },
  ];

  const NavContent = () => (
    <nav className="flex flex-col gap-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              location === item.href 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent"
            )}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
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
          <div className="w-10" /> {/* Spacer for center alignment */}
        </div>
      </header>
      <main className="pt-14 pb-safe-bottom container max-w-lg">
        {children}
      </main>
    </div>
  );
}
