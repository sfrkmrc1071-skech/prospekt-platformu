import React, { useState } from 'react';
import { Player, User, PlayerPosition, Foot } from '../types';
import { db } from '../services/db';
import { PlayerDetailModal } from './PlayerDetailModal';

const ALL_POSITIONS: PlayerPosition[] = [
  'Kaleci',
  'Stoper',
  'Sol Bek',
  'Sağ Bek',
  'Ön Libero',
  'Merkez Orta Saha',
  'On Numara',
  'Sol Kanat',
  'Sağ Kanat',
  'Santrafor',
  'İkinci Forvet',
];

interface PlayerMarketplaceProps {
  currentUser: User;
  onOpenSendMessageToUser: (receiverId: number, playerId: number, defaultSubject?: string) => void;
  onOpenPricingModal: () => void;
  onNavigateToSponsorships?: () => void;
}

export const PlayerMarketplace: React.FC<PlayerMarketplaceProps> = ({
  currentUser,
  onOpenSendMessageToUser,
  onOpenPricingModal,
  onNavigateToSponsorships,
}) => {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [onlyWatchlist, setOnlyWatchlist] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedFoot, setSelectedFoot] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Advanced Scout Filters (Premium Perk)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under1m' | '1m_10m' | 'over10m'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'u21' | 'prime' | 'veteran'>('all');
  const [onlyVerifiedRef, setOnlyVerifiedRef] = useState(false);

  const isPremiumOrPro = currentUser.membership_tier === 'premium' || currentUser.membership_tier === 'pro_scout' || currentUser.role_id === 1;

  // Detail Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Add / Edit Player Modal
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form State for creating/editing a player
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '2004-01-01',
    height: 180,
    weight: 75,
    preferred_foot: 'Sağ' as Foot,
    positions: ['Santrafor'] as PlayerPosition[],
    primary_position: 'Santrafor' as PlayerPosition,
    current_team_id: 1 as number | null,
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
    bio: '',
    market_value_eur: 5000000,
    contract_until: '2028-06-30',
    nationality: 'Türkiye',
    jersey_number: 10,
    instagram_handle: '',
  });

  const canCreate = db.hasPermission('players', 'can_create');
  const canUpdate = db.hasPermission('players', 'can_update');
  const canDelete = db.hasPermission('players', 'can_delete');
  const canViewPage = db.hasPermission('players', 'can_view_page');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Mevcut rolünüz (<strong>{db.getRole(currentUser.role_id)?.name}</strong>) için "Futbolcular" modülü görüntüleme yetkisi tanımlanmamıştır.
          </p>
        </div>
      </div>
    );
  }

  const players = db.getPlayers(includeDeleted);
  const teams = db.getTeams();

  const filteredPlayers = players.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      p.nationality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primary_position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = selectedPosition === 'all' || p.positions.includes(selectedPosition as PlayerPosition);
    const matchesFoot = selectedFoot === 'all' || p.preferred_foot === selectedFoot;
    const matchesTeam = selectedTeam === 'all' || (p.current_team_id && p.current_team_id.toString() === selectedTeam);
    const matchesWatchlist = !onlyWatchlist || db.isWatchlisted(currentUser.id, p.id);

    // Advanced Filters (Age, Market Value, Verified References)
    const playerAge = new Date().getFullYear() - new Date(p.birth_date).getFullYear();
    let matchesAge = true;
    if (ageFilter === 'u21') matchesAge = playerAge <= 21;
    else if (ageFilter === 'prime') matchesAge = playerAge >= 22 && playerAge <= 29;
    else if (ageFilter === 'veteran') matchesAge = playerAge >= 30;

    let matchesPrice = true;
    if (priceFilter === 'under1m') matchesPrice = p.market_value_eur < 1000000;
    else if (priceFilter === '1m_10m') matchesPrice = p.market_value_eur >= 1000000 && p.market_value_eur <= 10000000;
    else if (priceFilter === 'over10m') matchesPrice = p.market_value_eur > 10000000;

    let matchesRef = true;
    if (onlyVerifiedRef) {
      const refs = db.getReferences(p.id).filter(r => r.status === 'onaylandi');
      matchesRef = refs.length > 0;
    }

    return matchesSearch && matchesPosition && matchesFoot && matchesTeam && matchesWatchlist && matchesAge && matchesPrice && matchesRef;
  });

  const handleToggleWatchlist = (e: React.MouseEvent, playerId: number) => {
    e.stopPropagation();
    const currentList = currentUser.watchlist_player_ids || [];
    const isAlready = currentList.includes(playerId);
    
    // Watchlist quota: Standard members max 2 players
    if (!isAlready && !isPremiumOrPro && currentList.length >= 2) {
      if (window.confirm('Standart (Normal) üyeler izleme listesine (Watchlist) en fazla 2 futbolcu ekleyebilir.\n\nSınırsız izleme listesi, scout notları ve radar analizleri için Premium Scout planına yükseltmek ister misiniz?')) {
        onOpenPricingModal();
      }
      return;
    }
    db.toggleWatchlist(currentUser.id, playerId);
  };

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setFormData({
      first_name: '',
      last_name: '',
      birth_date: '2004-01-01',
      height: 182,
      weight: 76,
      preferred_foot: 'Sağ',
      positions: ['Santrafor'],
      primary_position: 'Santrafor',
      current_team_id: teams[0]?.id || null,
      photo: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=400&q=80',
      bio: '',
      market_value_eur: 5000000,
      contract_until: '2028-06-30',
      nationality: 'Türkiye',
      jersey_number: 9,
      instagram_handle: '',
    });
    setPlayerModalOpen(true);
  };

  const handleOpenEdit = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlayer(player);
    setFormData({
      first_name: player.first_name,
      last_name: player.last_name,
      birth_date: player.birth_date,
      height: player.height,
      weight: player.weight,
      preferred_foot: player.preferred_foot,
      positions: [...player.positions],
      primary_position: player.primary_position,
      current_team_id: player.current_team_id,
      photo: player.photo,
      bio: player.bio,
      market_value_eur: player.market_value_eur,
      contract_until: player.contract_until || '',
      nationality: player.nationality,
      jersey_number: player.jersey_number || 10,
      instagram_handle: player.instagram_handle || '',
    });
    setPlayerModalOpen(true);
  };

  const handlePositionToggle = (pos: PlayerPosition) => {
    if (formData.positions.includes(pos)) {
      if (formData.positions.length > 1) {
        const next = formData.positions.filter(p => p !== pos);
        setFormData({
          ...formData,
          positions: next,
          primary_position: formData.primary_position === pos ? next[0] : formData.primary_position
        });
      }
    } else {
      setFormData({
        ...formData,
        positions: [...formData.positions, pos]
      });
    }
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) return;

    if (editingPlayer) {
      db.updatePlayer(editingPlayer.id, {
        ...formData,
      });
    } else {
      db.insertPlayer({
        ...formData,
        user_id: currentUser.id, // Current creator user
      });
    }
    setPlayerModalOpen(false);
  };

  const handleSoftDelete = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`"${player.first_name} ${player.last_name}" futbolcusunu silmek (soft delete) istediğinize emin misiniz?`)) {
      db.softDeletePlayer(player.id);
    }
  };

  const handleRestore = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    db.restorePlayer(player.id);
  };

  // Quick stats
  const totalMarketValue = players.reduce((sum, p) => sum + p.market_value_eur, 0);

  return (
    <div className="container-fluid py-4">
      
      {/* Top Banner & Stats */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="p-4 bg-dark text-white rounded-3 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <div className="badge bg-primary text-uppercase mb-2">Scout & Transfer Pazarı</div>
              <h2 className="fw-black mb-1">Futbolcu Vitrini & Veri Tabanı</h2>
              <p className="text-secondary mb-0 small">
                Kulüpler, scoutlar ve menajerler için çoktan seçmeli mevkiler, videolar, aktiviteler ve onaylı referanslar.
              </p>
            </div>
            {canCreate && (
              <button className="btn btn-primary d-flex align-items-center gap-2 shadow" onClick={handleOpenAdd}>
                <i className="bi bi-person-plus-fill fs-5"></i>
                <span className="fw-bold">Yeni Futbolcu Tanımla</span>
              </button>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100 bg-white">
            <div className="card-body d-flex flex-column justify-content-center">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Aktif Futbolcular:</span>
                <strong className="text-dark">{players.length} Oyuncu</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Toplam Piyasa Değeri:</span>
                <strong className="text-success">{totalMarketValue.toLocaleString('tr-TR')} €</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Mimari Standart:</span>
                <span className="badge bg-success-subtle text-success border border-success">MySQL + SoftDeletes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsorship & Nearby Facilities Callout Strip */}
      <div className="alert bg-success-subtle border-success border-opacity-25 rounded-3 py-2 px-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success text-white">YENİ FIRSAT</span>
          <span className="small text-dark fw-semibold">
            📍 Konumunuza en yakın FIFA onaylı halı saha & tesisleri keşfedin; Nike, Adidas, GPS yelek ve sporcu hidrasyonu sponsorluk indirimlerinden yararlanın!
          </span>
        </div>
        {onNavigateToSponsorships && (
          <button 
            className="btn btn-success btn-sm fw-bold px-3 shadow-sm"
            onClick={onNavigateToSponsorships}
          >
            <i className="bi bi-geo-alt-fill me-1"></i> Tesis & Sponsorlukları Keşfet
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="Futbolcu adı, uyruk veya mevki ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2 col-md-3">
              <select 
                className="form-select"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
              >
                <option value="all">Tüm Mevkiler</option>
                {ALL_POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-2 col-md-3">
              <select 
                className="form-select"
                value={selectedFoot}
                onChange={(e) => setSelectedFoot(e.target.value)}
              >
                <option value="all">Tüm Ayaklar</option>
                <option value="Sağ">Sağ Ayak</option>
                <option value="Sol">Sol Ayak</option>
                <option value="Her İkisi">İki Ayaklı</option>
              </select>
            </div>

            <div className="col-lg-2 col-md-4">
              <select 
                className="form-select"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="all">Tüm Kulüpler</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id.toString()}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-3 col-md-8 d-flex justify-content-between align-items-center gap-2">
              <button 
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-1 ${onlyWatchlist ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setOnlyWatchlist(!onlyWatchlist)}
                title="Sadece izleme listenizdeki futbolcuları gösterin"
              >
                <i className={`bi ${onlyWatchlist ? 'bi-bookmark-star-fill' : 'bi-bookmark'}`}></i>
                <span>İzleme Listem</span>
              </button>

              <div className="btn-group btn-group-sm">
                <button 
                  className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('grid')}
                  title="Kart Görünümü"
                >
                  <i className="bi bi-grid-fill"></i>
                </button>
                <button 
                  className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('table')}
                  title="Detaylı Tablo Görünümü"
                >
                  <i className="bi bi-table"></i>
                </button>
              </div>

              <div className="form-check form-switch m-0">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="includeDeletedPlayers" 
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="includeDeletedPlayers">
                  Silinenler
                </label>
              </div>
            </div>
          </div>

          {/* Advanced Scout Filter Toggle Bar */}
          <div className="mt-3 pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
            <button 
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 ${
                showAdvancedFilters ? 'btn-dark' : 'btn-outline-dark'
              }`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <i className="bi bi-sliders2-vertical"></i>
              <span>Gelişmiş Scout Filtreleri (Piyasa Değeri, U21, Referans)</span>
              <span className={`badge ${isPremiumOrPro ? 'bg-warning text-dark' : 'bg-secondary text-white'}`}>
                {isPremiumOrPro ? 'PREMIUM ÖZELLİK' : '⭐ PREMIUM'}
              </span>
            </button>

            {!isPremiumOrPro && (
              <div className="d-flex align-items-center gap-2 text-muted small">
                <span>Standart Üye Watchlist Limiti: <strong>{currentUser.watchlist_player_ids?.length || 0} / 2</strong></span>
                <button 
                  type="button" 
                  className="btn btn-sm btn-warning text-dark fw-bold py-0 px-2"
                  onClick={onOpenPricingModal}
                >
                  <i className="bi bi-gem me-1"></i> Yükselt
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Advanced Scout Filters Drawer */}
          {showAdvancedFilters && (
            <div className="mt-3 p-3 bg-light rounded-3 border">
              {!isPremiumOrPro && (
                <div className="alert alert-warning py-2 px-3 small d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 shadow-sm">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-shield-lock-fill fs-5 text-dark"></i>
                    <span>
                      <strong>Premium Scout Ayrıcalığı:</strong> Bu filtreleme derin transfer ve scout analizi içindir. Standart planda demo amaçlı filtreleyebilirsiniz.
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-sm btn-dark fw-bold"
                    onClick={onOpenPricingModal}
                  >
                    👑 Tüm Scout Özelliklerini Aç
                  </button>
                </div>
              )}

              <div className="row g-3 align-items-center">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    <i className="bi bi-cash-stack me-1 text-success"></i> Piyasa Değeri Aralığı:
                  </label>
                  <select 
                    className="form-select form-select-sm"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value as any)}
                  >
                    <option value="all">Tüm Fiyat Aralıkları</option>
                    <option value="under1m">1.000.000 € Altı (Uygun Bütçeli)</option>
                    <option value="1m_10m">1.000.000 € - 10.000.000 € (Orta Segment)</option>
                    <option value="over10m">10.000.000 € Üstü (Yıldız Oyuncular)</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    <i className="bi bi-calendar3 me-1 text-primary"></i> Yaş & Gelişim Segmenti:
                  </label>
                  <select 
                    className="form-select form-select-sm"
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value as any)}
                  >
                    <option value="all">Tüm Yaş Grupları</option>
                    <option value="u21">U21 Genç Yetenekler (16 - 21 Yaş)</option>
                    <option value="prime">Prime Çağı (22 - 29 Yaş)</option>
                    <option value="veteran">Tecrübeli & Lider (30+ Yaş)</option>
                  </select>
                </div>

                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-1">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="onlyVerifiedRefCheck"
                      checked={onlyVerifiedRef}
                      onChange={(e) => setOnlyVerifiedRef(e.target.checked)}
                    />
                    <label className="form-check-label small fw-semibold text-dark" htmlFor="onlyVerifiedRefCheck">
                      <i className="bi bi-patch-check-fill text-success me-1"></i> Sadece Onaylı Referansı Olanlar
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="row g-4">
          {filteredPlayers.length === 0 ? (
            <div className="col-12 text-center py-5 text-muted">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              Arama kriterlerine uygun futbolcu bulunamadı.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const team = player.current_team_id ? db.getTeamById(player.current_team_id) : null;
              const isDeleted = Boolean(player.deleted_at);
              const reviews = db.getReviewsByPlayer(player.id);
              const references = db.getReferences(player.id).filter(r => r.status === 'onaylandi');
              const videos = db.getVideosByPlayer(player.id);

              return (
                <div className="col-xl-4 col-md-6" key={player.id}>
                  <div 
                    className={`card h-100 shadow-sm border-0 cursor-pointer transition-all hover-shadow-lg ${isDeleted ? 'bg-danger-subtle border border-danger' : 'bg-white'}`}
                    onClick={() => setSelectedPlayer(player)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Top image & badges */}
                    <div className="position-relative overflow-hidden" style={{ height: '220px', backgroundColor: '#111' }}>
                      <img 
                        src={player.photo} 
                        alt={`${player.first_name} ${player.last_name}`}
                        className={`w-100 h-100 object-fit-cover ${isDeleted ? 'grayscale opacity-50' : ''}`}
                        style={{ objectPosition: 'top center' }}
                      />

                      {/* Featured Sponsor Badge for Premium / Pro Players */}
                      {(player.id === 1 || player.id === 2) && (
                        <div className="position-absolute top-0 start-50 translate-middle-x mt-2 badge bg-warning text-dark fw-bold shadow-sm d-flex align-items-center gap-1 px-2 py-1">
                          <i className="bi bi-star-fill text-dark"></i>
                          <span>ÖNE ÇIKAN (VİTRİN)</span>
                        </div>
                      )}

                      <div className="position-absolute top-0 start-0 m-3 d-flex flex-column gap-1">
                        <span className="badge bg-primary text-white shadow-sm">
                          {player.primary_position}
                        </span>
                        {player.jersey_number && (
                          <span className="badge bg-dark bg-opacity-75 text-white font-monospace">
                            #{player.jersey_number}
                          </span>
                        )}
                      </div>

                      {/* Watchlist toggle button */}
                      <button 
                        type="button"
                        className={`btn btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow ${
                          db.isWatchlisted(currentUser.id, player.id) ? 'btn-warning text-dark' : 'btn-dark bg-opacity-75 text-white'
                        }`}
                        style={{ width: '34px', height: '34px', padding: 0 }}
                        onClick={(e) => handleToggleWatchlist(e, player.id)}
                        title={db.isWatchlisted(currentUser.id, player.id) ? 'İzleme listenizden çıkar' : 'İzleme listeme ekle (Watchlist)'}
                      >
                        <i className={`bi ${db.isWatchlisted(currentUser.id, player.id) ? 'bi-bookmark-star-fill' : 'bi-bookmark'}`}></i>
                      </button>

                      {/* Team Logo Badge */}
                      {team && (
                        <div 
                          className="position-absolute bottom-0 start-0 m-3 p-1 bg-white rounded-circle shadow-sm"
                          style={{ width: '42px', height: '42px' }}
                          title={team.name}
                        >
                          <img 
                            src={team.logo} 
                            alt={team.name} 
                            className="w-100 h-100 object-fit-contain" 
                          />
                        </div>
                      )}

                      {/* Market Value & Video count badge */}
                      <div className="position-absolute bottom-0 end-0 m-3 d-flex flex-column align-items-end gap-1">
                        <span className="badge bg-success shadow-sm fs-6">
                          {player.market_value_eur.toLocaleString('tr-TR')} €
                        </span>
                        {videos.length > 0 && (
                          <span className="badge bg-danger d-flex align-items-center gap-1 shadow-sm small">
                            <i className="bi bi-play-circle-fill"></i> {videos.length} Video
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="fw-black text-dark mb-0 d-flex align-items-center gap-2">
                            <span>{player.first_name} {player.last_name}</span>
                            {(player.id === 1 || player.id === 2) && (
                              <i className="bi bi-patch-check-fill text-warning" title="Doğrulanmış Pro Profil"></i>
                            )}
                          </h5>
                          <small className="text-muted">{team?.name || 'Serbest Oyuncu'} • {player.nationality}</small>
                        </div>

                        {references.length > 0 && (
                          <span className="badge bg-success-subtle text-success border border-success d-flex align-items-center gap-1 small" title="Onaylı Referans Bulunuyor">
                            <i className="bi bi-patch-check-fill"></i> {references.length} Onaylı Ref
                          </span>
                        )}
                      </div>

                      {/* Multi-Positions preview */}
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {player.positions.map((pos) => (
                          <span key={pos} className="badge bg-light text-secondary border small" style={{ fontSize: '0.7rem' }}>
                            {pos}
                          </span>
                        ))}
                      </div>

                      {/* Physical Metrics Grid */}
                      <div className="row g-2 p-2 bg-light rounded text-center small mb-3">
                        <div className="col-4">
                          <span className="text-muted d-block">Boy</span>
                          <strong className="text-dark">{player.height} cm</strong>
                        </div>
                        <div className="col-4">
                          <span className="text-muted d-block">Kilo</span>
                          <strong className="text-dark">{player.weight} kg</strong>
                        </div>
                        <div className="col-4">
                          <span className="text-muted d-block">Ayak</span>
                          <strong className="text-dark">{player.preferred_foot}</strong>
                        </div>
                      </div>

                      {/* Bio snippet */}
                      <p className="text-muted small text-truncate-2 mb-3" style={{ height: '40px', overflow: 'hidden' }}>
                        {player.bio}
                      </p>

                      {/* Representative Contact info - Standard vs Premium differentiation */}
                      <div className="p-2 mb-3 rounded bg-light border small">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-person-badge text-primary me-1"></i> Temsilci:</span>
                          <span className="fw-semibold text-dark">Ahmet Bulut (FIFA Menajeri)</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-muted"><i className="bi bi-telephone text-secondary me-1"></i> İletişim:</span>
                          {isPremiumOrPro ? (
                            <span className="fw-bold text-success font-monospace">+90 532 999 1122</span>
                          ) : (
                            <span 
                              className="badge bg-warning text-dark cursor-pointer text-decoration-none"
                              onClick={(e) => { e.stopPropagation(); onOpenPricingModal(); }}
                              title="Numarayı görmek için Premium'a geçin"
                              role="button"
                            >
                              🔒 0532 *** ** ** (Premium ile Gör)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <button 
                          className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlayer(player);
                          }}
                        >
                          <i className="bi bi-person-vcard"></i>
                          <span>Profili İncele</span>
                        </button>

                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-info"
                            title="Özel Mesaj Gönder"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSendMessageToUser(player.user_id, player.id, `${player.first_name} ${player.last_name} Görüşmesi`);
                            }}
                          >
                            <i className="bi bi-chat-dots-fill"></i>
                          </button>
                          
                          {!isDeleted ? (
                            <>
                              {canUpdate && (
                                <button 
                                  className="btn btn-outline-secondary"
                                  title="Düzenle"
                                  onClick={(e) => handleOpenEdit(player, e)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  className="btn btn-outline-danger"
                                  title="Sil (Soft Delete)"
                                  onClick={(e) => handleSoftDelete(player, e)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </>
                          ) : (
                            <button 
                              className="btn btn-success"
                              title="Geri Yükle"
                              onClick={(e) => handleRestore(player, e)}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-uppercase small">
                <tr>
                  <th>Futbolcu</th>
                  <th>Kulüp</th>
                  <th>Mevki (Çoktan Seçmeli)</th>
                  <th>Boy / Kilo</th>
                  <th>Ayak</th>
                  <th>Doğum Tarihi</th>
                  <th>Piyasa Değeri</th>
                  <th>Referans & Video</th>
                  <th className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      Kayıtlı futbolcu bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => {
                    const team = player.current_team_id ? db.getTeamById(player.current_team_id) : null;
                    const isDeleted = Boolean(player.deleted_at);
                    const references = db.getReferences(player.id).filter(r => r.status === 'onaylandi');
                    const videos = db.getVideosByPlayer(player.id);

                    return (
                      <tr 
                        key={player.id} 
                        className={`cursor-pointer ${isDeleted ? 'table-danger bg-opacity-10 text-muted' : ''}`}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img 
                              src={player.photo} 
                              alt={player.first_name} 
                              className="rounded-3 border"
                              style={{ width: '44px', height: '44px', objectFit: 'cover' }}
                            />
                            <div>
                              <div className="fw-bold text-dark d-flex align-items-center gap-1">
                                {player.first_name} {player.last_name}
                                {isDeleted && <span className="badge bg-danger small">Silinmiş</span>}
                              </div>
                              <small className="text-muted">{player.nationality}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark">{team?.name || 'Serbest'}</span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '200px' }}>
                            {player.positions.map(p => (
                              <span key={p} className={`badge small ${p === player.primary_position ? 'bg-primary' : 'bg-light text-dark border'}`}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{player.height} cm / {player.weight} kg</td>
                        <td><span className="badge bg-light text-dark border">{player.preferred_foot}</span></td>
                        <td>{player.birth_date}</td>
                        <td>
                          <strong className="text-success">{player.market_value_eur.toLocaleString('tr-TR')} €</strong>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {references.length > 0 && (
                              <span className="badge bg-success-subtle text-success border border-success" title="Onaylı Referans">
                                <i className="bi bi-patch-check-fill"></i> {references.length}
                              </span>
                            )}
                            {videos.length > 0 && (
                              <span className="badge bg-danger-subtle text-danger border border-danger" title="Video">
                                <i className="bi bi-youtube"></i> {videos.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-end">
                          <button 
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayer(player);
                            }}
                          >
                            İncele
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
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          currentUser={currentUser}
          onClose={() => setSelectedPlayer(null)}
          onOpenSendMessageToUser={onOpenSendMessageToUser}
          onOpenPricingModal={onOpenPricingModal}
        />
      )}

      {/* Add / Edit Player Modal (Point 4) */}
      {playerModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-person-bounding-box text-primary"></i>
                  {editingPlayer ? 'Futbolcu Profilini Düzenle' : 'Yeni Futbolcu Tanımla (futbolcular Tablosu)'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPlayerModalOpen(false)}></button>
              </div>

              <form onSubmit={handleSavePlayer}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Ad *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Semih"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Soyad *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Kılıçsoy"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Doğum Tarihi *</label>
                      <input 
                        type="date" 
                        required 
                        className="form-control" 
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Boy (cm) *</label>
                      <input 
                        type="number" 
                        required 
                        min={140} 
                        max={220}
                        className="form-control" 
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Kilo (kg) *</label>
                      <input 
                        type="number" 
                        required 
                        min={45} 
                        max={130}
                        className="form-control" 
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Tercih Edilen Ayak *</label>
                      <select 
                        className="form-select"
                        value={formData.preferred_foot}
                        onChange={(e) => setFormData({ ...formData, preferred_foot: e.target.value as any })}
                      >
                        <option value="Sağ">Sağ Ayak</option>
                        <option value="Sol">Sol Ayak</option>
                        <option value="Her İkisi">Her İkisi</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Forma Numarası</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={99}
                        className="form-control" 
                        value={formData.jersey_number}
                        onChange={(e) => setFormData({ ...formData, jersey_number: Number(e.target.value) })}
                      />
                    </div>

                    {/* Point 4: Mevki (Çoktan Seçmeli) */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small d-flex justify-content-between">
                        <span>Oynayabildiği Mevkiler (Çoktan Seçmeli - En az bir tane seçiniz) *</span>
                        <span className="text-primary small">Seçilen: {formData.positions.join(', ')}</span>
                      </label>
                      <div className="p-3 bg-light rounded border d-flex flex-wrap gap-2">
                        {ALL_POSITIONS.map((pos) => {
                          const isChecked = formData.positions.includes(pos);
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => handlePositionToggle(pos)}
                              className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                            >
                              <i className={`bi ${isChecked ? 'bi-check-circle-fill' : 'bi-circle'} me-1`}></i>
                              {pos}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Birincil (Ana) Mevki *</label>
                      <select 
                        className="form-select"
                        value={formData.primary_position}
                        onChange={(e) => setFormData({ ...formData, primary_position: e.target.value as any })}
                      >
                        {formData.positions.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Mevcut Kulübü</label>
                      <select 
                        className="form-select"
                        value={formData.current_team_id || ''}
                        onChange={(e) => setFormData({ ...formData, current_team_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Kulüpsüz / Serbest</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.league})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Piyasa Değeri (€ Euro)</label>
                      <input 
                        type="number" 
                        min={0}
                        step={50000}
                        className="form-control" 
                        value={formData.market_value_eur}
                        onChange={(e) => setFormData({ ...formData, market_value_eur: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Fotoğraf URL *</label>
                      <input 
                        type="url" 
                        required 
                        className="form-control" 
                        placeholder="https://..."
                        value={formData.photo}
                        onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Uyruk</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Sözleşme Bitiş Tarihi</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.contract_until}
                        onChange={(e) => setFormData({ ...formData, contract_until: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small">Futbolcu Bilgileri & Oyun Stili</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        placeholder="Futbolcunun oyun karakteri, hızı, taktiksel disiplini ve güçlü yönleri..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      ></textarea>
                    </div>

                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setPlayerModalOpen(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle"></i>
                    <span>{editingPlayer ? 'Futbolcuyu Güncelle' : 'Futbolcuyu Kaydet'}</span>
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
