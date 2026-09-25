import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: null });
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
  };

  const validate = () => {
    const errors = {};
    const idStr = identifier.trim();
    if (!idStr) {
      errors.identifier = "Email or Phone Number cannot be empty";
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idStr);
      const isPhone = /^\d{10}$/.test(idStr);
      if (!isEmail && !isPhone) {
        errors.identifier = "Enter a valid email address or 10-digit phone number";
      }
    }

    if (!password) {
      errors.password = "Password cannot be empty";
    } else if (password.length < 8) {
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
      const user = await login(identifier, password);
      if (user.role === "OWNER") {
        navigate("/owner/dashboard");
      } else {
        navigate("/driver/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        {/* Centered Auth Card */}
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-[16px] shadow-[0px_1px_3px_rgba(15,23,42,0.03),0px_10px_20px_rgba(15,23,42,0.05)] p-8 relative overflow-hidden">
          
          {/* Brand / Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">local_shipping</span>
            </div>
            <span className="font-headline-md text-[18px] text-primary font-bold">LogiBrain</span>
          </div>

          {/* Headers */}
          <div className="mb-10">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-[24px] md:text-[32px] font-bold text-on-surface mb-2">Welcome Back 👋</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant">Sign in to continue managing your fleet.</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">{error}</div>}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="space-y-2">
              <label className="font-label-md text-[14px] font-medium text-on-surface block" htmlFor="identifier">Email or Phone Number</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                <input 
                  className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.identifier ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                  id="identifier" 
                  placeholder="Email or Phone Number" 
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                />
              </div>
              {fieldErrors.identifier && <p className="text-red-500 text-xs mt-1">{fieldErrors.identifier}</p>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-label-md text-[14px] font-medium text-on-surface block" htmlFor="password">Password</label>
                <a className="font-label-sm text-[12px] font-semibold text-secondary hover:text-primary transition-colors" href="#">Forgot Password?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input 
                  className={`w-full h-[52px] pl-12 pr-12 bg-surface rounded-[16px] border ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-primary'} focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
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

            {/* Remember Me */}
            <div className="flex items-center">
              <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface-container-lowest bg-surface" id="remember" type="checkbox" />
              <label className="ml-2 font-body-sm text-[14px] text-on-surface-variant" htmlFor="remember">Remember me for 30 days</label>
            </div>

            {/* Submit Button */}
            <button 
              className={`w-full h-[48px] bg-primary text-on-primary rounded-[16px] font-label-md text-[14px] font-medium flex items-center justify-center gap-2 hover:shadow-[0px_4px_6px_rgba(15,23,42,0.12)] transition-all active:scale-[0.98] ${isLoading ? 'opacity-80 cursor-not-allowed animate-pulse' : ''}`}
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? "Signing In..." : "Sign In"}</span>
              {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-surface-variant"></div>
            <span className="mx-4 font-label-sm text-[12px] font-semibold text-outline">OR CONTINUE WITH</span>
            <div className="flex-grow border-t border-surface-variant"></div>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4">
            <button className="h-[48px] bg-surface-container-lowest border border-surface-variant rounded-[16px] flex items-center justify-center gap-2 hover:bg-surface transition-colors" type="button">
              <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIQo5Ll-McJX6jgFuIGclv7YdQi6PM-9H3AWmerT5IwcW0mrZOr1llX2rAvsKMh99Ah5dqD3pMtAnxlSna9kbB5-nWbxMU-7eFtBHMR2ROhtkf5z_1NNRXsLZUsz4NyCeZKs-SoxEKaeZ6IULJpdI4XCtblRvno01g0LPzhVYVJgTB6SG8BOZTLebj-lE5jfi996MiFDTq3fTvfWHpBUDze93qfZwupIgIEOmjv_F_1O1o5XEK1u_N" />
              <span className="font-label-md text-[14px] font-medium text-on-surface">Google</span>
            </button>
            <button className="h-[48px] bg-surface-container-lowest border border-surface-variant rounded-[16px] flex items-center justify-center gap-2 hover:bg-surface transition-colors" type="button">
              <img alt="Microsoft" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEFQgl7ntsNEagLD3CmUV5KB3Ot1W57q36Ckj_Y3eOm4bI73QBVwrS-D_cmAO1x09q4_ZjK1twoq_5lQDZrND2USPj-Jc_ixSu4KE9P7JYOV9Y8eIyLg3Pct1S_zJx8XG8AY40koYU4V5_uyf53fB0rXFlXb_9GW08vTLLCisipFA49SugjTVPciSjbY75_NvhLy9W-xttTIg9p4-XRgk9v3SjfzPDa89FkQ4SsSlrLeGi7Fp1R4Bu" />
              <span className="font-label-md text-[14px] font-medium text-on-surface">Microsoft</span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-10 text-center">
            <p className="font-body-sm text-[14px] text-on-surface-variant">
              Don't have an account? 
              <Link className="font-label-md text-[14px] font-medium text-primary hover:underline ml-1" to="/register">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
