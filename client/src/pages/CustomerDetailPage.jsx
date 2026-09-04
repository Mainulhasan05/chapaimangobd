import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerAPI, smsAPI } from '../api';
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
  Send,
  CheckCircle,
  X,
  FileText,
  Copy,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Standard Due Reminder SMS Template
const DEFAULT_REMINDER_TEMPLATE = `Just a gentle reminder from chapaimango.bd

Outstanding Due: BDT {due}

We would really appreciate it if you could clear the payment by {deadline}.

For bill & payment details, please visit: {billUrl}

For live support, WhatsApp us at  01717333880

-Chapai Mango Team`;

const calculateSmsMetrics = (text) => {
  if (!text) return { charCount: 0, credits: 0, isUnicode: false };
  const clean = text.toString();
  const charCount = clean.length;
  const isUnicode = /[^\u0000-\u007F]/.test(clean);
  let credits = 1;
  if (isUnicode) {
    credits = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  } else {
    credits = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  }
  return { charCount, credits, isUnicode };
};

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // SMS Reminder Modal State
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsForm, setSmsForm] = useState({
    due: '',
    deadline: '15 September 2026',
    billUrl: 'xxxxxxxxxx',
    whatsappNumber: '01717333880',
    directEdit: false,
    customText: '',
  });
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [previewSent, setPreviewSent] = useState(null);

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

  // Dynamic message resolver
  const resolvedSmsText = useMemo(() => {
    if (smsForm.directEdit) return smsForm.customText;
    const dueVal = smsForm.due || (customer?.totalDue ? Number(customer.totalDue).toLocaleString('en-BD') : '0');
    return DEFAULT_REMINDER_TEMPLATE
      .replace('{due}', dueVal)
      .replace('{deadline}', smsForm.deadline || '15 September 2026')
      .replace('{billUrl}', smsForm.billUrl || 'xxxxxxxxxx')
      .replace('{whatsappNumber}', smsForm.whatsappNumber || '01717333880');
  }, [smsForm, customer]);

  const smsMetrics = useMemo(() => calculateSmsMetrics(resolvedSmsText), [resolvedSmsText]);

  const openSmsModal = () => {
    const code = customer?.billShortCode || customer?._id;
    const billUrl = `${window.location.origin}/b/${code}`;
    setSmsForm({
      due: customer?.totalDue ? Number(customer.totalDue).toLocaleString('en-BD') : '0',
      deadline: '15 September 2026',
      billUrl,
      whatsappNumber: '01717333880',
      directEdit: false,
      customText: '',
    });
    setPreviewSent(null);
    setShowSmsModal(true);
  };

  const handleSendSms = async (isTest = false) => {
    if (!customer?.phone) return;
    setIsSendingSms(true);
    try {
      await smsAPI.test({
        phone: customer.phone,
        message: resolvedSmsText,
      });

      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });

      if (isTest) {
        toast.success(`Preview SMS sent to ${customer.phone}!`);
        setPreviewSent({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        toast.success(`SMS reminder dispatched to ${customer.name}!`);
        setShowSmsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send SMS');
    } finally {
      setIsSendingSms(false);
    }
  };

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
  const publicBillUrl = `${window.location.origin}/b/${customer.billShortCode || customer._id}`;

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

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {/* Copy Public Bill Link */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(publicBillUrl);
              toast.success('Public bill link copied!');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Copy Public Bill Link"
          >
            <Copy size={15} /> Copy Bill Link
          </button>

          {/* Open Public Bill in new tab */}
          <a
            href={publicBillUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'none',
            }}
            title="Open Customer Public Bill Page"
          >
            <ExternalLink size={15} /> View Bill Page
          </a>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={openSmsModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--accent-secondary)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              fontWeight: 600,
            }}
          >
            <MessageSquare size={16} /> Send SMS Reminder
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDeleteModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              fontWeight: 600,
              padding: '6px 14px',
            }}
          >
            <Trash2 size={16} /> Delete Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card stat-sales">
          <div className="stat-card-icon"><TrendingUp size={20} /></div>
          <div className="stat-card-label">Total Bill (Purchases)</div>
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

      {/* Bill Calculation Breakdown Box (if present) */}
      {customer.billDetailsText && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--accent-secondary)', background: 'rgba(0, 206, 201, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
            <FileText size={18} style={{ color: '#00cec9', marginTop: 2 }} />
            <div style={{ width: '100%' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                Bill Calculation Breakdown (Customer Visible)
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 8 }}>
                {customer.billDetailsText}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Memo Screenshot Box (if present) */}
      {customer.billImageUrl && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid #f39c12' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
            <ImageIcon size={18} style={{ color: '#f39c12', marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                Bill Slip / Memo Screenshot (Customer Visible)
              </div>
              <a href={customer.billImageUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={customer.billImageUrl}
                  alt="Bill Memo"
                  style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)' }}
                />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Notes Box */}
      {customer.notes && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--accent-secondary)', background: 'rgba(59, 130, 246, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
            <FileText size={18} style={{ color: 'var(--accent-secondary)', marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                Private Customer Note
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {customer.notes}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-muted">No transactions recorded yet</p>
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

      {/* Customer Danger Zone */}
      <div className="card" style={{ marginTop: 'var(--space-xl)', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h4 style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={16} /> Danger Zone: Delete Customer Profile
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Permanently remove {customer.name} ({customer.phone}) and clear associated ledger.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDeleteModal(true)}
            style={{
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
            }}
          >
            <Trash2 size={15} /> Delete Customer
          </button>
        </div>
      </div>

      {/* ========================================================
          STANDALONE SMS REMINDER MODAL
         ======================================================== */}
      {showSmsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Send Due Reminder SMS</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Recipient: <strong>{customer.name}</strong> ({customer.phone})
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSmsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Dynamic Variables Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  background: 'var(--bg-input)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    Outstanding Due (BDT)
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={smsForm.due}
                    onChange={(e) => setSmsForm({ ...smsForm, due: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    Payment Deadline
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={smsForm.deadline}
                    onChange={(e) => setSmsForm({ ...smsForm, deadline: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    Bill / Payment Link
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={smsForm.billUrl}
                    onChange={(e) => setSmsForm({ ...smsForm, billUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    WhatsApp Live Support
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={smsForm.whatsappNumber}
                    onChange={(e) => setSmsForm({ ...smsForm, whatsappNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Direct edit toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                  Message Preview:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!smsForm.directEdit) {
                      setSmsForm({ ...smsForm, directEdit: true, customText: resolvedSmsText });
                    } else {
                      setSmsForm({ ...smsForm, directEdit: false });
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-secondary)',
                    fontSize: '0.6875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {smsForm.directEdit ? 'Reset to Dynamic Resolver' : 'Direct edit text'}
                </button>
              </div>

              {/* Preview Box */}
              {smsForm.directEdit ? (
                <textarea
                  className="form-textarea"
                  rows={6}
                  style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}
                  value={smsForm.customText}
                  onChange={(e) => setSmsForm({ ...smsForm, customText: e.target.value })}
                />
              ) : (
                <div
                  style={{
                    background: '#0d1117',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '0.8125rem',
                    lineHeight: 1.45,
                    color: '#c9d1d9',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {resolvedSmsText}
                </div>
              )}

              {/* Character and token info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                <span>
                  <strong>{smsMetrics.charCount}</strong> chars • <strong>{smsMetrics.credits} SMS</strong> ({smsMetrics.isUnicode ? 'Unicode' : 'GSM'})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={isSendingSms}
                  onClick={() => handleSendSms(true)}
                  style={{ fontSize: '0.6875rem', height: 26, padding: '2px 8px' }}
                >
                  Test Send Preview
                </button>
              </div>

              {previewSent && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '0.6875rem',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle size={13} />
                  <span>Preview SMS dispatched successfully at {previewSent.time}.</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSmsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSendingSms}
                onClick={() => handleSendSms(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isSendingSms ? <div className="spinner" /> : <Send size={15} />}
                Send Reminder SMS Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete ${customer.name} (${customer.phone})?`}
        submessage={
          customer.orderCount > 0 || customer.totalDue > 0 ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>Warning:</div>
              This customer has <strong>{customer.orderCount || 0} order(s)</strong> and <strong>৳{(customer.totalDue || 0).toLocaleString()} standing due</strong>. Deleting will permanently remove their records.
            </div>
          ) : null
        }
        confirmText="Delete Customer"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default CustomerDetailPage;
