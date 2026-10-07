import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { db } from '../services/db';

interface AuditLogViewerProps {
  currentUser: User;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ currentUser }) => {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const canViewPage = db.hasPermission('audit_logs', 'can_view_page');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Sistem loglarını yalnızca Süper Admin ve yetkili denetçiler inceleyebilir.
          </p>
        </div>
      </div>
    );
  }

  const logs = db.getAuditLogs(
    tableFilter === 'all' ? undefined : tableFilter,
    actionFilter === 'all' ? undefined : actionFilter
  );

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      l.changes_summary.toLowerCase().includes(s) ||
      l.user_name.toLowerCase().includes(s) ||
      l.table_name.toLowerCase().includes(s)
    );
  });

  const availableTables = Array.from(new Set(db.getAuditLogs().map(l => l.table_name)));

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-journal-code text-primary"></i>
            Sistem Denetim Logları (sistem_loglari Tablosu)
          </h1>
          <p className="text-muted mb-0 small">
            Veritabanında gerçekleşen tüm INSERT, UPDATE, DELETE (Soft Delete) ve RESTORE işlemleri anlık olarak loglanır.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success-subtle text-success border border-success px-3 py-2">
            <i className="bi bi-broadcast me-1"></i> Canlı Denetim Dinleyicisi Aktif
          </span>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="İşlem detayı, kullanıcı veya tablo ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select 
                className="form-select"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              >
                <option value="all">Tüm Tablolar ({availableTables.length})</option>
                {availableTables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select 
                className="form-select"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">Tüm İşlemler</option>
                <option value="INSERT">INSERT (Ekleme)</option>
                <option value="UPDATE">UPDATE (Güncelleme)</option>
                <option value="DELETE">DELETE (Soft Silme)</option>
                <option value="RESTORE">RESTORE (Geri Yükleme)</option>
              </select>
            </div>

            <div className="col-md-2 text-md-end">
              <span className="small text-muted">
                Toplam: <strong>{filteredLogs.length}</strong> kayıt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 font-sans">
            <thead className="table-light text-uppercase small">
              <tr>
                <th style={{ width: '80px' }}>Log ID</th>
                <th>Zaman Damgası</th>
                <th>İşlem (Action)</th>
                <th>Etkilenen Tablo</th>
                <th>Kayıt ID</th>
                <th>İşlemi Yapan Kullanıcı</th>
                <th>IP Adresi</th>
                <th>Açıklama / Değişiklik Özeti</th>
                <th className="text-end">JSON Veri</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    <i className="bi bi-clock-history fs-1 d-block mb-2"></i>
                    Filtreye uygun log kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isInsert = log.action === 'INSERT';
                  const isUpdate = log.action === 'UPDATE';
                  const isDelete = log.action === 'DELETE';
                  const isRestore = log.action === 'RESTORE';

                  return (
                    <tr key={log.id}>
                      <td className="font-monospace text-secondary small">#{log.id.toString().slice(-4)}</td>
                      <td className="small text-nowrap">
                        <i className="bi bi-clock me-1 text-muted"></i>
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td>
                        <span className={`badge ${
                          isInsert ? 'bg-success' :
                          isUpdate ? 'bg-warning text-dark' :
                          isDelete ? 'bg-danger' : 'bg-primary'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <code className="text-primary fw-semibold">{log.table_name}</code>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">
                          #{log.record_id}
                        </span>
                      </td>
                      <td>
                        <div className="small fw-semibold">{log.user_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>ID: #{log.user_id}</div>
                      </td>
                      <td>
                        <span className="small text-muted font-monospace">{log.ip_address}</span>
                      </td>
                      <td>
                        <div className="small text-dark text-truncate" style={{ maxWidth: '320px' }}>
                          {log.changes_summary}
                        </div>
                      </td>
                      <td className="text-end">
                        <button 
                          className="btn btn-sm btn-outline-secondary py-0 px-2"
                          onClick={() => setSelectedLog(log)}
                        >
                          <i className="bi bi-code me-1"></i> Detay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Detail Modal */}
      {selectedLog && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-journal-text text-primary"></i>
                  Log Detayı: #{selectedLog.id} ({selectedLog.action} on {selectedLog.table_name})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedLog(null)}></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <div className="mb-3">
                  <strong className="d-block text-dark small mb-1">İşlem Özeti:</strong>
                  <div className="p-2 bg-white rounded border text-secondary small">
                    {selectedLog.changes_summary}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <small className="text-muted d-block">Kullanıcı:</small>
                    <strong>{selectedLog.user_name} (#{selectedLog.user_id})</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Tarih / Saat:</small>
                    <strong>{new Date(selectedLog.created_at).toLocaleString('tr-TR')}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">IP Adresi:</small>
                    <span className="font-monospace">{selectedLog.ip_address}</span>
                  </div>
                </div>

                {selectedLog.old_values && (
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-danger">Önceki Değerler (Old Values - JSON):</label>
                    <pre className="p-3 bg-dark text-warning rounded small overflow-auto font-monospace" style={{ maxHeight: '180px' }}>
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div className="mb-0">
                    <label className="form-label small fw-bold text-success">Yeni Değerler (New Values - JSON):</label>
                    <pre className="p-3 bg-dark text-info rounded small overflow-auto font-monospace" style={{ maxHeight: '180px' }}>
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
