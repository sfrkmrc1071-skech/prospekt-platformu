import React, { useState } from 'react';
import { User, Team } from '../types';
import { db } from '../services/db';

interface TeamManagementProps {
  currentUser: User;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser }) => {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    logo: '',
    league: 'Trendyol Süper Lig',
    city: 'İstanbul',
    stadium: '',
    founded_year: 1923,
    website: '',
  });

  const canCreate = db.hasPermission('teams', 'can_create');
  const canUpdate = db.hasPermission('teams', 'can_update');
  const canDelete = db.hasPermission('teams', 'can_delete');
  const canViewPage = db.hasPermission('teams', 'can_view_page');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Mevcut rolünüz (<strong>{db.getRole(currentUser.role_id)?.name}</strong>) için "Takımlar" modülünü görüntüleme yetkisi tanımlanmamıştır.
          </p>
        </div>
      </div>
    );
  }

  const teams = db.getTeams(includeDeleted);
  const leagues = Array.from(new Set(teams.map((t) => t.league)));

  const filteredTeams = teams.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.stadium.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLeague = leagueFilter === 'all' || t.league === leagueFilter;
    return matchesSearch && matchesLeague;
  });

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      short_name: '',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Football_Pencil_Icon.svg/200px-Football_Pencil_Icon.svg.png',
      league: 'Trendyol Süper Lig',
      city: 'İstanbul',
      stadium: '',
      founded_year: 1923,
      website: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      short_name: team.short_name,
      logo: team.logo || '',
      league: team.league,
      city: team.city,
      stadium: team.stadium,
      founded_year: team.founded_year,
      website: team.website || '',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      db.updateTeam(editingTeam.id, formData);
    } else {
      db.insertTeam(formData);
    }
    setModalOpen(false);
  };

  const handleSoftDelete = (team: Team) => {
    if (window.confirm(`"${team.name}" kulübünü silmek istediğinize emin misiniz? (Soft delete)`)) {
      db.softDeleteTeam(team.id);
    }
  };

  const handleRestore = (team: Team) => {
    db.restoreTeam(team.id);
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-shield-shaded text-primary"></i>
            Takımlar & Kulüpler Tablosu
          </h1>
          <p className="text-muted mb-0 small">
            Sistem yöneticisinin tanımladığı resmi spor kulüpleri, stadyumlar ve ligler veritabanı.
          </p>
        </div>

        {canCreate && (
          <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg"></i>
            <span>Yeni Takım Tanımla</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
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
                  placeholder="Kulüp adı, şehir veya stadyum ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select 
                className="form-select"
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
              >
                <option value="all">Tüm Ligler ({leagues.length})</option>
                {leagues.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4 d-flex justify-content-md-end">
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="includeDeletedTeams" 
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold text-secondary" htmlFor="includeDeletedTeams">
                  Silinen Takımları Göster (Soft Deleted)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Teams */}
      <div className="row g-4">
        {filteredTeams.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-shield-x fs-1 d-block mb-2"></i>
            Kriterlere uygun takım bulunamadı.
          </div>
        ) : (
          filteredTeams.map((team) => {
            const isDeleted = Boolean(team.deleted_at);

            return (
              <div className="col-xl-3 col-lg-4 col-md-6" key={team.id}>
                <div className={`card h-100 shadow-sm border-0 position-relative ${isDeleted ? 'bg-danger-subtle border border-danger' : ''}`}>
                  {isDeleted && (
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge bg-danger text-white">Soft Deleted</span>
                    </div>
                  )}

                  <div className="card-body p-4 text-center">
                    <div 
                      className="mx-auto mb-3 p-2 bg-light rounded-circle shadow-sm border d-flex align-items-center justify-content-center"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <img 
                        src={team.logo || 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Football_Pencil_Icon.svg/200px-Football_Pencil_Icon.svg.png'} 
                        alt={team.name}
                        className={`img-fluid ${isDeleted ? 'grayscale opacity-50' : ''}`}
                        style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <h5 className="fw-bold text-dark mb-1">{team.name}</h5>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-3">
                      {team.short_name} • {team.league}
                    </span>

                    <ul className="list-unstyled small text-muted text-start border-top pt-3 mb-3">
                      <li className="mb-1 d-flex justify-content-between">
                        <span><i className="bi bi-geo-alt me-1 text-danger"></i> Şehir:</span>
                        <strong className="text-dark">{team.city}</strong>
                      </li>
                      <li className="mb-1 d-flex justify-content-between">
                        <span><i className="bi bi-building me-1 text-secondary"></i> Stadyum:</span>
                        <strong className="text-dark text-truncate" style={{ maxWidth: '140px' }}>{team.stadium}</strong>
                      </li>
                      <li className="d-flex justify-content-between">
                        <span><i className="bi bi-calendar-check me-1 text-success"></i> Kuruluş:</span>
                        <strong className="text-dark">{team.founded_year}</strong>
                      </li>
                    </ul>

                    {/* Audit tag */}
                    <div className="p-2 rounded bg-light border small text-muted text-start mb-3" style={{ fontSize: '0.7rem' }}>
                      <div><strong>Oluşturma:</strong> {new Date(team.created_at).toLocaleDateString('tr-TR')}</div>
                      <div><strong>Oluşturan:</strong> User #{team.created_by || 1}</div>
                    </div>

                    {/* Action buttons */}
                    <div className="d-flex justify-content-center gap-2">
                      {!isDeleted ? (
                        <>
                          {canUpdate && (
                            <button 
                              className="btn btn-sm btn-outline-secondary px-3"
                              onClick={() => handleOpenEdit(team)}
                            >
                              <i className="bi bi-pencil me-1"></i> Düzenle
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              className="btn btn-sm btn-outline-danger px-3"
                              onClick={() => handleSoftDelete(team)}
                            >
                              <i className="bi bi-trash me-1"></i> Sil
                            </button>
                          )}
                        </>
                      ) : (
                        <button 
                          className="btn btn-sm btn-success px-3"
                          onClick={() => handleRestore(team)}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i> Geri Yükle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-shield-shaded text-primary"></i>
                  {editingTeam ? 'Takım Bilgilerini Düzenle' : 'Yeni Takım Tanımla'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold small">Kulüp Tam Adı *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Galatasaray Spor Kulübü"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Kısa Kod (Kısaltma) *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={6}
                        className="form-control font-monospace" 
                        placeholder="Örn: GS, FB, RMA"
                        value={formData.short_name}
                        onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Lig / Organizasyon *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Trendyol Süper Lig, La Liga"
                        value={formData.league}
                        onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Şehir / Ülke *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: İstanbul, Madrid"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Stadyum Adı *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: RAMS Park"
                        value={formData.stadium}
                        onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Kuruluş Yılı *</label>
                      <input 
                        type="number" 
                        required 
                        min={1800} 
                        max={2030}
                        className="form-control" 
                        value={formData.founded_year}
                        onChange={(e) => setFormData({ ...formData, founded_year: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold small">Kulüp Logo URL</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        placeholder="https://..."
                        value={formData.logo}
                        onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold small">Resmi Web Sitesi</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        placeholder="https://..."
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                    <i className="bi bi-check2-circle"></i>
                    <span>{editingTeam ? 'Değişiklikleri Kaydet' : 'Takımı Kaydet'}</span>
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
