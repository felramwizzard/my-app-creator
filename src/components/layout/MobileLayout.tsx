import { ReactNode } from "react";
import { TabBar } from "./TabBar";

interface MobileLayoutProps {
  children: ReactNode;
  hideTabBar?: boolean;
}

export function MobileLayout({ children, hideTabBar = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-auto pb-tab">
        {children}
      </main>
      {!hideTabBar && <TabBar />}
    </div>
  );
}
