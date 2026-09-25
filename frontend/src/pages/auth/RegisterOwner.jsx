import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterOwner() {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", businessName: "", businessAddress: ""
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { registerOwner } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: null });
    }
  };

  const validate = () => {
    const errors = {};
    const name = formData.name.trim();
    if (!name) {
      errors.name = "Username cannot be empty";
    } else if (name.length < 3) {
      errors.name = "Username must be at least 3 characters";
    } else if (/^\d+$/.test(name)) {
      errors.name = "Username cannot be only numbers";
    }

    if (!formData.phone) {
      errors.phone = "Phone number cannot be empty";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = "Enter a valid 10-digit phone number";
    }

    if (!formData.email) {
      errors.email = "Email cannot be empty";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address (e.g. name@example.com)";
    }

    if (!formData.password) {
      errors.password = "Password cannot be empty";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setIsLoading(true);
    try {
      await registerOwner(formData);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-on-background font-body-md bg-background">
      {/* Left: Illustration Side (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-container overflow-hidden items-center justify-center">
        {/* Subtle blue gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-bright via-secondary-fixed to-primary-fixed opacity-70"></div>
        {/* Illustration Image */}
        <img 
          className="relative z-10 w-4/5 max-w-2xl object-contain drop-shadow-2xl mix-blend-multiply" 
          alt="Fleet management dashboard illustration"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4770IeHhtyV75zeLFq-ChPqeH4SvhjVEIDBvqc8wQUXOGbGYqinDDFhKlVaEeJGMEW4qzYpT5J57PmPGoZtDFFJQD9PlYo3JwgMy8xfNK79qgqtCdNKL5EPcscBDEK2p_riI9kN0NA47UcmNhQuyNcRz3FgT1t2mJHn2DSXAjkowW1YSEM2MSWd740Qrwv6PqkW730x9G3dUuBDp46eno8YSk0XSkxYNyWvsOA1NK6VrOIlm9D4Ep" 
        />
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      {/* Right: Auth Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 h-screen overflow-y-auto">
        {/* Centered Auth Card */}
        <div className="w-full max-w-[500px] bg-surface-container-lowest rounded-[16px] shadow-[0px_1px_3px_rgba(15,23,42,0.03),0px_10px_20px_rgba(15,23,42,0.05)] p-8 relative overflow-hidden my-auto">
          
          {/* Brand / Logo */}
          <div className="mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">local_shipping</span>
            </div>
            <span className="font-headline-md text-[18px] text-primary font-bold">LogiBrain</span>
          </div>

          {/* Headers */}
          <div className="mb-8">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-[24px] md:text-[32px] font-bold text-on-surface mb-2">Create Account</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant">Register your fleet to get started.</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">{error}</div>}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="font-label-md text-[14px] font-medium text-on-surface block">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                  <input 
                    className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                    name="name" placeholder="John Doe" type="text"
                    onChange={handleChange}
                  />
                </div>
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="font-label-md text-[14px] font-medium text-on-surface block">Phone</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">call</span>
                  <input 
                    className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                    name="phone" placeholder="9876543210" type="text"
                    onChange={handleChange}
                  />
                </div>
                {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="font-label-md text-[14px] font-medium text-on-surface block">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                <input 
                  className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                  name="email" placeholder="name@company.com" type="text"
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="font-label-md text-[14px] font-medium text-on-surface block">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input 
                  className={`w-full h-[52px] pl-12 pr-12 bg-surface rounded-[16px] border ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                  name="password" placeholder="••••••••" type={showPassword ? "text" : "password"}
                  onChange={handleChange}
                />
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? "visibility" : "visibility_off"}</span>
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
            </div>

            {/* Business Name Input */}
            <div className="space-y-2">
              <label className="font-label-md text-[14px] font-medium text-on-surface block">Business Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">store</span>
                <input 
                  className="w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none" 
                  name="businessName" placeholder="Acme Logistics Ltd." required type="text"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Business Address Input */}
            <div className="space-y-2">
              <label className="font-label-md text-[14px] font-medium text-on-surface block">Business Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-6 -translate-y-1/2 text-outline">location_on</span>
                <textarea 
                  className="w-full min-h-[80px] pt-3 pb-3 pl-12 pr-4 bg-surface rounded-[16px] border border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none resize-none" 
                  name="businessAddress" placeholder="123 Transport Way..." required
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              className={`w-full h-[48px] bg-primary text-on-primary rounded-[16px] font-label-md text-[14px] font-medium flex items-center justify-center gap-2 hover:shadow-[0px_4px_6px_rgba(15,23,42,0.12)] transition-all active:scale-[0.98] mt-4 ${isLoading ? 'opacity-80 cursor-not-allowed animate-pulse' : ''}`}
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? "Creating Account..." : "Register"}</span>
              {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="font-body-sm text-[14px] text-on-surface-variant">
              Already have an account? 
              <Link className="font-label-md text-[14px] font-medium text-primary hover:underline ml-1" to="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
