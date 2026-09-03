import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../api';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  ShoppingCart,
  DollarSign,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  Key,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Terminal,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Activities', icon: Activity },
  { id: 'AUTH', label: 'Auth & Security', icon: Key, color: '#3b82f6' },
  { id: 'ORDER', label: 'Orders', icon: ShoppingCart, color: '#f59e0b' },
  { id: 'CUSTOMER', label: 'Customers', icon: User, color: '#06b6d4' },
  { id: 'PAYMENT', label: 'Payments', icon: DollarSign, color: '#10b981' },
  { id: 'SMS', label: 'SMS Gateway', icon: MessageSquare, color: '#8b5cf6' },
  { id: 'IMPORT', label: 'Excel Imports', icon: FileSpreadsheet, color: '#ec4899' },
  { id: 'SETTINGS', label: 'System Settings', icon: Settings, color: '#64748b' },
];

const getCategoryBadge = (category) => {
  switch (category) {
    case 'AUTH':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: Key };
    case 'ORDER':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', icon: ShoppingCart };
    case 'CUSTOMER':
      return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)', icon: User };
    case 'PAYMENT':
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)', icon: DollarSign };
    case 'SMS':
      return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)', icon: MessageSquare };
    case 'IMPORT':
      return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)', icon: FileSpreadsheet };
    case 'SETTINGS':
      return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', icon: Settings };
    default:
      return { bg: 'rgba(255, 255, 255, 0.1)', text: '#e2e8f0', border: 'rgba(255, 255, 255, 0.2)', icon: Activity };
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'SUCCESS':
      return { label: 'Success', icon: CheckCircle, color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)' };
    case 'FAILED':
      return { label: 'Failed', icon: XCircle, color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)' };
    case 'WARNING':
      return { label: 'Warning', icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)' };
    default:
      return { label: status, icon: Activity, color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.12)' };
  }
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-BD', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch Audit Stats
  const { data: statsData } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const res = await auditAPI.getStats();
      return res.data.data;
    },
  });

  // Fetch Paginated Logs
  const { data: logsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', { page, category, status, search, startDate, endDate }],
    queryFn: async () => {
      const res = await auditAPI.getAll({
        page,
        limit: 25,
        category: category !== 'ALL' ? category : undefined,
        status: status !== 'ALL' ? status : undefined,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res.data;
    },
  });

  const logs = logsData?.data || [];
  const pagination = logsData?.pagination || { page: 1, pages: 1, total: 0 };
  const stats = statsData || { totalLogs: 0, todayLogs: 0, categories: {}, statuses: {} };

  const handleResetFilters = () => {
    setCategory('ALL');
    setStatus('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={26} style={{ color: 'var(--accent-secondary)' }} />
            Audit Logs & Security Ledger
          </h1>
          <p className="page-description">
            Complete chronological audit trail of all system activities, admin sign-ins, order updates, customer edits, SMS dispatches, and financial ledger events.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
          {isFetching ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Activity size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Events Logged</span>
            <span className="stat-value">{stats.totalLogs?.toLocaleString() || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>All-time audit record</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Today's Activities</span>
            <span className="stat-value">{stats.todayLogs?.toLocaleString() || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Recorded since midnight</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <ShoppingCart size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Orders & Payments</span>
            <span className="stat-value">
              {((stats.categories?.ORDER || 0) + (stats.categories?.PAYMENT || 0)).toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Commerce transactions</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <MessageSquare size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">SMS & Communications</span>
            <span className="stat-value">{stats.categories?.SMS?.toLocaleString() || 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>SMS gateway dispatches</span>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-xs)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-xs)',
        marginBottom: 'var(--space-md)',
      }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = category === cat.id;
          const count = cat.id === 'ALL' ? stats.totalLogs : (stats.categories?.[cat.id] || 0);

          return (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 600 : 500,
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} style={{ color: isSelected ? '#ffffff' : cat.color }} />
              <span>{cat.label}</span>
              {count > 0 && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.6875rem',
                  background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-glass)',
                  color: isSelected ? '#ffffff' : 'var(--text-tertiary)',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
          alignItems: 'center',
        }}>
          {/* Search */}
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={16} />
            <input
              className="search-input"
              placeholder="Search by description, admin, action, IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%' }}
            >
              <option value="ALL">All Event Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
              <option value="WARNING">Warnings Only</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <input
              type="date"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '6px 8px' }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Start Date"
            />
            <span style={{ color: 'var(--text-tertiary)' }}>to</span>
            <input
              type="date"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '6px 8px' }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="End Date"
            />
          </div>

          {/* Clear Filters Button */}
          {(search || category !== 'ALL' || status !== 'ALL' || startDate || endDate) && (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResetFilters}
                style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
              >
                <X size={14} /> Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table / Cards Container */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="card empty-state" style={{ padding: 'var(--space-3xl)' }}>
          <div className="empty-state-icon">🛡️</div>
          <h3 className="empty-state-title">No Audit Logs Found</h3>
          <p className="empty-state-text">
            {search || category !== 'ALL' || status !== 'ALL'
              ? 'No activities match your filter criteria. Try clearing search filters.'
              : 'System activities will be automatically recorded here as administrators perform actions.'}
          </p>
          {(search || category !== 'ALL' || status !== 'ALL') && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters} style={{ marginTop: 'var(--space-md)' }}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container desktop-audit-table">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Timestamp</th>
                  <th style={{ width: 160 }}>Operator</th>
                  <th style={{ width: 150 }}>Category & Action</th>
                  <th>Description</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 140 }}>Client / IP</th>
                  <th className="audit-actions-header" style={{ width: 80 }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const catBadge = getCategoryBadge(log.category);
                  const statusBadge = getStatusBadge(log.status);
                  const CatIcon = catBadge.icon;
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr key={log._id}>
                      {/* Timestamp */}
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatTimeAgo(log.createdAt)}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                          {new Date(log.createdAt).toLocaleDateString('en-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Operator */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--accent-secondary)',
                            flexShrink: 0,
                          }}>
                            {log.userName?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.userName || 'Admin'}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                              {log.userRole || 'admin'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Action */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          background: catBadge.bg,
                          color: catBadge.text,
                          border: `1px solid ${catBadge.border}`,
                          marginBottom: 2,
                        }}>
                          <CatIcon size={11} /> {log.category}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {log.action}
                        </div>
                      </td>

                      {/* Description */}
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {log.description}
                        </div>
                        {log.targetType && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            Target: <span style={{ color: 'var(--text-secondary)' }}>{log.targetType}</span>
                            {log.targetId && <span> (#{log.targetId.slice(-6)})</span>}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          background: statusBadge.bg,
                          color: statusBadge.color,
                        }}>
                          <StatusIcon size={12} /> {statusBadge.label}
                        </span>
                      </td>

                      {/* Client IP */}
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                          <Globe size={11} /> {log.ipAddress || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td className="audit-actions-cell" style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Inspect Event Metadata"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-audit-cards">
            {logs.map((log) => {
              const catBadge = getCategoryBadge(log.category);
              const statusBadge = getStatusBadge(log.status);
              const CatIcon = catBadge.icon;
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={log._id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        background: catBadge.bg,
                        color: catBadge.text,
                        border: `1px solid ${catBadge.border}`,
                      }}>
                        <CatIcon size={11} /> {log.category}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {log.action}
                      </span>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      background: statusBadge.bg,
                      color: statusBadge.color,
                    }}>
                      <StatusIcon size={11} /> {statusBadge.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {log.description}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <span>By: <strong>{log.userName}</strong></span> • <span>{formatTimeAgo(log.createdAt)}</span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedLog(log)}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', height: 26 }}
                    >
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-xl)',
            }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                Page {page} of {pagination.pages} ({pagination.total} events)
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

      {/* Audit Detail & Metadata Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={20} style={{ color: 'var(--accent-secondary)' }} /> Event Details
                </h2>
                <p className="card-subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
                  ID: {selectedLog._id}
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedLog(null)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Event Description */}
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Activity Description</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedLog.description}
                </div>
              </div>

              {/* 4-Grid Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Category & Action</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 2 }}>{selectedLog.category}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>{selectedLog.action}</div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Status</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 2, color: getStatusBadge(selectedLog.status).color }}>
                    {selectedLog.status}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Operator / User</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 2 }}>{selectedLog.userName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedLog.userEmail || 'admin'}</div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Timestamp</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginTop: 2 }}>
                    {new Date(selectedLog.createdAt).toLocaleString('en-BD')}
                  </div>
                </div>
              </div>

              {/* Technical / Network Metadata */}
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="text-muted">IP Address:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
                {selectedLog.userAgent && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span className="text-muted">User Agent:</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '70%', wordBreak: 'break-all' }}>
                      {selectedLog.userAgent}
                    </span>
                  </div>
                )}
                {selectedLog.targetId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span className="text-muted">Target Entity:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.targetType} ({selectedLog.targetId})</span>
                  </div>
                )}
              </div>

              {/* Event Payload / Metadata JSON */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={14} style={{ color: 'var(--accent-secondary)' }} />
                    Payload & Change Metadata:
                  </div>
                  <pre style={{
                    padding: 'var(--space-md)',
                    background: '#0e1117',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#a78bfa',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        .desktop-audit-table {
          display: block;
        }
        .mobile-audit-cards {
          display: none;
        }

        .audit-actions-header,
        .audit-actions-cell {
          position: sticky;
          right: 0;
          background: var(--bg-card);
          z-index: 2;
          box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .desktop-audit-table {
            display: none !important;
          }
          .mobile-audit-cards {
            display: flex !important;
            flex-direction: column;
            gap: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default AuditLogsPage;
