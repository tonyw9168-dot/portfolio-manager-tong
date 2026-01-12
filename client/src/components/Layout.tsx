import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  Settings, 
  LogOut,
  TrendingUp,
  Menu,
  X,
  BarChart3,
  FileText,
  Target,
  History,
  Sparkles,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "仪表板", icon: LayoutDashboard, mobileLabel: "概览" },
  { href: "/asset-analysis", label: "资产分析", icon: Wallet, mobileLabel: "资产" },
  { href: "/performance-analysis", label: "性能分析", icon: BarChart3, mobileLabel: "性能" },
  { href: "/portfolio-planning", label: "配置规划", icon: Target, mobileLabel: "规划" },
  { href: "/cashflow", label: "现金流量", icon: ArrowLeftRight, mobileLabel: "流量" },
  { href: "/insurance", label: "家庭保险", icon: Shield, mobileLabel: "保险" },
  { href: "/settings", label: "设置", icon: Settings, mobileLabel: "设置" },
];

// 移动端底部导航只显示主要功能
const mobileNavItems = [
  { href: "/", label: "概览", icon: LayoutDashboard },
  { href: "/asset-analysis", label: "资产", icon: Wallet },
  { href: "/insurance", label: "保险", icon: Shield },
  { href: "/performance-analysis", label: "性能", icon: BarChart3 },
  { href: "/settings", label: "更多", icon: Menu },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-border bg-card pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">桐的家庭基金</h1>
              <p className="text-xs text-muted-foreground">Family Fund</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 mt-auto">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header - 简化设计 */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-card/95 backdrop-blur border-b border-border px-4 py-3 safe-area-top">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">投资组合</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Full Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-card shadow-xl animate-slide-in-right safe-area-top safe-area-bottom">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-semibold">菜单</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card safe-area-bottom">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-3"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="w-5 h-5" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {mobileNavItems.map((item) => {
            const isActive = item.href === "/settings" 
              ? ["/settings", "/cashflow"].includes(location)
              : location === item.href;
            
            if (item.href === "/settings") {
              return (
                <button
                  key={item.href}
                  onClick={() => setMobileMenuOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all min-w-[60px]",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all min-w-[60px]",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
