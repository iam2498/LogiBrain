import { useEffect, useState, useCallback } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const ACTION_LABELS = {
  OWNER_ACTIVATED: { label: "Owner Activated", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  OWNER_SUSPENDED: { label: "Owner Suspended", cls: "bg-red-500/10 text-red-700 border-red-500/20" },
  OWNER_REACTIVATED: { label: "Owner Reactivated", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  SUPPORT_REQUEST_UPDATED: { label: "Support Updated", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  ADMIN_LOGIN: { label: "Admin Login", cls: "bg-slate-500/10 text-slate-700 border-slate-500/20" },
  ADMIN_LOGOUT: { label: "Admin Logout", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  ADMIN_PASSWORD_CHANGED: { label: "Password Changed", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
};

function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatUptime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hrs > 0 || days > 0) parts.push(`${hrs}h`);
  if (mins > 0 || hrs > 0 || days > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Overview + Inline System Monitoring State
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Owner Management State
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState("ALL");
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerPagination, setOwnerPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerActionModal, setOwnerActionModal] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [isOwnerSubmitting, setIsOwnerSubmitting] = useState(false);

  // Activity Logs State
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logActionFilter, setLogActionFilter] = useState("ALL");
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ total: 0, page: 1, pages: 1, limit: 15 });

  // Admin Profile & Password State
  const [profileData, setProfileData] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await axiosClient.get("/admin/overview");
      setOverview(res.data.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load platform overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [showError]);

  const fetchOwners = useCallback(async () => {
    setOwnersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(ownerPage),
        limit: "10",
        status: ownerStatusFilter,
      });
      if (ownerSearch.trim()) params.append("search", ownerSearch.trim());
      const res = await axiosClient.get(`/admin/owners?${params.toString()}`);
      setOwners(res.data.data.owners || []);
      setOwnerPagination(res.data.data.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load owner accounts");
    } finally {
      setOwnersLoading(false);
    }
  }, [ownerPage, ownerStatusFilter, ownerSearch, showError]);

  const fetchActivityLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(logPage),
        limit: "15",
        action: logActionFilter,
      });
      const res = await axiosClient.get(`/admin/activity-logs?${params.toString()}`);
      setLogs(res.data.data.logs || []);
      setLogPagination(res.data.data.pagination || { total: 0, page: 1, pages: 1, limit: 15 });
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load activity logs");
    } finally {
      setLogsLoading(false);
    }
  }, [logPage, logActionFilter, showError]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axiosClient.get("/auth/me");
      setProfileData(res.data.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "owners") fetchOwners();
    if (activeTab === "logs") fetchActivityLogs();
    if (activeTab === "settings") fetchProfile();
  }, [activeTab, fetchOverview, fetchOwners, fetchActivityLogs, fetchProfile]);

  const handleOpenOwnerDetails = async (ownerId) => {
    try {
      const res = await axiosClient.get(`/admin/owners/${ownerId}`);
      setSelectedOwner(res.data.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load account details");
    }
  };

  const handleOpenOwnerAction = (owner, action) => {
    setOwnerActionModal({ owner, action });
    setActionReason("");
  };

  const handleConfirmOwnerStatus = async (e) => {
    e.preventDefault();
    if (!ownerActionModal) return;

    const { owner, action } = ownerActionModal;
    if (action === "SUSPEND" && actionReason.trim().length < 3) {
      showError("Please provide a clear suspension reason (at least 3 characters).");
      return;
    }

    setIsOwnerSubmitting(true);
    try {
      const res = await axiosClient.patch(`/admin/owners/${owner._id}/status`, {
        action,
        reason: actionReason.trim() || undefined,
      });
      showSuccess(res.data.message || "Owner account status updated");
      setOwnerActionModal(null);
      setActionReason("");
      if (selectedOwner?._id === owner._id) {
        setSelectedOwner(res.data.data);
      }
      await Promise.all([fetchOwners(), fetchOverview()]);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update owner status");
    } finally {
      setIsOwnerSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      showError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("New password and confirmation do not match.");
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const res = await axiosClient.patch("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess(res.data.message || "Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showError(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const navItems = [
    { id: "overview", label: "Dashboard", icon: "dashboard" },
    { id: "owners", label: "Owner Management", icon: "manage_accounts" },
    { id: "logs", label: "Activity Logs", icon: "history" },
    { id: "settings", label: "Settings / Profile", icon: "admin_panel_settings" },
  ];

  const tabMeta = {
    overview: {
      title: "Platform Administration",
      subtitle: "High-level platform health, owner account overview, and recent admin activity",
    },
    owners: {
      title: "Owner Management",
      subtitle: "Manage registered fleet owner accounts without accessing private business data",
    },
    logs: {
      title: "Admin Activity Logs",
      subtitle: "Audit trail of administrative actions across the platform",
    },
    settings: {
      title: "Settings & Profile",
      subtitle: "Manage your administrator account details and password security",
    },
  };

  const handleRefreshCurrent = () => {
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "owners") fetchOwners();
    if (activeTab === "logs") fetchActivityLogs();
    if (activeTab === "settings") fetchProfile();
  };

  const summary = overview?.summary || {
    totalOwners: 0,
    activeOwners: 0,
    suspendedOwners: 0,
  };

  const sys = overview?.systemStatus || {};

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen flex overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[90] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-primary-container h-screen w-[260px] fixed left-0 top-0 shadow-xl flex flex-col py-6 z-[100] transition-transform duration-200 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-6 mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[22px]">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-bold text-white tracking-wide">LogiBrain</span>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-on-primary-container">Platform Console</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-white/80 hover:text-white p-1 rounded-lg"
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-[14px] font-medium cursor-pointer ${
                  isActive
                    ? "bg-surface-container-highest/15 text-white border-l-4 border-secondary font-semibold"
                    : "text-on-primary-container hover:text-white hover:bg-surface-container-highest/10"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Logout menu item */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-red-300 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer mt-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </nav>

        {/* Privacy Notice & Admin Footer */}
        <div className="px-4 pt-4 border-t border-on-primary-container/20 mt-auto space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-on-primary-container leading-relaxed">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mb-1">
              <span className="material-symbols-outlined text-[15px]">lock</span>
              Privacy Enforced
            </div>
            Owner trucks, drivers, trips, and financials remain strictly private.
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-secondary/30 border border-secondary/50 text-white font-bold flex items-center justify-center text-[14px]">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-on-primary-container truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-[260px] w-full min-h-screen">
        {/* Top Header */}
        <header className="bg-surface/90 backdrop-blur-md h-[72px] sticky top-0 z-40 border-b border-outline-variant/40 flex items-center justify-between px-4 sm:px-6 md:px-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-[18px] sm:text-[20px] font-bold text-on-surface truncate">
                {tabMeta[activeTab]?.title}
              </h1>
              <p className="text-[12px] text-on-surface-variant hidden sm:block truncate">
                {tabMeta[activeTab]?.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefreshCurrent}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-[13px] font-medium border border-outline-variant/40 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Active Section Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto space-y-6">
          {/* ===================== A. DASHBOARD OVERVIEW ===================== */}
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      Total Registered Owners
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">group</span>
                    </span>
                  </div>
                  <div className="text-[30px] font-bold text-on-surface">
                    {overviewLoading ? "..." : summary.totalOwners}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-1">Platform owner accounts</p>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      Active Owners
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">verified_user</span>
                    </span>
                  </div>
                  <div className="text-[30px] font-bold text-emerald-700">
                    {overviewLoading ? "..." : summary.activeOwners}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-1">Enabled accounts</p>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      Suspended Owners
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">block</span>
                    </span>
                  </div>
                  <div className="text-[30px] font-bold text-red-600">
                    {overviewLoading ? "..." : summary.suspendedOwners}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-1">Temporarily restricted</p>
                </div>
              </div>

              {/* Inline System Monitoring Panel on Dashboard */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        sys.apiStatus === "HEALTHY" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <h2 className="text-[15px] font-bold text-on-surface">
                        System Monitor: {overviewLoading ? "Checking..." : sys.apiStatus || "UNKNOWN"}
                      </h2>
                      <p className="text-[12px] text-on-surface-variant">
                        Live backend API health, MongoDB status, and server uptime
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-on-surface-variant">
                    Last checked: {formatDateTime(sys.checkedAt)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
                    <p className="text-[11px] text-on-surface-variant font-medium">API Status</p>
                    <p className="font-bold text-on-surface mt-1">
                      {overviewLoading ? "..." : sys.apiStatus || "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
                    <p className="text-[11px] text-on-surface-variant font-medium">MongoDB</p>
                    <p className="font-bold text-on-surface mt-1">
                      {overviewLoading ? "..." : sys.databaseStatus || "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
                    <p className="text-[11px] text-on-surface-variant font-medium">Server Uptime</p>
                    <p className="font-bold font-mono text-on-surface mt-1">
                      {overviewLoading ? "..." : formatUptime(sys.uptimeSeconds)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Owner Registrations & Recent Platform Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-bold text-on-surface">
                        Recent Owner Registrations
                      </h2>
                      <p className="text-[12px] text-on-surface-variant">
                        Newest accounts on the platform
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("owners")}
                      className="text-[13px] text-secondary font-medium hover:underline cursor-pointer"
                    >
                      Manage All
                    </button>
                  </div>

                  {overviewLoading ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">
                      Loading recent registrations...
                    </div>
                  ) : (overview?.recentOwners || []).length === 0 ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">
                      No registered owners found.
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/25">
                      {overview.recentOwners.map((owner) => (
                        <div
                          key={owner._id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-on-surface truncate">
                              {owner.name}
                            </p>
                            <p className="text-[12px] text-on-surface-variant truncate">
                              {owner.email} • Joined {formatDateOnly(owner.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                              owner.accountStatus === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : "bg-red-500/10 text-red-700 border-red-500/20"
                            }`}
                          >
                            {owner.accountStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-bold text-on-surface">
                        Recent Platform Activities
                      </h2>
                      <p className="text-[12px] text-on-surface-variant">
                        Latest administrative audit events
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("logs")}
                      className="text-[13px] text-secondary font-medium hover:underline cursor-pointer"
                    >
                      Full Log
                    </button>
                  </div>

                  {overviewLoading ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">
                      Loading recent activities...
                    </div>
                  ) : (overview?.recentActivities || []).length === 0 ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">
                      No platform activities recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/25">
                      {overview.recentActivities.map((act) => {
                        const badge = ACTION_LABELS[act.action] || {
                          label: act.action,
                          cls: "bg-slate-100 text-slate-700 border-slate-200",
                        };
                        return (
                          <div key={act._id} className="py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                              <p className="text-[13px] text-on-surface font-medium mt-1 truncate">
                                {act.targetLabel || act.targetId || "Platform Event"}
                              </p>
                              {act.reason && (
                                <p className="text-[12px] text-on-surface-variant truncate">
                                  {act.reason}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-on-surface-variant whitespace-nowrap shrink-0">
                              {formatDateTime(act.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ===================== B. OWNER MANAGEMENT ===================== */}
          {activeTab === "owners" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
              {/* Filters */}
              <div className="p-5 border-b border-outline-variant/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[19px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={ownerSearch}
                    onChange={(e) => {
                      setOwnerSearch(e.target.value);
                      setOwnerPage(1);
                    }}
                    placeholder="Search by owner name or email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ownerStatusFilter}
                    onChange={(e) => {
                      setOwnerStatusFilter(e.target.value);
                      setOwnerPage(1);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] font-medium outline-none focus:border-secondary"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-surface-container-low/60 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline-variant/30">
                    <tr>
                      <th className="py-3.5 px-5 font-semibold">Owner Name</th>
                      <th className="py-3.5 px-5 font-semibold">Email Address</th>
                      <th className="py-3.5 px-5 font-semibold">Registration Date</th>
                      <th className="py-3.5 px-5 font-semibold">Account Status</th>
                      <th className="py-3.5 px-5 font-semibold">Last Login</th>
                      <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {ownersLoading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-on-surface-variant">
                          Loading owner accounts...
                        </td>
                      </tr>
                    ) : owners.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-on-surface-variant">
                          No owner accounts match your search or filter.
                        </td>
                      </tr>
                    ) : (
                      owners.map((owner) => (
                        <tr key={owner._id} className="hover:bg-surface-container-low/30">
                          <td className="py-4 px-5 font-semibold text-on-surface">{owner.name}</td>
                          <td className="py-4 px-5 text-on-surface-variant">{owner.email}</td>
                          <td className="py-4 px-5 text-on-surface-variant whitespace-nowrap">
                            {formatDateOnly(owner.createdAt)}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                owner.accountStatus === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                                  : "bg-red-500/10 text-red-700 border-red-500/25"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  owner.accountStatus === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {owner.accountStatus}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-on-surface-variant whitespace-nowrap">
                            {owner.lastLoginAt ? formatDateTime(owner.lastLoginAt) : "Not recorded"}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleOpenOwnerDetails(owner._id)}
                                className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40 cursor-pointer"
                              >
                                View Info
                              </button>
                              {owner.accountStatus === "ACTIVE" ? (
                                <button
                                  onClick={() => handleOpenOwnerAction(owner, "SUSPEND")}
                                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenOwnerAction(owner, "REACTIVATE")}
                                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-4 border-t border-outline-variant/30 flex items-center justify-between text-[13px] text-on-surface-variant">
                <span>
                  Showing page {ownerPagination.page} of {ownerPagination.pages} ({ownerPagination.total}{" "}
                  owners)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={ownerPagination.page <= 1}
                    onClick={() => setOwnerPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={ownerPagination.page >= ownerPagination.pages}
                    onClick={() => setOwnerPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== C. ACTIVITY LOGS ===================== */}
          {activeTab === "logs" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold text-on-surface">
                    Administrative Activity History
                  </h2>
                  <p className="text-[12px] text-on-surface-variant">
                    Immutable log of account status updates and admin auth events
                  </p>
                </div>

                <select
                  value={logActionFilter}
                  onChange={(e) => {
                    setLogActionFilter(e.target.value);
                    setLogPage(1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-surface border border-outline-variant/50 text-[13px] font-medium outline-none focus:border-secondary"
                >
                  <option value="ALL">All Actions</option>
                  <option value="OWNER_SUSPENDED">Owner Suspended</option>
                  <option value="OWNER_REACTIVATED">Owner Reactivated</option>
                  <option value="OWNER_ACTIVATED">Owner Activated</option>
                  <option value="ADMIN_LOGIN">Admin Login</option>
                  <option value="ADMIN_LOGOUT">Admin Logout</option>
                  <option value="ADMIN_PASSWORD_CHANGED">Password Changed</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-surface-container-low/60 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline-variant/30">
                    <tr>
                      <th className="py-3.5 px-5 font-semibold">Action</th>
                      <th className="py-3.5 px-5 font-semibold">Admin</th>
                      <th className="py-3.5 px-5 font-semibold">Target</th>
                      <th className="py-3.5 px-5 font-semibold">Reason / Details</th>
                      <th className="py-3.5 px-5 font-semibold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {logsLoading ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-on-surface-variant">
                          Loading activity logs...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-on-surface-variant">
                          No activity logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const badge = ACTION_LABELS[log.action] || {
                          label: log.action,
                          cls: "bg-slate-100 text-slate-700 border-slate-200",
                        };
                        return (
                          <tr key={log._id} className="hover:bg-surface-container-low/30">
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-medium text-on-surface">
                                {log.adminId?.name || "Admin"}
                              </div>
                              <div className="text-[11px] text-on-surface-variant font-mono">
                                {log.adminId?._id || "—"}
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-medium text-on-surface">
                                {log.targetLabel || "—"}
                              </div>
                              {log.targetId && (
                                <div className="text-[11px] text-on-surface-variant font-mono">
                                  ID: {log.targetId}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-on-surface-variant max-w-xs">
                              {log.reason || "—"}
                            </td>
                            <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-4 border-t border-outline-variant/30 flex items-center justify-between text-[13px] text-on-surface-variant">
                <span>
                  Page {logPagination.page} of {logPagination.pages} ({logPagination.total} events)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={logPagination.page <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logPagination.page >= logPagination.pages}
                    onClick={() => setLogPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== D. SETTINGS / PROFILE ===================== */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Admin Profile Card */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary text-white font-bold text-[22px] flex items-center justify-center">
                    {(profileData?.name || user?.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-on-surface">
                      {profileData?.name || user?.name || "Administrator"}
                    </h2>
                    <p className="text-[13px] text-on-surface-variant">
                      {profileData?.email || user?.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] pt-2 border-t border-outline-variant/30">
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">
                      Role
                    </p>
                    <p className="font-bold text-on-surface mt-1">
                      {profileData?.role || user?.role || "ADMIN"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">
                      Phone
                    </p>
                    <p className="font-mono font-semibold text-on-surface mt-1">
                      {profileData?.phone || user?.phone || "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">
                      Account Created
                    </p>
                    <p className="font-medium text-on-surface mt-1">
                      {formatDateOnly(profileData?.createdAt)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low/50">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase">
                      Last Login
                    </p>
                    <p className="font-medium text-on-surface mt-1">
                      {formatDateTime(profileData?.lastLoginAt)}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={logout}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[13px] border border-red-200 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Logout of Admin Session
                  </button>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
                <h2 className="text-[16px] font-bold text-on-surface mb-1">Change Password</h2>
                <p className="text-[12px] text-on-surface-variant mb-5">
                  Update your administrator password. Minimum 8 characters required.
                </p>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPasswordSubmitting}
                    className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-semibold text-[13px] disabled:opacity-50 cursor-pointer"
                  >
                    {isPasswordSubmitting ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODAL: BASIC OWNER ACCOUNT INFO ===================== */}
      {selectedOwner && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-on-surface">Basic Account Information</h3>
              <button
                onClick={() => setSelectedOwner(null)}
                className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Owner Name</span>
                <span className="font-semibold text-on-surface">{selectedOwner.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Email Address</span>
                <span className="font-medium text-on-surface">{selectedOwner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Account Status</span>
                <span className="font-bold">{selectedOwner.accountStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Registered On</span>
                <span className="text-on-surface">{formatDateTime(selectedOwner.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Last Login</span>
                <span className="text-on-surface">
                  {selectedOwner.lastLoginAt ? formatDateTime(selectedOwner.lastLoginAt) : "Not recorded"}
                </span>
              </div>
              {selectedOwner.accountStatus === "SUSPENDED" && (
                <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1">
                  <p className="text-[12px] font-bold text-red-800">Suspension Details</p>
                  <p className="text-[12px] text-red-700">
                    Reason: {selectedOwner.suspensionReason || "No reason recorded"}
                  </p>
                  <p className="text-[11px] text-red-600">
                    Suspended At: {formatDateTime(selectedOwner.suspendedAt)}
                  </p>
                  {selectedOwner.suspendedBy && (
                    <p className="text-[11px] text-red-600">
                      By: {selectedOwner.suspendedBy.name} ({selectedOwner.suspendedBy.email})
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 p-3 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant">
                Business records (trucks, drivers, trips, expenses, and financial reports) are private
                to this owner and hidden from platform administration.
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setSelectedOwner(null)}
                className="px-4 py-2 rounded-xl bg-white border border-outline-variant/50 text-[13px] font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CONFIRM SUSPEND / REACTIVATE ===================== */}
      {ownerActionModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-on-surface">
                {ownerActionModal.action === "SUSPEND"
                  ? "Confirm Account Suspension"
                  : "Confirm Account Reactivation"}
              </h3>
              <button
                onClick={() => setOwnerActionModal(null)}
                className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmOwnerStatus} className="p-6 space-y-4">
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {ownerActionModal.action === "SUSPEND" ? (
                  <>
                    You are about to temporarily suspend{" "}
                    <strong className="text-on-surface">{ownerActionModal.owner.name}</strong> (
                    {ownerActionModal.owner.email}). They will lose access to the platform until
                    reactivated, while all of their business data remains intact.
                  </>
                ) : (
                  <>
                    Reactivate <strong className="text-on-surface">{ownerActionModal.owner.name}</strong>{" "}
                    ({ownerActionModal.owner.email}) so they can resume managing their fleet?
                  </>
                )}
              </p>

              <div>
                <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                  {ownerActionModal.action === "SUSPEND"
                    ? "Suspension Reason (Required)"
                    : "Reactivation Note (Optional)"}
                </label>
                <textarea
                  rows={3}
                  required={ownerActionModal.action === "SUSPEND"}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    ownerActionModal.action === "SUSPEND"
                      ? "Enter reason for suspending this account..."
                      : "Optional note for audit log..."
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOwnerActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/50 text-[13px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOwnerSubmitting}
                  className={`px-4 py-2 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 cursor-pointer ${
                    ownerActionModal.action === "SUSPEND"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isOwnerSubmitting
                    ? "Processing..."
                    : ownerActionModal.action === "SUSPEND"
                    ? "Confirm Suspend"
                    : "Confirm Reactivate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
