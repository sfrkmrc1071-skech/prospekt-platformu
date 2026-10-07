import React, { useState } from 'react';
import { User, Role, PermissionModule, RolePermission } from '../types';
import { db } from '../services/db';

interface RolePermissionProps {
  currentUser: User;
}

const MODULE_LABELS: Record<PermissionModule, { name: string; icon: string; desc: string }> = {
  users: { name: 'Kullanıcı Yönetimi', icon: 'bi-people', desc: 'Sistem kullanıcı hesapları ve profilleri' },
  roles: { name: 'Rol & Yetki Yönetimi', icon: 'bi-key', desc: 'Rol tanımları ve yetki matrisi' },
  teams: { name: 'Takımlar', icon: 'bi-shield-shaded', desc: 'Kulüpler ve lig tanımlamaları' },
  players: { name: 'Futbolcular Tablosu', icon: 'bi-person-badge', desc: 'Oyuncu künyeleri, mevkiler, fiziksel veriler' },
  player_videos: { name: 'Futbolcu Videoları', icon: 'bi-play-circle', desc: 'Maç kesitleri, highlight ve scout klipleri' },
  player_references: { name: 'Referans Sistemi', icon: 'bi-patch-check', desc: 'Eski hocalar ve antrenör onaylı referanslar' },
  player_activities: { name: 'Maç Aktiviteleri', icon: 'bi-trophy', desc: 'Gol, asist, kurtarış, maç istatistikleri' },
  player_team_histories: { name: 'Kariyer & Takım Geçmişi', icon: 'bi-clock-history', desc: 'Önceki takımlar, yıllar, maç sayıları' },
  player_reviews: { name: 'Yıldızlama & Yorumlar', icon: 'bi-star-fill', desc: 'Scout değerlendirmeleri ve puanlama' },
  messages: { name: 'Özel Mesajlaşma', icon: 'bi-chat-dots', desc: 'Kulüp / Scout ve futbolcu arası mesajlar' },
  audit_logs: { name: 'Sistem Logları', icon: 'bi-journal-code', desc: 'Tüm INSERT/UPDATE/DELETE denetim kayıtları' },
};

