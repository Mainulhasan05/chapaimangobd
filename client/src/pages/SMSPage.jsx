import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsAPI, customerAPI } from '../api';
import {
  Send,
  Eye,
  MessageSquare,
  Search,
  CheckSquare,
  Square,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  Radio,
  Zap,
  CheckCircle2,
  X,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';

const templateVariables = [
  { key: '{name}', label: 'Customer Name' },
  { key: '{phone}', label: 'Phone' },
  { key: '{totalDue}', label: 'Total Due' },
  { key: '{totalPurchases}', label: 'Total Purchases' },
  { key: '{totalPaid}', label: 'Total Paid' },
  { key: '{address}', label: 'Address' },
];

const sampleTemplates = [
  {
    title: 'অর্ডার নিশ্চিতকরণ (Confirmation)',
    text: 'প্রিয় {name}, chapaimango.bd-এ আপনার চাঁপাই আমের অর্ডারটি কনফার্ম হয়েছে। মোট বিল: {totalPurchases} টাকা, পরিশোধ: {totalPaid} টাকা, বকেয়া: {totalDue} টাকা। ধন্যবাদ!',
  },
  {
    title: 'কুরিয়ার বুকিং আপডেট (Courier Dispatch)',
    text: 'প্রিয় {name}, চাঁপাইনবাবগঞ্জের বাগান থেকে আপনার ফ্রেশ আমের পার্সেল কুরিয়ারে বুকিং দেওয়া হয়েছে। দ্রুতই আপনার ঠিকানায় পৌঁছাবে। - chapaimango.bd',
  },
  {
    title: 'বকেয়া পরিশোধ রিমাইন্ডার (Due Reminder)',
    text: 'প্রিয় {name}, chapaimango.bd-এ আপনার আমের অর্ডারের বর্তমান বকেয়া {totalDue} টাকা। bKash/Nagad বা ক্যাশ অন ডেলিভারিতে পরিশোধ করতে অনুরোধ করা হচ্ছে। ধন্যবাদ।',
  },
  {
    title: 'আমের সিজন ও অগ্রিম বুকিং (Season Harvest Alert)',
    text: 'সুসংবাদ {name}! চাঁপাইনবাবগঞ্জের বাগান থেকে শতভাগ কেমিক্যালমুক্ত তাজা হিমসাগর ও ল্যাংড়া আম নামানো শুরু হয়েছে। অগ্রিম বুকিং করতে ভিজিট করুন chapaimango.bd',
  },
];

const isUnicodeText = (str) => /[^\u0000-\u007F]/.test(str || '');

const SMSPage = () => {
  const [template, setTemplate] = useState(sampleTemplates[0].text);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchCustomers, setSearchCustomers] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('compose');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test message from Chapai Mango (chapaimango.bd) via Automas SMS Gateway.');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [isReviewedChecked, setIsReviewedChecked] = useState(false);

  const queryClient = useQueryClient();

  const { data: configData } = useQuery({
    queryKey: ['sms-config'],
    queryFn: () => smsAPI.getConfig().then((r) => r.data.data),
  });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['sms-customers', searchCustomers, customerPage],
    queryFn: () =>
      customerAPI
        .getAll({ search: searchCustomers || undefined, page: customerPage, limit: 20, hasDue: 'true' })
        .then((r) => r.data),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sms-history'],
    queryFn: () => smsAPI.getHistory({ limit: 20 }).then((r) => r.data.data),
    enabled: activeTab === 'history',
  });

  const previewMutation = useMutation({
    mutationFn: (data) => smsAPI.preview(data),
    onSuccess: (res) => {
      setPreviewData(res.data.data);
      toast.success('Live preview updated!');
    },
    onError: () => toast.error('Failed to generate preview'),
  });

  const sendMutation = useMutation({
    mutationFn: (data) => smsAPI.send(data),
    onSuccess: (res) => {
      const summary = res.data.data.summary;
      toast.success(`SMS dispatched successfully! ${summary.sent} delivered, ${summary.failed} failed`);
      setSelectedCustomers([]);
      setPreviewData(null);
      setShowConfirmModal(false);
      setIsReviewedChecked(false);
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send SMS'),
  });

  const testMutation = useMutation({
    mutationFn: (data) => smsAPI.test(data),
    onSuccess: () => {
      toast.success('Test SMS sent successfully via Automas!');
      setShowTestModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send test SMS'),
  });

  const toggleCustomer = (id) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const customers = customersData?.data || [];
    const allIds = customers.map((c) => c._id);
    const allSelected = allIds.every((id) => selectedCustomers.includes(id));
    if (allSelected) {
      setSelectedCustomers((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedCustomers((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  // Open Preview Modal before sending
  const handleOpenReview = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    if (!template.trim()) {
      toast.error('Please enter an SMS template');
      return;
    }

    try {
      const res = await smsAPI.preview({
        customerIds: selectedCustomers,
        template,
        limit: 100,
      });
      setConfirmData(res.data);
      setIsReviewedChecked(false);
      setShowConfirmModal(true);
    } catch {
      toast.error('Failed to generate preview for verification');
    }
  };

  const handleExecuteConfirmedSend = () => {
    if (!isReviewedChecked) {
      toast.error('Please check the confirmation box after reviewing');
      return;
    }
    sendMutation.mutate({ customerIds: selectedCustomers, template });
  };

  const insertVariable = (varKey) => {
    setTemplate((prev) => prev + varKey);
  };

  const handleTestSubmit = (e) => {
    e.preventDefault();
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    testMutation.mutate({ phone: testPhone, message: testMessage });
  };

  const footerSuffix = configData?.appendSmsFooter && configData?.smsFooter ? ` - ${configData.smsFooter}` : '';
  const fullSampleText = template + footerSuffix;
  const isUnicode = isUnicodeText(fullSampleText);
  const maxCharsPerSms = isUnicode ? 70 : 160;
  const totalChars = template.length + (configData?.appendSmsFooter ? (footerSuffix.length) : 0);
  const smsCount = Math.max(1, Math.ceil(totalChars / maxCharsPerSms));

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination || {};

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">SMS Center</h1>
          <p className="page-description">
            Powered by <strong>Automas SMS Gateway</strong> (sms.automas.com.bd) • Suffix: <strong>{configData?.smsFooter || 'ChapaiMango.bd'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => setShowTestModal(true)}>
            <Zap size={16} /> Test SMS
          </button>
        </div>
      </div>

      {/* Gateway Status Banner */}
      <div className="card" style={{
        marginBottom: 'var(--space-lg)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
        background: 'var(--bg-glass)',
        borderLeft: '4px solid var(--accent-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Radio size={20} style={{ color: 'var(--accent-secondary)' }} />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Gateway: {configData?.gateway || 'Automas SMS Gateway'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Endpoint: {configData?.gatewayUrl || 'https://api.automas.com.bd/smsapiv3'} • Sender ID: <strong>{configData?.senderId || 'HIMEL'}</strong>
            </div>
          </div>
        </div>

        <div>
          {configData?.isConfigured ? (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} /> Connected (Live Mode)
            </span>
          ) : (
            <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={12} /> Simulated Mode (Add API Key in .env)
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 2, width: 'fit-content' }}>
        <button
          className={`btn btn-sm ${activeTab === 'compose' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('compose')}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <Send size={14} /> Compose & Bulk Send
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('history')}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <Clock size={14} /> SMS History
        </button>
      </div>

      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          {/* Left: Template + Preview */}
          <div>
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="card-header">
                <h3 className="card-title">Message Template</h3>
                {isUnicode ? (
                  <span className="badge badge-info">Unicode (Bangla) • 70 chars/SMS</span>
                ) : (
                  <span className="badge badge-neutral">ASCII (English) • 160 chars/SMS</span>
                )}
              </div>

              {/* Sample Templates Dropdown */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Pre-made Templates</label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  {sampleTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setTemplate(t.text)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Buttons */}
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <label className="form-label">Insert Dynamic Customer Data</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {templateVariables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => insertVariable(v.key)}
                      style={{ fontSize: '0.75rem', background: 'var(--accent-primary-light)', color: 'var(--accent-secondary)' }}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="form-textarea"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={5}
                placeholder="Write your SMS template here. Use {name}, {totalDue}, etc. for dynamic values."
                style={{ minHeight: 120, fontSize: '0.9375rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Info size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {totalChars} characters ({smsCount} SMS credit per customer)
                  </span>
                </div>
                {isUnicode && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                    Format 8 enabled
                  </span>
                )}
              </div>

              {configData?.appendSmsFooter && configData?.smsFooter && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-glass)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>Auto-Suffix</span>
                  <span>Will append: <strong style={{ color: 'var(--accent-secondary)' }}>- {configData.smsFooter}</strong></span>
                </div>
              )}
            </div>

            {/* Preview */}
            {previewData && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Live Preview</h3>
                  <span className="badge badge-info">{previewData.length} sample{previewData.length > 1 ? 's' : ''}</span>
                </div>
                {previewData.map((p, i) => (
                  <div key={i} style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4, color: 'var(--accent-secondary)' }}>
                      {p.name} ({p.phone})
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {p.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              <button
                className="btn btn-secondary"
                onClick={handleOpenReview}
                disabled={previewMutation.isPending || selectedCustomers.length === 0}
              >
                <Eye size={16} /> Preview All ({selectedCustomers.length})
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenReview}
                disabled={sendMutation.isPending || selectedCustomers.length === 0}
                style={{ flex: 1 }}
              >
                <Send size={16} /> Review & Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {/* Right: Customer Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Select Customers with Due</h3>
              <span className="badge badge-primary">{selectedCustomers.length} selected</span>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div className="search-bar" style={{ maxWidth: '100%' }}>
                <Search size={18} className="search-bar-icon" />
                <input
                  placeholder="Search customers by name or phone..."
                  value={searchCustomers}
                  onChange={(e) => { setSearchCustomers(e.target.value); setCustomerPage(1); }}
                />
              </div>
            </div>

            {/* Select All */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)',
              }}
              onClick={toggleAll}
            >
              <CheckSquare size={16} /> Select All on Page
            </div>

            {/* Customer List */}
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {customersLoading ? (
                <div className="loading-overlay" style={{ padding: 'var(--space-lg)' }}>
                  <div className="spinner" />
                </div>
              ) : customers.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                  <p className="text-muted">No customers with due found</p>
                </div>
              ) : (
                customers.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: selectedCustomers.includes(c._id) ? 'var(--accent-primary-light)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => toggleCustomer(c._id)}
                  >
                    {selectedCustomers.includes(c._id) ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.875rem' }}>
                        ৳{c.totalDue?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setCustomerPage((p) => Math.max(1, p - 1))} disabled={customerPage <= 1}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-muted" style={{ fontSize: '0.75rem', lineHeight: '30px' }}>
                  {customerPage}/{pagination.pages}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setCustomerPage((p) => Math.min(pagination.pages, p + 1))} disabled={customerPage >= pagination.pages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">SMS Gateway History</h3>
          </div>
          {historyLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : !historyData || historyData.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <h3 className="empty-state-title">No SMS sent yet</h3>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Recipients</th>
                    <th>Template</th>
                    <th>Delivered</th>
                    <th>Failed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>{log.recipients?.length}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.template}
                      </td>
                      <td className="text-success">{log.totalSent}</td>
                      <td className="text-danger">{log.totalFailed}</td>
                      <td>
                        <span className={`badge ${log.status === 'sent' ? 'badge-success' : log.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Pre-Send Review & Confirmation Modal */}
      {showConfirmModal && confirmData && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Eye size={20} style={{ color: 'var(--accent-secondary)' }} /> Review SMS Broadcast Before Dispatching
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Verify that every customer receives the exact intended information & brand suffix.
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowConfirmModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 'var(--space-sm)' }}>
              {/* Summary Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
              }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Recipients</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {confirmData.totalRecipients || selectedCustomers.length}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Credits</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {confirmData.totalCredits} SMS
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Sender ID</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {configData?.senderId || '8809617639998'}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Brand Suffix</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)' }}>
                    {configData?.appendSmsFooter ? (configData.smsFooter || 'ChapaiMango.bd') : 'Disabled'}
                  </div>
                </div>
              </div>

              {/* Exact Rendered Recipient Messages List */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Exact Rendered SMS Previews ({confirmData.data?.length || 0} customers):</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>100% matches handset delivery</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {confirmData.data?.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>({p.phone})</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                            Due: ৳{(p.totalDue || 0).toLocaleString()}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {p.charCount} chars • {p.credits} credit{p.credits > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        padding: '8px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-primary)',
                      }}>
                        {p.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div style={{
                padding: 'var(--space-md)',
                background: isReviewedChecked ? 'var(--accent-primary-light)' : 'var(--bg-glass)',
                border: isReviewedChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginTop: 'var(--space-md)',
                transition: 'all 0.2s',
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={isReviewedChecked}
                    onChange={(e) => setIsReviewedChecked(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>I confirm that I have reviewed the preview messages above.</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, margin: 0 }}>
                      The text shown in the preview will be dispatched directly to the {selectedCustomers.length} recipient handsets via Automas SMS Gateway.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteConfirmedSend}
                disabled={!isReviewedChecked || sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <>
                    <div className="spinner" /> Dispatching via Automas...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Confirm & Dispatch SMS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test SMS Modal */}
      {showTestModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Zap size={18} /> Send Test SMS (Automas)
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowTestModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTestSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Recipient Phone Number (Bangladesh) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea
                    className="form-textarea"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Sends through <code>https://api.automas.com.bd/smsapiv3</code> with Sender ID: <strong>{configData?.senderId || '8809617639998'}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={testMutation.isPending}>
                  {testMutation.isPending ? <div className="spinner" /> : <Send size={16} />}
                  Send Test SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .page > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SMSPage;
