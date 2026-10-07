import React, { useState } from 'react';
import { User, Role, MembershipTier } from '../types';
import { db } from '../services/db';

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: 4,
    status: 'active' as 'active' | 'suspended' | 'pending',
    club_name: '',
    bio: '',
    avatar: '',
    membership_tier: 'standard' as MembershipTier,
  });

  const canCreate = db.hasPermission('users', 'can_create');
  const canUpdate = db.hasPermission('users', 'can_update');
  const canDelete = db.hasPermission('users', 'can_delete');
  const canViewPage = db.hasPermission('users', 'can_view_page');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Mevcut rolünüz (<strong>{db.getRole(currentUser.role_id)?.name}</strong>) için "Kullanıcılar" modülü görüntüleme yetkisi tanımlanmamıştır.
            Lütfen üst menüden Sistem Yöneticisi rolüne geçiş yapın veya Rol & Yetkiler sayfasından izin verin.
          </p>
        </div>
      </div>
    );
  }

  const users = db.getUsers(includeDeleted);
  const roles = db.getRoles();

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.club_name && u.club_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role_id === roleFilter;
    const matchesTier = tierFilter === 'all' || (u.membership_tier || 'standard') === tierFilter;
    return matchesSearch && matchesRole && matchesTier;
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role_id: 4,
      status: 'active',
      club_name: '',
      bio: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      membership_tier: 'standard',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role_id: user.role_id,
      status: user.status,
      club_name: user.club_name || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      membership_tier: user.membership_tier || 'standard',
    });
    setModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      db.updateUser(editingUser.id, formData);
    } else {
      db.insertUser(formData);
    }
    setModalOpen(false);
  };

  const handleSoftDelete = (user: User) => {
    if (window.confirm(`"${user.name}" kullanıcısını silmek istediğinize emin misiniz? (Soft delete uygulanacak, veri tabanından silinmez)`)) {
      db.softDeleteUser(user.id);
    }
  };

  const handleRestore = (user: User) => {
    db.restoreUser(user.id);
  };

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-person-gear text-primary"></i>
            Kullanıcı Yönetimi
          </h1>
          <p className="text-muted mb-0 small">
            Sistem kullanıcılarını yönetin, rol ataması yapın ve soft delete / audit geçmişini takip edin.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {canCreate && (
            <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={handleOpenAddModal}>
              <i className="bi bi-person-plus-fill"></i>
              <span>Yeni Kullanıcı Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Membership & Subscription Statistics */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Toplam Kayıtlı Üye</span>
                <strong className="fs-4 text-dark">{users.length}</strong>
              </div>
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3">
                <i className="bi bi-people fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Standart (Normal) Üyeler</span>
                <strong className="fs-4 text-secondary">
                  {users.filter(u => (u.membership_tier || 'standard') === 'standard').length}
                </strong>
              </div>
              <div className="rounded-circle bg-secondary bg-opacity-10 text-secondary p-3">
                <i className="bi bi-tag fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Premium & Pro Üyeler</span>
                <strong className="fs-4 text-warning">
                  {users.filter(u => u.membership_tier === 'premium' || u.membership_tier === 'pro_scout').length}
                </strong>
              </div>
              <div className="rounded-circle bg-warning bg-opacity-10 text-warning p-3">
                <i className="bi bi-gem fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Aylık Tahmini Gelir (MRR)</span>
                <strong className="fs-4 text-success">
                  {(
                    users.filter(u => u.membership_tier === 'premium').length * 399 +
                    users.filter(u => u.membership_tier === 'pro_scout').length * 999
                  ).toLocaleString('tr-TR')} ₺
                </strong>
              </div>
              <div className="rounded-circle bg-success bg-opacity-10 text-success p-3">
                <i className="bi bi-graph-up-arrow fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="İsim, e-posta veya kulüp adına göre ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select 
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Tüm Roller ({roles.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select 
                className="form-select"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="all">Tüm Üyelikler</option>
                <option value="standard">Standart Üye</option>
                <option value="premium">Premium Üye</option>
                <option value="pro_scout">Pro Scout & Kulüp</option>
              </select>
            </div>

            <div className="col-md-2 d-flex justify-content-md-end align-items-center">
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="includeDeletedUsersSwitch" 
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold text-secondary" htmlFor="includeDeletedUsersSwitch">
                  Silinenleri Göster (Soft Deleted)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small fw-bold">
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Kullanıcı</th>
                <th>İletişim</th>
                <th>Rol</th>
                <th>Üyelik Planı</th>
                <th>Kulüp / Kurum</th>
                <th>Durum</th>
                <th>Denetim Bilgisi (Audit)</th>
                <th className="text-end">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Kayıtlı kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = db.getRole(user.role_id);
                  const isDeleted = Boolean(user.deleted_at);
                  const tier = user.membership_tier || 'standard';

                  return (
                    <tr key={user.id} className={isDeleted ? 'table-danger bg-opacity-10 text-muted' : ''}>
                      <td className="fw-bold text-secondary">#{user.id.toString().slice(-4)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img 
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} 
                            alt={user.name} 
                            className={`rounded-circle border ${isDeleted ? 'grayscale opacity-50' : ''}`}
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-bold text-dark d-flex align-items-center gap-2">
                              {user.name}
                              {isDeleted && (
                                <span className="badge bg-danger text-white small">Soft Deleted</span>
                              )}
                            </div>
                            <small className="text-muted">{user.bio || 'Biyografi belirtilmemiş'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="small fw-semibold">{user.email}</div>
                        <div className="small text-muted">{user.phone || '-'}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          user.role_id === 1 ? 'bg-danger' :
                          user.role_id === 2 ? 'bg-primary' :
                          user.role_id === 3 ? 'bg-info text-dark' :
                          user.role_id === 4 ? 'bg-success' : 'bg-warning text-dark'
                        }`}>
                          {role?.name || 'Bilinmiyor'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className={`badge d-inline-flex align-items-center gap-1 ${
                            tier === 'pro_scout' ? 'bg-info text-dark' :
                            tier === 'premium' ? 'bg-warning text-dark' : 'bg-light text-secondary border'
                          }`}>
                            <i className={`bi ${tier === 'pro_scout' ? 'bi-patch-check-fill' : tier === 'premium' ? 'bi-gem' : 'bi-tag'}`}></i>
                            <span>{tier === 'pro_scout' ? 'PRO SCOUT' : tier === 'premium' ? 'PREMIUM' : 'STANDART'}</span>
                          </span>

                          <div className="btn-group btn-group-sm mt-1 d-flex" style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                            <button 
                              type="button" 
                              className={`btn py-0 px-1 ${tier === 'standard' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                              onClick={() => db.upgradeUserMembership(user.id, 'standard')}
                              title="Standart Üyeliğe Geçir"
                            >
                              Std
                            </button>
                            <button 
                              type="button" 
                              className={`btn py-0 px-1 ${tier === 'premium' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning text-dark'}`}
                              onClick={() => db.upgradeUserMembership(user.id, 'premium')}
                              title="Premium Scout Yap"
                            >
                              Prem ⭐
                            </button>
                            <button 
                              type="button" 
                              className={`btn py-0 px-1 ${tier === 'pro_scout' ? 'btn-info text-dark fw-bold' : 'btn-outline-info text-dark'}`}
                              onClick={() => db.upgradeUserMembership(user.id, 'pro_scout')}
                              title="Pro Scout / Kulüp Yap"
                            >
                              Pro 💎
                            </button>
                          </div>

                          {user.membership_expires_at && (
                            <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                              Bit: {new Date(user.membership_expires_at).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="fw-medium text-dark">{user.club_name || '-'}</span>
                      </td>
                      <td>
                        {user.status === 'active' && <span className="badge bg-success-subtle text-success border border-success">Aktif</span>}
                        {user.status === 'suspended' && <span className="badge bg-danger-subtle text-danger border border-danger">Askıda</span>}
                        {user.status === 'pending' && <span className="badge bg-warning-subtle text-warning border border-warning">Onay Bekliyor</span>}
                      </td>
                      <td>
                        <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                          <div><strong>Eklenme:</strong> {new Date(user.created_at).toLocaleDateString('tr-TR')}</div>
                          <div><strong>Güncelleyen:</strong> #{user.updated_by || user.created_by}</div>
                          {isDeleted && (
                            <div className="text-danger">
                              <strong>Silinme:</strong> {new Date(user.deleted_at!).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {!isDeleted ? (
                            <>
                              {canUpdate && (
                                <button 
                                  className="btn btn-outline-secondary" 
                                  title="Düzenle"
                                  onClick={() => handleOpenEditModal(user)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  className="btn btn-outline-danger" 
                                  title="Soft Delete (Sil)"
                                  onClick={() => handleSoftDelete(user)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </>
                          ) : (
                            <button 
                              className="btn btn-success" 
                              title="Geri Yükle (Restore)"
                              onClick={() => handleRestore(user)}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i> Geri Yükle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus-fill'} text-primary`}></i>
                  {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Tanımla'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Ad Soyad *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Örn: Arda Güler"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">E-posta Adresi *</label>
                      <input 
                        type="email" 
                        required 
                        className="form-control" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Örn: arda@kulup.com"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Telefon Numarası</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+90 5XX XXX XX XX"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Sistem Rolü *</label>
                      <select 
                        className="form-select"
                        value={formData.role_id}
                        onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Bağlı Olduğu Kulüp / Ajans</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.club_name}
                        onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                        placeholder="Örn: Real Madrid CF veya Foot Agent"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hesap Durumu</label>
                      <select 
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      >
                        <option value="active">Aktif</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="pending">Onay Bekliyor</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Üyelik Katmanı (Plan) *</label>
                      <select 
                        className="form-select"
                        value={formData.membership_tier}
                        onChange={(e) => setFormData({ ...formData, membership_tier: e.target.value as any })}
                      >
                        <option value="standard">Standart Üye (Ücretsiz)</option>
                        <option value="premium">Premium Üye (Abonelikli)</option>
                        <option value="pro_scout">Pro Scout & Kulüp (Elit Lisans)</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Profil Fotoğrafı URL</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Biyografi & Notlar</label>
                      <textarea 
                        className="form-control" 
                        rows={2}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Kullanıcı hakkında kısa bilgi..."
                      ></textarea>
                    </div>
                  </div>

                  <div className="alert alert-info mt-3 py-2 small mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle-fill"></i>
                    <div>
                      Laravel Eloquent <code>created_by</code>, <code>updated_by</code> ve <code>timestamps</code> alanları otomatik atanır.
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                    <i className="bi bi-check2-circle"></i>
                    <span>{editingUser ? 'Güncellemeyi Kaydet' : 'Kullanıcıyı Oluştur'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
