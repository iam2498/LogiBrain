import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";

export default function ForgotPassword() {
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & New Password, 3: Success
  const [identifier, setIdentifier] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const navigate = useNavigate();

  const validateStep1 = () => {
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    const otpStr = otp.trim();
    if (!otpStr) {
      errors.otp = "Verification code cannot be empty";
    } else if (otpStr.length !== 6) {
      errors.otp = "Verification code must be exactly 6 digits";
    }

    if (!newPassword) {
      errors.newPassword = "New password cannot be empty";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password cannot be empty";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setError("");
    setIsLoading(true);
    try {
      const res = await axiosClient.post("/auth/forgot-password", {
        identifier: identifier.trim(),
      });
      setSentEmail(res.data.data?.email || identifier.trim());
      setStep(2);
      showSuccess("Verification code sent to your email!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to process password reset request";
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setError("");
    setIsLoading(true);
    try {
      await axiosClient.post("/auth/reset-password", {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setStep(3);
      showSuccess("Password reset successfully!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password";
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-on-background font-body-md bg-background">
      {/* Left: Illustration Side (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-container overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-bright via-secondary-fixed to-primary-fixed opacity-70"></div>
        <img
          className="relative z-10 w-4/5 max-w-2xl object-contain drop-shadow-2xl mix-blend-multiply"
          alt="Fleet management illustration"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4770IeHhtyV75zeLFq-ChPqeH4SvhjVEIDBvqc8wQUXOGbGYqinDDFhKlVaEeJGMEW4qzYpT5J57PmPGoZtDFFJQD9PlYo3JwgMy8xfNK79qgqtCdNKL5EPcscBDEK2p_riI9kN0NA47UcmNhQuyNcRz3FgT1t2mJHn2DSXAjkowW1YSEM2MSWd740Qrwv6PqkW730x9G3dUuBDp46eno8YSk0XSkxYNyWvsOA1NK6VrOIlm9D4Ep"
        />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      {/* Right: Auth Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-[16px] shadow-[0px_1px_3px_rgba(15,23,42,0.03),0px_10px_20px_rgba(15,23,42,0.05)] p-8 relative overflow-hidden">
          {/* Brand / Logo */}
          <div className="mb-8 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">
                local_shipping
              </span>
            </div>
            <span className="font-headline-md text-[18px] text-primary font-bold">LogiBrain</span>
          </div>

          {/* STEP 1: Enter Identifier */}
          {step === 1 && (
            <>
              <div className="mb-8">
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-[24px] md:text-[28px] font-bold text-on-surface mb-2">
                  Forgot Password? 🔑
                </h1>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Enter your registered email or phone number to receive a 6-digit verification
                  code.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleRequestOtp}>
                <div className="space-y-2">
                  <label
                    className="font-label-md text-[14px] font-medium text-on-surface block"
                    htmlFor="identifier"
                  >
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      person
                    </span>
                    <input
                      className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.identifier
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-transparent focus:border-primary"
                        } focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                      id="identifier"
                      placeholder="e.g. name@example.com or 9876543210"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: null });
                      }}
                    />
                  </div>
                  {fieldErrors.identifier && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.identifier}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] bg-primary text-on-primary rounded-[16px] font-medium shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-outline-variant/30 pt-6">
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Remember your password?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-secondary hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-[24px] md:text-[28px] font-bold text-on-surface mb-2">
                  Reset Password 🔒
                </h1>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Enter the 6-digit verification code sent to your email and set your new password.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl mb-5 flex items-start gap-2.5 text-[13px] text-blue-900">
                <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0 mt-0.5">
                  mark_email_read
                </span>
                <div>
                  <span className="font-bold block">Check your inbox</span>
                  <span>
                    A 6-digit verification code has been sent via email to{" "}
                    <strong>{sentEmail || identifier}</strong>. It expires in 15 minutes.
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleResetPassword}>
                {/* 6-Digit OTP */}
                <div className="space-y-1.5">
                  <label
                    className="font-label-md text-[14px] font-medium text-on-surface block"
                    htmlFor="otp"
                  >
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      pin
                    </span>
                    <input
                      className={`w-full h-[52px] pl-12 pr-4 bg-surface rounded-[16px] border ${fieldErrors.otp
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-transparent focus:border-primary"
                        } focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md font-mono tracking-wider placeholder:text-outline-variant outline-none`}
                      id="otp"
                      placeholder="123456"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value);
                        if (fieldErrors.otp) setFieldErrors({ ...fieldErrors, otp: null });
                      }}
                    />
                  </div>
                  {fieldErrors.otp && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.otp}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label
                    className="font-label-md text-[14px] font-medium text-on-surface block"
                    htmlFor="newPassword"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      lock
                    </span>
                    <input
                      className={`w-full h-[52px] pl-12 pr-12 bg-surface rounded-[16px] border ${fieldErrors.newPassword
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-transparent focus:border-primary"
                        } focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                      id="newPassword"
                      placeholder="At least 8 characters"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (fieldErrors.newPassword)
                          setFieldErrors({ ...fieldErrors, newPassword: null });
                      }}
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  {fieldErrors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label
                    className="font-label-md text-[14px] font-medium text-on-surface block"
                    htmlFor="confirmPassword"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      lock_reset
                    </span>
                    <input
                      className={`w-full h-[52px] pl-12 pr-12 bg-surface rounded-[16px] border ${fieldErrors.confirmPassword
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-transparent focus:border-primary"
                        } focus:bg-surface-container-lowest focus:ring-0 shadow-sm transition-all text-body-md placeholder:text-outline-variant outline-none`}
                      id="confirmPassword"
                      placeholder="Repeat new password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword)
                          setFieldErrors({ ...fieldErrors, confirmPassword: null });
                      }}
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showConfirmPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] bg-primary text-on-primary rounded-[16px] font-medium shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-4"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-[13px] border-t border-outline-variant/30 pt-4">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleRequestOtp}
                    className="text-secondary hover:text-primary transition-colors font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setOtp("");
                      setFieldErrors({});
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors font-medium flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Change Email
                  </button>
                </div>
                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <div className="w-full text-center">
                <h2 className="font-headline-lg text-[24px] font-bold text-on-surface mb-2">
                  Password Reset! 🎉
                </h2>
                <p className="text-[14px] text-on-surface-variant leading-relaxed max-w-[340px] mx-auto text-center">
                  Your password has been reset successfully. You can now log in to LogiBrain using your new password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full h-[52px] bg-primary text-on-primary rounded-[16px] font-medium shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
