import { ReactNode } from "react";
import { FinanceTabBar } from "./FinanceTabBar";

interface FinanceLayoutProps {
  children: ReactNode;
}

export function FinanceLayout({ children }: FinanceLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 overflow-y-auto page-content">
        {children}
      </main>
      <FinanceTabBar />
    </div>
  );
}
