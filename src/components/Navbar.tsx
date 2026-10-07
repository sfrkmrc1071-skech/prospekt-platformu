import React from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentUser: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenArchitectureModal: () => void;
  onOpenPricingModal: () => void;
  unreadMessagesCount: number;
  pendingReferencesCount: number;
  auditLogsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenArchitectureModal,
  onOpenPricingModal,
  unreadMessagesCount,
  pendingReferencesCount,
  auditLogsCount,
}) => {
  const { firebaseUser, loginWithGoogle, logout } = useAuth();
  const allUsers = db.getUsers();
  const currentRole = db.getRole(currentUser.role_id);
  const tier = currentUser.membership_tier || 'standard';

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    db.setCurrentUserId(userId);
  };

  const navItems = [
    { id: 'marketplace', label: 'Futbolcu Pazarı', icon: 'bi-people-fill' },
    { id: 'teams', label: 'Takımlar', icon: 'bi-shield-shaded' },
    { id: 'users', label: 'Kullanıcılar', icon: 'bi-person-gear' },
    { id: 'roles', label: 'Rol & Yetkiler', icon: 'bi-key-fill' },
    { 
      id: 'references', 
      label: 'Referans Talepleri', 
      icon: 'bi-patch-check-fill',
      badge: pendingReferencesCount > 0 ? pendingReferencesCount : undefined,
      badgeColor: 'bg-warning text-dark'
    },
    { 
      id: 'messages', 
      label: 'Özel Mesajlar', 
      icon: 'bi-chat-dots-fill',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeColor: 'bg-danger'
    },
    { 
      id: 'logs', 
      label: 'Sistem Logları', 
      icon: 'bi-clock-history',
      badge: auditLogsCount,
      badgeColor: 'bg-info text-dark'
    },
    { 
      id: 'sponsorships', 
      label: 'Sponsorluk & Tesisler', 
      icon: 'bi-geo-alt-fill',
      badge: 'FIRSAT',
      badgeColor: 'bg-success text-white'
    },
    { 
      id: 'membership', 
      label: 'Üyelik & Planlar', 
      icon: 'bi-gem',
      badge: tier === 'pro_scout' ? 'PRO' : tier === 'premium' ? 'PREMIUM' : 'YÜKSELT',
      badgeColor: tier === 'pro_scout' ? 'bg-info text-dark' : tier === 'premium' ? 'bg-warning text-dark' : 'bg-warning text-dark fw-bold'
    },
  ];

  return (
    <header className="border-bottom bg-white shadow-sm sticky-top">
      {/* Top Utility Bar */}
      <div className="bg-dark text-light py-1 px-3 border-bottom border-secondary small">
        <div className="container-fluid d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
              <i className="bi bi-fire"></i>
              <span>Firebase Auth & Firestore Bağlı</span>
            </span>
            <span className="text-secondary d-none d-md-inline">|</span>
            <span className="text-light d-none d-md-inline">
              <i className="bi bi-shield-lock me-1"></i> Aktif Rol: <strong>{currentRole?.name}</strong>
            </span>
            <span className="text-secondary d-none d-lg-inline">|</span>
            <span 
              className={`badge d-flex align-items-center gap-1 cursor-pointer ${
                tier === 'pro_scout' ? 'bg-info text-dark' :
                tier === 'premium' ? 'bg-warning text-dark' : 'bg-secondary text-white'
              }`}
              role="button"
              onClick={onOpenPricingModal}
              title="Üyelik planını değiştirmek için tıklayın"
            >
              <i className={`bi ${tier === 'pro_scout' ? 'bi-patch-check-fill' : tier === 'premium' ? 'bi-gem' : 'bi-tag'}`}></i>
              <span className="text-uppercase fw-bold">
                {tier === 'pro_scout' ? 'PRO SCOUT' : tier === 'premium' ? 'PREMIUM' : 'STANDART ÜYE'}
              </span>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button 
              onClick={onOpenPricingModal}
              className="btn btn-sm btn-warning text-dark fw-bold d-flex align-items-center gap-1 py-0 px-2 shadow-sm"
              title="Üyelik Planlarını İncele & Yükselt"
            >
              <i className="bi bi-gem"></i>
              <span>Planlar & Yükselt</span>
            </button>

            <span className="text-light me-1 small">Aktif Rol / Profil:</span>
            <select 
              className="form-select form-select-sm bg-dark text-white border-secondary py-0"
              style={{ width: 'auto', minWidth: '220px', fontSize: '0.8rem' }}
              value={currentUser.id}
              onChange={handleUserChange}
              title="Test etmek istediğiniz kullanıcı rolünü seçin"
            >
              {allUsers.map((u) => {
                const role = db.getRole(u.role_id);
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({role?.name.split(' ')[0]} - {u.membership_tier?.toUpperCase() || 'STD'})
                  </option>
                );
              })}
            </select>

            <button 
              onClick={onOpenArchitectureModal}
              className="btn btn-sm btn-outline-info d-flex align-items-center gap-1 py-0 px-2"
              title="Laravel Migrations, Eloquent & MySQL Şemasını Görüntüle"
            >
              <i className="bi bi-code-slash"></i>
              <span className="d-none d-sm-inline">Laravel & MySQL Kodları</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light py-2">
        <div className="container-fluid">
          <button 
            type="button"
            className="navbar-brand d-flex align-items-center gap-2 border-0 bg-transparent text-start p-0 m-0 cursor-pointer"
            onClick={() => onSelectTab('marketplace')}
          >
            <div 
              className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold shadow-sm"
              style={{ width: '38px', height: '38px', fontSize: '1.2rem' }}
            >
              ⚽
            </div>
            <div>
              <div className="fw-black text-dark lh-1" style={{ fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
                PROSPEKT
              </div>
              <div className="text-muted fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                FUTBOLCU PAZAR YERİ & SCOUT
              </div>
            </div>
          </button>

          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#prospektNav"
            aria-controls="prospektNav" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="prospektNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <li className="nav-item" key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      className={`nav-link btn btn-link text-decoration-none d-flex align-items-center gap-1 px-3 py-2 rounded-2 fw-medium ${
                        isActive 
                          ? 'active bg-primary text-white shadow-sm' 
                          : 'text-dark hover-bg-light'
                      }`}
                    >
                      <i className={`bi ${item.icon}`}></i>
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`badge rounded-pill ms-1 ${item.badgeColor || 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Google Firebase Auth Section */}
            <div className="d-flex align-items-center gap-2 border-start ps-lg-3 mt-2 mt-lg-0">
              {firebaseUser ? (
                <div className="d-flex align-items-center gap-2">
                  <img 
                    src={firebaseUser.photoURL || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} 
                    alt={firebaseUser.displayName || currentUser.name} 
                    className="rounded-circle border border-success"
                    style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                  />
                  <div className="text-start">
                    <div className="fw-bold text-dark lh-sm d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                      <span>{firebaseUser.displayName || currentUser.name}</span>
                      <i className="bi bi-patch-check-fill text-primary" title="Google ile Doğrulanmış"></i>
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                      {firebaseUser.email}
                    </div>
                  </div>
                  <button 
                    onClick={logout} 
                    className="btn btn-sm btn-outline-danger py-1 px-2 ms-1"
                    title="Google Oturumunu Kapat"
                  >
                    <i className="bi bi-box-arrow-right"></i>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={loginWithGoogle}
                  className="btn btn-sm btn-outline-dark d-flex align-items-center gap-2 py-1 px-3 shadow-sm rounded-pill fw-semibold"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Google ile Giriş</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