export const RolePermissionManagement: React.FC<RolePermissionProps> = ({ currentUser }) => {
  const roles = db.getRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id || 1);
  const [newRoleModal, setNewRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ name: '', slug: '', description: '' });

  const canViewPage = db.hasPermission('roles', 'can_view_page');
  const canUpdate = db.hasPermission('roles', 'can_update');
  const canCreate = db.hasPermission('roles', 'can_create');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Mevcut rolünüz (<strong>{db.getRole(currentUser.role_id)?.name}</strong>) için "Rol & Yetki Yönetimi" modülünü görüntüleme izni bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  const selectedRole = db.getRole(selectedRoleId) || roles[0];
  const permissions = db.getPermissions(selectedRoleId);

  const handleTogglePermission = (permId: number, field: keyof RolePermission, currentValue: boolean) => {
    if (!canUpdate && currentUser.role_id !== 1) {
      alert('Yetki değiştirme izniniz bulunmamaktadır.');
      return;
    }
    db.updateRolePermission(permId, { [field]: !currentValue });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleData.name.trim()) return;

    const slug = newRoleData.slug.trim() || newRoleData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const createdRole = db.insertRole({
      name: newRoleData.name,
      slug: slug as any,
      description: newRoleData.description,
    });

    setSelectedRoleId(createdRole.id);
    setNewRoleModal(false);
    setNewRoleData({ name: '', slug: '', description: '' });
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-shield-lock-fill text-primary"></i>
            Rol ve Yetki Yönetimi (RBAC Matrix)
          </h1>
          <p className="text-muted mb-0 small">
            Her sayfa ve modül için: Sayfa Görüntüleme, Kayıtları Görüntüleme, Ekleme, Güncelleme ve Silme (Soft Delete) izinlerini yönetin.
          </p>
        </div>

        {canCreate && (
          <button 
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={() => setNewRoleModal(true)}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Yeni Rol Tanımla</span>
          </button>
        )}
      </div>

      <div className="row g-4">
        {/* Left: Role Selection Cards */}
        <div className="col-lg-3">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="card-title fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <i className="bi bi-person-badge text-secondary"></i>
                Tanımlı Roller ({roles.length})
              </h6>
            </div>
            <div className="list-group list-group-flush">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start py-3 border-0 border-start border-4 ${
                      isSelected ? 'border-primary bg-primary-subtle text-dark fw-bold' : 'border-transparent text-secondary'
                    }`}
                  >
                    <div className="me-auto text-start">
                      <div className="d-flex align-items-center gap-2">
                        <span>{r.name}</span>
                        {r.is_system && (
                          <span className="badge bg-secondary-subtle text-secondary small" style={{ fontSize: '0.65rem' }}>
                            Sistem
                          </span>
                        )}
                      </div>
                      <small className="text-muted d-block mt-1 font-monospace" style={{ fontSize: '0.72rem' }}>
                        slug: {r.slug}
                      </small>
                    </div>
                    {isSelected && <i className="bi bi-chevron-right text-primary"></i>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card shadow-sm border-0 bg-light">
            <div className="card-body small">
              <h6 className="fw-bold mb-2 text-dark">
                <i className="bi bi-info-circle me-1 text-primary"></i>
                Laravel Gates & Policies
              </h6>
              <p className="text-muted mb-2">
                Burada yapılan her izin değişikliği veritabanındaki <code>role_permissions</code> tablosuna anında işlenir ve <code>sistem_loglari</code> tablosuna denetim kaydı yazılır.
              </p>
              <div className="bg-white p-2 rounded border font-monospace text-secondary" style={{ fontSize: '0.72rem' }}>
                Gate::define('update-player', fn($user) =&gt; ...);
              </div>
            </div>
          </div>
        </div>

        {/* Right: Permissions Matrix */}
        <div className="col-lg-9">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="card-title fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <span className="badge bg-primary fs-6">{selectedRole.name}</span>
                  İzin Matrisi
                </h5>
                <small className="text-muted">{selectedRole.description}</small>
              </div>

              {selectedRole.id === 1 && (
                <span className="badge bg-warning text-dark px-3 py-2">
                  <i className="bi bi-star-fill me-1"></i> Süper Admin Tam Yetkilidir
                </span>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th style={{ width: '280px' }}>Modül Adı</th>
                    <th className="text-center" style={{ width: '120px' }}>
                      <div className="d-flex flex-column align-items-center">
                        <i className="bi bi-layout-sidebar mb-1 text-primary"></i>
                        <span>Sayfa Görüntüleme</span>
                      </div>
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>
                      <div className="d-flex flex-column align-items-center">
                        <i className="bi bi-eye mb-1 text-info"></i>
                        <span>Kayıt Görüntüleme</span>
                      </div>
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>
                      <div className="d-flex flex-column align-items-center">
                        <i className="bi bi-plus-square mb-1 text-success"></i>
                        <span>Ekleme (Insert)</span>
                      </div>
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>
                      <div className="d-flex flex-column align-items-center">
                        <i className="bi bi-pencil-square mb-1 text-warning"></i>
                        <span>Güncelleme</span>
                      </div>
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>
                      <div className="d-flex flex-column align-items-center">
                        <i className="bi bi-trash mb-1 text-danger"></i>
                        <span>Silme (Soft Delete)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p) => {
                    const mod = MODULE_LABELS[p.module] || { name: p.module, icon: 'bi-folder', desc: '' };
                    const isSuper = selectedRole.id === 1;

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="p-2 rounded bg-light text-primary border">
                              <i className={`bi ${mod.icon} fs-5`}></i>
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{mod.name}</div>
                              <small className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                                modül: {p.module}
                              </small>
                            </div>
                          </div>
                        </td>

                        {/* can_view_page */}
                        <td className="text-center">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            checked={isSuper ? true : p.can_view_page}
                            disabled={isSuper}
                            onChange={() => handleTogglePermission(p.id, 'can_view_page', p.can_view_page)}
                          />
                        </td>

                        {/* can_view_records */}
                        <td className="text-center">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            checked={isSuper ? true : p.can_view_records}
                            disabled={isSuper}
                            onChange={() => handleTogglePermission(p.id, 'can_view_records', p.can_view_records)}
                          />
                        </td>

                        {/* can_create */}
                        <td className="text-center">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            checked={isSuper ? true : p.can_create}
                            disabled={isSuper}
                            onChange={() => handleTogglePermission(p.id, 'can_create', p.can_create)}
                          />
                        </td>

                        {/* can_update */}
                        <td className="text-center">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            checked={isSuper ? true : p.can_update}
                            disabled={isSuper}
                            onChange={() => handleTogglePermission(p.id, 'can_update', p.can_update)}
                          />
                        </td>

                        {/* can_delete */}
                        <td className="text-center">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            checked={isSuper ? true : p.can_delete}
                            disabled={isSuper}
                            onChange={() => handleTogglePermission(p.id, 'can_delete', p.can_delete)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="card-footer bg-white py-3 border-top d-flex justify-content-between align-items-center">
              <span className="text-muted small">
                <i className="bi bi-shield-check text-success me-1"></i>
                Değişiklikler anında veritabanına ve yetki denetleyicisine yansıtılır.
              </span>
              <span className="small text-secondary">
                Son Güncelleme: <code>{selectedRole.updated_at ? new Date(selectedRole.updated_at).toLocaleTimeString('tr-TR') : 'Bugün'}</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* New Role Modal */}
      {newRoleModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-key-fill text-primary"></i>
                  Yeni Sistem Rolü Tanımla
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setNewRoleModal(false)}></button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Rol Adı *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      placeholder="Örn: Kulüp Tıbbi Ekip / Doktor"
                      value={newRoleData.name}
                      onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Slug (Benzersiz Kod)</label>
                    <input 
                      type="text" 
                      className="form-control font-monospace" 
                      placeholder="Örn: club_medical"
                      value={newRoleData.slug}
                      onChange={(e) => setNewRoleData({ ...newRoleData, slug: e.target.value })}
                    />
                    <small className="text-muted">Boş bırakılırsa rol adından otomatik üretilir.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Açıklama</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      placeholder="Bu role sahip kullanıcıların sistemdeki görevi..."
                      value={newRoleData.description}
                      onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setNewRoleModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Rolü Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
