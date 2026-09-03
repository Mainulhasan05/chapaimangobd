import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  DollarSign,
  FileSpreadsheet,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import PhoneInput, { isBDPhoneValid } from '../components/PhoneInput';

const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });
  const [filterDue, setFilterDue] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', phone: '', altPhone: '', address: '', area: '', openingBalance: '', notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, filterDue],
    queryFn: () =>
      customerAPI
        .getAll({ page, limit: 20, search: search || undefined, hasDue: filterDue || undefined })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => customerAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully!');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create customer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated!');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }) => customerAPI.recordPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment recorded!');
      setShowPaymentModal(null);
      setPaymentForm({ amount: '', method: 'cash', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customerAPI.delete(id, { cascade: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Customer deleted successfully');
      setCustomerToDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete customer'),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm({ name: '', phone: '', altPhone: '', address: '', area: '', openingBalance: '', notes: '' });
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      altPhone: customer.altPhone || '',
      address: customer.address,
      area: customer.area || '',
      openingBalance: customer.openingBalance || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isBDPhoneValid(form.phone)) {
      toast.error('Customer phone number must be exactly 11 digits (e.g. 017XXXXXXXX)');
      return;
    }
    if (form.altPhone && !isBDPhoneValid(form.altPhone)) {
      toast.error('Alternative phone number must be exactly 11 digits (e.g. 017XXXXXXXX)');
      return;
    }
    const payload = {
      ...form,
      openingBalance: parseFloat(form.openingBalance) || 0,
    };
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handlePayment = (e) => {
    e.preventDefault();
    paymentMutation.mutate({
      id: showPaymentModal._id,
      data: { ...paymentForm, amount: parseFloat(paymentForm.amount) },
    });
  };

  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-description">{pagination.total || 0} total customers</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/import')}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={18} className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filterDue}
          onChange={(e) => { setFilterDue(e.target.value); setPage(1); }}
        >
          <option value="">All Customers</option>
          <option value="true">Has Due</option>
          <option value="false">No Due</option>
        </select>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span>Loading customers...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No customers found</h3>
          <p className="empty-state-text">
            {search ? 'Try a different search term' : 'Add your first customer to get started'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container desktop-customers-table">
            <table className="table customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th>Orders</th>
                  <th>Total Purchases</th>
                  <th>Total Due</th>
                  <th className="customers-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.address}</div>
                    </td>
                    <td>
                      <div>{c.phone}</div>
                      {c.totalSmsSent > 0 && (
                        <span
                          className="badge badge-neutral"
                          title={`${c.totalSmsSent} SMS delivered to this customer`}
                          style={{ fontSize: '0.625rem', padding: '1px 5px', gap: 3, display: 'inline-flex', alignItems: 'center', marginTop: 2 }}
                        >
                          <MessageSquare size={9} style={{ color: 'var(--accent-secondary)' }} /> {c.totalSmsSent} SMS
                        </span>
                      )}
                    </td>
                    <td>{c.area || '—'}</td>
                    <td>{c.orderCount}</td>
                    <td>৳{c.totalPurchases?.toLocaleString()}</td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: c.totalDue > 0 ? 'var(--danger)' : 'var(--success)',
                      }}>
                        ৳{c.totalDue?.toLocaleString()}
                      </span>
                    </td>
                    <td className="customers-actions-cell">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View Details"
                          onClick={() => navigate(`/customers/${c._id}`)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit"
                          onClick={() => openEdit(c)}
                        >
                          <Edit2 size={16} />
                        </button>
                        {c.totalDue > 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            title="Record Payment"
                            onClick={() => setShowPaymentModal(c)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 28 }}
                          >
                            <DollarSign size={13} /> Pay
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-icon btn-sm text-danger"
                          title="Delete Customer"
                          onClick={() => setCustomerToDelete(c)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Customers Cards View */}
          <div className="mobile-customers-cards">
            {customers.map((c) => (
              <div
                key={c._id}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {c.name}
                    </div>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <a
                          href={`tel:${c.phone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--accent-secondary)' }}
                        >
                          <Phone size={12} /> {c.phone}
                        </a>
                        {c.totalSmsSent > 0 && (
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.625rem', padding: '1px 5px', gap: 3, display: 'inline-flex', alignItems: 'center' }}
                          >
                            <MessageSquare size={9} style={{ color: 'var(--accent-secondary)' }} /> {c.totalSmsSent}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {c.area && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                      {c.area}
                    </span>
                  )}
                </div>

                {c.address && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} style={{ flexShrink: 0 }} /> {c.address}
                  </div>
                )}

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
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Orders</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.orderCount || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Purchases</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      ৳{(c.totalPurchases || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Due</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: c.totalDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ৳{(c.totalDue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="customer-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/customers/${c._id}`)}
                  >
                    <Eye size={14} /> Ledger
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(c)}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={() => setCustomerToDelete(c)}
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  {c.totalDue > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm customer-pay-btn"
                      onClick={() => setShowPaymentModal(c)}
                    >
                      <DollarSign size={15} /> Pay Due • ৳{(c.totalDue || 0).toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 'var(--space-md)', marginTop: 'var(--space-lg)',
            }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <PhoneInput
                    label="Phone Number"
                    value={form.phone}
                    onChange={(val) => setForm({ ...form, phone: val })}
                    required
                  />
                  <PhoneInput
                    label="Alt Phone"
                    value={form.altPhone}
                    onChange={(val) => setForm({ ...form, altPhone: val })}
                    required={false}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input
                    className="form-input"
                    placeholder="Full address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Area / Zone</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Dhaka, Chittagong"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                    />
                  </div>
                  {!editingCustomer && (
                    <div className="form-group">
                      <label className="form-label">Previous Due (Opening Balance)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        value={form.openingBalance}
                        onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Any notes about this customer..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <div className="spinner" />}
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Record Payment</h2>
                <p className="card-subtitle">{showPaymentModal.name} — Due: ৳{showPaymentModal.totalDue?.toLocaleString()}</p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPaymentModal(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Amount (৳) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input
                    className="form-input"
                    placeholder="Optional note"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending && <div className="spinner" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Customer Deletion */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => deleteMutation.mutate(customerToDelete._id)}
        title="Delete Customer Profile"
        message={
          customerToDelete
            ? `Are you sure you want to delete ${customerToDelete.name} (${customerToDelete.phone})?`
            : ''
        }
        submessage={
          customerToDelete && (customerToDelete.orderCount > 0 || customerToDelete.totalDue > 0) ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>Warning:</div>
              This customer has <strong>{customerToDelete.orderCount || 0} order(s)</strong> and <strong>৳{(customerToDelete.totalDue || 0).toLocaleString()} standing due</strong>. Deleting will permanently remove their records.
            </div>
          ) : null
        }
        confirmText="Delete Customer"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
        secondaryAction={{
          label: 'Deactivate instead',
          onClick: () => {
            updateMutation.mutate({ id: customerToDelete._id, data: { status: 'inactive' } });
            setCustomerToDelete(null);
            toast.success('Customer marked as inactive');
          },
        }}
      />

      {/* Responsive Styles */}
      <style>{`
        .desktop-customers-table {
          display: block;
        }
        .mobile-customers-cards {
          display: none;
        }

        .customers-actions-header {
          text-align: right;
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
        }

        .customers-actions-cell {
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .desktop-customers-table {
            display: none !important;
          }
          .mobile-customers-cards {
            display: flex !important;
            flex-direction: column;
            gap: var(--space-md);
          }
        }

        .customer-card-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        .customer-card-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 0.8125rem;
          min-height: 36px;
          width: 100%;
          white-space: nowrap;
        }

        .customer-card-actions .customer-pay-btn {
          grid-column: 1 / -1;
          font-weight: 600;
          font-size: 0.875rem;
          background: var(--accent-gradient);
          color: white;
          box-shadow: 0 2px 10px rgba(108, 92, 231, 0.3);
          min-height: 38px;
        }

        @media (max-width: 600px) {
          .page-header > div:last-child {
            width: 100%;
            display: flex;
            gap: 8px;
          }
          .page-header > div:last-child .btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomersPage;
