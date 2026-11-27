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

module.exports = {
  ownerStatusActionSchema,
};
