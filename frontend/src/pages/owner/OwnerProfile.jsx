import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import OwnerProfileCard from "../../components/layout/OwnerProfileCard";

export default function OwnerProfile() {
  const { user, logout, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initialTab = searchParams.get("tab") === "password" ? "password" : "details";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessAddress: "",
    gstNumber: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "password" || tabParam === "details") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axiosClient.get("/auth/me");
        const data = res.data.data || {};
        setProfileForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          businessName: data.businessName || "",
          businessAddress: data.businessAddress || "",
          gstNumber: data.gstNumber || "",
        });
      } catch (err) {
        showError(err.response?.data?.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [showError]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await axiosClient.patch("/auth/profile", profileForm);
      updateUser(res.data.data);
      showSuccess(res.data.message || "Owner details updated successfully!");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update owner details");
    } finally {
      setIsSavingProfile(false);
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

    setIsSavingPassword(true);
    try {
      const res = await axiosClient.patch("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess(res.data.message || "Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showError(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Owner Sidebar */}
      <aside
        className={`bg-primary-container h-screen w-[240px] fixed left-0 top-0 shadow-lg flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] font-bold text-white tracking-wide">LogiBrain</h1>
              <p className="font-label-sm text-[12px] text-on-primary-container">Owner Portal</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <Link to="/owner/dashboard" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link to="/owner/drivers" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">person</span> Drivers
          </Link>
          <Link to="/owner/expenses" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">payments</span> Expenses
          </Link>
          <Link to="/owner/reports" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">assessment</span> Reports
          </Link>
        </nav>

        <div className="px-6 pt-6 border-t border-on-primary-container/20 mt-auto">
          <OwnerProfileCard onNavigate={() => setIsSidebarOpen(false)} />
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-[240px] w-full">
        <header className="bg-surface/80 backdrop-blur-xl h-[72px] sticky top-0 z-40 border-b border-outline-variant/50 flex justify-between items-center px-6 md:px-10 w-full shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h2 className="font-headline-md text-[20px] font-bold text-on-surface">
                Profile Settings
              </h2>
              <p className="text-[12px] text-on-surface-variant hidden sm:block">
                Update your account details or change your password
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto space-y-6">
          {/* Owner Summary Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary text-white font-bold text-[22px] flex items-center justify-center shrink-0">
                {(profileForm.name || user?.name || "O").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-on-surface">
                  {profileForm.name || user?.name}
                </h3>
                <p className="text-[13px] text-on-surface-variant">
                  {profileForm.email || user?.email}
                  {profileForm.businessName ? ` • ${profileForm.businessName}` : ""}
                </p>
              </div>
            </div>

            {/* Option Switcher */}
            <div className="inline-flex rounded-xl bg-surface-container-low p-1 border border-outline-variant/40">
              <button
                type="button"
                onClick={() => handleTabSwitch("details")}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                  activeTab === "details"
                    ? "bg-secondary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Edit Owner Details
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("password")}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                  activeTab === "password"
                    ? "bg-secondary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Change Password
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 border border-outline-variant/40 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-secondary border-t-transparent" />
            </div>
          ) : activeTab === "details" ? (
            <form
              onSubmit={handleSaveProfile}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-xs space-y-5"
            >
              <div>
                <h3 className="text-[17px] font-bold text-on-surface">Edit Owner Details</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  Keep your personal contact and fleet business details up to date.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    Mobile Number (10 digits)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] font-mono outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.businessName}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, businessName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    Business Address
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.businessAddress}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, businessAddress: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] outline-none focus:border-secondary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[12px] font-semibold text-on-surface-variant mb-1">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={profileForm.gstNumber}
                    onChange={(e) => setProfileForm((p) => ({ ...p, gstNumber: e.target.value }))}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-[13px] font-mono outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-[13px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProfile ? "Saving Changes..." : "Save Owner Details"}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleChangePassword}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-xs space-y-5 max-w-xl"
            >
              <div>
                <h3 className="text-[17px] font-bold text-on-surface">Change Password</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  Enter your current password and choose a new password (minimum 8 characters).
                </p>
              </div>

              <div className="space-y-4">
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
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-[13px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
