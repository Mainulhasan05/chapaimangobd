import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  ExternalLink,
  RotateCcw,
  Check,
  Phone,
  Package,
  Truck,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Normalizes phone numbers to international Bangladesh WhatsApp format (e.g. 88017XXXXXXXX)
 */
export const getCleanWhatsAppPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  if (digits.startsWith('88') && digits.length === 13) return digits;
  return digits;
};

/**
 * Generates formatted WhatsApp Markdown ready messages for an order
 */
export const generateWhatsAppMessage = (order, templateType = 'invoice') => {
  if (!order) return '';

  const custName = order.customer?.name || 'সম্মানিত গ্রাহক';
  const orderRef = order._id ? `#${order._id.toString().slice(-6).toUpperCase()}` : '';
  const dateStr = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const itemsList = (order.items || [])
    .map(
      (it) =>
        `• *${it.productName}* × ${it.quantity} = ৳${(
          it.subtotal || it.quantity * it.rate
        )?.toLocaleString()}`
    )
    .join('\n');

  const itemsSubtotal = (order.items || []).reduce(
    (sum, it) => sum + (it.subtotal || it.quantity * it.rate || 0),
    0
  );

  const discountText =
    order.discount > 0 ? `🎁 *বিশেষ ছাড়:* -৳${order.discount.toLocaleString()}\n` : '';
  const courierChargeText =
    order.courierCharge > 0
      ? `🚚 *কুরিয়ার চার্জ:* ৳${order.courierCharge.toLocaleString()}\n`
      : '';

  const dueStatusText =
    order.orderDue > 0
      ? `⚠️ *বকেয়া / COD:* ৳${order.orderDue.toLocaleString()}`
      : `✨ *বকেয়া:* ৳০ (সম্পূর্ণ পরিশোধিত)`;

  const address = order.deliveryAddress || order.customer?.address || 'অপেক্ষমাণ';
  const courierInfo = order.courierName
    ? `🚚 *কুরিয়ার:* ${order.courierName}${
        order.courierTrackingId ? ` (ট্র্যাকিং: ${order.courierTrackingId})` : ''
      }`
    : '';

  const notesText = order.notes ? `📝 *প্যাকিং নোট:* ${order.notes}` : '';

  switch (templateType) {
    case 'invoice':
      return `🥭 *ChapaiMango.bd — অর্ডার নিশ্চিতকরণ ও চালান*

প্রিয় *${custName}*, আসসালামু আলাইকুম!
ChapaiMango.bd-এ আপনার চাঁপাইনবাবগঞ্জের তাজা আমের অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।

━━━━━━━━━━━━━━━━━━━━
📦 *অর্ডার আইডি:* ${orderRef}
📅 *তারিখ:* ${dateStr}
━━━━━━━━━━━━━━━━━━━━
🛒 *পণ্যের বিবরণ:*
${itemsList || '• আম'}
━━━━━━━━━━━━━━━━━━━━
💵 *পণ্যের মূল্য:* ৳${itemsSubtotal.toLocaleString()}
${discountText}${courierChargeText}💰 *সর্বমোট বিল:* ৳${(order.totalBill || 0).toLocaleString()}
✅ *পরিশোধিত:* ৳${(order.paidAmount || 0).toLocaleString()}
${dueStatusText}

📍 *ডেলিভারি ঠিকানা:* ${address}
${courierInfo ? `${courierInfo}\n` : ''}${notesText ? `${notesText}\n` : ''}━━━━━━━━━━━━━━━━━━━━
আম বাগান থেকে সংগ্রহ করে যত্নসহকারে ক্যারেটে প্যাকিং করে পাঠানো হবে।
ধন্যবাদ,
*ChapaiMango.bd* 🥭
🌐 chapaimango.bd | 📞 হেল্পলাইন`;

    case 'tracking':
      return `🚚 *ChapaiMango.bd — চালান বুকিং ও কুরিয়ার ট্র্যাকিং*

প্রিয় *${custName}*, আসসালামু আলাইকুম!
আপনার অর্ডারকৃত তাজা ও বিষমুক্ত আমের চালানটি কুরিয়ারে বুকিং সম্পন্ন হয়েছে। 🥭

━━━━━━━━━━━━━━━━━━━━
📦 *অর্ডার আইডি:* ${orderRef}
🚚 *কুরিয়ার:* ${order.courierName || 'কুরিয়ার সার্ভিস'}
🔖 *ট্র্যাকিং / মেমো নং:* ${order.courierTrackingId || 'বুকিং প্রক্রিয়াধীন'}
📍 *গন্তব্য:* ${address}
━━━━━━━━━━━━━━━━━━━━
🛒 *পণ্য:*
${itemsList || '• আম'}
━━━━━━━━━━━━━━━━━━━━
${
  order.orderDue > 0
    ? `💵 *কন্ডিশন / COD মূল্য:* ৳${order.orderDue.toLocaleString()} (ডেলিভারির সময় প্রদেয়)`
    : `✅ *পরিশোধ:* সম্পূর্ণ মূল্য পরিশোধিত (কোনো ফি নেই)`
}
━━━━━━━━━━━━━━━━━━━━
📦 পার্সেল গ্রহণের সময় কুরিয়ার মেমো নম্বর ও ক্যারেট অক্ষত আছে কিনা দেখে রিসিভ করবেন।
ধন্যবাদ,
*ChapaiMango.bd* 🥭`;

    case 'dueReminder':
      return `💰 *ChapaiMango.bd — বকেয়া পরিশোধের অনুরোধ*

প্রিয় *${custName}*, আসসালামু আলাইকুম।
আশা করি ভালো আছেন। আপনার অর্ডার নং *${orderRef}*-এর পেমেন্ট সংক্রান্ত তথ্য:

━━━━━━━━━━━━━━━━━━━━
📦 *অর্ডার আইডি:* ${orderRef}
💰 *সর্বমোট বিল:* ৳${(order.totalBill || 0).toLocaleString()}
✅ *পরিশোধিত:* ৳${(order.paidAmount || 0).toLocaleString()}
⚠️ *বর্তমান বকেয়া:* ৳${(order.orderDue || 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
বকেয়া পরিশোধের মাধ্যম:
📱 *bKash / Nagad:* আমাদের অফিশিয়াল নম্বরে পেমেন্ট করতে পারেন
(রেফারেন্সে আপনার অর্ডার আইডি ${orderRef} দিন)

পেমেন্ট সম্পন্ন হলে অনুগ্রহ করে ট্রানজেকশন আইডি বা স্ক্রিনশট শেয়ার করুন।
ধন্যবাদ,
*ChapaiMango.bd* 🥭`;

    case 'thankYou':
      return `✨ *ChapaiMango.bd — ধন্যবাদ ও শুভেচ্ছা*

প্রিয় *${custName}*, আসসালামু আলাইকুম!
আমাদের চাঁপাইনবাবগঞ্জের বাগান থেকে সরাসরি সংগৃহীত আম আপনার কাছে সফলভাবে পৌঁছেছে। 🥭

আশা করি আমের মিষ্টি স্বাদ, ঘ্রাণ ও গুণমান আপনার পরিবারের মন জয় করেছে।

💡 *আমের যত্ন ও সংরক্ষণের টিপস:*
• ক্যারেট থেকে আম বের করে খোলা শুষ্ক স্থানে পেপারের ওপর বিছিয়ে রাখুন।
• পাকার পূর্বে আম কখনোই ফ্রিজে রাখবেন না।
• মিষ্টি সুবাস বের হলে ও সামান্য নরম হলে পানিতে ধুয়ে পরিবেশন করুন।

আমাদের সেবা ও আমের মান কেমন লেগেছে তা জানাতে একটি ছোট রিভিউ দিলে আমরা চিরকৃতজ্ঞ থাকব।
পরবর্তী সিজনেও আপনার সেবায় পাশে থাকার অপেক্ষায় রইলাম।
ধন্যবাদ,
*ChapaiMango.bd* 🥭`;

    default:
      return '';
  }
};

