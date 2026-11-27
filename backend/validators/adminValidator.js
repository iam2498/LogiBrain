const { z } = require("zod");

const ownerStatusActionSchema = z
  .object({
    action: z.enum(["ACTIVATE", "SUSPEND", "REACTIVATE"]),
    reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "SUSPEND" && (!data.reason || data.reason.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "A suspension reason of at least 3 characters is required",
      });
    }
  });

const updateSupportRequestSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]),
  adminResponse: z.string().trim().max(2000, "Response cannot exceed 2000 characters").optional(),
});

const createSupportRequestSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150),
  category: z.enum(["ACCOUNT", "BILLING", "TECHNICAL", "GENERAL"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

module.exports = {
  ownerStatusActionSchema,
  updateSupportRequestSchema,
  createSupportRequestSchema,
};
