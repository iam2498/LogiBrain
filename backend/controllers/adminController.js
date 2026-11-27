const User = require("../models/User");
const SupportRequest = require("../models/SupportRequest");
const AdminActivityLog = require("../models/AdminActivityLog");
const { getSystemHealth } = require("../utils/systemMetrics");
const {
  ownerStatusActionSchema,
  updateSupportRequestSchema,
} = require("../validators/adminValidator");

const OWNER_PUBLIC_PROJECTION =
  "_id name email isActive accountStatus createdAt updatedAt lastLoginAt suspendedAt suspensionReason suspendedBy";

function resolveOwnerAccountStatus(ownerDoc) {
  if (!ownerDoc) return "SUSPENDED";
  if (ownerDoc.accountStatus === "SUSPENDED" || ownerDoc.isActive === false) {
    return "SUSPENDED";
  }
  return "ACTIVE";
}

function serializeOwnerAccount(ownerDoc) {
  const plain = ownerDoc.toObject ? ownerDoc.toObject() : { ...ownerDoc };
  return {
    _id: plain._id,
    name: plain.name,
    email: plain.email,
    accountStatus: resolveOwnerAccountStatus(plain),
    isActive: resolveOwnerAccountStatus(plain) === "ACTIVE",
    createdAt: plain.createdAt,
    lastLoginAt: plain.lastLoginAt || null,
    suspendedAt: plain.suspendedAt || null,
    suspensionReason: plain.suspensionReason || null,
    suspendedBy: plain.suspendedBy || null,
  };
}

