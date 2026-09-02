import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api';
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import '../dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (num) => {
  if (num >= 100000) return `৳${(num / 1000).toFixed(0)}k`;
  return `৳${(num || 0).toLocaleString('en-BD')}`;
};

const getStatusBadge = (status) => {
  const map = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-primary',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    returned: 'badge-danger',
  };
  return map[status] || 'badge-neutral';
};

const DashboardPage = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart', 30],
    queryFn: () => dashboardAPI.getChartData({ period: 30 }).then((r) => r.data.data),
  });

  if (statsLoading) {
    return (
      <div className="page">
        <div className="dashboard-stats stagger">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '80%', height: 28 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = statsData?.overview || {};
  const today = statsData?.today || {};
  const recentOrders = statsData?.recentOrders || [];
  const topDueCustomers = statsData?.topDueCustomers || [];

  // Chart config
  const lineChartData = {
    labels: (chartData || []).map((d) => {
      const date = new Date(d._id);
      return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Sales',
        data: (chartData || []).map((d) => d.totalSales),
        borderColor: '#6c5ce7',
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#6c5ce7',
      },
      {
        label: 'Collected',
        data: (chartData || []).map((d) => d.totalCollected),
        borderColor: '#00cec9',
        backgroundColor: 'rgba(0, 206, 201, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#00cec9',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9aa0a6',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12, family: 'Inter' },
        },
      },
      tooltip: {
        backgroundColor: '#1a1d28',
        titleColor: '#e8eaed',
        bodyColor: '#9aa0a6',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: (v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Overview of your business performance</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats stagger">
        <div className="stat-card stat-sales">
          <div className="stat-card-icon">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-label">Total Sales</div>
          <div className="stat-card-value">{formatCurrency(stats.totalSales)}</div>
          {today.salesToday > 0 && (
            <div className="stat-card-change bg-success-light text-success">
              <ArrowUpRight size={12} />
              ৳{today.salesToday?.toLocaleString()} today
            </div>
          )}
        </div>

        <div className="stat-card stat-dues">
          <div className="stat-card-icon">
            <AlertCircle size={22} />
          </div>
          <div className="stat-card-label">Total Pending Dues</div>
          <div className="stat-card-value text-danger">{formatCurrency(stats.totalDues)}</div>
        </div>

        <div className="stat-card stat-collected">
          <div className="stat-card-icon">
            <DollarSign size={22} />
          </div>
          <div className="stat-card-label">Total Collected</div>
          <div className="stat-card-value text-success">{formatCurrency(stats.totalCollected)}</div>
          {today.collectedToday > 0 && (
            <div className="stat-card-change bg-success-light text-success">
              <ArrowUpRight size={12} />
              ৳{today.collectedToday?.toLocaleString()} today
            </div>
          )}
        </div>

        <div className="stat-card stat-orders">
          <div className="stat-card-icon">
            <ShoppingCart size={22} />
          </div>
          <div className="stat-card-label">Total Orders</div>
          <div className="stat-card-value">{stats.totalOrders || 0}</div>
          {today.ordersToday > 0 && (
            <div className="stat-card-change bg-info-light text-info">
              <ArrowUpRight size={12} />
              {today.ordersToday} today
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-charts">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Sales & Collections</h3>
          </div>
          <div style={{ height: 300 }}>
            {chartData && chartData.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <p className="text-muted">No chart data available yet. Create some orders to see trends.</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Quick Stats</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customers</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.totalCustomers || 0}</div>
              </div>
              <Users size={24} style={{ color: 'var(--accent-secondary)', opacity: 0.6 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.activeCustomers || 0}</div>
              </div>
              <Users size={24} style={{ color: 'var(--success)', opacity: 0.6 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Today's Orders</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{today.ordersToday || 0}</div>
              </div>
              <Clock size={24} style={{ color: 'var(--warning)', opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-bottom">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
            <a href="/orders" className="btn btn-ghost btn-sm">View All</a>
          </div>
          {recentOrders.length > 0 ? (
            <div className="recent-orders-list">
              {recentOrders.map((order) => (
                <div key={order._id} className="recent-order-item">
                  <div className="recent-order-customer">
                    <div className="recent-order-name">{order.customer?.name || 'Unknown'}</div>
                    <div className="recent-order-phone">{order.customer?.phone}</div>
                  </div>
                  <div className="recent-order-amount">৳{order.totalBill?.toLocaleString()}</div>
                  <div className="recent-order-status">
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <ShoppingCart size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p className="text-muted">No orders yet</p>
            </div>
          )}
        </div>

        {/* Top Due Customers */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Due Customers</h3>
            <a href="/customers?hasDue=true" className="btn btn-ghost btn-sm">View All</a>
          </div>
          {topDueCustomers.length > 0 ? (
            <div>
              {topDueCustomers.map((customer) => (
                <div key={customer._id} className="due-customer-item">
                  <div className="due-customer-info">
                    <span className="due-customer-name">{customer.name}</span>
                    <span className="due-customer-phone">{customer.phone}</span>
                  </div>
                  <span className="due-customer-amount">৳{customer.totalDue?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <AlertCircle size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p className="text-muted">No pending dues</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
