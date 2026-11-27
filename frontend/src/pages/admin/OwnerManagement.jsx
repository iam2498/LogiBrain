import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";

export default function OwnerManagement() {
  const { showSuccess, showError } = useToast();
  const [owners, setOwners] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Single Owner Inspection Modal state
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOwners = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
      };
      const res = await axiosClient.get("/admin/owners", { params });
      setOwners(res.data.data.owners);
      setPagination(res.data.data.pagination);
      if (isManual) showSuccess("Fleet owners list refreshed successfully");
    } catch (err) {
      console.error("Failed to fetch owners", err);
      showError(err.response?.data?.message || "Failed to load fleet owners");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOwners();
  };

  const handleInspectOwner = async (ownerId) => {
    setSelectedOwnerId(ownerId);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const res = await axiosClient.get(`/admin/owners/${ownerId}`);
      setOwnerDetails(res.data.data);
    } catch (err) {
      console.error("Failed to inspect owner", err);
      showError(err.response?.data?.message || "Failed to load owner fleet details");
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (owner) => {
    setStatusUpdatingId(owner._id);
    const newStatus = !owner.isActive;
    try {
      await axiosClient.patch(`/admin/users/${owner._id}/status`, {
        isActive: newStatus,
      });

      setOwners((prev) =>
        prev.map((o) => (o._id === owner._id ? { ...o, isActive: newStatus } : o))
      );

      if (ownerDetails && ownerDetails.owner._id === owner._id) {
        setOwnerDetails((prev) => ({
          ...prev,
          owner: { ...prev.owner, isActive: newStatus },
        }));
      }

      showSuccess(`Owner account ${newStatus ? "Activated" : "Suspended"} successfully`);
    } catch (err) {
      console.error("Failed to toggle owner status", err);
      showError(err.response?.data?.message || "Failed to update owner status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const formatCurrency = (val) => {
    return `₹${(val || 0).toLocaleString("en-IN")}`;
  };

  return (
    <AdminLayout
      title="Owner Management"
      subtitle="Directory of fleet logistics owners, enterprise business profiles, and fleet sizes"
      actions={
        <button
          onClick={() => fetchOwners(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium transition-colors border border-outline-variant/30 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          title="Refresh owners list"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin text-secondary" : ""}`}>
            refresh
          </span>
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      }
    >
      {/* Search Toolbar */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by owner name, business title, email, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all placeholder:text-on-surface-variant/60"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            Search
          </button>
        </form>
      </div>

      {/* Owners Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-on-surface-variant">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[24px] text-secondary">
              progress_activity
            </span>
            <span>Loading fleet owners directory...</span>
          </div>
        </div>
      ) : owners.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 text-center rounded-2xl border border-outline-variant/30 shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-3 block">
            corporate_fare
          </span>
          <h3 className="text-[16px] font-bold text-on-surface">No Fleet Owners Found</h3>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Try adjusting your search criteria or register new fleet owners on the platform.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {owners.map((owner) => (
            <div
              key={owner._id}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-outline-variant/20 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-[18px] border border-blue-500/20">
                    {owner.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-on-surface tracking-tight">
                      {owner.businessName || owner.name}
                    </h3>
                    <p className="text-[12px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      {owner.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(owner)}
                  disabled={statusUpdatingId === owner._id}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    owner.isActive
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                  }`}
                  title="Click to toggle account status"
                >
                  {owner.isActive ? "Active" : "Suspended"}
                </button>
              </div>

              {/* Card Body - Contacts */}
              <div className="p-5 space-y-3 text-[13px] flex-1">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span className="truncate">{owner.email}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>{owner.phone}</span>
                </div>
                {owner.gstNumber && (
                  <div className="flex items-center gap-2 text-on-surface-variant font-mono text-[11px]">
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>GST: {owner.gstNumber}</span>
                  </div>
                )}

                {/* Fleet Statistics Pill Grid */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-outline-variant/20 text-center">
                  <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">Trucks</p>
                    <p className="text-[15px] font-bold text-on-surface mt-0.5">
                      {owner.stats?.truckCount || 0}
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">Drivers</p>
                    <p className="text-[15px] font-bold text-on-surface mt-0.5">
                      {owner.stats?.driverCount || 0}
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] text-blue-600 uppercase font-bold">Live</p>
                    <p className="text-[15px] font-bold text-blue-600 mt-0.5">
                      {owner.stats?.activeTripsCount || 0}
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold">Done</p>
                    <p className="text-[15px] font-bold text-emerald-600 mt-0.5">
                      {owner.stats?.completedTripsCount || 0}
                    </p>
                  </div>
                </div>

                {/* Revenue Generated */}
                <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/15 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-blue-600">Total Revenue Generated</span>
                  <span className="font-bold text-on-surface text-[14px]">
                    {formatCurrency(owner.stats?.totalRevenue)}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/20 flex justify-between items-center text-[12px]">
                <span className="text-on-surface-variant">
                  Joined: {new Date(owner.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={() => handleInspectOwner(owner._id)}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold transition-colors flex items-center gap-1"
                >
                  Inspect Fleet
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.pages > 1 && (
        <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex items-center justify-between text-[13px] text-on-surface-variant">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} Fleet Owners)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={pagination.page <= 1}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
              disabled={pagination.page >= pagination.pages}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Owner Fleet Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[20px] text-on-surface">
                  {modalLoading ? "Loading Fleet..." : ownerDetails?.owner?.businessName || ownerDetails?.owner?.name}
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  Complete Fleet Architecture: Trucks, Registered Drivers, and Recent Movements
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[13px]">
              {modalLoading ? (
                <div className="py-16 text-center text-on-surface-variant flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[24px] text-secondary">
                    progress_activity
                  </span>
                  <span>Loading fleet details...</span>
                </div>
              ) : ownerDetails ? (
                <>
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Fleet Trucks</p>
                      <p className="text-2xl font-bold text-on-surface mt-1">
                        {ownerDetails.trucks?.length || 0}
                      </p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Drivers</p>
                      <p className="text-2xl font-bold text-on-surface mt-1">
                        {ownerDetails.drivers?.length || 0}
                      </p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Logged Trips</p>
                      <p className="text-2xl font-bold text-on-surface mt-1">
                        {ownerDetails.recentTrips?.length || 0}
                      </p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        {formatCurrency(ownerDetails.totalExpenses)}
                      </p>
                    </div>
                  </div>

                  {/* Registered Trucks Section */}
                  <div>
                    <h4 className="font-bold text-[15px] text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-blue-600">local_shipping</span>
                      Registered Trucks ({ownerDetails.trucks?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ownerDetails.trucks?.map((truck) => (
                        <div
                          key={truck._id}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono font-bold text-on-surface text-[14px]">
                              {truck.registrationNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                truck.status === "AVAILABLE"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : truck.status === "ON_TRIP"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              {truck.status}
                            </span>
                          </div>
                          <p className="text-[12px] text-on-surface-variant">
                            {truck.truckType || "Truck"} • {truck.capacity || "N/A"}
                          </p>
                          {truck.currentDriverId && (
                            <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">person</span>
                              Driver: {truck.currentDriverId?.userId?.name || "Assigned"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Registered Drivers Section */}
                  <div>
                    <h4 className="font-bold text-[15px] text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-indigo-600">badge</span>
                      Fleet Drivers ({ownerDetails.drivers?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ownerDetails.drivers?.map((driver) => (
                        <div
                          key={driver._id}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-on-surface">
                              {driver.userId?.name || "Driver"}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                              {driver.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant font-mono">
                            Lic: {driver.licenseNumber}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1">
                            Phone: {driver.userId?.phone || "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Trips Section */}
                  <div>
                    <h4 className="font-bold text-[15px] text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-emerald-600">route</span>
                      Recent Fleet Trips ({ownerDetails.recentTrips?.length || 0})
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-surface-container-low text-on-surface-variant font-semibold">
                          <tr>
                            <th className="p-3">Route</th>
                            <th className="p-3">Material</th>
                            <th className="p-3">Revenue</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {ownerDetails.recentTrips?.map((trip) => (
                            <tr key={trip._id} className="hover:bg-surface-container-low/50">
                              <td className="p-3 font-semibold text-on-surface">
                                {trip.source} → {trip.destination}
                              </td>
                              <td className="p-3 text-on-surface-variant">{trip.material || "Freight"}</td>
                              <td className="p-3 font-semibold text-on-surface">
                                {formatCurrency(trip.actualRevenue || trip.expectedRevenue)}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    trip.status === "ON_TRIP"
                                      ? "bg-blue-500/10 text-blue-600"
                                      : trip.status === "COMPLETED"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-red-500/10 text-red-600"
                                  }`}
                                >
                                  {trip.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-surface-container-high text-on-surface font-medium hover:bg-surface-container-highest transition-colors"
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