/**
 * WhatsApp Order Ready Message Modal
 */
const WhatsAppOrderModal = ({ order, isOpen, onClose }) => {
  const [activeTemplate, setActiveTemplate] = useState('invoice');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize and select smart default template based on order status
  useEffect(() => {
    if (!order) return;

    let defaultTpl = 'invoice';
    if (order.status === 'shipped') {
      defaultTpl = 'tracking';
    } else if (order.status === 'delivered') {
      defaultTpl = order.orderDue > 0 ? 'dueReminder' : 'thankYou';
    } else if (order.orderDue > 0 && order.paymentStatus === 'partial') {
      defaultTpl = 'invoice';
    }

    setActiveTemplate(defaultTpl);
    setSelectedPhone(order.customer?.phone || '');
    setMessageText(generateWhatsAppMessage(order, defaultTpl));
    setCopied(false);
  }, [order]);

  // Update message when template tab changes
  const handleTemplateChange = (tpl) => {
    setActiveTemplate(tpl);
    setMessageText(generateWhatsAppMessage(order, tpl));
  };

  if (!isOpen || !order) return null;

  const cleanPhone = getCleanWhatsAppPhone(selectedPhone);
  const isPhoneValid = cleanPhone.length === 13 && cleanPhone.startsWith('8801');
  const waUrl = isPhoneValid
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('WhatsApp message copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('Customer has no valid phone number');
      return;
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp chat with customer...');
  };

  const templates = [
    { id: 'invoice', label: 'মেমো ও চালান', icon: Package },
    { id: 'tracking', label: 'কুরিয়ার ট্র্যাকিং', icon: Truck },
    { id: 'dueReminder', label: 'বকেয়া তাগাদা', icon: DollarSign },
    { id: 'thankYou', label: 'ধন্যবাদ ও রিভিউ', icon: Sparkles },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ backdropFilter: 'blur(6px)', zIndex: 1200 }}
    >
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header with WhatsApp Brand Colors */}
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.35)',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 2c-5.508 0-9.986 4.477-9.986 9.984 0 1.761.459 3.479 1.332 5.001L2 22l5.163-1.353c1.472.802 3.129 1.226 4.868 1.226 5.508 0 9.986-4.477 9.986-9.984 0-5.507-4.478-9.989-9.986-9.989zm5.82 14.156c-.244.686-1.42 1.309-1.968 1.391-.51.077-1.173.109-3.791-.976-3.344-1.385-5.506-4.786-5.673-5.008-.167-.222-1.358-1.808-1.358-3.448 0-1.641.862-2.45 1.169-2.784.307-.333.67-.417.893-.417.223 0 .446.002.642.012.207.01.485-.078.759.579.284.68 1.002 2.45 1.091 2.632.089.182.148.396.029.633-.119.237-.178.385-.356.593-.178.208-.374.464-.535.624-.179.178-.366.372-.157.73.208.356.927 1.53 1.992 2.478 1.368 1.218 2.523 1.597 2.879 1.775.356.178.564.148.772-.089.208-.237.89-1.038 1.128-1.394.237-.356.475-.297.8-.178.326.119 2.072.977 2.428 1.155.356.178.593.267.68.416.089.148.089.862-.155 1.548z" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.0625rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                1-Click WhatsApp Message
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(37, 211, 102, 0.15)',
                    color: '#25D366',
                    fontWeight: 700,
                  }}
                >
                  Ready
                </span>
              </h2>
              <p className="card-subtitle" style={{ fontSize: '0.75rem', margin: 0 }}>
                Instant pre-formatted messages for Order #{order._id?.toString().slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Customer & Phone Selector Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Customer
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {order.customer?.name || 'Customer'}
              </div>
            </div>

            {/* Phone selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={14} style={{ color: '#25D366' }} />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedPhone}</span>
              </div>
              {order.customer?.altPhone && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setSelectedPhone(
                      selectedPhone === order.customer.phone
                        ? order.customer.altPhone
                        : order.customer.phone
                    )
                  }
                  style={{
                    fontSize: '0.6875rem',
                    padding: '2px 6px',
                    height: 22,
                    color: 'var(--accent-secondary)',
                  }}
                  title="Switch between Primary and Alt Phone"
                >
                  Switch Phone
                </button>
              )}
              {isPhoneValid ? (
                <span
                  className="badge badge-success"
                  style={{ fontSize: '0.625rem', padding: '1px 6px', backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
                >
                  ✓ BD Format
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>
                  Check Number
                </span>
              )}
            </div>
          </div>

          {/* Template Selector Pills */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Select Message Template:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isActive = activeTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateChange(tpl.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isActive ? '1.5px solid #25D366' : '1px solid var(--border)',
                      background: isActive
                        ? 'rgba(37, 211, 102, 0.1)'
                        : 'var(--bg-glass)',
                      color: isActive ? '#25D366' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tpl.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Preview & Textarea Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0, fontSize: '0.75rem' }}>
                WhatsApp Ready Message (Preview & Edit)
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMessageText(generateWhatsAppMessage(order, activeTemplate))}
                style={{ fontSize: '0.6875rem', padding: '1px 6px', height: 22, gap: 4, color: 'var(--text-tertiary)' }}
                title="Reset to default template text"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
            <textarea
              className="form-textarea"
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                fontFamily: 'inherit',
                minHeight: 180,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                resize: 'vertical',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
              }}
            >
              <span>{messageText.length} characters</span>
              <span>Formatting supported: *bold*, _italics_, emojis</span>
            </div>
          </div>
        </div>

        {/* Modal Footer with 1-Click Send & Copy Buttons */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 20px',
            background: 'var(--bg-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 36,
              padding: '0 14px',
              fontSize: '0.8125rem',
            }}
          >
            {copied ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ height: 36, fontSize: '0.8125rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleOpenWhatsApp}
              disabled={!cleanPhone}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '0 16px',
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.4)',
                cursor: cleanPhone ? 'pointer' : 'not-allowed',
                opacity: cleanPhone ? 1 : 0.6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 2c-5.508 0-9.986 4.477-9.986 9.984 0 1.761.459 3.479 1.332 5.001L2 22l5.163-1.353c1.472.802 3.129 1.226 4.868 1.226 5.508 0 9.986-4.477 9.986-9.984 0-5.507-4.478-9.989-9.986-9.989zm5.82 14.156c-.244.686-1.42 1.309-1.968 1.391-.51.077-1.173.109-3.791-.976-3.344-1.385-5.506-4.786-5.673-5.008-.167-.222-1.358-1.808-1.358-3.448 0-1.641.862-2.45 1.169-2.784.307-.333.67-.417.893-.417.223 0 .446.002.642.012.207.01.485-.078.759.579.284.68 1.002 2.45 1.091 2.632.089.182.148.396.029.633-.119.237-.178.385-.356.593-.178.208-.374.464-.535.624-.179.178-.366.372-.157.73.208.356.927 1.53 1.992 2.478 1.368 1.218 2.523 1.597 2.879 1.775.356.178.564.148.772-.089.208-.237.89-1.038 1.128-1.394.237-.356.475-.297.8-.178.326.119 2.072.977 2.428 1.155.356.178.593.267.68.416.089.148.089.862-.155 1.548z" />
              </svg>
              Open in WhatsApp
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOrderModal;
