import AuditLog from '../models/AuditLog.js';

// @desc    Get paginated audit logs with search and category filters
// @route   GET /api/audit-logs
// @access  Private (Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      category,
      action,
      status,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Category filter
    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    // Action filter
    if (action && action !== 'ALL') {
      query.action = action;
    }

    // Status filter
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search filter across description, action, userName, userEmail, targetId, ipAddress
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { description: searchRegex },
        { action: searchRegex },
        { userName: searchRegex },
        { userEmail: searchRegex },
        { targetId: searchRegex },
        { ipAddress: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log statistics and category distribution
// @route   GET /api/audit-logs/stats
// @access  Private (Admin)
export const getAuditStats = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, categoryCounts, statusCounts] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      AuditLog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const categories = {};
    categoryCounts.forEach((c) => {
      categories[c._id] = c.count;
    });

    const statuses = {};
    statusCounts.forEach((s) => {
      statuses[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        categories,
        statuses,
      },
    });
  } catch (error) {
    next(error);
  }
};
