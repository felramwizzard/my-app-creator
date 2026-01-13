import { ChevronRight, User, Bell, Palette, Shield, HelpCircle, Info } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
}

function SettingItem({ icon: Icon, label, description, onClick }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-card rounded-xl shadow-card transition-all hover:bg-card/80 touch-manipulation active:scale-[0.98]"
    >
      <div className="p-2.5 bg-accent rounded-xl">
        <Icon className="w-5 h-5 text-accent-foreground" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}

const SettingsPage = () => {
  return (
    <MobileLayout>
      <div className="px-5 py-6 space-y-6">
        <PageHeader title="Settings" />

        {/* Profile section */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Your Profile</h3>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div className="space-y-3">
          <SettingItem
            icon={Bell}
            label="Notifications"
            description="Manage alerts and reminders"
          />
          <SettingItem
            icon={Palette}
            label="Appearance"
            description="Theme and display settings"
          />
          <SettingItem
            icon={Shield}
            label="Privacy & Security"
            description="Protect your data"
          />
          <SettingItem
            icon={HelpCircle}
            label="Help & Support"
            description="Get assistance"
          />
          <SettingItem
            icon={Info}
            label="About"
            description="Version 1.0.0"
          />
        </div>

        {/* App info */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Built with ❤️ using Lovable
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default SettingsPage;
