import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerAPI, smsAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  DollarSign,
  FileSpreadsheet,
  MessageSquare,
  Trash2,
  Send,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import PhoneInput, { isBDPhoneValid } from '../components/PhoneInput';

// Standard Client Due Reminder SMS Template
const DEFAULT_REMINDER_TEMPLATE = `Just a gentle reminder from chapaimango.bd

Outstanding Due: BDT {due}

We would really appreciate it if you could clear the payment by {deadline}.

For bill & payment details, please visit: {billUrl}

For live support, WhatsApp us at  {whatsappNumber}

-Chapai Mango Team`;

// Calculate character count and SMS tokens (GSM 03.40 / Unicode)
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

// Generate 6-char readable short code for draft customer bill links
const generateDraftShortCode = () => {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Build public bill URL
const getPublicBillUrl = (shortCode) => {
  if (!shortCode) return '';
  const origin = window.location.origin;
  return `${origin}/b/${shortCode}`;
};

// Replace dynamic placeholders
const resolveReminderTemplate = ({ due, deadline, billUrl, whatsappNumber }) => {
  return DEFAULT_REMINDER_TEMPLATE
    .replace('{due}', due || '0')
    .replace('{deadline}', deadline || '15 September 2026')
    .replace('{billUrl}', billUrl || 'xxxxxxxxxx')
    .replace('{whatsappNumber}', whatsappNumber || '01717333880');
};

const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });
  const [filterDue, setFilterDue] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [selectedNoteCustomer, setSelectedNoteCustomer] = useState(null);
  const [copiedLinkCustomerId, setCopiedLinkCustomerId] = useState(null);

  // Standalone SMS Reminder Modal for existing customers
  const [standaloneSmsCustomer, setStandaloneSmsCustomer] = useState(null);
  const [standaloneSmsForm, setStandaloneSmsForm] = useState({
    due: '',
    deadline: '15 September 2026',
    billUrl: '',
    whatsappNumber: '01717333880',
    directEdit: false,
    customText: '',
  });
  const [isSendingStandaloneSms, setIsSendingStandaloneSms] = useState(false);
  const [standalonePreviewHistory, setStandalonePreviewHistory] = useState(null);

  // Primary Customer Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    totalBill: '',
    currentDue: '',
    notes: '',
    altPhone: '',
    area: '',
    billShortCode: '',
    billDetailsText: '',
    billImageUrl: '',
  });
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // SMS Reminder Section in Customer Modal
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsDueCustomized, setSmsDueCustomized] = useState(false);
  const [smsDue, setSmsDue] = useState('');
  const [smsDeadline, setSmsDeadline] = useState('15 September 2026');
  const [smsBillUrl, setSmsBillUrl] = useState('');
  const [smsWhatsapp, setSmsWhatsapp] = useState('01717333880');
  const [isDirectEdit, setIsDirectEdit] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingPreview, setIsSendingPreview] = useState(false);
  const [previewSentHistory, setPreviewSentHistory] = useState(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch Customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, filterDue],
    queryFn: () =>
      customerAPI
        .getAll({ page, limit: 20, search: search || undefined, hasDue: filterDue || undefined })
        .then((r) => r.data),
  });

  // Calculate resolved text for Add/Edit modal
  const finalAddModalSmsText = useMemo(() => {
    if (isDirectEdit) return customMessage;
    const dueDisplay = smsDueCustomized
      ? smsDue
      : form.currentDue
      ? Number(form.currentDue).toLocaleString('en-BD')
      : '0';
    const resolvedUrl = smsBillUrl || getPublicBillUrl(form.billShortCode);
    return resolveReminderTemplate({
      due: dueDisplay,
      deadline: smsDeadline,
      billUrl: resolvedUrl,
      whatsappNumber: smsWhatsapp,
    });
  }, [isDirectEdit, customMessage, smsDueCustomized, smsDue, form.currentDue, form.billShortCode, smsDeadline, smsBillUrl, smsWhatsapp]);

  const addModalSmsMetrics = useMemo(() => calculateSmsMetrics(finalAddModalSmsText), [finalAddModalSmsText]);

  // Calculate resolved text for standalone SMS modal
  const finalStandaloneSmsText = useMemo(() => {
    if (standaloneSmsForm.directEdit) return standaloneSmsForm.customText;
    return resolveReminderTemplate({
      due: standaloneSmsForm.due,
      deadline: standaloneSmsForm.deadline,
      billUrl: standaloneSmsForm.billUrl,
      whatsappNumber: standaloneSmsForm.whatsappNumber,
    });
  }, [standaloneSmsForm]);

  const standaloneSmsMetrics = useMemo(() => calculateSmsMetrics(finalStandaloneSmsText), [finalStandaloneSmsText]);

  // Create Customer Mutation
  const createMutation = useMutation({
    mutationFn: (data) => customerAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });

      const smsRes = res.data?.smsResult;
      if (smsRes?.success) {
        toast.success(`Customer created & reminder SMS sent to ${res.data?.data?.phone}!`);
      } else if (smsRes?.error) {
        toast.success('Customer created successfully!');
        toast.error(`SMS reminder could not be sent: ${smsRes.error}`);
      } else {
        toast.success('Customer created successfully!');
      }
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create customer'),
  });

  // Update Customer Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Customer updated successfully!');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update customer'),
  });

  // Payment Mutation
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

  // Delete Mutation
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

  // Open Add Modal
  const openAddModal = () => {
    const draftCode = generateDraftShortCode();
    const generatedUrl = getPublicBillUrl(draftCode);

    setEditingCustomer(null);
    setForm({
      name: '',
      phone: '',
      address: '',
      totalBill: '',
      currentDue: '',
      notes: '',
      altPhone: '',
      area: '',
      billShortCode: draftCode,
      billDetailsText: '',
      billImageUrl: '',
    });
    setSmsEnabled(true);
    setSmsDueCustomized(false);
    setSmsDue('');
    setSmsDeadline('15 September 2026');
    setSmsBillUrl(generatedUrl);
    setSmsWhatsapp('01717333880');
    setIsDirectEdit(false);
    setCustomMessage('');
    setPreviewSentHistory(null);
    setShowExtraFields(false);
    setShowModal(true);
  };

  // Open Edit Modal
  const openEdit = (customer) => {
    const shortCode = customer.billShortCode || generateDraftShortCode();
    const billUrl = getPublicBillUrl(shortCode);

    setEditingCustomer(customer);
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      altPhone: customer.altPhone || '',
      address: customer.address || '',
      area: customer.area || '',
      totalBill: customer.totalPurchases !== undefined ? customer.totalPurchases : '',
      currentDue: customer.totalDue !== undefined ? customer.totalDue : '',
      notes: customer.notes || '',
      billShortCode: shortCode,
      billDetailsText: customer.billDetailsText || '',
      billImageUrl: customer.billImageUrl || '',
    });
    setSmsEnabled(false);
    setSmsDueCustomized(false);
    setSmsDue(customer.totalDue ? Number(customer.totalDue).toLocaleString('en-BD') : '0');
    setSmsDeadline('15 September 2026');
    setSmsBillUrl(billUrl);
    setSmsWhatsapp('01717333880');
    setIsDirectEdit(false);
    setCustomMessage('');
    setPreviewSentHistory(null);
    setShowExtraFields(Boolean(customer.altPhone || customer.area));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm({
      name: '',
      phone: '',
      address: '',
      totalBill: '',
      currentDue: '',
      notes: '',
      altPhone: '',
      area: '',
      billShortCode: '',
      billDetailsText: '',
      billImageUrl: '',
    });
    setPreviewSentHistory(null);
  };

  // Handle Due input changes to keep SMS due in sync unless user customized it
  const handleCurrentDueChange = (val) => {
    setForm({ ...form, currentDue: val });
    if (!smsDueCustomized) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        setSmsDue(num.toLocaleString('en-BD'));
        setSmsEnabled(true);
      } else {
        setSmsDue('0');
      }
    }
  };

  // Handle Bill Memo Screenshot Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadingImage(true);
    try {
      const res = await customerAPI.uploadBillImage(formData);
      const uploadedUrl = res.data?.data?.url || res.data?.url;
      setForm((prev) => ({ ...prev, billImageUrl: uploadedUrl }));
      toast.success('Screenshot / memo image uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Send Preview / Test SMS in Add Customer modal
  const handleSendPreviewSms = async () => {
    if (!form.phone || !isBDPhoneValid(form.phone)) {
      toast.error('Please enter a valid 11-digit phone number first (e.g. 017XXXXXXXX)');
      return;
    }
    setIsSendingPreview(true);
    try {
      const res = await smsAPI.test({ phone: form.phone, message: finalAddModalSmsText });
      toast.success(`Preview SMS dispatched to ${form.phone}!`);
      setPreviewSentHistory({
        phone: form.phone,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        credits: res.data?.data?.credits || addModalSmsMetrics.credits,
        status: 'Delivered',
      });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch preview SMS');
    } finally {
      setIsSendingPreview(false);
    }
  };

  // Handle Primary Form Submit
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
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      totalBill: parseFloat(form.totalBill) || 0,
      currentDue: parseFloat(form.currentDue) || 0,
      notes: form.notes ? form.notes.trim() : '',
      altPhone: form.altPhone ? form.altPhone.trim() : undefined,
      area: form.area ? form.area.trim() : undefined,
      billShortCode: form.billShortCode,
      billDetailsText: form.billDetailsText ? form.billDetailsText.trim() : '',
      billImageUrl: form.billImageUrl || '',
      sendSms: !editingCustomer && smsEnabled,
      smsMessage: !editingCustomer && smsEnabled ? finalAddModalSmsText : undefined,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Handle Record Payment Submit
  const handlePayment = (e) => {
    e.preventDefault();
    paymentMutation.mutate({
      id: showPaymentModal._id,
      data: { ...paymentForm, amount: parseFloat(paymentForm.amount) },
    });
  };

  // Copy customer public bill link
  const copyCustomerBillLink = (customer) => {
    const code = customer.billShortCode || customer._id;
    const url = getPublicBillUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedLinkCustomerId(customer._id);
    toast.success(`Bill link copied: ${url}`);
    setTimeout(() => {
      setCopiedLinkCustomerId((curr) => (curr === customer._id ? null : curr));
    }, 2500);
  };

  // Open Standalone SMS Reminder Modal for an existing customer
  const openStandaloneSmsModal = (customer) => {
    const code = customer.billShortCode || customer._id;
    const billUrl = getPublicBillUrl(code);

    setStandaloneSmsCustomer(customer);
    setStandaloneSmsForm({
      due: customer.totalDue ? Number(customer.totalDue).toLocaleString('en-BD') : '0',
      deadline: '15 September 2026',
      billUrl,
      whatsappNumber: '01717333880',
      directEdit: false,
      customText: '',
    });
    setStandalonePreviewHistory(null);
  };

  // Dispatch standalone reminder SMS
  const handleSendStandaloneSms = async (isTestOnly = false) => {
    if (!standaloneSmsCustomer?.phone) return;
    setIsSendingStandaloneSms(true);
    try {
      const message = finalStandaloneSmsText;
      await smsAPI.test({
        phone: standaloneSmsCustomer.phone,
        message,
      });

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sms-history'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });

      if (isTestOnly) {
        toast.success(`Preview SMS sent to ${standaloneSmsCustomer.phone}!`);
        setStandalonePreviewHistory({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Delivered',
        });
      } else {
        toast.success(`SMS reminder dispatched to ${standaloneSmsCustomer.name}!`);
        setStandaloneSmsCustomer(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch SMS reminder');
    } finally {
      setIsSendingStandaloneSms(false);
    }
  };

  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-description">
            {pagination.total || 0} customer records • Track bills, dues, unique bill links & SMS reminders
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/import')}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
          <Search size={18} className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 150 }}
          value={filterDue}
          onChange={(e) => {
            setFilterDue(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Customers</option>
          <option value="true">Has Standing Due</option>
          <option value="false">Zero Due</option>
        </select>
      </div>

      {/* Loading Overlay */}
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
            {search ? 'Try a different search query' : 'Add your first customer with bill and due to get started'}
          </p>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={openAddModal}>
              <Plus size={18} /> Add Customer
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container desktop-customers-table">
            <table className="table customers-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Customer</th>
                  <th style={{ minWidth: 150 }}>Phone & SMS</th>
                  <th style={{ textAlign: 'right', minWidth: 110 }}>Total Bill</th>
                  <th style={{ textAlign: 'right', minWidth: 110 }}>Current Due</th>
                  <th style={{ minWidth: 140 }}>Memo / Note</th>
                  <th className="customers-actions-header" style={{ textAlign: 'right', minWidth: 290 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                          {c.address}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{c.phone}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {c.totalSmsSent > 0 ? (
                          <span
                            className="badge badge-neutral"
                            title={`${c.totalSmsSent} reminder SMS delivered${c.lastSmsSentAt ? ` (Last: ${new Date(c.lastSmsSentAt).toLocaleDateString('en-BD')})` : ''}`}
                            style={{
                              fontSize: '0.625rem',
                              padding: '1px 6px',
                              gap: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: 'var(--accent-secondary)',
                              borderRadius: '4px',
                            }}
                          >
                            <MessageSquare size={10} /> {c.totalSmsSent} SMS
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>No SMS yet</span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ৳{(c.totalPurchases || 0).toLocaleString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: c.totalDue > 0 ? 'var(--danger)' : 'var(--success)',
                        }}
                      >
                        ৳{(c.totalDue || 0).toLocaleString()}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.billImageUrl && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: '#f39c12',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                            }}
                          >
                            <ImageIcon size={11} /> Screenshot
                          </span>
                        )}

                        {c.billDetailsText ? (
                          <button
                            type="button"
                            onClick={() => setSelectedNoteCustomer({ name: c.name, phone: c.phone, notes: c.billDetailsText, isBillDetails: true })}
                            style={{
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              padding: 0,
                              maxWidth: 160,
                              display: 'block',
                            }}
                            title="View Calculation Text"
                          >
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              📋 {c.billDetailsText}
                            </div>
                          </button>
                        ) : c.notes ? (
                          <button
                            type="button"
                            onClick={() => setSelectedNoteCustomer(c)}
                            style={{
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              padding: 0,
                              maxWidth: 160,
                              display: 'block',
                            }}
                            title="View Note"
                          >
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              📝 {c.notes}
                            </div>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </div>
                    </td>

                    <td className="customers-actions-cell">
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Copy Customer Bill Link Button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Copy Customer Public Bill Link"
                          onClick={() => copyCustomerBillLink(c)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            height: 28,
                            color: copiedLinkCustomerId === c._id ? 'var(--success)' : 'var(--text-secondary)',
                            background: copiedLinkCustomerId === c._id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {copiedLinkCustomerId === c._id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedLinkCustomerId === c._id ? 'Copied' : 'Link'}
                        </button>

                        {/* Open Public Bill in new tab */}
                        <a
                          href={getPublicBillUrl(c.billShortCode || c._id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          title="View Customer Bill Page"
                          style={{
                            padding: '4px 6px',
                            height: 28,
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          <ExternalLink size={13} />
                        </a>

                        {/* Send SMS Reminder Button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Send Due Reminder SMS"
                          onClick={() => openStandaloneSmsModal(c)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            height: 28,
                            color: 'var(--accent-secondary)',
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={13} /> SMS
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Edit Customer"
                          onClick={() => openEdit(c)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: 28 }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        {/* Pay Due Button */}
                        {c.totalDue > 0 && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            title="Record Payment"
                            onClick={() => setShowPaymentModal(c)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 28 }}
                          >
                            <DollarSign size={13} /> Pay
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          title="Delete Customer"
                          onClick={() => setCustomerToDelete(c)}
                          style={{
                            color: 'var(--danger)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            height: 28,
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
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
                          <MessageSquare size={9} style={{ color: 'var(--accent-secondary)' }} /> {c.totalSmsSent} SMS
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyCustomerBillLink(c)}
                      title="Copy Bill Link"
                      style={{ fontSize: '0.6875rem', padding: '3px 8px', height: 26 }}
                    >
                      {copiedLinkCustomerId === c._id ? <Check size={12} /> : <Copy size={12} />} Link
                    </button>
                    <a
                      href={getPublicBillUrl(c.billShortCode || c._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 6px', height: 26 }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {c.address && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} style={{ flexShrink: 0, opacity: 0.8 }} /> {c.address}
                  </div>
                )}

                {/* 2-Column Financial Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Bill</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      ৳{(c.totalPurchases || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Current Due</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: c.totalDue > 0 ? 'var(--danger)' : 'var(--success)',
                      }}
                    >
                      ৳{(c.totalDue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Memo / Notes in card */}
                {(c.billImageUrl || c.billDetailsText || c.notes) && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '2px solid var(--accent-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {c.billImageUrl && (
                      <span style={{ color: '#f39c12', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <ImageIcon size={12} /> Memo screenshot attached
                      </span>
                    )}
                    {c.billDetailsText && (
                      <div>
                        <strong>Calculation:</strong> {c.billDetailsText}
                      </div>
                    )}
                    {c.notes && (
                      <div>
                        <strong>Note:</strong> {c.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="customer-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openStandaloneSmsModal(c)}
                    style={{ color: 'var(--accent-secondary)' }}
                  >
                    <MessageSquare size={14} /> SMS
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/customers/${c._id}`)}
                  >
                    <Eye size={14} /> Ledger
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-lg)',
              }}
            >
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

      {/* ========================================================
          CREATE / EDIT CUSTOMER MODAL WITH MEMO & SMS DUE REMINDER
         ======================================================== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 660, maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Enter customer details, calculation breakdown, screenshot slip & send automated SMS
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Name & Phone */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Customer Name *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Hasan Mahmud"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <PhoneInput
                      label="Phone Number"
                      value={form.phone}
                      onChange={(val) => setForm({ ...form, phone: val })}
                      required
                    />
                  </div>
                </div>

                {/* Full Address */}
                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input
                    className="form-input"
                    placeholder="Delivery address, house/street, district..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                {/* Total Bill & Current Due */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Bill (৳)</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total order value</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      step="any"
                      value={form.totalBill}
                      onChange={(e) => setForm({ ...form, totalBill: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Current Due (৳)</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Standing due</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      step="any"
                      value={form.currentDue}
                      onChange={(e) => handleCurrentDueChange(e.target.value)}
                      style={{ borderColor: form.currentDue > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined }}
                    />
                  </div>
                </div>

                {/* ========================================================
                    UNORGANIZED DATA CALCULATION TEXT & SCREENSHOT UPLOAD
                   ======================================================== */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      Bill Breakdown & Screenshot Memo (Customer Visible)
                    </span>
                  </div>

                  {/* Formatted Calculation Textarea */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Calculation / Order Breakdown (Text)</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        Paste formatted memo or calculations
                      </span>
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g.&#10;5 kg Himsagar @ 140 = 700&#10;10 kg Amrapali @ 120 = 1200&#10;Courier Charge = 200&#10;Total = 2100 | Paid = 500 | Due = 1600"
                      rows={3}
                      style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                      value={form.billDetailsText}
                      onChange={(e) => setForm({ ...form, billDetailsText: e.target.value })}
                    />
                  </div>

                  {/* Screenshot / Memo Image Upload */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Screenshot / Bill Slip Image
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />

                    {form.billImageUrl ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ImageIcon size={20} style={{ color: '#f39c12' }} />
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Screenshot attached
                            </div>
                            <a
                              href={form.billImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.6875rem', color: 'var(--accent-secondary)' }}
                            >
                              View uploaded image
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => setForm({ ...form, billImageUrl: '' })}
                          style={{ color: 'var(--danger)', height: 26, fontSize: '0.6875rem' }}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontSize: '0.8125rem',
                          height: 36,
                          borderStyle: 'dashed',
                        }}
                      >
                        {isUploadingImage ? <div className="spinner" /> : <Upload size={15} />}
                        {isUploadingImage ? 'Uploading Image...' : 'Upload Memo Screenshot (JPG, PNG, WEBP)'}
                      </button>
                    )}
                  </div>

                  {/* Generated Customer Bill URL Info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LinkIcon size={14} style={{ color: 'var(--accent-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>Customer Link:</span>
                      <strong style={{ color: 'var(--accent-secondary)', fontFamily: 'monospace' }}>
                        {getPublicBillUrl(form.billShortCode)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(getPublicBillUrl(form.billShortCode));
                        toast.success('Link copied to clipboard!');
                      }}
                      style={{ height: 24, padding: '2px 8px', fontSize: '0.6875rem' }}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Notes about customer, preferences, or special instructions..."
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* ========================================================
                    DYNAMIC SMS DUE REMINDER SECTION (Only on Create Customer)
                   ======================================================== */}
                {!editingCustomer && (
                  <div
                    style={{
                      marginTop: 'var(--space-sm)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-sm)',
                    }}
                  >
                    {/* Toggle Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: smsEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: smsEnabled ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
                          }}
                        >
                          <MessageSquare size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            Send Due Reminder SMS
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            Includes unique customer bill link automatically
                          </div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={smsEnabled}
                          onChange={(e) => setSmsEnabled(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: smsEnabled ? 'var(--accent-secondary)' : 'var(--text-tertiary)' }}>
                          {smsEnabled ? 'Enabled' : 'Skip SMS'}
                        </span>
                      </label>
                    </div>

                    {smsEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                        {/* Dynamic Parameters Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
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
                              style={{ height: 32, fontSize: '0.75rem', padding: '4px 8px' }}
                              value={smsDueCustomized ? smsDue : (form.currentDue ? Number(form.currentDue).toLocaleString('en-BD') : '0')}
                              onChange={(e) => {
                                setSmsDueCustomized(true);
                                setSmsDue(e.target.value);
                              }}
                              placeholder="e.g. 8,760"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                              Payment Deadline
                            </label>
                            <input
                              className="form-input"
                              style={{ height: 32, fontSize: '0.75rem', padding: '4px 8px' }}
                              value={smsDeadline}
                              onChange={(e) => setSmsDeadline(e.target.value)}
                              placeholder="e.g. 15 September 2026"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                              Bill Link (Auto-populated)
                            </label>
                            <input
                              className="form-input"
                              style={{ height: 32, fontSize: '0.75rem', padding: '4px 8px' }}
                              value={smsBillUrl || getPublicBillUrl(form.billShortCode)}
                              onChange={(e) => setSmsBillUrl(e.target.value)}
                              placeholder="Bill Link"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                              WhatsApp Live Support
                            </label>
                            <input
                              className="form-input"
                              style={{ height: 32, fontSize: '0.75rem', padding: '4px 8px' }}
                              value={smsWhatsapp}
                              onChange={(e) => setSmsWhatsapp(e.target.value)}
                              placeholder="01717333880"
                            />
                          </div>
                        </div>

                        {/* Direct edit toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            SMS Preview:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isDirectEdit) {
                                setCustomMessage(finalAddModalSmsText);
                              }
                              setIsDirectEdit(!isDirectEdit);
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
                            {isDirectEdit ? 'Reset to Dynamic Resolver' : 'Directly edit message text'}
                          </button>
                        </div>

                        {/* Live Message Preview / Direct Editor */}
                        {isDirectEdit ? (
                          <textarea
                            className="form-textarea"
                            rows={7}
                            style={{ fontSize: '0.8125rem', fontFamily: 'monospace', lineHeight: 1.4 }}
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                          />
                        ) : (
                          <div
                            style={{
                              background: '#0d1117',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px 14px',
                              fontFamily: 'monospace',
                              fontSize: '0.8125rem',
                              lineHeight: 1.45,
                              color: '#c9d1d9',
                              whiteSpace: 'pre-wrap',
                              position: 'relative',
                            }}
                          >
                            {finalAddModalSmsText}
                          </div>
                        )}

                        {/* Preview Metrics & Test Dispatch Bar */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                            paddingTop: 4,
                          }}
                        >
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {addModalSmsMetrics.charCount}
                            </span>{' '}
                            chars •{' '}
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {addModalSmsMetrics.credits} SMS
                            </span>{' '}
                            ({addModalSmsMetrics.isUnicode ? 'Unicode' : 'GSM'})
                            {form.phone && <span style={{ marginLeft: 6, color: 'var(--text-tertiary)' }}>→ to {form.phone}</span>}
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={isSendingPreview || !form.phone}
                            onClick={handleSendPreviewSms}
                            style={{
                              height: 28,
                              fontSize: '0.6875rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            {isSendingPreview ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Send size={12} />}
                            Send Test / Preview SMS
                          </button>
                        </div>

                        {/* Preview Sent Status Banner */}
                        {previewSentHistory && (
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
                            <span>
                              Test preview SMS dispatched to <strong>{previewSentHistory.phone}</strong> at {previewSentHistory.time} ({previewSentHistory.status}).
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingCustomer ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={() => {
                      const target = editingCustomer;
                      closeModal();
                      setCustomerToDelete(target);
                    }}
                    style={{
                      color: 'var(--danger)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      padding: '6px 12px',
                    }}
                  >
                    <Trash2 size={15} /> Delete Customer
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <div className="spinner" />}
                    {editingCustomer
                      ? 'Update Customer'
                      : smsEnabled
                      ? 'Save Customer & Send SMS'
                      : 'Save Customer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STANDALONE SMS REMINDER MODAL FOR EXISTING CUSTOMERS
         ======================================================== */}
      {standaloneSmsCustomer && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Send Due Reminder SMS</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Recipient: <strong>{standaloneSmsCustomer.name}</strong> ({standaloneSmsCustomer.phone})
                </p>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setStandaloneSmsCustomer(null)}
                title="Close"
              >
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
                    value={standaloneSmsForm.due}
                    onChange={(e) => setStandaloneSmsForm({ ...standaloneSmsForm, due: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    Payment Deadline
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={standaloneSmsForm.deadline}
                    onChange={(e) => setStandaloneSmsForm({ ...standaloneSmsForm, deadline: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    Bill / Payment Link
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={standaloneSmsForm.billUrl}
                    onChange={(e) => setStandaloneSmsForm({ ...standaloneSmsForm, billUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    WhatsApp Live Support
                  </label>
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: '0.75rem' }}
                    value={standaloneSmsForm.whatsappNumber}
                    onChange={(e) => setStandaloneSmsForm({ ...standaloneSmsForm, whatsappNumber: e.target.value })}
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
                    if (!standaloneSmsForm.directEdit) {
                      setStandaloneSmsForm({ ...standaloneSmsForm, directEdit: true, customText: finalStandaloneSmsText });
                    } else {
                      setStandaloneSmsForm({ ...standaloneSmsForm, directEdit: false });
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
                  {standaloneSmsForm.directEdit ? 'Reset to Dynamic Resolver' : 'Direct edit text'}
                </button>
              </div>

              {/* Preview Box */}
              {standaloneSmsForm.directEdit ? (
                <textarea
                  className="form-textarea"
                  rows={7}
                  style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}
                  value={standaloneSmsForm.customText}
                  onChange={(e) => setStandaloneSmsForm({ ...standaloneSmsForm, customText: e.target.value })}
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
                  {finalStandaloneSmsText}
                </div>
              )}

              {/* Character and token info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                <span>
                  <strong>{standaloneSmsMetrics.charCount}</strong> chars • <strong>{standaloneSmsMetrics.credits} SMS</strong> ({standaloneSmsMetrics.isUnicode ? 'Unicode' : 'GSM'})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={isSendingStandaloneSms}
                  onClick={() => handleSendStandaloneSms(true)}
                  style={{ fontSize: '0.6875rem', height: 26, padding: '2px 8px' }}
                >
                  Test Send Preview
                </button>
              </div>

              {standalonePreviewHistory && (
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
                  <span>Preview SMS dispatched successfully at {standalonePreviewHistory.time}.</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStandaloneSmsCustomer(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSendingStandaloneSms}
                onClick={() => handleSendStandaloneSms(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isSendingStandaloneSms ? <div className="spinner" /> : <Send size={15} />}
                Send Reminder SMS Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          NOTE / CALCULATION DETAILS VIEWER MODAL
         ======================================================== */}
      {selectedNoteCustomer && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={18} style={{ color: 'var(--accent-secondary)' }} />
                <h3 className="modal-title">
                  {selectedNoteCustomer.isBillDetails ? 'Bill Calculation Details' : 'Customer Note'}
                </h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedNoteCustomer(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                {selectedNoteCustomer.name} ({selectedNoteCustomer.phone})
              </div>
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontFamily: selectedNoteCustomer.isBillDetails ? 'monospace' : 'inherit',
                }}
              >
                {selectedNoteCustomer.notes}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedNoteCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RECORD PAYMENT MODAL
         ======================================================== */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Record Payment</h2>
                <p className="card-subtitle">
                  {showPaymentModal.name} — Standing Due: ৳{(showPaymentModal.totalDue || 0).toLocaleString()}
                </p>
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
                    autoFocus
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
                    placeholder="Optional transaction reference or note"
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

      {/* ========================================================
          DELETE CONFIRMATION MODAL
         ======================================================== */}
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
          min-width: 290px;
        }

        .customers-actions-cell {
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
          min-width: 290px;
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
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        .customer-card-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 8px;
          font-size: 0.75rem;
          min-height: 34px;
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
