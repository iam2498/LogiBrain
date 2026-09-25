const { z } = require("zod");

const registerOwnerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Username cannot be empty")
    .min(3, "Username must be at least 3 characters")
    .refine(val => !/^\d+$/.test(val), "Username cannot be only numbers"),
  email: z.string().email("Enter a valid email address (e.g. name@example.com)"),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  password: z.string().min(1, "Password cannot be empty").min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name is required"),
  businessAddress: z.string().min(5, "Business address is required"),
  gstNumber: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string()
    .trim()
    .min(1, "Email or Phone Number is required")
    .refine(val => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isPhone = /^\d{10}$/.test(val);
      return isEmail || isPhone;
    }, "Enter a valid email address or 10-digit phone number"),
  password: z.string().min(1, "Password cannot be empty").min(8, "Password must be at least 8 characters"),
});

module.exports = { registerOwnerSchema, loginSchema };
