const { z } = require("zod");

const registerOwnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name cannot be empty")
    .min(3, "Full name must be at least 3 characters")
    .refine((val) => !/^\d+$/.test(val), "Full name cannot be only numbers"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address (e.g. name@example.com)"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  password: z
    .string()
    .min(1, "Password cannot be empty")
    .min(8, "Password must be at least 8 characters")
    .refine((val) => val.trim().length > 0, "Password cannot be only spaces"),
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters"),
  businessAddress: z
    .string()
    .trim()
    .min(5, "Business address must be at least 5 characters"),
  gstNumber: z.string().trim().optional(),
});

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or Phone Number is required")
    .refine((val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isPhone = /^\d{10}$/.test(val);
      return isEmail || isPhone;
    }, "Enter a valid email address or 10-digit phone number"),
  password: z
    .string()
    .min(1, "Password cannot be empty")
    .min(8, "Password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or Phone Number is required")
    .refine((val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isPhone = /^\d{10}$/.test(val);
      return isEmail || isPhone;
    }, "Enter a valid email address or 10-digit phone number"),
});

const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Email or Phone Number is required"),
  otp: z.string().trim().length(6, "Verification code must be 6 digits"),
  newPassword: z
    .string()
    .min(1, "New password cannot be empty")
    .min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(1, "New password cannot be empty")
    .min(8, "New password must be at least 8 characters")
    .refine((val) => val.trim().length > 0, "Password cannot be only spaces"),
});

module.exports = {
  registerOwnerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
