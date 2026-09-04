import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderAPI, customerAPI, smsAPI } from '../api';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Package,
  DollarSign,
  FileSpreadsheet,
  Phone,
  Truck,
  Calendar,
  CreditCard,
  MapPin,
  FileText,
  Printer,
  Send,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ArrowRight,
  RotateCcw,
  Coins,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import PhoneInput, { isBDPhoneValid } from '../components/PhoneInput';
import WhatsAppOrderModal from '../components/WhatsAppOrderModal';

const formatSummaryDate = (dateStr) => {
  if (!dateStr) return { formatted: '', isToday: false, isYesterday: false };
  const parts = dateStr.split('-').map(Number);
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

  const isToday = dateStr === todayStr;
  const isYesterday = dateStr === yestStr;

  const formatted = dateObj.toLocaleDateString('en-BD', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return { formatted, isToday, isYesterday };
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

const getPaymentBadge = (status) => {
  const map = { unpaid: 'badge-danger', partial: 'badge-warning', paid: 'badge-success' };
  return map[status] || 'badge-neutral';
};

const OrdersPage = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [showStickerModal, setShowStickerModal] = useState(null);
  const [showTrackingSmsModal, setShowTrackingSmsModal] = useState(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(null);
  const [editOrderForm, setEditOrderForm] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });
  const [orderToDelete, setOrderToDelete] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Order form state
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    customerSearch: '',
    items: [{ productName: '', quantity: 1, rate: '' }],
    discount: '',
    courierName: '',
    courierCharge: '',
    paidAmount: '',
    deliveryAddress: '',
    notes: '',
  });

  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (data) => customerAPI.create(data),
    onSuccess: (res) => {
      const newCust = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-search'] });
      toast.success(`Customer ${newCust.name} created!`);
      setOrderForm((prev) => ({
        ...prev,
        customerId: newCust._id,
        customerSearch: `${newCust.name} (${newCust.phone})`,
        deliveryAddress: newCust.address,
      }));
      setShowQuickCustomerModal(false);
      setQuickCustomerForm({ name: '', phone: '', address: '', area: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create customer'),
  });

  const handleQuickCustomerSubmit = (e) => {
    e.preventDefault();
    if (!isBDPhoneValid(quickCustomerForm.phone)) {
      toast.error('Customer phone number must be exactly 11 digits (e.g. 017XXXXXXXX)');
      return;
    }
    quickCustomerMutation.mutate(quickCustomerForm);
  };

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'summary'
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yestStr = toYMD(y);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setStartDate(toYMD(past));
      setEndDate(toYMD(now));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setStartDate(toYMD(past));
      setEndDate(toYMD(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    }
  };

  const clearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const filterBySpecificDate = (dateStr) => {
    setStartDate(dateStr);
    setEndDate(dateStr);
    setDatePreset('custom');
    setPage(1);
    setViewMode('list');
  };

  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, limit, statusFilter, paymentFilter, startDate, endDate, search],
    queryFn: () =>
      orderAPI
        .getAll({
          page,
          limit,
          status: statusFilter || undefined,
          paymentStatus: paymentFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search.trim() || undefined,
        })
        .then((r) => r.data),
  });

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['orders-daily-summary', startDate, endDate, statusFilter, paymentFilter, search],
    queryFn: () =>
      orderAPI
        .getDailySummary({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: statusFilter || undefined,
          paymentStatus: paymentFilter || undefined,
          search: search.trim() || undefined,
        })
        .then((r) => r.data.data),
  });

  // Search customers for order creation
  const { data: customersData } = useQuery({
    queryKey: ['customer-search', orderForm.customerSearch],
    queryFn: () =>
      customerAPI.getAll({ search: orderForm.customerSearch, limit: 10 }).then((r) => r.data.data),
    enabled: orderForm.customerSearch.length >= 2,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => orderAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Order created successfully!');
      setShowCreateModal(false);
      resetOrderForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create order'),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => orderAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Order updated!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const orderPaymentMutation = useMutation({
    mutationFn: ({ id, data }) => orderAPI.addPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Payment recorded!');
      setShowPaymentModal(null);
      setPaymentForm({ amount: '', method: 'cash', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => orderAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Order deleted and customer balance adjusted!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete order'),
  });

  const sendTrackingSmsMutation = useMutation({
    mutationFn: (data) => smsAPI.test(data),
    onSuccess: () => {
      toast.success('Courier tracking SMS sent successfully!');
      setShowTrackingSmsModal(null);
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-balance'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send SMS'),
  });

  const editOrderMutation = useMutation({
    mutationFn: ({ id, data }) => orderAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Order items and balance updated successfully!');
      setShowEditOrderModal(null);
      setEditOrderForm(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update order'),
  });

  const handleOpenTrackingSms = (order) => {
    const custName = order.customer?.name || 'গ্রাহক';
    const courier = order.courierName || 'কুরিয়ার';
    const tracking = order.courierTrackingId ? `ট্র্যাকিং/মেমো নং: ${order.courierTrackingId}` : 'বুকিং প্রক্রিয়াধীন';
    const dueText = order.orderDue > 0 ? `, বকেয়া/COD: ৳${order.orderDue.toLocaleString()}` : ', মূল্য পরিশোধিত';
    const defaultMsg = `প্রিয় ${custName}, আপনার আমের চালানটি ${courier} এ পাঠানো হয়েছে। ${tracking}${dueText}। ধন্যবাদ - ChapaiMango.bd`;

    setShowTrackingSmsModal({
      order,
      phone: order.customer?.phone || '',
      name: custName,
      message: defaultMsg,
    });
  };

  const handleOpenEditOrder = (order) => {
    setShowEditOrderModal(order);
    setEditOrderForm({
      items: order.items?.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        rate: it.rate,
      })) || [{ productName: '', quantity: 1, rate: '' }],
      discount: order.discount ? String(order.discount) : '',
      courierName: order.courierName || '',
      courierTrackingId: order.courierTrackingId || '',
      courierCharge: order.courierCharge ? String(order.courierCharge) : '',
      deliveryAddress: order.deliveryAddress || order.customer?.address || '',
      notes: order.notes || '',
    });
  };

  const resetOrderForm = () => {
    setOrderForm({
      customerId: '',
      customerSearch: '',
      items: [{ productName: '', quantity: 1, rate: '' }],
      discount: '',
      courierName: '',
      courierCharge: '',
      paidAmount: '',
      deliveryAddress: '',
      notes: '',
    });
  };

  const addItem = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { productName: '', quantity: 1, rate: '' }],
    });
  };

  const removeItem = (idx) => {
    if (orderForm.items.length <= 1) return;
    setOrderForm({
      ...orderForm,
      items: orderForm.items.filter((_, i) => i !== idx),
    });
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...orderForm.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setOrderForm({ ...orderForm, items: newItems });
  };

  const calculateTotal = () => {
    const itemsTotal = orderForm.items.reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
      0
    );
    return itemsTotal - (parseFloat(orderForm.discount) || 0) + (parseFloat(orderForm.courierCharge) || 0);
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!orderForm.customerId) {
      toast.error('Please select a customer');
      return;
    }
    const payload = {
      customer: orderForm.customerId,
      items: orderForm.items.map((item) => ({
        productName: item.productName,
        quantity: parseInt(item.quantity),
        rate: parseFloat(item.rate),
        subtotal: parseInt(item.quantity) * parseFloat(item.rate),
      })),
      discount: parseFloat(orderForm.discount) || 0,
      courierName: orderForm.courierName,
      courierCharge: parseFloat(orderForm.courierCharge) || 0,
      paidAmount: parseFloat(orderForm.paidAmount) || 0,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes,
    };
    createOrderMutation.mutate(payload);
  };

  const handlePayment = (e) => {
    e.preventDefault();
    orderPaymentMutation.mutate({
      id: showPaymentModal._id,
      data: { ...paymentForm, amount: parseFloat(paymentForm.amount) },
    });
  };

  const orders = data?.data || [];
  const pagination = data?.pagination || {};
  const total = calculateTotal();

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-description">{pagination.total || 0} total orders</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/import')}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Search Bar with Live Clear */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 260 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search orders by customer name, phone (01XXXXXXXXX) or memo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              paddingLeft: 38,
              paddingRight: search ? 34 : 12,
              height: 38,
              fontSize: '0.875rem',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {search && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-secondary)',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            <span>Search: "{search}" ({pagination.total || 0} orders found)</span>
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
              title="Clear search filter"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* View Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div className="segmented-tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`segmented-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Package size={15} /> All Orders ({pagination.total || 0})
          </button>
          <button
            type="button"
            className={`segmented-tab ${viewMode === 'summary' ? 'active' : ''}`}
            onClick={() => setViewMode('summary')}
          >
            <Calendar size={15} /> Date-wise Summary Breakdown
          </button>
        </div>

        {(startDate || endDate) && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-secondary)',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            <Calendar size={13} />
            <span>
              {startDate === endDate ? `Date: ${startDate}` : `${startDate || 'Start'} → ${endDate || 'End'}`}
            </span>
            <button
              type="button"
              onClick={clearDateFilter}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              title="Clear date filter"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Date Presets & Filter Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
        flexWrap: 'wrap',
        background: 'var(--bg-glass)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Date Range:
          </span>
          <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '3px 10px', height: 26 }}
                onClick={() => applyDatePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', height: 26 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', height: 26 }}
              />
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 120, height: 28, fontSize: '0.75rem', padding: '2px 24px 2px 8px' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 120, height: 28, fontSize: '0.75rem', padding: '2px 24px 2px 8px' }}
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Payment</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: Date-wise Summary Breakdown */}
      {viewMode === 'summary' && (
        <div className="animate-fade-in">
          {/* Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Total Orders</span>
                <div className="metric-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
                  <Package size={15} />
                </div>
              </div>
              <div className="metric-card-value">{summaryData?.totals?.totalOrders || 0}</div>
              <div className="metric-card-footer">
                <span>Across <strong>{summaryData?.days?.length || 0}</strong> active dates</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Total Order Amount</span>
                <div className="metric-card-icon" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24' }}>
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="metric-card-value">৳{(summaryData?.totals?.totalAmount || 0).toLocaleString()}</div>
              <div className="metric-card-footer">
                <span>Avg <strong>৳{Math.round((summaryData?.totals?.totalAmount || 0) / (summaryData?.totals?.totalOrders || 1)).toLocaleString()}</strong> / order</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Total Collected</span>
                <div className="metric-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
                  <Coins size={15} />
                </div>
              </div>
              <div className="metric-card-value" style={{ color: 'var(--success)' }}>
                ৳{(summaryData?.totals?.totalPaid || 0).toLocaleString()}
              </div>
              <div className="metric-card-footer">
                <span>
                  {summaryData?.totals?.totalAmount > 0 
                    ? Math.round(((summaryData?.totals?.totalPaid || 0) / summaryData.totals.totalAmount) * 100)
                    : 100}% collection rate
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Total Outstanding Due</span>
                <div className="metric-card-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                  <AlertTriangle size={15} />
                </div>
              </div>
              <div className="metric-card-value" style={{ color: 'var(--danger)' }}>
                ৳{(summaryData?.totals?.totalDue || 0).toLocaleString()}
              </div>
              <div className="metric-card-footer">
                <span>Pending payment & COD</span>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          {isSummaryLoading ? (
            <div className="loading-overlay">
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <span>Calculating date-wise summary...</span>
            </div>
          ) : !summaryData?.days || summaryData.days.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 className="empty-state-title">No orders in this period</h3>
              <p className="empty-state-text">Try selecting "All Time" or adjusting your date range filter</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-container desktop-orders-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'center' }}>Total Orders</th>
                      <th style={{ textAlign: 'right' }}>Total Bill (৳)</th>
                      <th style={{ textAlign: 'right' }}>Collected (৳)</th>
                      <th style={{ textAlign: 'right' }}>Due (৳)</th>
                      <th style={{ textAlign: 'right' }}>Avg Order (৳)</th>
                      <th>Status Breakdown</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.days.map((day) => {
                      const { formatted, isToday, isYesterday } = formatSummaryDate(day.date);
                      return (
                        <tr key={day.date}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600 }}>{formatted}</span>
                              {isToday && <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Today</span>}
                              {isYesterday && <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Yesterday</span>}
                            </div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{day.date}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-info" style={{ fontWeight: 600, fontSize: '0.75rem', padding: '2px 8px' }}>
                              {day.orderCount} {day.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem' }}>
                            ৳{day.totalAmount.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                            ৳{day.totalPaid.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: day.totalDue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            ৳{day.totalDue.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ৳{day.avgOrderValue.toLocaleString()}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {Object.entries(day.statusCounts || {}).map(([st, cnt]) => (
                                <span key={st} className={`badge ${getStatusBadge(st)}`} style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                                  {cnt} {st}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => filterBySpecificDate(day.date)}
                              title={`View ${day.orderCount} orders for ${day.date}`}
                              style={{ fontSize: '0.75rem', padding: '4px 8px', gap: 4 }}
                            >
                              <Eye size={13} /> View Orders <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-glass)', fontWeight: 700 }}>
                      <td>Grand Total ({summaryData.days.length} Days)</td>
                      <td style={{ textAlign: 'center' }}>{summaryData.totals.totalOrders} orders</td>
                      <td style={{ textAlign: 'right' }}>৳{summaryData.totals.totalAmount.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)' }}>৳{summaryData.totals.totalPaid.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger)' }}>৳{summaryData.totals.totalDue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        ৳{Math.round((summaryData.totals.totalAmount || 0) / (summaryData.totals.totalOrders || 1)).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Breakdown Cards */}
              <div className="mobile-orders-cards">
                {summaryData.days.map((day) => {
                  const { formatted, isToday, isYesterday } = formatSummaryDate(day.date);
                  return (
                    <div
                      key={day.date}
                      className="card"
                      style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontSize: '0.9375rem' }}>{formatted}</strong>
                            {isToday && <span className="badge badge-primary" style={{ fontSize: '0.625rem' }}>Today</span>}
                            {isYesterday && <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>Yesterday</span>}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{day.date}</div>
                        </div>
                        <span className="badge badge-info" style={{ fontWeight: 600 }}>
                          {day.orderCount} {day.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 6,
                        background: 'var(--bg-glass)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total</div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>৳{day.totalAmount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Collected</div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--success)' }}>৳{day.totalPaid.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Due</div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: day.totalDue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            ৳{day.totalDue.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => filterBySpecificDate(day.date)}
                        style={{ width: '100%', justifyContent: 'center', gap: 6, minHeight: 34 }}
                      >
                        <Eye size={14} /> View {day.orderCount} Orders for this Date
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: Orders List (Table & Mobile Cards) */}
      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <div className="loading-overlay">
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <span>Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <Package size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 className="empty-state-title">No orders found</h3>
              <p className="empty-state-text">
                {startDate || endDate ? 'Try changing or clearing your date range filter' : 'Create your first order to get started'}
              </p>
              {(startDate || endDate) && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearDateFilter} style={{ marginTop: 12 }}>
                  <RotateCcw size={14} /> Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="table-container desktop-orders-table">
            <table className="table orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="orders-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {new Date(order.orderDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{order.customer?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{order.customer?.phone}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {order.items?.length} item{order.items?.length > 1 ? 's' : ''}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {order.items?.[0]?.productName?.split('-')[0] || ''}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>৳{order.totalBill?.toLocaleString()}</td>
                    <td className="text-success">৳{order.paidAmount?.toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: order.orderDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ৳{order.orderDue?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={order.status}
                        onChange={(e) => updateOrderMutation.mutate({ id: order._id, data: { status: e.target.value } })}
                        style={{ padding: '4px 28px 4px 8px', fontSize: '0.75rem', width: 'auto', minWidth: 105, background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
                      >
                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${getPaymentBadge(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="orders-actions-cell">
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Print Crate Sticker / Slip"
                          onClick={() => setShowStickerModal(order)}
                          style={{ color: 'var(--accent-secondary)' }}
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="1-Click WhatsApp Ready Message"
                          onClick={() => setShowWhatsAppModal(order)}
                          style={{ color: '#25D366' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 2c-5.508 0-9.986 4.477-9.986 9.984 0 1.761.459 3.479 1.332 5.001L2 22l5.163-1.353c1.472.802 3.129 1.226 4.868 1.226 5.508 0 9.986-4.477 9.986-9.984 0-5.507-4.478-9.989-9.986-9.989zm5.82 14.156c-.244.686-1.42 1.309-1.968 1.391-.51.077-1.173.109-3.791-.976-3.344-1.385-5.506-4.786-5.673-5.008-.167-.222-1.358-1.808-1.358-3.448 0-1.641.862-2.45 1.169-2.784.307-.333.67-.417.893-.417.223 0 .446.002.642.012.207.01.485-.078.759.579.284.68 1.002 2.45 1.091 2.632.089.182.148.396.029.633-.119.237-.178.385-.356.593-.178.208-.374.464-.535.624-.179.178-.366.372-.157.73.208.356.927 1.53 1.992 2.478 1.368 1.218 2.523 1.597 2.879 1.775.356.178.564.148.772-.089.208-.237.89-1.038 1.128-1.394.237-.356.475-.297.8-.178.326.119 2.072.977 2.428 1.155.356.178.593.267.68.416.089.148.089.862-.155 1.548z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Send Courier Tracking SMS"
                          onClick={() => handleOpenTrackingSms(order)}
                          style={{ color: 'var(--info)' }}
                        >
                          <Send size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit Order Items & Details"
                          onClick={() => handleOpenEditOrder(order)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View Order Details"
                          onClick={() => setShowDetailsModal(order)}
                        >
                          <Eye size={15} />
                        </button>
                        {order.orderDue > 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            title="Add Payment"
                            onClick={() => setShowPaymentModal(order)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 28 }}
                          >
                            <DollarSign size={13} /> Pay
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm text-danger"
                          title="Delete Order"
                          onClick={() => setOrderToDelete(order)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Orders Cards View */}
          <div className="mobile-orders-cards">
            {orders.map((order) => (
              <div
                key={order._id}
                className="card"
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                }}
              >
                {/* Top Row: Date & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} style={{ color: 'var(--accent-secondary)' }} />
                    {new Date(order.orderDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${getPaymentBadge(order.paymentStatus)}`} style={{ fontSize: '0.6875rem' }}>
                      {order.paymentStatus}
                    </span>
                    <select
                      className="form-select"
                      value={order.status}
                      onChange={(e) => updateOrderMutation.mutate({ id: order._id, data: { status: e.target.value } })}
                      style={{ padding: '2px 22px 2px 6px', fontSize: '0.6875rem', width: 'auto', minWidth: 90, height: 24 }}
                    >
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer & Courier Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {order.customer?.name || 'Unknown Customer'}
                    </div>
                    {order.customer?.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: 2 }}
                      >
                        <Phone size={12} /> {order.customer.phone}
                      </a>
                    )}
                  </div>
                  {order.courierName && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Truck size={12} /> {order.courierName}
                    </span>
                  )}
                </div>

                {/* Items Summary */}
                <div style={{ background: 'var(--bg-glass)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', marginBottom: 2 }}>Items:</div>
                  {order.items?.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>🥭 {it.productName} (x{it.quantity})</span>
                      <span style={{ fontWeight: 500 }}>৳{(it.subtotal || it.quantity * it.rate)?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 6,
                  padding: '8px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Bill</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      ৳{order.totalBill?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Paid</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--success)' }}>
                      ৳{order.paidAmount?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Due</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: order.orderDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ৳{order.orderDue?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="order-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowDetailsModal(order)}
                  >
                    <Eye size={13} /> Details
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowStickerModal(order)}
                  >
                    <Printer size={13} /> Sticker
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowWhatsAppModal(order)}
                    style={{ color: '#25D366' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 2c-5.508 0-9.986 4.477-9.986 9.984 0 1.761.459 3.479 1.332 5.001L2 22l5.163-1.353c1.472.802 3.129 1.226 4.868 1.226 5.508 0 9.986-4.477 9.986-9.984 0-5.507-4.478-9.989-9.986-9.989zm5.82 14.156c-.244.686-1.42 1.309-1.968 1.391-.51.077-1.173.109-3.791-.976-3.344-1.385-5.506-4.786-5.673-5.008-.167-.222-1.358-1.808-1.358-3.448 0-1.641.862-2.45 1.169-2.784.307-.333.67-.417.893-.417.223 0 .446.002.642.012.207.01.485-.078.759.579.284.68 1.002 2.45 1.091 2.632.089.182.148.396.029.633-.119.237-.178.385-.356.593-.178.208-.374.464-.535.624-.179.178-.366.372-.157.73.208.356.927 1.53 1.992 2.478 1.368 1.218 2.523 1.597 2.879 1.775.356.178.564.148.772-.089.208-.237.89-1.038 1.128-1.394.237-.356.475-.297.8-.178.326.119 2.072.977 2.428 1.155.356.178.593.267.68.416.089.148.089.862-.155 1.548z" />
                    </svg> WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenTrackingSms(order)}
                  >
                    <Send size={13} /> SMS
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenEditOrder(order)}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={() => setOrderToDelete(order)}
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                  {order.orderDue > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm order-due-btn"
                      onClick={() => setShowPaymentModal(order)}
                    >
                      <DollarSign size={14} /> Collect Due • ৳{order.orderDue?.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

              {/* Enhanced Pagination Controls */}
              {pagination.total > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                  marginTop: 'var(--space-lg)',
                  paddingTop: 'var(--space-md)',
                  borderTop: '1px solid var(--border)',
                }}>
                  {/* Left: Range and Total Count */}
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Showing <strong>{((page - 1) * limit) + 1}</strong>–<strong>{Math.min(page * limit, pagination.total || 0)}</strong> of <strong>{pagination.total || 0}</strong> orders
                    {search && <span style={{ color: 'var(--accent-secondary)' }}> (matching "{search}")</span>}
                  </div>

                  {/* Center: Page numbers navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{ padding: '4px 8px', height: 30, fontSize: '0.75rem' }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: pagination.pages || 1 }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>...</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`btn btn-sm ${page === item ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPage(item)}
                            style={{
                              minWidth: 28,
                              height: 30,
                              padding: '0 8px',
                              fontSize: '0.75rem',
                              fontWeight: page === item ? 700 : 500,
                            }}
                          >
                            {item}
                          </button>
                        )
                      )}

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page >= pagination.pages}
                      style={{ padding: '4px 8px', height: 30, fontSize: '0.75rem' }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Right: Page Size Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>Rows per page:</span>
                    <select
                      className="form-select"
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{ width: 'auto', padding: '2px 24px 2px 8px', height: 30, fontSize: '0.75rem' }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Order</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setShowCreateModal(false); resetOrderForm(); }} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                {/* Customer Search */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Customer *</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowQuickCustomerModal(true)}
                      style={{ fontSize: '0.75rem', padding: '2px 8px', height: 24, gap: 4, color: 'var(--accent-secondary)' }}
                    >
                      <Plus size={12} /> New Customer
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      placeholder="Search customer by name or phone (01XXXXXXXXX)..."
                      value={orderForm.customerSearch}
                      onChange={(e) => setOrderForm({ ...orderForm, customerSearch: e.target.value, customerId: '' })}
                    />
                    {customersData && customersData.length > 0 && !orderForm.customerId && orderForm.customerSearch.length >= 2 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', maxHeight: 200, overflow: 'auto',
                        boxShadow: 'var(--shadow-lg)',
                      }}>
                        {customersData.map((c) => (
                          <div
                            key={c._id}
                            style={{
                              padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                              transition: 'background 0.15s',
                            }}
                            onClick={() => setOrderForm({
                              ...orderForm,
                              customerId: c._id,
                              customerSearch: `${c.name} (${c.phone})`,
                              deliveryAddress: c.address,
                            })}
                            onMouseEnter={(e) => (e.target.style.background = 'var(--bg-glass-hover)')}
                            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                          >
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.phone} • Due: ৳{c.totalDue?.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {customersData && customersData.length === 0 && !orderForm.customerId && orderForm.customerSearch.length >= 2 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', padding: '12px 14px',
                        boxShadow: 'var(--shadow-lg)', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          No customer found matching "{orderForm.customerSearch}"
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const isDigits = /^\d+$/.test(orderForm.customerSearch);
                            setQuickCustomerForm({
                              name: isDigits ? '' : orderForm.customerSearch,
                              phone: isDigits ? orderForm.customerSearch : '',
                              address: '',
                              area: '',
                            });
                            setShowQuickCustomerModal(true);
                          }}
                          style={{ fontSize: '0.75rem', padding: '4px 10px', gap: 5 }}
                        >
                          <Plus size={13} /> Create "{orderForm.customerSearch}" as New Customer
                        </button>
                      </div>
                    )}
                  </div>
                  {orderForm.customerId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Customer selected
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Mango Items / Products *</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>Quick Add:</span>
                      {[
                        { name: 'Khirsapat (Himsagar) 20kg', rate: 2400 },
                        { name: 'Langra 20kg', rate: 2200 },
                        { name: 'Amrapali 10kg', rate: 1300 },
                        { name: 'Fazli 25kg', rate: 2000 },
                        { name: 'Gopalbhog 20kg', rate: 2600 },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          className="badge"
                          style={{
                            cursor: 'pointer',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border)',
                            color: 'var(--accent-secondary)',
                            fontSize: '0.6875rem',
                            padding: '2px 6px',
                          }}
                          onClick={() => {
                            // If first item is empty, populate it; otherwise append
                            if (orderForm.items.length === 1 && !orderForm.items[0].productName) {
                              setOrderForm({
                                ...orderForm,
                                items: [{ productName: preset.name, quantity: 1, rate: preset.rate }],
                              });
                            } else {
                              setOrderForm({
                                ...orderForm,
                                items: [...orderForm.items, { productName: preset.name, quantity: 1, rate: preset.rate }],
                              });
                            }
                          }}
                        >
                          + {preset.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'flex-start' }}>
                      <input
                        className="form-input"
                        placeholder="e.g. Khirsapat / Himsagar - 20 Kg Crate"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                        style={{ flex: 2 }}
                        required
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        style={{ width: 70 }}
                        min="1"
                        required
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                        style={{ width: 90 }}
                        min="0"
                        required
                      />
                      <div style={{ width: 80, padding: '10px 0', textAlign: 'right', fontWeight: 500, fontSize: '0.875rem' }}>
                        ৳{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}
                      </div>
                      {orderForm.items.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(idx)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {/* Discount, Courier, Paid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Discount (৳)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      value={orderForm.discount}
                      onChange={(e) => setOrderForm({ ...orderForm, discount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Courier Charge (৳)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      value={orderForm.courierCharge}
                      onChange={(e) => setOrderForm({ ...orderForm, courierCharge: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Advance / Paid (৳)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      value={orderForm.paidAmount}
                      onChange={(e) => setOrderForm({ ...orderForm, paidAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Courier Service</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['Sundarban', 'Steadfast', 'SA Paribahan', 'Pathao'].map((courier) => (
                          <button
                            key={courier}
                            type="button"
                            className="badge"
                            style={{
                              cursor: 'pointer',
                              background: orderForm.courierName === courier ? 'var(--accent-primary)' : 'var(--bg-glass)',
                              color: orderForm.courierName === courier ? '#fff' : 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              fontSize: '0.6875rem',
                              padding: '2px 6px',
                            }}
                            onClick={() => setOrderForm({ ...orderForm, courierName: courier })}
                          >
                            {courier}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input className="form-input" placeholder="e.g. Sundarban Courier, Steadfast, SA Paribahan" value={orderForm.courierName} onChange={(e) => setOrderForm({ ...orderForm, courierName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Address</label>
                    <input className="form-input" placeholder="Customer delivery address in Dhaka/Chittagong..." value={orderForm.deliveryAddress} onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Packaging & Harvest Notes</label>
                  <textarea className="form-textarea" placeholder="e.g. কাঁচা-পাকা আম, ক্যারেটে পেপার কুচি দিয়ে প্যাকিং, শুক্রবার ডেলিভারি..." value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
                </div>

                {/* Total Summary */}
                <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="text-muted">Total Bill:</span>
                    <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>৳{total.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="text-muted">Paid:</span>
                    <span className="text-success">৳{(parseFloat(orderForm.paidAmount) || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                    <span style={{ fontWeight: 600 }}>Order Due:</span>
                    <span style={{ fontWeight: 700, color: (total - (parseFloat(orderForm.paidAmount) || 0)) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ৳{Math.max(0, total - (parseFloat(orderForm.paidAmount) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); resetOrderForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending && <div className="spinner" />}
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add Payment</h2>
                <p className="card-subtitle">
                  {showPaymentModal.customer?.name} — Order Due: ৳{showPaymentModal.orderDue?.toLocaleString()}
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPaymentModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Amount (৳) *</label>
                  <input type="number" className="form-input" placeholder="Enter amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Method</label>
                  <select className="form-select" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input className="form-input" placeholder="Optional" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={orderPaymentMutation.isPending}>
                  {orderPaymentMutation.isPending && <div className="spinner" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={20} style={{ color: 'var(--accent-secondary)' }} /> Order Details
                </h2>
                <p className="card-subtitle">
                  Placed on {new Date(showDetailsModal.orderDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowDetailsModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Customer Info */}
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Customer</div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{showDetailsModal.customer?.name}</div>
                {showDetailsModal.customer?.phone && (
                  <a href={`tel:${showDetailsModal.customer.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--accent-secondary)', marginTop: 2 }}>
                    <Phone size={13} /> {showDetailsModal.customer.phone}
                  </a>
                )}
                {showDetailsModal.deliveryAddress && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{showDetailsModal.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Status & Courier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Order Status</div>
                  <span className={`badge ${getStatusBadge(showDetailsModal.status)}`}>
                    {showDetailsModal.status}
                  </span>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Courier</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{showDetailsModal.courierName || '—'}</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>Ordered Items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {showDetailsModal.items?.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>🥭 {it.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{it.quantity} × ৳{it.rate?.toLocaleString()}</div>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        ৳{(it.subtotal || it.quantity * it.rate)?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {showDetailsModal.notes && (
                <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Packaging Notes: </span>
                  <span>{showDetailsModal.notes}</span>
                </div>
              )}

              {/* Financial Breakdown */}
              <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                  <span className="text-muted">Courier Charge:</span>
                  <span>৳{(showDetailsModal.courierCharge || 0).toLocaleString()}</span>
                </div>
                {showDetailsModal.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span className="text-muted">Discount:</span>
                    <span className="text-danger">-৳{showDetailsModal.discount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', fontWeight: 600, marginBottom: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                  <span>Total Bill:</span>
                  <span>৳{showDetailsModal.totalBill?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 4 }}>
                  <span className="text-muted">Paid:</span>
                  <span className="text-success">৳{showDetailsModal.paidAmount?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                  <span>Order Due:</span>
                  <span style={{ color: showDetailsModal.orderDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ৳{showDetailsModal.orderDue?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailsModal(null)}>Close</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const o = showDetailsModal;
                  setShowDetailsModal(null);
                  setShowWhatsAppModal(o);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#25D366',
                  borderColor: 'rgba(37, 211, 102, 0.4)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 2c-5.508 0-9.986 4.477-9.986 9.984 0 1.761.459 3.479 1.332 5.001L2 22l5.163-1.353c1.472.802 3.129 1.226 4.868 1.226 5.508 0 9.986-4.477 9.986-9.984 0-5.507-4.478-9.989-9.986-9.989zm5.82 14.156c-.244.686-1.42 1.309-1.968 1.391-.51.077-1.173.109-3.791-.976-3.344-1.385-5.506-4.786-5.673-5.008-.167-.222-1.358-1.808-1.358-3.448 0-1.641.862-2.45 1.169-2.784.307-.333.67-.417.893-.417.223 0 .446.002.642.012.207.01.485-.078.759.579.284.68 1.002 2.45 1.091 2.632.089.182.148.396.029.633-.119.237-.178.385-.356.593-.178.208-.374.464-.535.624-.179.178-.366.372-.157.73.208.356.927 1.53 1.992 2.478 1.368 1.218 2.523 1.597 2.879 1.775.356.178.564.148.772-.089.208-.237.89-1.038 1.128-1.394.237-.356.475-.297.8-.178.326.119 2.072.977 2.428 1.155.356.178.593.267.68.416.089.148.089.862-.155 1.548z" />
                </svg>
                WhatsApp
              </button>
              {showDetailsModal.orderDue > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const o = showDetailsModal;
                    setShowDetailsModal(null);
                    setShowPaymentModal(o);
                  }}
                >
                  <DollarSign size={16} /> Collect Payment (৳{showDetailsModal.orderDue?.toLocaleString()})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Crate Packing Slip / Courier Sticker Modal */}
      {showStickerModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header no-print">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Printer size={20} style={{ color: 'var(--accent-secondary)' }} /> Crate Packing Slip / Courier Sticker
                </h2>
                <p className="card-subtitle">
                  Attach this slip to mango crates for couriers (Sundarban, Steadfast, SA Paribahan, etc.)
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowStickerModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {/* The Actual Printable Slip */}
              <div
                id="crate-packing-slip-printable"
                style={{
                  background: '#ffffff',
                  color: '#111827',
                  padding: '24px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #000000',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {/* Sticker Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', letterSpacing: '0.5px' }}>
                    🥭 ChapaiMango.bd
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', marginTop: 2 }}>
                    Garden Fresh Mangoes • Shibganj, Chapai Nawabganj & Rajshahi
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                    Helpline: 01711-111111 • Web: chapaimango.bd
                  </div>
                </div>

                {/* Courier & Dispatch Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ border: '1.5px solid #111827', padding: '8px 12px', borderRadius: 4, background: '#f9fafb' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Courier Service</div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#111827' }}>
                      {showStickerModal.courierName || 'Sundarban Courier'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', marginTop: 3 }}>
                      Tracking/CN: <strong style={{ letterSpacing: '0.5px' }}>{showStickerModal.courierTrackingId || 'N/A'}</strong>
                    </div>
                  </div>

                  <div style={{ border: '1.5px solid #111827', padding: '8px 12px', borderRadius: 4, background: '#f9fafb' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Order Ref / Date</div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#111827' }}>
                      #{showStickerModal._id.toString().slice(-6).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.8125rem', marginTop: 3 }}>
                      Date: {new Date(showStickerModal.orderDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Receiver Info Card */}
                <div style={{ border: '2px solid #111827', borderRadius: 6, padding: '12px 14px', marginBottom: 14, background: '#ffffff' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 8 }}>
                    📍 RECEIVER / প্রাপকের ঠিকানা
                  </div>
                  <div style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#111827' }}>
                    {showStickerModal.customer?.name}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#047857', marginTop: 4 }}>
                    📞 {showStickerModal.customer?.phone} {showStickerModal.customer?.altPhone ? ` / ${showStickerModal.customer.altPhone}` : ''}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginTop: 6, lineHeight: 1.4 }}>
                    {showStickerModal.deliveryAddress || showStickerModal.customer?.address || 'N/A'}
                  </div>
                </div>

                {/* Mango Package Varieties Table */}
                <div style={{ border: '1.5px solid #111827', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', borderBottom: '1.5px solid #111827', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: 700 }}>Mango Variety (আমের জাত)</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>Crates / Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showStickerModal.items?.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < showStickerModal.items.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>🥭 {it.productName}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>{it.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showStickerModal.notes && (
                  <div style={{ fontSize: '0.8125rem', color: '#4b5563', marginBottom: 14, fontStyle: 'italic' }}>
                    <strong>Note:</strong> {showStickerModal.notes}
                  </div>
                )}

                {/* COD Due Amount Banner */}
                {showStickerModal.orderDue > 0 ? (
                  <div style={{
                    border: '3px solid #dc2626',
                    borderRadius: 6,
                    padding: '12px',
                    textAlign: 'center',
                    background: '#fef2f2',
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚠️ CASH ON DELIVERY (COD) DUE TO COLLECT:
                    </div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#b91c1c', margin: '4px 0' }}>
                      ৳{showStickerModal.orderDue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>
                      কুরিয়ার প্রতিনিধি: অনুগ্রহ করে ডেলিভারির সময় গ্রাহকের কাছ থেকে এই টাকা গ্রহণ করুন
                    </div>
                  </div>
                ) : (
                  <div style={{
                    border: '3px solid #16a34a',
                    borderRadius: 6,
                    padding: '12px',
                    textAlign: 'center',
                    background: '#f0fdf4',
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                      ✅ PRE-PAID IN FULL (৳0 DUE)
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', margin: '2px 0' }}>
                      NO COLLECTION
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                      গ্রাহক সম্পূর্ণ মূল্য পরিশোধ করেছেন — কোনো টাকা আদায় করবেন না
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer no-print">
              <button className="btn btn-secondary" onClick={() => setShowStickerModal(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={16} /> Print Delivery Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Tracking & Dispatch SMS Modal */}
      {showTrackingSmsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Send size={18} style={{ color: 'var(--accent-secondary)' }} /> Send Courier Tracking SMS
                </h2>
                <p className="card-subtitle">
                  Dispatch delivery memo & tracking information via SMS
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowTrackingSmsModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recipient:</div>
                  <div style={{ fontWeight: 600 }}>{showTrackingSmsModal.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Phone:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{showTrackingSmsModal.phone}</div>
                    {showTrackingSmsModal.phone.length === 11 ? (
                      <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>✓ 11 Digits</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>{showTrackingSmsModal.phone.length}/11 Digits</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">SMS Message Content</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={showTrackingSmsModal.message}
                  onChange={(e) => setShowTrackingSmsModal({ ...showTrackingSmsModal, message: e.target.value })}
                  style={{ fontSize: '0.9375rem', minHeight: 100 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>{showTrackingSmsModal.message.length} characters</span>
                  <span>Unicode / GSM Supported</span>
                </div>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                💡 Recipient receives SMS instantly from your configured brand sender ID.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTrackingSmsModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => sendTrackingSmsMutation.mutate({ phone: showTrackingSmsModal.phone, message: showTrackingSmsModal.message })}
                disabled={sendTrackingSmsMutation.isPending || !showTrackingSmsModal.phone}
              >
                {sendTrackingSmsMutation.isPending && <div className="spinner" />}
                <Send size={15} /> Send Tracking SMS Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Items & Courier Details Modal */}
      {showEditOrderModal && editOrderForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit2 size={18} style={{ color: 'var(--accent-secondary)' }} /> Edit Order #{showEditOrderModal._id.toString().slice(-6)}
                </h2>
                <p className="card-subtitle">
                  Customer: <strong>{showEditOrderModal.customer?.name}</strong> • Modifying items will safely sync customer balance
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowEditOrderModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editOrderMutation.mutate({
                  id: showEditOrderModal._id,
                  data: {
                    ...editOrderForm,
                    discount: parseFloat(editOrderForm.discount) || 0,
                    courierCharge: parseFloat(editOrderForm.courierCharge) || 0,
                  },
                });
              }}
            >
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Items Editor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Mango Items & Crates</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditOrderForm({
                        ...editOrderForm,
                        items: [...editOrderForm.items, { productName: '', quantity: 1, rate: '' }],
                      })}
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  {editOrderForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <input
                        className="form-input"
                        placeholder="Variety (e.g. Khirsapat)"
                        value={item.productName}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].productName = e.target.value;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        required
                      />
                      <input
                        className="form-input"
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        required
                      />
                      <input
                        className="form-input"
                        type="number"
                        placeholder="Rate (৳)"
                        value={item.rate}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].rate = parseFloat(e.target.value) || 0;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        disabled={editOrderForm.items.length <= 1}
                        onClick={() => {
                          if (editOrderForm.items.length > 1) {
                            setEditOrderForm({
                              ...editOrderForm,
                              items: editOrderForm.items.filter((_, i) => i !== idx),
                            });
                          }
                        }}
                      >
                        <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Financial Adjustments */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label className="form-label">Discount (৳)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={editOrderForm.discount}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, discount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Courier Charge (৳)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={editOrderForm.courierCharge}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, courierCharge: e.target.value })}
                    />
                  </div>
                </div>

                {/* Courier Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label className="form-label">Courier Name</label>
                    <input
                      className="form-input"
                      placeholder="Sundarban / Steadfast"
                      value={editOrderForm.courierName}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, courierName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Consignment / Tracking ID</label>
                    <input
                      className="form-input"
                      placeholder="Tracking / Memo #"
                      value={editOrderForm.courierTrackingId}
                      onChange={(e) => setEditOrderForm({ ...editOrderForm, courierTrackingId: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Delivery Address</label>
                  <input
                    className="form-input"
                    value={editOrderForm.deliveryAddress}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, deliveryAddress: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Order Notes</label>
                  <input
                    className="form-input"
                    value={editOrderForm.notes}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditOrderModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editOrderMutation.isPending}>
                  {editOrderMutation.isPending && <div className="spinner" />}
                  Save Changes & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal inside Orders */}
      {showQuickCustomerModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Quick Add Customer</h3>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowQuickCustomerModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={quickCustomerForm.name}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                    required
                  />
                </div>

                <PhoneInput
                  label="Phone Number"
                  value={quickCustomerForm.phone}
                  onChange={(val) => setQuickCustomerForm({ ...quickCustomerForm, phone: val })}
                  required
                />

                <div className="form-group">
                  <label className="form-label">Delivery Address *</label>
                  <input
                    className="form-input"
                    placeholder="Delivery address in Bangladesh"
                    value={quickCustomerForm.address}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Area / District (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Dhaka, Rajshahi"
                    value={quickCustomerForm.area}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, area: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQuickCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={quickCustomerMutation.isPending}
                >
                  {quickCustomerMutation.isPending && <div className="spinner" />}
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Order Deletion */}
      <ConfirmModal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={() => {
          if (orderToDelete) {
            deleteOrderMutation.mutate(orderToDelete._id, {
              onSettled: () => setOrderToDelete(null),
            });
          }
        }}
        title="Delete Order"
        message={
          orderToDelete
            ? `Are you sure you want to delete order #${orderToDelete._id.slice(-6)} for ${orderToDelete.customer?.name || 'Customer'}?`
            : ''
        }
        submessage={
          orderToDelete ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>Balance Reversal:</div>
              Deleting this order will automatically reverse <strong>৳{(orderToDelete.totalBill || 0).toLocaleString()}</strong> from the customer's total purchases and due balance.
            </div>
          ) : null
        }
        confirmText="Delete Order"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteOrderMutation.isPending}
      />

      {/* 1-Click WhatsApp Ready Message Modal */}
      {showWhatsAppModal && (
        <WhatsAppOrderModal
          order={showWhatsAppModal}
          isOpen={Boolean(showWhatsAppModal)}
          onClose={() => setShowWhatsAppModal(null)}
        />
      )}

      {/* Responsive & Print Styles for Orders Page */}
      <style>{`
        .desktop-orders-table {
          display: block;
        }
        .mobile-orders-cards {
          display: none;
        }

        .orders-actions-header {
          text-align: right;
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
          min-width: 280px;
        }

        .orders-actions-cell {
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
          min-width: 280px;
        }

        @media (max-width: 768px) {
          .desktop-orders-table {
            display: none !important;
          }
          .mobile-orders-cards {
            display: flex !important;
            flex-direction: column;
            gap: var(--space-md);
          }
        }

        .order-card-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 520px) {
          .order-card-actions {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .order-card-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 7px 6px;
          font-size: 0.75rem;
          min-height: 34px;
          width: 100%;
          white-space: nowrap;
        }

        .order-card-actions .order-due-btn {
          grid-column: 1 / -1;
          font-weight: 600;
          font-size: 0.8125rem;
          min-height: 36px;
          background: var(--accent-gradient);
          color: white;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.3);
        }

        /* Print styles for thermal & A4 crate stickers */
        @media print {
          body * {
            visibility: hidden !important;
          }
          #crate-packing-slip-printable, #crate-packing-slip-printable * {
            visibility: visible !important;
          }
          #crate-packing-slip-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrdersPage;
