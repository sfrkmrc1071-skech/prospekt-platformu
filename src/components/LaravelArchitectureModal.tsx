import React, { useState } from 'react';
import { 
  LARAVEL_MIGRATIONS_CODE, 
  LARAVEL_ELOQUENT_MODEL_CODE, 
  MYSQL_DDL_DUMP 
} from '../services/laravelCodeGenerator';

interface LaravelArchitectureModalProps {
  onClose: () => void;
}

export const LaravelArchitectureModal: React.FC<LaravelArchitectureModalProps> = ({ onClose }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'migrations' | 'models' | 'sql'>('migrations');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'migrations': return LARAVEL_MIGRATIONS_CODE;
      case 'models': return LARAVEL_ELOQUENT_MODEL_CODE;
      case 'sql': return MYSQL_DDL_DUMP;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([MYSQL_DDL_DUMP], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospekt_football_schema_dump.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl">
          {/* Header */}
          <div className="modal-header bg-dark text-white border-bottom border-secondary py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 bg-danger rounded text-white">
                <i className="bi bi-filetype-php fs-4"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white">
                  Laravel 11 & MySQL Veritabanı Mimarisi
                </h5>
                <small className="text-secondary">
                  Soft Delete, Audit Log Trait, RBAC ve tüm 10 modülün ilişkisel şema kaynak kodları
                </small>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                onClick={handleDownloadSql}
                title="MySQL DDL .sql dosyasını indir"
              >
                <i className="bi bi-download"></i>
                <span>.sql İndir</span>
              </button>

              <button 
                className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                onClick={handleCopy}
              >
                <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                <span>{copied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
              </button>

              <button type="button" className="btn-close btn-close-white ms-2" onClick={onClose}></button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="bg-light border-bottom px-4 pt-2">
            <ul className="nav nav-tabs border-0 gap-2">
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeCodeTab === 'migrations' ? 'active bg-white text-danger border-bottom border-danger border-3' : 'text-secondary'}`}
                  onClick={() => setActiveCodeTab('migrations')}
                >
                  <i className="bi bi-database-gear me-1"></i> 1. Laravel Migrations (Blueprint)
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeCodeTab === 'models' ? 'active bg-white text-danger border-bottom border-danger border-3' : 'text-secondary'}`}
                  onClick={() => setActiveCodeTab('models')}
                >
                  <i className="bi bi-cpu me-1"></i> 2. Eloquent Modelleri & Trait
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeCodeTab === 'sql' ? 'active bg-white text-danger border-bottom border-danger border-3' : 'text-secondary'}`}
                  onClick={() => setActiveCodeTab('sql')}
                >
                  <i className="bi bi-file-earmark-code me-1"></i> 3. MySQL 8.0 DDL & DML Dump
                </button>
              </li>
            </ul>
          </div>

          {/* Modal Body: Code Display */}
          <div className="modal-body p-0 bg-dark text-light position-relative">
            <pre className="p-4 mb-0 font-monospace overflow-auto text-success-emphasis" style={{ maxHeight: '550px', fontSize: '0.82rem', lineHeight: 1.5 }}>
              <code>{getActiveCode()}</code>
            </pre>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white py-2 px-4 d-flex justify-content-between">
            <div className="small text-muted d-flex align-items-center gap-3">
              <span><i className="bi bi-check-circle-fill text-success me-1"></i> <code>$table-&gt;softDeletes()</code> tüm tablolarda mevcut</span>
              <span><i className="bi bi-check-circle-fill text-success me-1"></i> <code>created_by, updated_by, deleted_by</code></span>
              <span><i className="bi bi-check-circle-fill text-success me-1"></i> <code>audit_logs</code> tablosu</span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
