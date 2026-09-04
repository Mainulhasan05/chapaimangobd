import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerAPI, getImageUrl } from '../api';
import {
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  ZoomIn,
  X,
  FileText,
  Image as ImageIcon,
  CreditCard,
  Building2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '').replace(/\/api$/, '')
  : 'https://chapaimango-api.parlorprobd.com';

const PublicBillPage = () => {
  const { shortCode } = useParams();
  const [copiedKey, setCopiedKey] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-bill', shortCode],
    queryFn: () => customerAPI.getPublicBill(shortCode).then((r) => r.data.data),
    retry: 1,
  });

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2500);
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
          color: '#e8eaed',
          padding: 20,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="spinner" style={{ width: 44, height: 44, marginBottom: 16 }} />
        <div style={{ fontSize: '0.9375rem', color: '#9aa0a6' }}>বিলের তথ্য লোড হচ্ছে...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
          color: '#e8eaed',
          padding: 24,
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            marginBottom: 16,
          }}
        >
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>
          বিলের তথ্য খুঁজে পাওয়া যায়নি
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#9aa0a6', maxWidth: 360, margin: '0 0 20px' }}>
          {error?.response?.data?.message || 'লিংকটি সঠিক নয় অথবা মেয়াদোত্তীর্ণ হতে পারে। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।'}
        </p>
        <a
          href="https://wa.me/8801717333880"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#25D366',
            color: '#fff',
            textDecoration: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <MessageCircle size={18} /> হোয়াটসঅ্যাপে যোগাযোগ করুন
        </a>
      </div>
    );
  }

  const customer = data;
  const isPaid = (customer.totalDue || 0) <= 0;

  // Resolve full image URL pointing directly to backend host
  const fullImageUrl = getImageUrl(customer.billImageUrl) || null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0d14',
        color: '#e8eaed',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: '16px 12px 60px',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 14px rgba(243, 156, 18, 0.35)',
              }}
            >
              🥭
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#fff' }}>
                Chapai Mango
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#9aa0a6' }}>
                chapaimango.bd • গ্রাহক বিল ও পেমেন্ট বিবরণী
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/8801717333880"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp Support"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(37, 211, 102, 0.12)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              color: '#25D366',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={15} /> সাপোর্ট
          </a>
        </div>

        {/* Customer Information & Due Status Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(26, 29, 40, 0.9) 0%, rgba(18, 20, 29, 0.95) 100%)',
            border: isPaid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 16,
            padding: '20px 18px',
            marginBottom: 16,
            boxShadow: isPaid
              ? '0 8px 32px rgba(16, 185, 129, 0.08)'
              : '0 8px 32px rgba(239, 68, 68, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Status Pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                সম্মানিত গ্রাহক
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: '#fff' }}>
                {customer.name}
              </h1>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 700,
                background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isPaid ? '#10b981' : '#ef4444',
                border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {isPaid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {isPaid ? 'পরিশোধ সম্পন্ন (Paid)' : 'বকেয়া রয়েছে (Due)'}
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem', color: '#9aa0a6', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} style={{ color: '#6c5ce7', flexShrink: 0 }} />
              <span style={{ color: '#e8eaed', fontWeight: 500 }}>{customer.phone}</span>
            </div>
            {customer.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={14} style={{ color: '#6c5ce7', flexShrink: 0, marginTop: 2 }} />
                <span>{customer.address}</span>
              </div>
            )}
          </div>

          {/* Financial Breakdown Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#9aa0a6', marginBottom: 2 }}>মোট বিল (Total Bill)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                ৳{(customer.totalPurchases || 0).toLocaleString('en-BD')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', color: '#9aa0a6', marginBottom: 2 }}>বর্তমান বকেয়া (Due)</div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: isPaid ? '#10b981' : '#ef4444',
                }}
              >
                ৳{(customer.totalDue || 0).toLocaleString('en-BD')}
              </div>
            </div>
          </div>

          {isPaid && (
            <div
              style={{
                marginTop: 12,
                fontSize: '0.75rem',
                color: '#10b981',
                textAlign: 'center',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={14} /> ধন্যবাদ! আপনার সমস্ত বিল সফলভাবে পরিশোধিত হয়েছে।
            </div>
          )}
        </div>

        {/* ========================================================
            ORDER CALCULATION BREAKDOWN (IF TEXT WAS ENTERED)
           ======================================================== */}
        {customer.billDetailsText && (
          <div
            style={{
              background: 'rgba(26, 29, 40, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                <FileText size={16} style={{ color: '#00cec9' }} /> অর্ডারের বিবরণ ও হিসাব (Details)
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(customer.billDetailsText, 'detailsText')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedKey === 'detailsText' ? '#10b981' : '#9aa0a6',
                  fontSize: '0.6875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedKey === 'detailsText' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'detailsText' ? 'কপি হয়েছে' : 'কপি করুন'}
              </button>
            </div>

            <div
              style={{
                background: '#0d1117',
                padding: '12px 14px',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: '#c9d1d9',
                whiteSpace: 'pre-wrap',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              {customer.billDetailsText}
            </div>
          </div>
        )}

        {/* ========================================================
            UPLOADED SCREENSHOT / MEMO IMAGE (IF IMAGE WAS UPLOADED)
           ======================================================== */}
        {fullImageUrl && (
          <div
            style={{
              background: 'rgba(26, 29, 40, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                <ImageIcon size={16} style={{ color: '#f39c12' }} /> বিলের মেমো / স্ক্রিনশট (Bill Slip)
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c5ce7',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                }}
              >
                <ZoomIn size={14} /> বড় করে দেখুন
              </button>
            </div>

            <div
              style={{
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                maxHeight: 340,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
              }}
              onClick={() => setIsZoomed(true)}
            >
              <img
                src={fullImageUrl}
                alt="Bill Slip"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            FIXED BENGALI PAYMENT INSTRUCTIONS & 1-CLICK COPY BUTTONS
           ======================================================== */}
        <div
          style={{
            background: 'rgba(26, 29, 40, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '20px 18px',
            marginBottom: 24,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header Message */}
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#e8eaed', marginBottom: 16 }}>
            সম্মানিত চাঁপাই ম্যাংগো পরিবারের সদস্য, শুভেচ্ছা জানাচ্ছি। আশা করি নিরাপদ খাদ্যের সাথে নিরাপদে আছেন। বিল অনুযায়ী আপনার সুবিধাজনক উপায়ে বিল পরিশোধের অনুরোধ জানাচ্ছি।
          </div>

          {/* bKash Payment Link Highlight */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(226, 19, 110, 0.15) 0%, rgba(226, 19, 110, 0.05) 100%)',
              border: '1px solid rgba(226, 19, 110, 0.4)',
              borderRadius: 12,
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#ff2d87', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={18} /> সরাসরি বিকাশ পেমেন্ট লিংক
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#9aa0a6' }}>রেফারেন্সে আপনার নাম লিখুন</span>
            </div>

            <a
              href="https://shop.bkash.com/chapai-mango01717333880/paymentlink"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #e2136e 0%, #b80d56 100%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '10px 16px',
                borderRadius: 8,
                boxShadow: '0 4px 14px rgba(226, 19, 110, 0.4)',
              }}
            >
              <span>বিকাশ দিয়ে সরাসরি পেমেন্ট করুন</span>
              <ExternalLink size={16} />
            </a>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', marginBottom: 12 }}>
            পেমেন্ট মিডিয়া ও অ্যাকাউন্ট বিবরণঃ
          </div>

          {/* Quick Account Numbers Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {/* bKash */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#e2136e' }}>১) বিকাশ (পেমেন্ট অপশন)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                  01717333880
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('01717333880', 'bkash')}
                style={{
                  background: copiedKey === 'bkash' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedKey === 'bkash' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'bkash' ? 'কপি হয়েছে' : 'কপি করুন'}
              </button>
            </div>

            {/* Nagad */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#f39c12' }}>২) নগদ (পার্সোনাল / সেন্ড মানি)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                  01717333880
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('01717333880', 'nagad')}
                style={{
                  background: copiedKey === 'nagad' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedKey === 'nagad' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'nagad' ? 'কপি হয়েছে' : 'কপি করুন'}
              </button>
            </div>

            {/* Rocket */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#8e44ad' }}>৩) রকেট (পার্সোনাল)</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                  017173338801
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('017173338801', 'rocket')}
                style={{
                  background: copiedKey === 'rocket' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedKey === 'rocket' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'rocket' ? 'কপি হয়েছে' : 'কপি করুন'}
              </button>
            </div>
          </div>

          {/* Bank Details Section */}
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={16} style={{ color: '#00cec9' }} /> ব্যাংক ডিটেইলসঃ
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {/* City Bank */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#00cec9' }}>City Bank</div>
                  <div style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>A/C Name: Shahinur Rahman Himel</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    2302600366001
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#9aa0a6' }}>Branch: Chapainawabganj Branch</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('2302600366001', 'citybank')}
                  style={{
                    background: copiedKey === 'citybank' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {copiedKey === 'citybank' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'citybank' ? 'কপি হয়েছে' : 'A/C কপি'}
                </button>
              </div>
            </div>

            {/* DBBL Bank */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#00cec9' }}>DBBL Bank (Dutch-Bangla)</div>
                  <div style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>A/C Name: Shahinur Rahman Himel</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    24015139979
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#9aa0a6' }}>Branch: Chapainawabganj Sadar Branch</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('24015139979', 'dbbl')}
                  style={{
                    background: copiedKey === 'dbbl' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {copiedKey === 'dbbl' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'dbbl' ? 'কপি হয়েছে' : 'A/C কপি'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(243, 156, 18, 0.08)',
              border: '1px solid rgba(243, 156, 18, 0.25)',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: '#f39c12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>অনুগ্রহ করে পেমেন্ট করার পর আমাদের কাছ থেকে কনফার্মেশন নিয়ে নিবেন।</span>
            <a
              href="https://wa.me/8801717333880?text=Hello%20Chapai%20Mango,%20I%20have%20completed%20the%20payment%20for%20my%20bill."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#25D366',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MessageCircle size={13} /> পেমেন্ট কনফার্ম করুন
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', marginTop: 30 }}>
          <div>© {new Date().getFullYear()} Chapai Mango • chapaimango.bd</div>
          <div style={{ marginTop: 4 }}>চাঁপাইনবাবগঞ্জ, বাংলাদেশ • হেল্পলাইন: 01717333880</div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isZoomed && fullImageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={22} />
          </button>
          <img
            src={fullImageUrl}
            alt="Zoomed Bill Memo"
            style={{
              maxWidth: '96vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PublicBillPage;
