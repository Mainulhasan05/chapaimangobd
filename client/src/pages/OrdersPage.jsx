import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderAPI, customerAPI } from '../api';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Order form state
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    customerSearch: '',
    items: [{ productName: '', quantity: 1, rate: '' }],
    discount: 0,
    courierName: '',
    courierCharge: 0,
    paidAmount: 0,
    deliveryAddress: '',
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, statusFilter, paymentFilter],
    queryFn: () =>
      orderAPI
        .getAll({
          page,
          limit: 20,
          status: statusFilter || undefined,
          paymentStatus: paymentFilter || undefined,
        })
        .then((r) => r.data),
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

  const resetOrderForm = () => {
    setOrderForm({
      customerId: '', customerSearch: '',
      items: [{ productName: '', quantity: 1, rate: '' }],
      discount: 0, courierName: '', courierCharge: 0, paidAmount: 0, deliveryAddress: '', notes: '',
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}>
          <option value="">All Payment</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Orders Table & Mobile Cards */}
      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span>Loading orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 className="empty-state-title">No orders found</h3>
          <p className="empty-state-text">Create your first order to get started</p>
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
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
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
                            style={{ padding: '4px 10px', fontSize: '0.75rem', height: 28 }}
                          >
                            <DollarSign size={13} /> Pay
                          </button>
                        )}
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
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowDetailsModal(order)}
                    style={{ flex: order.orderDue > 0 ? 'none' : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={14} /> Details
                  </button>
                  {order.orderDue > 0 && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowPaymentModal(order)}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <DollarSign size={14} /> Collect Due (৳{order.orderDue?.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>Page {page} of {pagination.pages}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                Next <ChevronRight size={16} />
              </button>
            </div>
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
                  <label className="form-label">Customer *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      placeholder="Search customer by name or phone..."
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
                  </div>
                  {orderForm.customerId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>✓ Customer selected</div>
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
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        style={{ width: 70 }}
                        min="1"
                        required
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Rate"
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
                    <input type="number" className="form-input" min="0" value={orderForm.discount} onChange={(e) => setOrderForm({ ...orderForm, discount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Courier Charge (৳)</label>
                    <input type="number" className="form-input" min="0" value={orderForm.courierCharge} onChange={(e) => setOrderForm({ ...orderForm, courierCharge: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Advance / Paid (৳)</label>
                    <input type="number" className="form-input" min="0" value={orderForm.paidAmount} onChange={(e) => setOrderForm({ ...orderForm, paidAmount: e.target.value })} />
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

      {/* Responsive Styles for Orders Page */}
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
        }

        .orders-actions-cell {
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
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
      `}</style>
    </div>
  );
};

export default OrdersPage;
