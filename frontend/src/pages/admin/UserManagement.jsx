import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        role: role !== "ALL" ? role : undefined,
        status: status !== "ALL" ? status : undefined,
      };
      const res = await axiosClient.get("/admin/users", { params });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
      if (isManual) showSuccess("Users list refreshed successfully");
    } catch (err) {
      console.error("Failed to load users", err);
      showError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role, status, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (userToToggle) => {
    if (userToToggle._id === currentAdmin?._id) {
      showError("You cannot deactivate your own admin account.");
      return;
    }

    setStatusUpdatingId(userToToggle._id);
    const newStatus = !userToToggle.isActive;
    try {
      const res = await axiosClient.patch(`/admin/users/${userToToggle._id}/status`, {
        isActive: newStatus,
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === userToToggle._id ? { ...u, isActive: newStatus } : u))
      );

      if (selectedUser?._id === userToToggle._id) {
        setSelectedUser((prev) => ({ ...prev, isActive: newStatus }));
      }

      showSuccess(res.data.message || `User status updated to ${newStatus ? "Active" : "Inactive"}`);
    } catch (err) {
      console.error("Failed to toggle status", err);
      showError(err.response?.data?.message || "Failed to update user status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <AdminLayout
      title="User Management"
      subtitle="View, search, inspect, and manage system accounts across all roles"
      actions={
        <button
          onClick={() => fetchUsers(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium transition-colors border border-outline-variant/30 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          title="Refresh user list"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin text-secondary" : ""}`}>
            refresh
          </span>
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      }
    >
      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, email, phone, or business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all placeholder:text-on-surface-variant/60"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Role Filter */}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 font-medium"
            >
              <option value="ALL">All Roles</option>
              <option value="OWNER">Fleet Owners</option>
              <option value="DRIVER">Drivers</option>
              <option value="ADMIN">Administrators</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[16px] text-on-surface">System Accounts</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] bg-secondary/10 text-secondary font-semibold">
              {pagination.total} Users Total
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-container-low/50 text-on-surface-variant text-[11px] uppercase tracking-wider font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Fleet / Assoc</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-on-surface-variant">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px] text-secondary">
                        progress_activity
                      </span>
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 mb-2 block">
                      person_off
                    </span>
                    No user accounts match the selected criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/40 transition-colors">
                    {/* User Profile */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary/15 text-secondary font-bold flex items-center justify-center text-[13px] border border-secondary/20">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-on-surface text-[14px] flex items-center gap-1.5">
                            {u.name}
                            {u._id === currentAdmin?._id && (
                              <span className="text-[10px] bg-amber-400 text-slate-900 px-1 rounded font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-on-surface-variant">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                          u.role === "ADMIN"
                            ? "bg-amber-400/20 text-amber-800 border border-amber-400/30"
                            : u.role === "OWNER"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-4 text-on-surface-variant font-medium">
                      {u.phone}
                    </td>

                    {/* Associated Metadata */}
                    <td className="py-4 px-4 text-[12px]">
                      {u.role === "OWNER" && (
                        <div>
                          <p className="font-medium text-on-surface">{u.businessName || "Fleet Owner"}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {u.truckCount || 0} Trucks • {u.driverCount || 0} Drivers
                          </p>
                        </div>
                      )}
                      {u.role === "DRIVER" && (
                        <div>
                          <p className="font-medium text-on-surface">
                            {u.ownerId?.businessName || u.ownerId?.name || "Assigned Fleet"}
                          </p>
                          <p className="text-[11px] text-on-surface-variant font-mono">
                            Lic: {u.driverProfile?.licenseNumber || "N/A"}
                          </p>
                        </div>
                      )}
                      {u.role === "ADMIN" && (
                        <span className="text-on-surface-variant italic">System Controller</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-on-surface-variant text-[12px]">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Active/Inactive Status Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={statusUpdatingId === u._id || u._id === currentAdmin?._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20"
                        } ${statusUpdatingId === u._id ? "opacity-50 cursor-wait" : ""}`}
                        title={
                          u._id === currentAdmin?._id
                            ? "Cannot deactivate your own account"
                            : "Click to toggle active status"
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        ></span>
                        <span>{u.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"
                        title="View Full Profile Details"
                      >
                        <span className="material-symbols-outlined text-[19px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between text-[13px] text-on-surface-variant">
            <span>
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest w-full max-w-[540px] max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-secondary/20 text-secondary font-bold text-[18px] flex items-center justify-center border border-secondary/30">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-[17px] sm:text-[18px] text-on-surface">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-secondary/10 text-secondary">
                      {selectedUser.role}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        selectedUser.isActive
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {selectedUser.isActive ? "Active Account" : "Inactive / Suspended"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 text-[13px] flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-[11px] text-on-surface-variant font-medium uppercase">Email Address</p>
                  <p className="font-semibold text-on-surface mt-0.5 truncate">{selectedUser.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-[11px] text-on-surface-variant font-medium uppercase">Phone Number</p>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedUser.phone}</p>
                </div>
              </div>

              {selectedUser.role === "OWNER" && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-on-surface text-[14px]">Business Information</h4>
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Business Name:</span>
                      <span className="font-semibold text-on-surface">
                        {selectedUser.businessName || "Not Provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">GST Number:</span>
                      <span className="font-semibold text-on-surface font-mono">
                        {selectedUser.gstNumber || "Not Registered"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Address:</span>
                      <span className="font-medium text-on-surface text-right max-w-[240px]">
                        {selectedUser.businessAddress || "Not Provided"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                      <p className="text-[11px] text-blue-600 font-bold">Trucks</p>
                      <p className="text-lg font-bold text-on-surface">{selectedUser.truckCount || 0}</p>
                    </div>
                    <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                      <p className="text-[11px] text-indigo-600 font-bold">Drivers</p>
                      <p className="text-lg font-bold text-on-surface">{selectedUser.driverCount || 0}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <p className="text-[11px] text-emerald-600 font-bold">Trips</p>
                      <p className="text-lg font-bold text-on-surface">{selectedUser.tripCount || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedUser.role === "DRIVER" && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-on-surface text-[14px]">Driver Credentials</h4>
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Driving License:</span>
                      <span className="font-mono font-bold text-secondary">
                        {selectedUser.driverProfile?.licenseNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Assigned Owner:</span>
                      <span className="font-medium text-on-surface">
                        {selectedUser.ownerId?.businessName || selectedUser.ownerId?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Driver Status:</span>
                      <span className="font-semibold text-emerald-600">
                        {selectedUser.driverProfile?.status || "AVAILABLE"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 text-[11px] text-on-surface-variant flex justify-between border-t border-outline-variant/20">
                <span>Account ID: {selectedUser._id}</span>
                <span>
                  Registered: {new Date(selectedUser.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-surface-container-low border-t border-outline-variant/30 flex justify-between items-center shrink-0">
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                disabled={selectedUser._id === currentAdmin?._id}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  selectedUser.isActive
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                } disabled:opacity-40`}
              >
                {selectedUser.isActive ? "Deactivate Account" : "Activate Account"}
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-surface-container-high text-on-surface text-[13px] font-medium hover:bg-surface-container-highest transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
