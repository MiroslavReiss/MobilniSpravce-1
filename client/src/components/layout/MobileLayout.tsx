import { Link, useLocation } from "wouter";
import { Home, User, CheckSquare, MessageSquare, FolderKanban, Bell, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
    { icon: Activity, label: "Historie", href: "/activity-log" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 h-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center justify-around h-full px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <motion.a
                  className="relative flex flex-col items-center"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded-lg transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {item.badge && item.badge > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <Badge 
                            className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                            variant="destructive"
                          >
                            {item.badge}
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    <span className="text-xs">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                </motion.a>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}