// 1. Platform Dashboard Overview (Strictly platform-level; zero private business data)
exports.getPlatformOverview = async (req, res, next) => {
  try {
    const activeFilter = {
      role: "OWNER",
      isActive: true,
      accountStatus: { $ne: "SUSPENDED" },
    };
    const suspendedFilter = {
      role: "OWNER",
      $or: [{ isActive: false }, { accountStatus: "SUSPENDED" }],
    };

    const [
      totalOwners,
      activeOwners,
      suspendedOwners,
      pendingSupportRequests,
      recentOwnersDocs,
      recentActivities,
    ] = await Promise.all([
      User.countDocuments({ role: "OWNER" }),
      User.countDocuments(activeFilter),
      User.countDocuments(suspendedFilter),
      SupportRequest.countDocuments({ status: "PENDING" }),
      User.find({ role: "OWNER" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(OWNER_PUBLIC_PROJECTION)
        .lean(),
      AdminActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("adminId", "name email")
        .lean(),
    ]);

    const health = getSystemHealth();

    res.json({
      success: true,
      data: {
        summary: {
          totalOwners,
          activeOwners,
          suspendedOwners,
          pendingSupportRequests,
        },
        recentOwners: recentOwnersDocs.map(serializeOwnerAccount),
        recentActivities,
        systemStatus: {
          apiStatus: health.apiStatus,
          databaseStatus: health.databaseStatus,
          uptimeSeconds: health.uptimeSeconds,
          errorCount: health.errorCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Owner Account Listing (Search, Status Filter, Pagination)
exports.getOwners = async (req, res, next) => {
  try {
    const { search = "", status = "ALL", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = { role: "OWNER" };
    const andFilters = [];

    if (status === "ACTIVE") {
      andFilters.push({ isActive: true, accountStatus: { $ne: "SUSPENDED" } });
    } else if (status === "SUSPENDED") {
      andFilters.push({ $or: [{ isActive: false }, { accountStatus: "SUSPENDED" }] });
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      andFilters.push({ $or: [{ name: searchRegex }, { email: searchRegex }] });
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const [owners, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select(OWNER_PUBLIC_PROJECTION)
        .populate("suspendedBy", "name email")
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        owners: owners.map(serializeOwnerAccount),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. View Basic Owner Account Information Only
exports.getOwnerAccountById = async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: "OWNER" })
      .select(OWNER_PUBLIC_PROJECTION)
      .populate("suspendedBy", "name email")
      .lean();

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner account not found" });
    }

    res.json({
      success: true,
      data: serializeOwnerAccount(owner),
    });
  } catch (error) {
    next(error);
  }
};

// 4. Activate / Suspend / Reactivate Owner Account (Never touches business data)
exports.updateOwnerAccountStatus = async (req, res, next) => {
  try {
    const { action, reason } = ownerStatusActionSchema.parse(req.body);
    const owner = await User.findOne({ _id: req.params.id, role: "OWNER" }).select(
      OWNER_PUBLIC_PROJECTION
    );

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner account not found" });
    }

    const currentStatus = resolveOwnerAccountStatus(owner);

    if (action === "SUSPEND") {
      if (currentStatus === "SUSPENDED") {
        return res.status(400).json({
          success: false,
          message: "Owner account is already suspended",
        });
      }

      owner.isActive = false;
      owner.accountStatus = "SUSPENDED";
      owner.suspendedAt = new Date();
      owner.suspensionReason = reason.trim();
      owner.suspendedBy = req.user._id;
      await owner.save();

      await AdminActivityLog.create({
        adminId: req.user._id,
        action: "OWNER_SUSPENDED",
        targetType: "OWNER",
        targetId: owner._id,
        targetLabel: `${owner.name} (${owner.email})`,
        reason: owner.suspensionReason,
        metadata: { previousStatus: currentStatus, newStatus: "SUSPENDED" },
      });

      const populatedOwner = await User.findById(owner._id)
        .select(OWNER_PUBLIC_PROJECTION)
        .populate("suspendedBy", "name email")
        .lean();

      return res.json({
        success: true,
        message: `Owner account ${owner.name} has been suspended`,
        data: serializeOwnerAccount(populatedOwner),
      });
    }

    // ACTIVATE or REACTIVATE
    if (currentStatus === "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Owner account is already active",
      });
    }

    owner.isActive = true;
    owner.accountStatus = "ACTIVE";
    owner.suspendedAt = undefined;
    owner.suspensionReason = undefined;
    owner.suspendedBy = undefined;
    await owner.save();

    const logAction =
      action === "REACTIVATE" || currentStatus === "SUSPENDED"
        ? "OWNER_REACTIVATED"
        : "OWNER_ACTIVATED";

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: logAction,
      targetType: "OWNER",
      targetId: owner._id,
      targetLabel: `${owner.name} (${owner.email})`,
      reason: reason?.trim() || undefined,
      metadata: { previousStatus: currentStatus, newStatus: "ACTIVE" },
    });

    const populatedOwner = await User.findById(owner._id)
      .select(OWNER_PUBLIC_PROJECTION)
      .lean();

    res.json({
      success: true,
      message: `Owner account ${owner.name} has been reactivated`,
      data: serializeOwnerAccount(populatedOwner),
    });
  } catch (error) {
    next(error);
  }
};

// 5. List Support & Help Requests
exports.getSupportRequests = async (req, res, next) => {
  try {
    const { status = "ALL", search = "", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [{ subject: searchRegex }, { message: searchRegex }];
    }

    const [requests, total, pendingCount] = await Promise.all([
      SupportRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("ownerId", "name email accountStatus isActive")
        .populate("respondedBy", "name email")
        .lean(),
      SupportRequest.countDocuments(query),
      SupportRequest.countDocuments({ status: "PENDING" }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pendingCount,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Update Support Request Status & Admin Response
exports.updateSupportRequest = async (req, res, next) => {
  try {
    const { status, adminResponse } = updateSupportRequestSchema.parse(req.body);
    const requestDoc = await SupportRequest.findById(req.params.id);

    if (!requestDoc) {
      return res.status(404).json({ success: false, message: "Support request not found" });
    }

    const previousStatus = requestDoc.status;
    requestDoc.status = status;
    if (adminResponse !== undefined) {
      requestDoc.adminResponse = adminResponse;
    }
    requestDoc.respondedBy = req.user._id;
    requestDoc.respondedAt = new Date();
    if (status === "RESOLVED") {
      requestDoc.resolvedAt = new Date();
    } else if (previousStatus === "RESOLVED") {
      requestDoc.resolvedAt = undefined;
    }

    await requestDoc.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: "SUPPORT_REQUEST_UPDATED",
      targetType: "SUPPORT_REQUEST",
      targetId: requestDoc._id,
      targetLabel: requestDoc.subject,
      reason: `Status changed from ${previousStatus} to ${status}`,
      metadata: { previousStatus, newStatus: status },
    });

    const updated = await SupportRequest.findById(requestDoc._id)
      .populate("ownerId", "name email accountStatus isActive")
      .populate("respondedBy", "name email")
      .lean();

    res.json({
      success: true,
      message: "Support request updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// 7. System Health & Monitoring
exports.getSystemMonitoring = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: getSystemHealth(),
    });
  } catch (error) {
    next(error);
  }
};

// 8. Admin Security & Activity Logs
exports.getActivityLogs = async (req, res, next) => {
  try {
    const { action = "ALL", page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (action && action !== "ALL") {
      query.action = action;
    }

    const [logs, total] = await Promise.all([
      AdminActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("adminId", "name email")
        .lean(),
      AdminActivityLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
