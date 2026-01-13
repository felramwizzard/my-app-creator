import { Home, CheckSquare, Calendar, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: CheckSquare, label: "Tasks", path: "/tasks" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function TabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-tab max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 touch-manipulation",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                isActive && "bg-accent"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
