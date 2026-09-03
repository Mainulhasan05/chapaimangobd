import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '../api';
import {
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Radio,
  MessageSquare,
  Save,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: smsConfig, isLoading } = useQuery({
    queryKey: ['sms-config'],
    queryFn: () => smsAPI.getConfig().then((r) => r.data.data),
  });

  const [footerForm, setFooterForm] = useState({
    smsFooter: 'ChapaiMango.bd',
    appendSmsFooter: true,
  });

  useEffect(() => {
    if (smsConfig) {
      setFooterForm({
        smsFooter: smsConfig.smsFooter !== undefined ? smsConfig.smsFooter : 'ChapaiMango.bd',
        appendSmsFooter: smsConfig.appendSmsFooter !== undefined ? smsConfig.appendSmsFooter : true,
      });
    }
  }, [smsConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: (data) => smsAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] });
      toast.success('SMS branding & footer settings saved!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update SMS settings');
    },
  });

  const handleSaveFooter = (e) => {
    e.preventDefault();
    updateConfigMutation.mutate(footerForm);
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage system configuration, credentials, and SMS gateway for chapaimango.bd</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-lg)', maxWidth: 680 }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <User size={18} /> Admin Profile
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Full Name</div>
              <div style={{ fontWeight: 500 }}>{user?.name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Email Address</div>
              <div style={{ fontWeight: 500 }}>{user?.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Phone Number</div>
              <div style={{ fontWeight: 500 }}>{user?.phone || '01711111111'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Access Role</div>
              <span className="badge badge-primary">{user?.role || 'admin'}</span>
            </div>
          </div>
        </div>

        {/* SMS Branding & Suffix Configuration Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <MessageSquare size={18} style={{ color: 'var(--accent-secondary)' }} /> SMS Branding & Footer Suffix
            </h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
            Automatically append your brand suffix (e.g. <code>ChapaiMango.bd</code>) to the end of all transactional and bulk SMS sent to customers.
          </p>

          <form onSubmit={handleSaveFooter}>
            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">SMS Suffix / Brand Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ChapaiMango.bd"
                value={footerForm.smsFooter}
                onChange={(e) => setFooterForm({ ...footerForm, smsFooter: e.target.value })}
                required
              />
              <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                This text will be attached at the end of every message (e.g. <em>"...ধন্যবাদ। - {footerForm.smsFooter || 'ChapaiMango.bd'}"</em>).
              </small>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={footerForm.appendSmsFooter}
                  onChange={(e) => setFooterForm({ ...footerForm, appendSmsFooter: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span>Automatically append suffix to all outgoing SMS</span>
              </label>
            </div>

            {/* Live Suffix Preview */}
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>
                Live SMS Preview with Suffix:
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
                প্রিয় রহিম, chapaimango.bd-এ আপনার ক্ষীরসাপাত আমের অর্ডারটি গ্রহণ করা হয়েছে।
                {footerForm.appendSmsFooter && footerForm.smsFooter && (
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                    {' '}- {footerForm.smsFooter.trim()}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={updateConfigMutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {updateConfigMutation.isPending ? (
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                ) : (
                  <Save size={14} />
                )}
                Save SMS Suffix
              </button>
            </div>
          </form>
        </div>

        {/* SMS Gateway Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Radio size={18} style={{ color: 'var(--accent-secondary)' }} /> SMS Gateway Integration
            </h3>
            {smsConfig?.isConfigured ? (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} /> Active & Connected
              </span>
            ) : (
              <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Simulation Mode
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
            The SMS system delivers automated order updates, courier tracking alerts, and personalized due payment reminders directly to recipient handsets across all mobile operators in Bangladesh.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <div className="settings-meta-grid">
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Sender ID</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {smsConfig?.senderId || '8809617639998'}
                </div>
              </div>
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Language & Encoding</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--success)' }}>
                  Unicode (Bangla) & ASCII
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>SMS Credentials & Gateway Configuration:</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Configure your secret API key and approved Sender ID in the <code>server/.env</code> file:
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              SMS_API_KEY=••••••••••••••••••••••••••••••••<br />
              SMS_SENDER_ID={smsConfig?.senderId || '8809617639998'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }
        @media (max-width: 520px) {
          .settings-meta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;

