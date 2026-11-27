import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },
    { label: "User Management", path: "/admin/users", icon: "group" },
    { label: "Owner Management", path: "/admin/owners", icon: "corporate_fare" },
    { label: "All Trips", path: "/admin/trips", icon: "route" },
    { label: "Basic Reports", path: "/admin/reports", icon: "assessment" },
  ];

  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <aside
        className={`bg-primary-container h-screen w-[260px] fixed left-0 top-0 shadow-2xl flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md shadow-secondary/30">
              <span className="material-symbols-outlined text-[24px]">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-[19px] font-bold text-white tracking-wide">LogiBrain</h1>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Admin
                </span>
              </div>
              <p className="font-label-sm text-[11px] text-on-primary-container tracking-wide">
                Central Operations Console
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-on-primary-container/70 uppercase">
            Platform Modules
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[14px] ${
                  isActive
                    ? "text-secondary bg-surface-container-highest/15 font-semibold shadow-inner border-l-4 border-secondary"
                    : "text-on-primary-container hover:text-white hover:bg-surface-container-highest/10"
                }`}
              >
                <span className={`material-symbols-outlined text-[21px] ${isActive ? "fill-icon" : ""}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer Profile */}
        <div className="px-5 pt-5 border-t border-on-primary-container/20 mt-auto">
          <div className="flex items-center gap-3 mb-4 bg-surface-container-highest/10 p-2.5 rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center text-white font-bold border border-secondary/40 text-[15px]">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between">
                <p className="text-white text-[13px] font-semibold truncate">{user?.name || "Administrator"}</p>
              </div>
              <p className="text-on-primary-container text-[11px] truncate">{user?.email || "admin@logibrain.com"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all font-medium text-[13px] border border-red-500/20"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-[260px] w-full min-h-screen">
        {/* TopNavBar */}
        <header className="bg-surface/85 backdrop-blur-xl h-[72px] sticky top-0 z-40 border-b border-outline-variant/40 flex justify-between items-center px-4 sm:px-6 md:px-10 w-full shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors shrink-0"
              aria-label="Open mobile menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-headline-md text-[17px] sm:text-[19px] md:text-[20px] font-bold text-on-surface truncate">
                  {title}
                </h1>
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  System Active
                </div>
              </div>
              {subtitle && (
                <p className="font-label-sm text-[12px] text-on-surface-variant hidden sm:block truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-xl border border-outline-variant/40 text-on-surface-variant text-[12px]">
              <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <span>Admin Role</span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
