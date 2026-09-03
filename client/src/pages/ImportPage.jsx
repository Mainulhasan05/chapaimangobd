import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importAPI } from '../api';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  Download,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CANONICAL_FIELDS = [
  { value: 'customerName', label: 'Customer Name *' },
  { value: 'phone', label: 'Phone Number *' },
  { value: 'productName', label: 'Product / Mango Name *' },
  { value: 'rate', label: 'Rate / Price *' },
  { value: 'total', label: 'Total Bill *' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'date', label: 'Date' },
  { value: 'address', label: 'Delivery Address' },
  { value: 'reference', label: 'Ref / Referred By' },
  { value: 'courier', label: 'Courier' },
  { value: 'discount', label: 'Discount' },
  { value: 'paid', label: 'Paid Amount' },
  { value: 'balance', label: 'Standing Balance / Due' },
  { value: 'confirmed', label: 'Confirmed (Yes/No)' },
  { value: 'serial', label: 'S/N (Serial)' },
];

const ImportPage = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const previewMutation = useMutation({
    mutationFn: (formData) => importAPI.preview(formData),
    onSuccess: (res) => {
      const data = res.data.data;
      setPreviewData(data);
      setColumnMapping(data.mapping || {});
      setImportResult(null);
      toast.success(`Parsed ${data.totalRows} rows from ${data.fileName}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to read Excel file');
      setFile(null);
      setPreviewData(null);
    },
  });

  const executeMutation = useMutation({
    mutationFn: (formData) => importAPI.execute(formData),
    onSuccess: (res) => {
      const result = res.data.data;
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Excel import completed successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to execute import');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (batchId) => importAPI.rollback(batchId),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Import batch rolled back successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      resetAll();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to rollback import batch');
    },
  });

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const formData = new FormData();
    formData.append('file', selectedFile);
    previewMutation.mutate(formData);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleMappingChange = (colIdx, field) => {
    setColumnMapping((prev) => ({
      ...prev,
      [colIdx]: field,
    }));
  };

  const handleStartImport = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(columnMapping));
    executeMutation.mutate(formData);
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setColumnMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Excel Data Import</h1>
          <p className="page-description">
            Import offline mango orders, customer contacts, courier shipping ledgers, and standing dues into the system.
          </p>
        </div>
      </div>

      {/* Import Execution Result View */}
      {importResult && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--success)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'var(--success-light)', color: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="card-title" style={{ color: 'var(--success)' }}>Import Completed Successfully</h3>
                <p className="card-subtitle">
                  {importResult.totalRows} total rows processed • Batch ID: <code style={{ color: 'var(--accent-secondary)' }}>{importResult.importBatchId}</code>
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-md)',
            margin: 'var(--space-lg) 0'
          }}>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customers Created</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                {importResult.customersCreated}
              </div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Existing Updated</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>
                {importResult.customersUpdated}
              </div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Orders Created</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                {importResult.ordersCreated}
              </div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplicates Skipped</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                {importResult.ordersSkippedDuplicate || 0}
              </div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Payments Logged</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                {importResult.paymentsCreated}
              </div>
            </div>
          </div>

          {importResult.ordersSkippedDuplicate > 0 && (
            <div style={{ padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              🛡️ <strong>Deduplication protected:</strong> {importResult.ordersSkippedDuplicate} rows were already imported previously and skipped to prevent duplicate orders and balance corruption.
            </div>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <div style={{
              background: 'var(--danger-light)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--danger)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                <AlertTriangle size={16} /> {importResult.errors.length} Warnings / Errors
              </div>
              <div style={{ maxHeight: 120, overflow: 'auto', fontSize: '0.8125rem' }}>
                {importResult.errors.map((err, i) => (
                  <div key={i}>Row {err.row}: {err.message}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn btn-primary" onClick={() => navigate('/orders')}>
                View Orders <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/customers')}>
                View Customers
              </button>
              <button className="btn btn-ghost" onClick={resetAll}>
                Import Another File
              </button>
            </div>

            {importResult.importBatchId && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to rollback batch ${importResult.importBatchId}? This will delete all orders created in this batch and reverse customer balances.`)) {
                    rollbackMutation.mutate(importResult.importBatchId);
                  }
                }}
                disabled={rollbackMutation.isPending}
              >
                {rollbackMutation.isPending && <div className="spinner" />}
                Rollback This Import
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!previewData && !importResult && (
        <div className="import-grid">
          {/* Dropzone */}
          <div
            className={`card ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border)',
              background: isDragging ? 'var(--accent-primary-light)' : 'var(--bg-card)',
              padding: 'var(--space-3xl) var(--space-xl)',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-base)',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />

            <div style={{
              width: 64, height: 64, borderRadius: 'var(--radius-xl)',
              background: 'var(--accent-primary-light)', color: 'var(--accent-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--space-lg)'
            }}>
              {previewMutation.isPending ? (
                <div className="spinner" style={{ width: 28, height: 28 }} />
              ) : (
                <Upload size={32} />
              )}
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
              {previewMutation.isPending ? 'Analyzing your spreadsheet...' : 'Choose or drag & drop Excel file'}
            </h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', maxWidth: 360, marginBottom: 'var(--space-lg)' }}>
              Supports .xlsx, .xls, and .csv files. Compatible with Mango/F-Commerce order ledgers.
            </p>

            <button type="button" className="btn btn-primary btn-sm" disabled={previewMutation.isPending}>
              <FileSpreadsheet size={16} /> Browse File
            </button>
          </div>

          {/* Quick Guidance Box */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Info size={18} style={{ color: 'var(--accent-secondary)' }} /> Supported Columns
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Our smart parser automatically recognizes columns like:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Date</strong> (e.g. 23/6/2026, auto-inherits)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Customer Name</strong> & <strong>Ref</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Phone</strong> (10/11 digits, multi-line)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Mango name / Product</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Courier & Address</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Qty, Rate, Discount, Total</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span><strong>Paid Amount & Standing Balance</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Column Mapping Stage */}
      {previewData && !importResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* File summary banner */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <FileSpreadsheet size={28} style={{ color: 'var(--accent-secondary)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{previewData.fileName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {previewData.totalRows} records found • Sheet: "{previewData.sheetName}"
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStartImport}
              disabled={executeMutation.isPending}
            >
              {executeMutation.isPending ? (
                <>
                  <div className="spinner" />
                  Importing {previewData.totalRows} records...
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  Execute Import ({previewData.totalRows} Rows)
                </>
              )}
            </button>
          </div>

          {/* Column Mapping Section */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Column Mapping</h3>
              <span className="badge badge-info">Auto-detected from your headers</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 'var(--space-md)',
            }}>
              {previewData.headers.map((header, idx) => {
                const currentField = columnMapping[idx] || '';
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-glass)',
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      border: currentField ? '1px solid var(--accent-primary-light)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Excel Column: <strong>"{header || `Col ${idx + 1}`}"</strong>
                    </div>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.8125rem', padding: '6px 28px 6px 8px' }}
                      value={currentField}
                      onChange={(e) => handleMappingChange(idx, e.target.value)}
                    >
                      <option value="">-- Skip this column --</option>
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Parsed Data Preview (First 10 Rows)</h3>
              <span className="badge badge-neutral">Sample representation</span>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Ref</th>
                    <th>Product</th>
                    <th>Courier</th>
                    <th>Address</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((p) => {
                    const row = p.parsed;
                    return (
                      <tr key={p.rowIndex}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>#{p.rowIndex}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                          {row.date ? new Date(row.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ fontWeight: 500 }}>{row.customerName || '—'}</td>
                        <td style={{ color: 'var(--accent-secondary)' }}>{row.phone || '—'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{row.reference || '—'}</td>
                        <td style={{ fontWeight: 500 }}>{row.productName || '—'}</td>
                        <td>{row.courier || '—'}</td>
                        <td style={{ fontSize: '0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.address || '—'}
                        </td>
                        <td>{row.quantity || 1}</td>
                        <td>৳{row.rate || 0}</td>
                        <td style={{ fontWeight: 600 }}>৳{(row.total || 0).toLocaleString()}</td>
                        <td className="text-success">{row.paid ? `৳${row.paid}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .import-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-lg);
        }
        @media (max-width: 768px) {
          .import-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ImportPage;
