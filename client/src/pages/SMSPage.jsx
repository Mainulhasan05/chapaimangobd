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
  RefreshCw,
  Copy,
  Check,
  Users,
  Coins,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput, { isBDPhoneValid } from '../components/PhoneInput';

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

const formatBalance = (data, isLoading) => {
  if (isLoading) return '...';
  if (!data) return 'Active';
  const val = data.balance;
  if (typeof val === 'number') {
    return `${val.toLocaleString()} Credits`;
  }
  if (typeof val === 'string' && val.trim()) {
    const num = parseFloat(val);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(val.trim())) {
      return `${num.toLocaleString()} Credits`;
    }
    return val;
  }
  if (typeof val === 'object' && val !== null) {
    if (typeof val.response === 'number') {
      return `${val.response.toLocaleString()} Credits`;
    }
    if (typeof val.response === 'string' && !isNaN(parseFloat(val.response))) {
      return `${parseFloat(val.response).toLocaleString()} Credits`;
    }
    return 'Active';
  }
  return 'Active';
};

const SMSPage = () => {
  const [template, setTemplate] = useState(sampleTemplates[0].text);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchCustomers, setSearchCustomers] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('compose');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test message from Chapai Mango (chapaimango.bd).');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [isReviewedChecked, setIsReviewedChecked] = useState(false);

  const [selectedLogDetails, setSelectedLogDetails] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // SMS History filters & pagination
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  const handleCopyMessage = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const queryClient = useQueryClient();

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsAPI.getStats().then((r) => r.data.data),
  });

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['sms-balance'],
    queryFn: () => smsAPI.getBalance().then((r) => r.data.data),
  });

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

  const { data: historyResponse, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['sms-history', historyPage, historySearch, historyStatus],
    queryFn: () =>
      smsAPI
        .getHistory({
          page: historyPage,
          limit: 15,
          search: historySearch || undefined,
          status: historyStatus !== 'all' ? historyStatus : undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'history',
  });

  const historyData = historyResponse?.data || [];
  const historyPagination = historyResponse?.pagination || { page: 1, total: 0, pages: 1 };

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
      const summary = res.data?.data?.summary || { sent: 0, failed: 0 };
      toast.success(`SMS dispatched successfully! ${summary.sent} delivered, ${summary.failed} failed`);
      setSelectedCustomers([]);
      setPreviewData(null);
      setShowConfirmModal(false);
      setIsReviewedChecked(false);
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send SMS'),
  });

  const testMutation = useMutation({
    mutationFn: (data) => smsAPI.test(data),
    onSuccess: () => {
      toast.success('Test SMS sent successfully!');
      setShowTestModal(false);
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
    if (!isBDPhoneValid(testPhone)) {
      toast.error('Recipient phone number must be a valid 11-digit Bangladeshi number (e.g. 017XXXXXXXX)');
      return;
    }
    testMutation.mutate({ phone: testPhone, message: testMessage });
  };

  const footerSuffix = configData?.appendSmsFooter && configData?.smsFooter ? ` - ${configData.smsFooter}` : '';
  const fullSampleText = template + footerSuffix;
  const isUnicode = isUnicodeText(fullSampleText);
  const totalChars = template.length + (configData?.appendSmsFooter ? (footerSuffix.length) : 0);

  // Multi-part segment calculation (UDH standards: Bangla 70/67, GSM 160/153)
  let smsCount = 1;
  if (isUnicode) {
    smsCount = totalChars <= 70 ? 1 : Math.ceil(totalChars / 67);
  } else {
    smsCount = totalChars <= 160 ? 1 : Math.ceil(totalChars / 153);
  }

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination || {};

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">SMS Center</h1>
          <p className="page-description">
            Broadcast transactional updates, courier tracking & due notifications • Brand Suffix: <strong>{configData?.smsFooter || 'ChapaiMango.bd'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => setShowTestModal(true)}>
            <Zap size={16} /> Test SMS
          </button>
        </div>
      </div>

      {/* Gateway Status & Balance Strip */}
      <div className="gateway-status-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Radio size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>SMS Gateway</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>
                <span className="gateway-live-indicator" /> Live
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>
              Sender ID: <strong style={{ color: 'var(--text-primary)' }}>{configData?.senderId || '8809617639998'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {/* Live Balance Widget */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gateway Balance:</span>
            <strong style={{ fontSize: '0.875rem', color: 'var(--accent-secondary)' }}>
              {formatBalance(balanceData, balanceLoading)}
            </strong>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => {
                refetchBalance();
                refetchStats();
              }}
              title="Refresh Balance & Stats"
              style={{ width: 22, height: 22, padding: 0 }}
            >
              <RefreshCw size={12} className={balanceLoading ? 'spin' : ''} />
            </button>
          </div>

          <div>
            {configData?.isConfigured ? (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px' }}>
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : (
              <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px' }}>
                <Info size={12} /> Simulated Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Real-time SMS Send Count & Tracking Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        {/* Total SMS Delivered */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Total Delivered</span>
            <div className="metric-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
              <Send size={15} />
            </div>
          </div>
          <div className="metric-card-value">
            {statsData?.totalSent?.toLocaleString() ?? 0}
          </div>
          <div className="metric-card-footer">
            <span className="badge badge-success" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
              {statsData?.deliveryRate ?? 100}% Success
            </span>
            <span>{statsData?.totalFailed ?? 0} failed</span>
          </div>
        </div>

        {/* Tokens / Credits Used */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Credits Used</span>
            <div className="metric-card-icon" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24' }}>
              <Coins size={15} />
            </div>
          </div>
          <div className="metric-card-value">
            {statsData?.totalCredits?.toLocaleString() ?? 0}
          </div>
          <div className="metric-card-footer">
            <span>Across <strong>{statsData?.totalDispatches ?? 0}</strong> dispatches</span>
          </div>
        </div>

        {/* Dispatched Today */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Sent Today</span>
            <div className="metric-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="metric-card-value">
            {statsData?.sentToday?.toLocaleString() ?? 0}
          </div>
          <div className="metric-card-footer">
            <span><strong>{statsData?.creditsToday ?? 0}</strong> credits consumed</span>
          </div>
        </div>

        {/* Dispatched This Month */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Sent This Month</span>
            <div className="metric-card-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="metric-card-value">
            {statsData?.sentThisMonth?.toLocaleString() ?? 0}
          </div>
          <div className="metric-card-footer">
            <span><strong>{statsData?.creditsThisMonth ?? 0}</strong> credits this month</span>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="segmented-tabs">
        <button
          type="button"
          className={`segmented-tab ${activeTab === 'compose' ? 'active' : ''}`}
          onClick={() => setActiveTab('compose')}
        >
          <Send size={14} /> Compose & Bulk Send
        </button>
        <button
          type="button"
          className={`segmented-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={14} /> SMS History
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="sms-compose-grid">
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
            {Array.isArray(previewData) && previewData.length > 0 && (
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <div>
              <h3 className="card-title">SMS Dispatch History & Tracking</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Full audit record of delivered customer SMS messages, recipient handsets, and token credit costs.
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['sms-history'] });
                queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={historyLoading ? 'spin' : ''} /> Refresh History
            </button>
          </div>

          {/* History Filter Toolbar */}
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-glass)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 'var(--space-sm)',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flex: 1, minWidth: 260, maxWidth: 460 }}>
              <div className="search-box" style={{ width: '100%', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search recipient name, phone, or message..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  style={{ paddingLeft: 32, fontSize: '0.8125rem', height: 36 }}
                />
                {historySearch && (
                  <button
                    onClick={() => { setHistorySearch(''); setHistoryPage(1); }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Status:</span>
              <div style={{ display: 'inline-flex', background: 'var(--bg-input)', padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                {['all', 'sent', 'partial', 'failed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => { setHistoryStatus(st); setHistoryPage(1); }}
                    style={{
                      border: 'none',
                      background: historyStatus === st ? 'var(--accent-primary)' : 'transparent',
                      color: historyStatus === st ? '#fff' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      borderRadius: 'calc(var(--radius-sm) - 2px)',
                      cursor: 'pointer',
                      fontWeight: historyStatus === st ? 600 : 400,
                      textTransform: 'capitalize',
                      transition: 'all 0.15s',
                    }}
                  >
                    {st === 'all' ? 'All' : st === 'sent' ? 'Delivered' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {historyLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : !Array.isArray(historyData) || historyData.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <h3 className="empty-state-title">No SMS sent yet</h3>
              <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
                Outgoing promotional, order confirmation, and due reminder SMS records will appear here.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Recipient</th>
                    <th style={{ minWidth: 260 }}>Delivered Message (Exact Customer Content)</th>
                    <th>Token Cost</th>
                    <th>Sent</th>
                    <th>Failed</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(historyData) && historyData.map((log) => {
                    const firstRecipient = log.resolvedTexts?.[0] || log.recipients?.[0] || {};
                    const totalRecipientsCount = log.recipients?.length || log.resolvedTexts?.length || 1;
                    const deliveredText = firstRecipient.text || log.template || '';
                    const isMulti = totalRecipientsCount > 1;

                    return (
                      <tr
                        key={log._id}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => setSelectedLogDetails(log)}
                        title="Click to view full message & token details"
                      >
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                          <div style={{ fontWeight: 500 }}>
                            {new Date(log.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.createdAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          {isMulti ? (
                            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <Users size={12} /> {totalRecipientsCount} Recipients
                            </span>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                                {firstRecipient.name || 'Recipient'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
                                {firstRecipient.phone || '—'}
                              </div>
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{
                            maxWidth: 360,
                            padding: '6px 10px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                          }}>
                            <div style={{
                              fontSize: '0.8125rem',
                              lineHeight: 1.4,
                              color: 'var(--text-primary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'normal',
                            }}>
                              {deliveredText}
                            </div>
                            {isMulti && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--accent-secondary)', marginTop: 3 }}>
                                + {totalRecipientsCount - 1} more recipient{totalRecipientsCount - 1 > 1 ? 's' : ''} (personalized)
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <Coins size={12} style={{ color: 'var(--warning)' }} />
                            {log.totalCredits || 1} Credit{log.totalCredits !== 1 ? 's' : ''}
                          </span>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {firstRecipient.isUnicode ? 'Unicode (Bangla)' : 'ASCII (English)'}
                          </div>
                        </td>

                        <td className="text-success" style={{ fontWeight: 600 }}>{log.totalSent}</td>
                        <td className="text-danger" style={{ fontWeight: 600 }}>{log.totalFailed}</td>

                        <td>
                          <span className={`badge ${log.status === 'sent' ? 'badge-success' : log.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {log.status === 'sent' ? 'Delivered' : log.status === 'partial' ? 'Partial' : 'Failed'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLogDetails(log);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <Eye size={13} /> View Full
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* History Pagination Bar */}
          {historyPagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-md)',
              borderTop: '1px solid var(--border)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
            }}>
              <div>
                Showing page <strong>{historyPagination.page}</strong> of <strong>{historyPagination.pages}</strong> ({historyPagination.total} total logs)
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHistoryPage((p) => Math.min(historyPagination.pages, p + 1))}
                  disabled={historyPage >= historyPagination.pages}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
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
                  {Array.isArray(confirmData.data) && confirmData.data.map((p, idx) => (
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
                      The text shown in the preview will be dispatched directly to the {selectedCustomers.length} recipient handsets.
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
                    <div className="spinner" /> Dispatching SMS...
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

      {/* Full SMS Message & Token Details Modal */}
      {selectedLogDetails && (
        <div className="modal-overlay" onClick={() => setSelectedLogDetails(null)}>
          <div
            className="modal"
            style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <MessageSquare size={20} style={{ color: 'var(--accent-secondary)' }} /> Delivered SMS Content & Details
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Dispatched on {new Date(selectedLogDetails.createdAt).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })} • Sender ID: <strong>{selectedLogDetails.senderId || configData?.senderId || '8809617639998'}</strong>
                </p>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setSelectedLogDetails(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 'var(--space-sm)' }}>
              {/* Summary Metric Badges */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
              }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total SMS Cost</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Coins size={16} /> {selectedLogDetails.totalCredits || 1} Credit{selectedLogDetails.totalCredits !== 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Recipients</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedLogDetails.recipients?.length || selectedLogDetails.resolvedTexts?.length || 1}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Delivered</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)' }}>
                    {selectedLogDetails.totalSent}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Failed</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: selectedLogDetails.totalFailed > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {selectedLogDetails.totalFailed}
                  </div>
                </div>
              </div>

              {/* Exact Rendered Recipient Messages */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Exact Handset Messages Delivered ({selectedLogDetails.resolvedTexts?.length || 1}):</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>What the customer received</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {(selectedLogDetails.resolvedTexts || [{ text: selectedLogDetails.template }]).map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {r.name || selectedLogDetails.recipients?.[idx]?.name || 'Recipient'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
                            ({r.phone || selectedLogDetails.recipients?.[idx]?.phone || '—'})
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={`badge ${r.status === 'failed' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.6875rem' }}>
                            {r.status === 'failed' ? 'Failed' : 'Delivered'}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Coins size={10} style={{ color: 'var(--warning)' }} />
                            {r.credits || 1} Credit{r.credits !== 1 ? 's' : ''}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {r.charCount || r.text?.length || 0} chars
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {r.isUnicode ? 'Unicode (Bangla)' : 'ASCII (English)'}
                          </span>
                        </div>
                      </div>

                      {/* Exact Delivered Text Box */}
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--bg-input)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-primary)',
                        userSelect: 'text',
                      }}>
                        {r.text}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCopyMessage(r.text, `${selectedLogDetails._id}-${idx}`)}
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          {copiedId === `${selectedLogDetails._id}-${idx}` ? (
                            <>
                              <Check size={13} style={{ color: 'var(--success)' }} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={13} /> Copy Message
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Template Used */}
              {selectedLogDetails.template && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Template Pattern: </span>
                  <code>{selectedLogDetails.template}</code>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedLogDetails(null)}
              >
                Close
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
                <Zap size={18} /> Send Test SMS
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowTestModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTestSubmit}>
              <div className="modal-body">
                <PhoneInput
                  label="Recipient Phone Number (Bangladesh)"
                  value={testPhone}
                  onChange={setTestPhone}
                  required
                />
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
                  Sender ID: <strong>{configData?.senderId || '8809617639998'}</strong> • Bangladesh Operators Supported
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
        .sms-compose-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-lg);
        }
        @media (max-width: 768px) {
          .sms-compose-grid {
            grid-template-columns: 1fr !important;
          }
          .page-header > div:last-child {
            width: 100%;
          }
          .page-header > div:last-child .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default SMSPage;
