const SupportRequest = require("../models/SupportRequest");
const { createSupportRequestSchema } = require("../validators/adminValidator");

exports.createSupportRequest = async (req, res, next) => {
  try {
    const parsedData = createSupportRequestSchema.parse(req.body);

    const requestDoc = await SupportRequest.create({
      ownerId: req.user._id,
      subject: parsedData.subject,
      category: parsedData.category || "GENERAL",
      priority: parsedData.priority || "MEDIUM",
      message: parsedData.message,
      status: "PENDING",
    });

    res.status(201).json({ success: true, data: requestDoc });
  } catch (error) {
    next(error);
  }
};

exports.getMySupportRequests = async (req, res, next) => {
  try {
    const requests = await SupportRequest.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};
