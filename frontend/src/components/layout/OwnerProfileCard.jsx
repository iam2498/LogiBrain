import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function OwnerProfileCard({ onNavigate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSelectOption = (tab) => {
    setMenuOpen(false);
    if (onNavigate) onNavigate();
    navigate(`/owner/profile?tab=${tab}`);
  };

  return (
    <div ref={containerRef} className="relative mb-3">
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f172a] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
          <button
            type="button"
            onClick={() => handleSelectOption("details")}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">edit</span>
            <span>Edit Owner Details</span>
          </button>
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={() => handleSelectOption("password")}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-400">lock_reset</span>
            <span>Change Password</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer group"
        title="Profile Settings"
      >
        <div className="w-10 h-10 rounded-full bg-surface-container-highest/20 flex items-center justify-center text-white font-bold border border-on-primary-container/30 shrink-0">
          {user?.name?.charAt(0).toUpperCase() || "O"}
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p className="text-white text-[14px] font-medium truncate">{user?.name}</p>
          <p className="text-on-primary-container text-[12px] truncate">{user?.email}</p>
        </div>
        <span className="material-symbols-outlined text-[18px] text-on-primary-container group-hover:text-white transition-colors shrink-0">
          {menuOpen ? "expand_more" : "settings"}
        </span>
      </button>
    </div>
  );
}
