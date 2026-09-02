import Order from '../models/Order.js';
import Customer from '../models/Customer.js';

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
export const getDashboardStats = async (req, res, next) => {
  try {
    // Run all aggregations in parallel
    const [
      totalCustomers,
      activeCustomers,
      totalOrders,
      ordersByStatus,
      financialStats,
      recentOrders,
      topDueCustomers,
      todayStats,
    ] = await Promise.all([
      // Total customers
      Customer.countDocuments(),

      // Active customers
      Customer.countDocuments({ status: 'active' }),

      // Total orders
      Order.countDocuments(),

      // Orders by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Financial summary from Customer collection (pre-computed)
      Customer.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalPurchases' },
            totalCollected: { $sum: '$totalPaid' },
            totalDues: { $sum: '$totalDue' },
          },
        },
      ]),

      // Recent 10 orders
      Order.find()
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Top 10 customers with highest due
      Customer.find({ totalDue: { $gt: 0 } })
        .sort({ totalDue: -1 })
        .limit(10)
        .select('name phone totalDue totalPurchases')
        .lean(),

      // Today's stats
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Order.aggregate([
          { $match: { createdAt: { $gte: today } } },
          {
            $group: {
              _id: null,
              ordersToday: { $sum: 1 },
              salesToday: { $sum: '$totalBill' },
              collectedToday: { $sum: '$paidAmount' },
            },
          },
        ]);
      })(),
    ]);

    const financial = financialStats[0] || {
      totalSales: 0,
      totalCollected: 0,
      totalDues: 0,
    };

    const today = todayStats[0] || {
      ordersToday: 0,
      salesToday: 0,
      collectedToday: 0,
    };

    // Transform ordersByStatus into an object
    const statusCounts = {};
    ordersByStatus.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          activeCustomers,
          totalOrders,
          totalSales: financial.totalSales,
          totalCollected: financial.totalCollected,
          totalDues: financial.totalDues,
        },
        today,
        ordersByStatus: statusCounts,
        recentOrders,
        topDueCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chart data (sales over time)
// @route   GET /api/dashboard/chart-data
export const getChartData = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const salesByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalSales: { $sum: '$totalBill' },
          totalCollected: { $sum: '$paidAmount' },
          totalDue: { $sum: '$orderDue' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: salesByDay,
    });
  } catch (error) {
    next(error);
  }
};
