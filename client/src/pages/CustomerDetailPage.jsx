import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerAPI } from '../api';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerAPI.getOne(id).then((r) => r.data.data),
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer-ledger', id],
    queryFn: () => customerAPI.getLedger(id).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => customerAPI.delete(id, { cascade: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Customer deleted successfully');
      navigate('/customers');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete customer'),
  });

  if (customerLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <span>Loading customer...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Customer not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/customers')}>
          Go Back
        </button>
      </div>
    );
  }

  const ledger = ledgerData?.ledger || [];

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/customers')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{customer.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: 4 }}>
              <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                <Phone size={14} /> {customer.phone}
              </span>
              <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                <MapPin size={14} /> {customer.address}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowDeleteModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          <Trash2 size={15} /> Delete Customer
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card stat-sales">
          <div className="stat-card-icon"><TrendingUp size={20} /></div>
          <div className="stat-card-label">Total Purchases</div>
          <div className="stat-card-value" style={{ fontSize: '1.375rem' }}>৳{customer.totalPurchases?.toLocaleString()}</div>
        </div>
        <div className="stat-card stat-collected">
          <div className="stat-card-icon"><DollarSign size={20} /></div>
          <div className="stat-card-label">Total Paid</div>
          <div className="stat-card-value text-success" style={{ fontSize: '1.375rem' }}>৳{customer.totalPaid?.toLocaleString()}</div>
        </div>
        <div className="stat-card stat-dues">
          <div className="stat-card-icon"><AlertCircle size={20} /></div>
          <div className="stat-card-label">Current Due</div>
          <div className="stat-card-value text-danger" style={{ fontSize: '1.375rem' }}>৳{customer.totalDue?.toLocaleString()}</div>
        </div>
        <div className="stat-card stat-orders">
          <div className="stat-card-icon"><ShoppingCart size={20} /></div>
          <div className="stat-card-label">Total Orders</div>
          <div className="stat-card-value" style={{ fontSize: '1.375rem' }}>{customer.orderCount}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-secondary)' }}>
          <div className="stat-card-icon" style={{ color: 'var(--accent-secondary)', background: 'rgba(59, 130, 246, 0.12)' }}>
            <MessageSquare size={20} />
          </div>
          <div className="stat-card-label">SMS Dispatched</div>
          <div className="stat-card-value" style={{ fontSize: '1.375rem' }}>{customer.totalSmsSent || 0}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {customer.lastSmsSentAt ? `Last: ${formatDate(customer.lastSmsSentAt)}` : 'No SMS sent'}
          </div>
        </div>
      </div>

      {/* Opening Balance Info */}
      {customer.openingBalance > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <AlertCircle size={18} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: '0.875rem' }}>
              Opening Balance (Previous Due): <strong>৳{customer.openingBalance?.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Ledger Timeline */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transaction Ledger</h3>
          <span className="badge badge-neutral">{ledger.length} entries</span>
        </div>

        {ledgerLoading ? (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        ) : ledger.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
            <p className="text-muted">No transactions yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ledger.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  borderBottom: i < ledger.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${entry.type === 'order' ? 'var(--accent-primary)' : 'var(--success)'}`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: entry.type === 'order' ? 'var(--accent-primary-light)' : 'var(--success-light)',
                  color: entry.type === 'order' ? 'var(--accent-secondary)' : 'var(--success)',
                }}>
                  {entry.type === 'order' ? <ShoppingCart size={16} /> : <DollarSign size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {entry.type === 'order' ? 'Order' : 'Payment'}
                        {entry.type === 'order' && (
                          <span className={`badge ${entry.status === 'delivered' ? 'badge-success' : entry.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 8 }}>
                            {entry.status}
                          </span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {formatDate(entry.date)}
                        {entry.method && ` • ${entry.method}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {entry.type === 'order' ? (
                        <>
                          <div style={{ fontWeight: 600 }}>৳{entry.amount?.toLocaleString()}</div>
                          {entry.due > 0 && (
                            <div className="text-danger" style={{ fontSize: '0.75rem' }}>
                              Due: ৳{entry.due?.toLocaleString()}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-success" style={{ fontWeight: 600 }}>
                          +৳{entry.amount?.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {entry.note && (
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>{entry.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Customer Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleteMutation.isPending && setShowDeleteModal(false)}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-light)', color: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Delete Customer</h3>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: 'var(--space-md)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{customer.name}</strong> ({customer.phone})?
              </p>

              {(customer.orderCount > 0 || customer.totalDue > 0) && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-md)',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>Warning:</div>
                  This customer has <strong>{customer.orderCount || 0} order(s)</strong> and <strong>৳{(customer.totalDue || 0).toLocaleString()} standing due</strong>. Deleting this customer will permanently delete their profile and associated order records.
                </div>
              )}

              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <div className="spinner" />}
                <Trash2 size={15} /> Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
