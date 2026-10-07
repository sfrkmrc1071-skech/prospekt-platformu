import React, { useState } from 'react';
import { 
  Player, 
  User, 
  PlayerPosition, 
  ActivityType, 
  RelationType, 
  VideoType,
  Foot
} from '../types';
import { db } from '../services/db';
import { PlayerPerformanceChart } from './PlayerPerformanceChart';

interface PlayerDetailModalProps {
  player: Player;
  currentUser: User;
  onClose: () => void;
  onOpenSendMessageToUser: (receiverId: number, playerId: number, defaultSubject?: string) => void;
  onOpenPricingModal?: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  currentUser,
  onClose,
  onOpenSendMessageToUser,
  onOpenPricingModal,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'performance' | 'videos' | 'references' | 'activities' | 'career' | 'reviews' | 'notes' | 'sponsors'>('profile');
  const isWatchlisted = db.isWatchlisted(currentUser.id, player.id);
  const isPremiumOrPro = currentUser.membership_tier === 'premium' || currentUser.membership_tier === 'pro_scout' || currentUser.role_id === 1;

  // Private Scout Notes State (Premium Perk)
  const scoutNotes = db.getScoutNotes(player.id, currentUser.id);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAction, setNewNoteAction] = useState<'izlemeye_al' | 'teklif_yap' | 'kiralik_dusun' | 'pas_gec'>('izlemeye_al');
  const [newNoteTag, setNewNoteTag] = useState('');

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    db.insertScoutNote({
      user_id: currentUser.id,
      player_id: player.id,
      note: newNoteText,
      recommended_action: newNoteAction,
      tags: newNoteTag ? newNoteTag.split(',').map(t => t.trim()).filter(Boolean) : ['Gözlem'],
    });
    setNewNoteText('');
    setNewNoteTag('');
  };

  const handleToggleWatchlist = () => {
    if (currentUser.membership_tier === 'standard' && currentUser.role_id !== 1) {
      if (onOpenPricingModal) {
        onOpenPricingModal();
      } else {
        alert('İzleme Listesi (Watchlist) özelliği Premium ve Pro Scout üyelere özeldir.');
      }
      return;
    }
    db.toggleWatchlist(currentUser.id, player.id);
  };

  // Video Form
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<VideoType>('highlight');
  const [videoDesc, setVideoDesc] = useState('');

  // Reference Form
  const [showAddRef, setShowAddRef] = useState(false);
  const [refereeUserId, setRefereeUserId] = useState<number>(2); // Default Fatih Terim
  const [relationType, setRelationType] = useState<RelationType>('Antrenör');
  const [refRequestMsg, setRefRequestMsg] = useState('');

  // Reference Approval Modal / State
  const [approvingRefId, setApprovingRefId] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Activity Form
  const [showAddAct, setShowAddAct] = useState(false);
  const [actSeason, setActSeason] = useState('2025/2026');
  const [actTeamId, setActTeamId] = useState<number>(player.current_team_id || 1);
  const [actOpponentId, setActOpponentId] = useState<number>(2);
  const [actType, setActType] = useState<ActivityType>('gol');
  const [actMinute, setActMinute] = useState<number>(45);
  const [actNotes, setActNotes] = useState('');
  const [actWeek, setActWeek] = useState('Hafta 12');

  // Career Form
  const [showAddCareer, setShowAddCareer] = useState(false);
  const [careerTeamId, setCareerTeamId] = useState<number>(1);
  const [careerStartYear, setCareerStartYear] = useState<number>(2022);
  const [careerEndYear, setCareerEndYear] = useState<string>('');
  const [careerPosition, setCareerPosition] = useState<PlayerPosition>(player.primary_position);
  const [careerAppearances, setCareerAppearances] = useState<number>(25);
  const [careerGoals, setCareerGoals] = useState<number>(5);
  const [careerAssists, setCareerAssists] = useState<number>(3);
  const [careerAchievements, setCareerAchievements] = useState('');

  // Review Form
  const [showAddReview, setShowAddReview] = useState(false);
  const [reviewOverall, setReviewOverall] = useState<number>(5);
  const [reviewTechnical, setReviewTechnical] = useState<number>(4);
  const [reviewPhysical, setReviewPhysical] = useState<number>(4);
  const [reviewMental, setReviewMental] = useState<number>(4);
  const [reviewVerdict, setReviewVerdict] = useState<'İlk 11 Oyuncusu' | 'Yüksek Potansiyelli Genç' | 'Gelişime Açık' | 'Yıldız Adayı' | 'Rotasyon Oyuncusu'>('İlk 11 Oyuncusu');
  const [reviewComment, setReviewComment] = useState('');

  // Data fetching
  const currentTeam = player.current_team_id ? db.getTeamById(player.current_team_id) : null;
  const videos = db.getVideosByPlayer(player.id);
  const references = db.getReferences(player.id);
  const activities = db.getActivitiesByPlayer(player.id);
  const careerHistories = db.getTeamHistoriesByPlayer(player.id);
  const reviews = db.getReviewsByPlayer(player.id);
  const allUsers = db.getUsers();
  const allTeams = db.getTeams();
  const playerUser = db.getUserById(player.user_id);

  // Age calculation
  const calculateAge = (birthDateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Video submit
  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim()) return;
    db.insertVideo({
      player_id: player.id,
      title: videoTitle,
      video_url: videoUrl,
      video_type: videoType,
      description: videoDesc,
      match_date: new Date().toISOString().split('T')[0],
    });
    setVideoTitle('');
    setVideoUrl('');
    setVideoDesc('');
    setShowAddVideo(false);
  };

  // Reference request submit
  const handleSaveReferenceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    db.requestReference({
      player_id: player.id,
      referee_user_id: refereeUserId,
      relation_type: relationType,
      request_message: refRequestMsg,
    });
    setRefRequestMsg('');
    setShowAddRef(false);
  };

  // Reference approval
  const handleApproveReference = (refId: number, status: 'onaylandi' | 'reddedildi') => {
    db.updateReferenceStatus(refId, status, approvalNotes || 'Onaylandı.');
    setApprovingRefId(null);
    setApprovalNotes('');
  };

  // Activity submit
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    db.insertActivity({
      player_id: player.id,
      season: actSeason,
      team_id: actTeamId,
      opponent_team_id: actOpponentId,
      activity_type: actType,
      minute: actMinute,
      match_week: actWeek,
      notes: actNotes,
    });
    setActNotes('');
    setShowAddAct(false);
  };

  // Career submit
  const handleSaveCareer = (e: React.FormEvent) => {
    e.preventDefault();
    db.insertTeamHistory({
      player_id: player.id,
      team_id: careerTeamId,
      start_year: careerStartYear,
      end_year: careerEndYear ? Number(careerEndYear) : null,
      position: careerPosition,
      appearances: careerAppearances,
      goals: careerGoals,
      assists: careerAssists,
      achievements: careerAchievements,
    });
    setCareerAchievements('');
    setShowAddCareer(false);
  };

  // Review submit
  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    db.insertReview({
      player_id: player.id,
      reviewer_user_id: currentUser.id,
      rating_overall: reviewOverall,
      rating_technical: reviewTechnical,
      rating_physical: reviewPhysical,
      rating_mental: reviewMental,
      scout_verdict: reviewVerdict,
      comment: reviewComment,
    });
    setReviewComment('');
    setShowAddReview(false);
  };

  // Average review
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating_overall, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="modal-header bg-dark text-white border-0 py-3 px-4 position-relative">
            <div className="d-flex align-items-center gap-3">
              <img 
                src={player.photo} 
                alt={`${player.first_name} ${player.last_name}`}
                className="rounded-3 border border-secondary shadow"
                style={{ width: '64px', height: '64px', objectFit: 'cover' }}
              />
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="modal-title fw-black mb-0 text-white">
                    {player.first_name} {player.last_name}
                  </h4>
                  {player.jersey_number && (
                    <span className="badge bg-secondary font-monospace">#{player.jersey_number}</span>
                  )}
                  <span className="badge bg-primary">{player.primary_position}</span>
                </div>
                <div className="text-secondary small mt-1 d-flex flex-wrap align-items-center gap-3">
                  <span><i className="bi bi-shield me-1"></i> {currentTeam?.name || 'Kulüpsüz / Serbest'}</span>
                  <span><i className="bi bi-geo me-1"></i> {player.nationality}</span>
                  <span><i className="bi bi-calendar me-1"></i> {calculateAge(player.birth_date)} Yaş ({player.birth_date})</span>
                  <span><i className="bi bi-currency-euro me-1"></i> {player.market_value_eur.toLocaleString('tr-TR')} €</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-1 ${isWatchlisted ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning'}`}
                onClick={handleToggleWatchlist}
                title={isWatchlisted ? 'İzleme listenizden çıkarın' : 'İzleme listenize ekleyin (Premium)'}
              >
                <i className={`bi ${isWatchlisted ? 'bi-bookmark-star-fill' : 'bi-bookmark-plus'}`}></i>
                <span>{isWatchlisted ? 'İzleme Listenizde' : 'İzleme Listesine Ekle'}</span>
              </button>

              <button 
                type="button" 
                className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
                onClick={() => {
                  onClose();
                  onOpenSendMessageToUser(player.user_id, player.id, `${player.first_name} ${player.last_name} Hakkında Scout Görüşmesi`);
                }}
              >
                <i className="bi bi-chat-dots-fill text-info"></i>
                <span>Özel Mesaj Gönder</span>
              </button>

              <button type="button" className="btn-close btn-close-white ms-2" onClick={onClose}></button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-light border-bottom px-4 pt-2">
            <ul className="nav nav-tabs border-0 gap-1">
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'profile' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <i className="bi bi-person-lines-fill me-1"></i> Genel Bilgiler
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 d-flex align-items-center gap-1 ${activeTab === 'performance' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('performance')}
                >
                  <i className="bi bi-graph-up-arrow text-success"></i>
                  <span>Sezonluk Performans Grafiği</span>
                  <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.65rem' }}>
                    Recharts
                  </span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'videos' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('videos')}
                >
                  <i className="bi bi-play-circle-fill me-1"></i> Videolar & Özetler ({videos.length})
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'references' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('references')}
                >
                  <i className="bi bi-patch-check-fill me-1"></i> Onaylı Referanslar ({references.filter(r => r.status === 'onaylandi').length})
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'activities' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('activities')}
                >
                  <i className="bi bi-lightning-charge-fill me-1"></i> Maç Aktiviteleri ({activities.length})
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'career' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('career')}
                >
                  <i className="bi bi-clock-history me-1"></i> Geçmiş Takımlar ({careerHistories.length})
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 ${activeTab === 'reviews' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  <i className="bi bi-star-fill text-warning me-1"></i> Değerlendirmeler ({reviews.length})
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 d-flex align-items-center gap-1 ${activeTab === 'notes' ? 'active bg-white text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('notes')}
                >
                  <i className="bi bi-journal-text text-warning"></i>
                  <span>Özel Scout Notlarım</span>
                  <span className={`badge ${isPremiumOrPro ? 'bg-warning text-dark' : 'bg-secondary text-white'}`} style={{ fontSize: '0.65rem' }}>
                    {isPremiumOrPro ? scoutNotes.length : '🔒'}
                  </span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link fw-semibold border-0 py-2 px-3 d-flex align-items-center gap-1 ${activeTab === 'sponsors' ? 'active bg-white text-success border-bottom border-success border-3' : 'text-secondary'}`}
                  onClick={() => setActiveTab('sponsors')}
                >
                  <i className="bi bi-shield-shaded text-success"></i>
                  <span>Sponsorluk & Tesisler</span>
                  <span className="badge bg-success text-white" style={{ fontSize: '0.65rem' }}>
                    FIRSAT
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-white" style={{ minHeight: '480px' }}>
            
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div>
                <div className="row g-4">
                  {/* Left Column: Metrics & Position Radar */}
                  <div className="col-md-5">
                    <div className="card shadow-sm border-0 bg-light mb-3">
                      <div className="card-body">
                        <h6 className="fw-bold text-dark mb-3">Fiziksel & Teknik Özellikler</h6>
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="p-2 bg-white rounded border">
                              <small className="text-muted d-block">Boy</small>
                              <strong className="fs-5 text-dark">{player.height} cm</strong>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 bg-white rounded border">
                              <small className="text-muted d-block">Kilo</small>
                              <strong className="fs-5 text-dark">{player.weight} kg</strong>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 bg-white rounded border">
                              <small className="text-muted d-block">Tercih Edilen Ayak</small>
                              <strong className="fs-6 text-dark">{player.preferred_foot}</strong>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 bg-white rounded border">
                              <small className="text-muted d-block">Doğum Tarihi</small>
                              <strong className="fs-6 text-dark">{player.birth_date}</strong>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="p-2 bg-white rounded border">
                              <small className="text-muted d-block">Sözleşme Bitiş</small>
                              <strong className="fs-6 text-dark">{player.contract_until || 'Belirtilmemiş'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Positions Card (Point 4: Çoktan Seçmeli Mevkiler) */}
                    <div className="card shadow-sm border-0 mb-3">
                      <div className="card-body">
                        <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                          <i className="bi bi-grid-3x3-gap-fill text-primary"></i>
                          Oynayabildiği Mevkiler (Çoktan Seçmeli)
                        </h6>
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {player.positions.map((pos) => {
                            const isPrimary = pos === player.primary_position;
                            return (
                              <span 
                                key={pos} 
                                className={`badge p-2 px-3 rounded-pill ${isPrimary ? 'bg-primary text-white shadow-sm' : 'bg-light text-dark border'}`}
                              >
                                {isPrimary ? '★ ' : ''}{pos} {isPrimary ? '(Birincil)' : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Quick Audit Box */}
                    <div className="p-3 rounded bg-light border small text-muted">
                      <div className="fw-bold text-dark mb-1"><i className="bi bi-database me-1"></i> MySQL Denetim İzi:</div>
                      <div><strong>Oluşturulma:</strong> {new Date(player.created_at).toLocaleString('tr-TR')}</div>
                      <div><strong>Oluşturan:</strong> User #{player.created_by || 1}</div>
                      <div><strong>Son Güncelleme:</strong> {new Date(player.updated_at).toLocaleString('tr-TR')}</div>
                      <div><strong>Soft Delete:</strong> {player.deleted_at ? 'Silinmiş' : 'Aktif (Hayır)'}</div>
                    </div>
                  </div>

                  {/* Right Column: Bio, Scouts Summary, Club */}
                  <div className="col-md-7">
                    <div className="card shadow-sm border-0 mb-3">
                      <div className="card-body">
                        <h6 className="fw-bold text-dark mb-2">Futbolcu Biyografisi & Oyun Stili</h6>
                        <p className="text-secondary leading-relaxed mb-3">
                          {player.bio || 'Henüz detaylı biyografi eklenmemiş.'}
                        </p>

                        <div className="row g-2 pt-2 border-top">
                          <div className="col-sm-6">
                            <span className="text-muted small">Mevcut Kulüp:</span>
                            <div className="fw-bold text-dark">{currentTeam?.name || 'Serbest Oyuncu'}</div>
                          </div>
                          <div className="col-sm-6">
                            <span className="text-muted small">Piyasa Değeri:</span>
                            <div className="fw-bold text-success fs-5">{player.market_value_eur.toLocaleString('tr-TR')} €</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ratings Overview Summary */}
                    <div className="card shadow-sm border-0 mb-3 bg-light">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold text-dark mb-0">Scout & Değerlendirme Puanı</h6>
                          {averageRating && (
                            <span className="badge bg-warning text-dark fs-6">
                              ★ {averageRating} / 5.0
                            </span>
                          )}
                        </div>
                        <p className="text-muted small mb-3">
                          Bu futbolcu için toplam <strong>{reviews.length}</strong> scout değerlendirmesi ve <strong>{references.filter(r => r.status === 'onaylandi').length}</strong> onaylı antrenör referansı bulunmaktadır.
                        </p>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setActiveTab('reviews')}
                          >
                            Tüm Değerlendirmeleri İncele
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setActiveTab('references')}
                          >
                            Referansları Gör
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                            onClick={() => setActiveTab('performance')}
                          >
                            <i className="bi bi-graph-up-arrow"></i>
                            <span>Performans Trendi</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pro Scout & Premium Radar Analysis Card */}
                    <div className="card shadow-sm border-0 mb-3 overflow-hidden">
                      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2 px-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-pie-chart-fill text-warning"></i>
                          <strong className="small">Pro Scout Derin Radar & Veri Analizi</strong>
                        </div>
                        {isPremiumOrPro ? (
                          <span className="badge bg-warning text-dark small">👑 VIP Scout Erişimi</span>
                        ) : (
                          <span className="badge bg-secondary text-white small">🔒 Premium Özellik</span>
                        )}
                      </div>

                      <div className="card-body p-3">
                        {isPremiumOrPro ? (
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span className="small text-muted">Scout Algoritması Analitik Puanları:</span>
                              <span className="badge bg-success-subtle text-success border border-success">
                                Güven Skoru: %94
                              </span>
                            </div>

                            {/* Radar Skill Progress Bars */}
                            <div className="d-flex flex-column gap-2 mb-3">
                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-lightning-charge text-warning me-1"></i> Sürat & Patlayıcı İvmelenme</span>
                                  <strong>92 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-warning" style={{ width: '92%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-bullseye text-danger me-1"></i> Şut & Ceza Sahası Bitiriciliği</span>
                                  <strong>88 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-danger" style={{ width: '88%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-diagram-3 text-primary me-1"></i> Saha Görüşü & Kilit Pas Kalitesi</span>
                                  <strong>90 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-primary" style={{ width: '90%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-shuffle text-info me-1"></i> Birebir Dripling & Dar Alan Çıkışları</span>
                                  <strong>94 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-info" style={{ width: '94%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-shield text-secondary me-1"></i> Savunma Pres Katkısı & Top Kapma</span>
                                  <strong>62 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-secondary" style={{ width: '62%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span><i className="bi bi-heart-pulse text-success me-1"></i> 90 Dakika Fiziki Dayanıklılık</span>
                                  <strong>86 / 100</strong>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div className="progress-bar bg-success" style={{ width: '86%' }}></div>
                                </div>
                              </div>
                            </div>

                            {/* Dossier Download Action */}
                            <div className="p-3 bg-light rounded border d-flex flex-wrap justify-content-between align-items-center gap-2">
                              <div>
                                <div className="fw-bold text-dark small">Resmi Kulüp Scouting Raporu</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  Tüm metrikler ve antrenör tavsiyeleriyle hazırlanmış teknik dosya.
                                </div>
                              </div>
                              <button 
                                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                onClick={() => {
                                  const text = `PROSPEKT SCOUT RAPORU\nFutbolcu: ${player.first_name} ${player.last_name}\nMevki: ${player.primary_position}\nPiyasa Değeri: ${player.market_value_eur} EUR\nSürat: 92/100, Bitiricilik: 88/100, Pas: 90/100, Dripling: 94/100\nUyruk: ${player.nationality}\nDoğum Tarihi: ${player.birth_date}`;
                                  const blob = new Blob([text], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `scout_raporu_${player.first_name}_${player.last_name}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <i className="bi bi-file-earmark-arrow-down-fill"></i>
                                <span>Scout Dosyasını İndir</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 px-2 position-relative bg-light rounded">
                            <div className="opacity-25 filter blur-sm">
                              <div className="progress mb-2" style={{ height: '6px' }}><div className="progress-bar w-75"></div></div>
                              <div className="progress mb-2" style={{ height: '6px' }}><div className="progress-bar w-50"></div></div>
                              <div className="progress mb-2" style={{ height: '6px' }}><div className="progress-bar w-90"></div></div>
                            </div>
                            <div className="my-2">
                              <i className="bi bi-lock-fill fs-2 text-warning"></i>
                              <h6 className="fw-bold text-dark mt-2 mb-1">Bu Alan Premium Üyelere Özeldir</h6>
                              <p className="text-muted small mb-3">
                                6 Boyutlu Scout Radar grafikleri, gizli performans metrikleri ve indirilebilir transfer raporu için Pro Scout planına geçin.
                              </p>
                              <button 
                                className="btn btn-sm btn-warning text-dark fw-bold px-3 py-2 shadow-sm rounded-pill"
                                onClick={() => onOpenPricingModal && onOpenPricingModal()}
                              >
                                <i className="bi bi-gem me-1"></i> Premium Planları İncele & Yükselt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instagram or Social */}
                    {player.instagram_handle && (
                      <div className="p-3 bg-white rounded border d-flex align-items-center justify-content-between">
                        <span className="text-muted small"><i className="bi bi-instagram me-1 text-danger"></i> Sosyal Medya:</span>
                        <strong className="text-dark font-monospace">{player.instagram_handle}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SEASONAL PERFORMANCE CHART (Recharts) */}
            {activeTab === 'performance' && (
              <PlayerPerformanceChart
                player={player}
                activities={activities}
                careerHistories={careerHistories}
                onOpenAddActivity={() => {
                  setShowAddAct(true);
                  setActiveTab('activities');
                }}
              />
            )}

            {/* TAB 2: VIDEOS (Point 5) */}
            {activeTab === 'videos' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Futbolcu Video Arşivi</h5>
                    <p className="text-muted small mb-0">
                      Futbolcunun maç özetleri, highlight ve scout klipleri linkleri.
                    </p>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={() => setShowAddVideo(!showAddVideo)}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span>Yeni Video Ekle</span>
                  </button>
                </div>

                {/* Add Video Form */}
                {showAddVideo && (
                  <div className="card shadow-sm border-0 mb-4 bg-light">
                    <div className="card-body">
                      <h6 className="fw-bold text-dark mb-3">Yeni Video Linki Ekle (player_videos Tablosu)</h6>
                      <form onSubmit={handleSaveVideo}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Video Başlığı *</label>
                            <input 
                              type="text" 
                              required 
                              className="form-control" 
                              placeholder="Örn: 2025/2026 Sezonu Golleri ve Asistleri"
                              value={videoTitle}
                              onChange={(e) => setVideoTitle(e.target.value)}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Video URL (YouTube / Scout Linki) *</label>
                            <input 
                              type="url" 
                              required 
                              className="form-control" 
                              placeholder="https://www.youtube.com/watch?v=..."
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Video Türü</label>
                            <select 
                              className="form-select"
                              value={videoType}
                              onChange={(e) => setVideoType(e.target.value as any)}
                            >
                              <option value="highlight">Özet & Goller (Highlight)</option>
                              <option value="match_clip">Maç Kesiti (Match Clip)</option>
                              <option value="training">Antrenman & Bireysel Çalışma</option>
                              <option value="scout_report">Scout Analiz Klibi</option>
                            </select>
                          </div>
                          <div className="col-md-8">
                            <label className="form-label small fw-semibold">Açıklama / Notlar</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="Klip içeriği hakkında kısa not..."
                              value={videoDesc}
                              onChange={(e) => setVideoDesc(e.target.value)}
                            />
                          </div>
                          <div className="col-12 text-end">
                            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={() => setShowAddVideo(false)}>İptal</button>
                            <button type="submit" className="btn btn-sm btn-primary">Videoyu Kaydet</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Video List */}
                <div className="row g-3">
                  {videos.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                      <i className="bi bi-play-btn fs-1 d-block mb-2"></i>
                      Henüz video linki eklenmemiş.
                    </div>
                  ) : (
                    videos.map((vid) => (
                      <div className="col-md-6" key={vid.id}>
                        <div className="card h-100 shadow-sm border-0">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                {vid.video_type.toUpperCase()}
                              </span>
                              <small className="text-muted">{vid.duration || 'Video Linki'}</small>
                            </div>
                            <h6 className="fw-bold text-dark mb-1">{vid.title}</h6>
                            <p className="text-muted small mb-3">{vid.description || 'Açıklama yok'}</p>
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <a 
                                href={vid.video_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
                              >
                                <i className="bi bi-youtube"></i>
                                <span>Videoyu İzle / Linke Git</span>
                              </a>
                              <button 
                                className="btn btn-sm btn-outline-danger" 
                                title="Videoyu Sil (Soft Delete)"
                                onClick={() => db.softDeleteVideo(vid.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REFERENCES (Point 6) */}
            {activeTab === 'references' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Onaylı Referanslar Sistemi</h5>
                    <p className="text-muted small mb-0">
                      Futbolcunun sistemdeki antrenör, teknik direktör veya yöneticilerden talep ettiği ve onaylanan referanslar.
                    </p>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={() => setShowAddRef(!showAddRef)}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span>Referans Talep Et</span>
                  </button>
                </div>

                {/* Add Reference Request Form */}
                {showAddRef && (
                  <div className="card shadow-sm border-0 mb-4 bg-light">
                    <div className="card-body">
                      <h6 className="fw-bold text-dark mb-3">Sistem Kullanıcısından Referans Talep Et (player_references)</h6>
                      <form onSubmit={handleSaveReferenceRequest}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Referans İstenen Kullanıcı *</label>
                            <select 
                              className="form-select"
                              value={refereeUserId}
                              onChange={(e) => setRefereeUserId(Number(e.target.value))}
                            >
                              {allUsers.filter(u => u.id !== player.user_id).map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.club_name || db.getRole(u.role_id)?.name})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">İlişki Türü *</label>
                            <select 
                              className="form-select"
                              value={relationType}
                              onChange={(e) => setRelationType(e.target.value as any)}
                            >
                              <option value="Eski Teknik Direktör">Eski Teknik Direktör</option>
                              <option value="Antrenör">Antrenör</option>
                              <option value="Kulüp Yöneticisi">Kulüp Yöneticisi</option>
                              <option value="Takım Kaptanı">Takım Kaptanı</option>
                              <option value="Scout / Gözlemci">Scout / Gözlemci</option>
                              <option value="Menajer">Menajer</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-semibold">Talep Mesajınız</label>
                            <textarea 
                              className="form-control" 
                              rows={2}
                              placeholder="Hocam sayfamda referansınızın yer alması için onayınızı rica ediyorum..."
                              value={refRequestMsg}
                              onChange={(e) => setRefRequestMsg(e.target.value)}
                            ></textarea>
                          </div>
                          <div className="col-12 text-end">
                            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={() => setShowAddRef(false)}>İptal</button>
                            <button type="submit" className="btn btn-sm btn-primary">Referans Talebini Gönder</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* References List */}
                <div className="row g-3">
                  {references.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                      <i className="bi bi-patch-question fs-1 d-block mb-2"></i>
                      Henüz referans kaydı bulunmamaktadır.
                    </div>
                  ) : (
                    references.map((ref) => {
                      const referee = db.getUserById(ref.referee_user_id);
                      const isPending = ref.status === 'beklemede';
                      const isApproved = ref.status === 'onaylandi';
                      const isCurrentUserReferee = currentUser.id === ref.referee_user_id;

                      return (
                        <div className="col-md-6" key={ref.id}>
                          <div className={`card h-100 shadow-sm border ${isApproved ? 'border-success-subtle bg-white' : isPending ? 'border-warning-subtle bg-light' : 'border-danger-subtle'}`}>
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <img 
                                    src={referee?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80'} 
                                    alt={referee?.name}
                                    className="rounded-circle border"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                  <div>
                                    <h6 className="fw-bold text-dark mb-0">{referee?.name || 'Sistem Kullanıcısı'}</h6>
                                    <small className="text-muted">{ref.relation_type} • {referee?.club_name}</small>
                                  </div>
                                </div>

                                {isApproved && (
                                  <span className="badge bg-success-subtle text-success border border-success d-flex align-items-center gap-1">
                                    <i className="bi bi-patch-check-fill"></i> Onaylı Referans
                                  </span>
                                )}
                                {isPending && (
                                  <span className="badge bg-warning-subtle text-warning border border-warning d-flex align-items-center gap-1">
                                    <i className="bi bi-clock-history"></i> Onay Bekliyor
                                  </span>
                                )}
                                {ref.status === 'reddedildi' && (
                                  <span className="badge bg-danger-subtle text-danger border border-danger">
                                    Reddedildi
                                  </span>
                                )}
                              </div>

                              {ref.request_message && (
                                <div className="p-2 bg-light rounded text-muted small mb-2 border">
                                  <strong>Talep Mesajı:</strong> "{ref.request_message}"
                                </div>
                              )}

                              {isApproved && ref.notes && (
                                <blockquote className="border-start border-3 border-success ps-3 my-2 text-dark small fst-italic">
                                  "{ref.notes}"
                                </blockquote>
                              )}

                              <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top small text-muted">
                                <span>{ref.decision_date ? `Onay: ${ref.decision_date}` : `Talep: ${new Date(ref.created_at).toLocaleDateString('tr-TR')}`}</span>

                                {/* If current user is the referee and it's pending, allow approve/reject */}
                                {isPending && (isCurrentUserReferee || currentUser.role_id === 1) && (
                                  <div className="btn-group btn-group-sm">
                                    <button 
                                      className="btn btn-outline-success"
                                      onClick={() => {
                                        const note = window.prompt('Referans onay notunuzu / futbolcu hakkındaki görüşünüzü yazın:');
                                        if (note !== null) {
                                          db.updateReferenceStatus(ref.id, 'onaylandi', note || 'Referans onaylandı.');
                                        }
                                      }}
                                    >
                                      <i className="bi bi-check-lg me-1"></i> Onayla
                                    </button>
                                    <button 
                                      className="btn btn-outline-danger"
                                      onClick={() => db.updateReferenceStatus(ref.id, 'reddedildi', 'Uygun görülmedi.')}
                                    >
                                      Reddet
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: MATCH ACTIVITIES (Point 7) */}
            {activeTab === 'activities' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Maç Aktiviteleri Tablosu</h5>
                    <p className="text-muted small mb-0">
                      Futbolcunun maçlarda sergilediği gol, asist, kurtarış ve dakika kayıtları.
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button 
                      className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                      onClick={() => setActiveTab('performance')}
                    >
                      <i className="bi bi-graph-up-arrow"></i>
                      <span>Performans Grafiğini Aç</span>
                    </button>
                    <button 
                      className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                      onClick={() => setShowAddAct(!showAddAct)}
                    >
                      <i className="bi bi-plus-lg"></i>
                      <span>Aktivite Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Add Activity Form */}
                {showAddAct && (
                  <div className="card shadow-sm border-0 mb-4 bg-light">
                    <div className="card-body">
                      <h6 className="fw-bold text-dark mb-3">Yeni Maç Aktivitesi Kaydı (player_activities)</h6>
                      <form onSubmit={handleSaveActivity}>
                        <div className="row g-3">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Sezon</label>
                            <input 
                              type="text" 
                              required 
                              className="form-control" 
                              value={actSeason} 
                              onChange={(e) => setActSeason(e.target.value)} 
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Oynadığı Takım</label>
                            <select 
                              className="form-select"
                              value={actTeamId}
                              onChange={(e) => setActTeamId(Number(e.target.value))}
                            >
                              {allTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Karşı Takım (Rakip)</label>
                            <select 
                              className="form-select"
                              value={actOpponentId}
                              onChange={(e) => setActOpponentId(Number(e.target.value))}
                            >
                              {allTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Aktivite Türü</label>
                            <select 
                              className="form-select"
                              value={actType}
                              onChange={(e) => setActType(e.target.value as any)}
                            >
                              <option value="gol">⚽ Gol</option>
                              <option value="asist">👟 Asist</option>
                              <option value="kurtaris">🧤 Kurtarış</option>
                              <option value="penalti_kurtarisi">🎯 Penaltı Kurtarışı</option>
                              <option value="sari_kart">🟨 Sarı Kart</option>
                              <option value="kirmizi_kart">🟥 Kırmızı Kart</option>
                              <option value="macin_adami">⭐ Maçın Adamı</option>
                              <option value="temiz_sayfa">🛡️ Temiz Sayfa (Clean Sheet)</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold">Dakika</label>
                            <input 
                              type="number" 
                              min={1} 
                              max={120} 
                              required 
                              className="form-control" 
                              value={actMinute}
                              onChange={(e) => setActMinute(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Hafta / Tur</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="Örn: Hafta 18"
                              value={actWeek}
                              onChange={(e) => setActWeek(e.target.value)}
                            />
                          </div>
                          <div className="col-md-7">
                            <label className="form-label small fw-semibold">Detay Açıklama</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="Örn: 20 metreden sert şut, ceza sahası dışından"
                              value={actNotes}
                              onChange={(e) => setActNotes(e.target.value)}
                            />
                          </div>
                          <div className="col-12 text-end">
                            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={() => setShowAddAct(false)}>İptal</button>
                            <button type="submit" className="btn btn-sm btn-primary">Aktiviteyi Kaydet</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Table of Activities */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light small">
                      <tr>
                        <th>Sezon</th>
                        <th>Hafta</th>
                        <th>Oynadığı Takım</th>
                        <th>Karşı Takım (Rakip)</th>
                        <th>Aktivite Türü</th>
                        <th>Dakika</th>
                        <th>Açıklama</th>
                        <th className="text-end">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-muted">
                            Kayıtlı aktivite bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        activities.map((act) => {
                          const team = db.getTeamById(act.team_id);
                          const opponent = db.getTeamById(act.opponent_team_id);

                          return (
                            <tr key={act.id}>
                              <td className="fw-semibold">{act.season}</td>
                              <td>{act.match_week || '-'}</td>
                              <td><strong>{team?.name || '-'}</strong></td>
                              <td><span className="text-muted">vs</span> <strong>{opponent?.name || '-'}</strong></td>
                              <td>
                                <span className={`badge ${
                                  act.activity_type === 'gol' ? 'bg-success' :
                                  act.activity_type === 'asist' ? 'bg-primary' :
                                  act.activity_type === 'kurtaris' ? 'bg-info text-dark' :
                                  act.activity_type === 'sari_kart' ? 'bg-warning text-dark' :
                                  act.activity_type === 'kirmizi_kart' ? 'bg-danger' : 'bg-dark'
                                }`}>
                                  {act.activity_type.toUpperCase()}
                                </span>
                              </td>
                              <td><span className="badge bg-light text-dark border">{act.minute}'</span></td>
                              <td className="small text-muted">{act.notes || '-'}</td>
                              <td className="text-end">
                                <button 
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  onClick={() => db.softDeleteActivity(act.id)}
                                  title="Sil"
                                >
                                  <i className="bi bi-trash"></i>
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

            {/* TAB 5: CAREER & TEAM HISTORIES (Point 8) */}
            {activeTab === 'career' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Geçmiş Takımlar & Kariyer Geçmişi</h5>
                    <p className="text-muted small mb-0">
                      Futbolcunun forma giydiği takımlar, başlangıç-bitiş yılları ve istatistikleri (futbolcu_takim tablosu).
                    </p>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={() => setShowAddCareer(!showAddCareer)}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span>Kariyer Kaydı Ekle</span>
                  </button>
                </div>

                {/* Add Career Form */}
                {showAddCareer && (
                  <div className="card shadow-sm border-0 mb-4 bg-light">
                    <div className="card-body">
                      <h6 className="fw-bold text-dark mb-3">Kariyer Takımı Ekle (player_team_histories)</h6>
                      <form onSubmit={handleSaveCareer}>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Takım *</label>
                            <select 
                              className="form-select"
                              value={careerTeamId}
                              onChange={(e) => setCareerTeamId(Number(e.target.value))}
                            >
                              {allTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold">Başlangıç Yılı</label>
                            <input 
                              type="number" 
                              required 
                              min={2000} 
                              max={2030} 
                              className="form-control" 
                              value={careerStartYear}
                              onChange={(e) => setCareerStartYear(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold">Bitiş Yılı</label>
                            <input 
                              type="number" 
                              min={2000} 
                              max={2030} 
                              className="form-control" 
                              placeholder="Hala Takımda"
                              value={careerEndYear}
                              onChange={(e) => setCareerEndYear(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Oynadığı Mevki</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={careerPosition}
                              onChange={(e) => setCareerPosition(e.target.value as any)}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Maç Sayısı</label>
                            <input 
                              type="number" 
                              min={0} 
                              className="form-control" 
                              value={careerAppearances}
                              onChange={(e) => setCareerAppearances(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Gol Sayısı</label>
                            <input 
                              type="number" 
                              min={0} 
                              className="form-control" 
                              value={careerGoals}
                              onChange={(e) => setCareerGoals(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Asist Sayısı</label>
                            <input 
                              type="number" 
                              min={0} 
                              className="form-control" 
                              value={careerAssists}
                              onChange={(e) => setCareerAssists(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Kazanılan Kupalar / Başarı</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="Örn: 1x Lig Şampiyonu"
                              value={careerAchievements}
                              onChange={(e) => setCareerAchievements(e.target.value)}
                            />
                          </div>
                          <div className="col-12 text-end">
                            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={() => setShowAddCareer(false)}>İptal</button>
                            <button type="submit" className="btn btn-sm btn-primary">Kaydet</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Career Table */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light small">
                      <tr>
                        <th>Dönem</th>
                        <th>Kulüp</th>
                        <th>Mevki</th>
                        <th>Maç</th>
                        <th>Gol</th>
                        <th>Asist</th>
                        <th>Kupalar / Başarılar</th>
                        <th className="text-end">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {careerHistories.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-muted">
                            Kariyer geçmişi kaydı bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        careerHistories.map((hist) => {
                          const team = db.getTeamById(hist.team_id);
                          return (
                            <tr key={hist.id}>
                              <td className="fw-bold font-monospace">
                                {hist.start_year} - {hist.end_year || 'Günümüz'}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {team?.logo && (
                                    <img src={team.logo} alt={team.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                  )}
                                  <strong>{team?.name || '-'}</strong>
                                </div>
                              </td>
                              <td><span className="badge bg-light text-dark border">{hist.position}</span></td>
                              <td>{hist.appearances}</td>
                              <td><strong className="text-success">{hist.goals}</strong></td>
                              <td><strong className="text-primary">{hist.assists}</strong></td>
                              <td><small className="text-muted">{hist.achievements || '-'}</small></td>
                              <td className="text-end">
                                <button 
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  onClick={() => db.softDeleteTeamHistory(hist.id)}
                                >
                                  <i className="bi bi-trash"></i>
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

            {/* TAB 6: REVIEWS & RATINGS (Point 9) */}
            {activeTab === 'reviews' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Scout Değerlendirmeleri & Yıldızlama</h5>
                    <p className="text-muted small mb-0">
                      Kullanıcıların ve scout gözlemcilerinin futbolcuyu 1-5 yıldızla derecelendirmesi ve yorumları.
                    </p>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={() => setShowAddReview(!showAddReview)}
                  >
                    <i className="bi bi-star-fill text-warning"></i>
                    <span>Değerlendirme Yaz</span>
                  </button>
                </div>

                {/* Add Review Form */}
                {showAddReview && (
                  <div className="card shadow-sm border-0 mb-4 bg-light">
                    <div className="card-body">
                      <h6 className="fw-bold text-dark mb-3">Yeni Scout Raporu & Puanlama (player_reviews)</h6>
                      <form onSubmit={handleSaveReview}>
                        <div className="row g-3">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Genel Puan (1-5 Yıldız) *</label>
                            <select 
                              className="form-select"
                              value={reviewOverall}
                              onChange={(e) => setReviewOverall(Number(e.target.value))}
                            >
                              <option value={5}>★★★★★ 5 - Dünya Çapında / Elit</option>
                              <option value={4}>★★★★☆ 4 - Üst Düzey / Kaliteli</option>
                              <option value={3}>★★★☆☆ 3 - Lig Standardı</option>
                              <option value={2}>★★☆☆☆ 2 - Gelişmesi Gerekiyor</option>
                              <option value={1}>★☆☆☆☆ 1 - Yetersiz</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Teknik Puan (1-5)</label>
                            <input 
                              type="range" 
                              className="form-range" 
                              min={1} 
                              max={5} 
                              value={reviewTechnical} 
                              onChange={(e) => setReviewTechnical(Number(e.target.value))} 
                            />
                            <div className="small text-muted text-center fw-bold">{reviewTechnical} / 5</div>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Fiziksel Puan (1-5)</label>
                            <input 
                              type="range" 
                              className="form-range" 
                              min={1} 
                              max={5} 
                              value={reviewPhysical} 
                              onChange={(e) => setReviewPhysical(Number(e.target.value))} 
                            />
                            <div className="small text-muted text-center fw-bold">{reviewPhysical} / 5</div>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Mental & Taktik (1-5)</label>
                            <input 
                              type="range" 
                              className="form-range" 
                              min={1} 
                              max={5} 
                              value={reviewMental} 
                              onChange={(e) => setReviewMental(Number(e.target.value))} 
                            />
                            <div className="small text-muted text-center fw-bold">{reviewMental} / 5</div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Scout Kararı (Verdict) *</label>
                            <select 
                              className="form-select"
                              value={reviewVerdict}
                              onChange={(e) => setReviewVerdict(e.target.value as any)}
                            >
                              <option value="İlk 11 Oyuncusu">İlk 11 Oyuncusu</option>
                              <option value="Yüksek Potansiyelli Genç">Yüksek Potansiyelli Genç</option>
                              <option value="Yıldız Adayı">Yıldız Adayı</option>
                              <option value="Gelişime Açık">Gelişime Açık</option>
                              <option value="Rotasyon Oyuncusu">Rotasyon Oyuncusu</option>
                            </select>
                          </div>
                          <div className="col-md-8">
                            <label className="form-label small fw-semibold">Detaylı Scout Yorumu *</label>
                            <textarea 
                              required 
                              rows={2} 
                              className="form-control" 
                              placeholder="Oyuncunun güçlü yönleri, karar verme hızı, pozisyon alma bilgisi..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                            ></textarea>
                          </div>
                          <div className="col-12 text-end">
                            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={() => setShowAddReview(false)}>İptal</button>
                            <button type="submit" className="btn btn-sm btn-primary">Değerlendirmeyi Yayınla</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                <div className="d-flex flex-column gap-3">
                  {reviews.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-star fs-1 d-block mb-2"></i>
                      Henüz değerlendirme yapılmamış.
                    </div>
                  ) : (
                    reviews.map((rev) => {
                      const reviewer = db.getUserById(rev.reviewer_user_id);
                      return (
                        <div className="card shadow-sm border-0" key={rev.id}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <img 
                                  src={reviewer?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'} 
                                  alt={reviewer?.name}
                                  className="rounded-circle border"
                                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                />
                                <div>
                                  <h6 className="fw-bold text-dark mb-0">{reviewer?.name || 'Scout Gözlemcisi'}</h6>
                                  <small className="text-muted">{reviewer?.club_name || db.getRole(reviewer?.role_id || 2)?.name}</small>
                                </div>
                              </div>

                              <div className="text-end">
                                <div className="text-warning fs-5">
                                  {'★'.repeat(rev.rating_overall)}
                                  {'☆'.repeat(5 - rev.rating_overall)}
                                </div>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                                  {rev.scout_verdict}
                                </span>
                              </div>
                            </div>

                            <p className="text-dark small my-2 leading-relaxed">
                              {rev.comment}
                            </p>

                            <div className="d-flex flex-wrap gap-2 pt-2 border-top small text-muted">
                              <span className="badge bg-light text-secondary border">Teknik: {rev.rating_technical}/5</span>
                              <span className="badge bg-light text-secondary border">Fizik: {rev.rating_physical}/5</span>
                              <span className="badge bg-light text-secondary border">Mental: {rev.rating_mental}/5</span>
                              <span className="ms-auto">{new Date(rev.created_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: PRIVATE SCOUT NOTES (PREMIUM & PRO PERK) */}
            {activeTab === 'notes' && (
              <div>
                {!isPremiumOrPro ? (
                  <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
                    <div className="mx-auto bg-warning bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                      <i className="bi bi-lock-fill fs-1 text-warning"></i>
                    </div>
                    <h4 className="fw-black text-dark mb-2">Gizli Scout Not Defteri Kilitli</h4>
                    <p className="text-secondary max-w-xl mx-auto mb-4">
                      Futbolcular hakkında sadece sizin veya kulübünüzün görebileceği gizli teknik notlar, bonservis stratejileri ve transfer kararları almak Premium Scout ve Pro Kulüp üyelerimize özeldir.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                      <button 
                        type="button" 
                        className="btn btn-warning text-dark fw-bold px-4 py-2 shadow-sm rounded-pill d-flex align-items-center gap-2"
                        onClick={() => onOpenPricingModal && onOpenPricingModal()}
                      >
                        <i className="bi bi-gem"></i>
                        <span>Premium'a Geç ve Not Tut</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Add note card */}
                    <div className="card shadow-sm border-0 mb-4 bg-light">
                      <div className="card-body p-4">
                        <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                          <i className="bi bi-pencil-square text-primary"></i>
                          <span>{player.first_name} {player.last_name} İçin Yeni Gizli Scout Notu Yaz</span>
                        </h6>

                        <form onSubmit={handleSaveNote}>
                          <div className="mb-3">
                            <textarea
                              className="form-control"
                              rows={3}
                              placeholder="Oyuncunun maç içi davranışları, sözleşme detayları, bonservis pazarlığı tavsiyeleri veya gelişim izlenimleriniz..."
                              value={newNoteText}
                              onChange={(e) => setNewNoteText(e.target.value)}
                              required
                            ></textarea>
                          </div>

                          <div className="row g-3 align-items-center">
                            <div className="col-md-5">
                              <label className="form-label small fw-semibold text-secondary mb-1">Tavsiye Edilen Transfer Aksiyonu:</label>
                              <select 
                                className="form-select form-select-sm"
                                value={newNoteAction}
                                onChange={(e) => setNewNoteAction(e.target.value as any)}
                              >
                                <option value="izlemeye_al">👀 İzlemeye Al (Yakın Takip)</option>
                                <option value="teklif_yap">🎯 Resmi Teklif Yap (Acil Transfer)</option>
                                <option value="kiralik_dusun">🔄 Kiralık Olarak Değerlendir</option>
                                <option value="pas_gec">⛔ Pas Geç (Kulüp Yapısına Uygun Değil)</option>
                              </select>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label small fw-semibold text-secondary mb-1">Etiketler (Virgülle ayırın):</label>
                              <input 
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Örn: Hızlı, 2026 Sözleşme, Sol Ayak"
                                value={newNoteTag}
                                onChange={(e) => setNewNoteTag(e.target.value)}
                              />
                            </div>

                            <div className="col-md-3 d-flex align-items-end">
                              <button type="submit" className="btn btn-primary btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-1">
                                <i className="bi bi-check-lg"></i>
                                <span>Notu Kaydet</span>
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Notes List */}
                    <h6 className="fw-bold text-dark mb-3">
                      Kaydedilen Notlar ({scoutNotes.length})
                    </h6>

                    {scoutNotes.length === 0 ? (
                      <div className="text-center py-5 text-muted border rounded-3 bg-light">
                        <i className="bi bi-journal-x fs-1 d-block mb-2"></i>
                        Henüz bu futbolcu için gizli scout notu girmediniz. Yukarıdaki formu kullanarak ilk notunuzu ekleyebilirsiniz.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {scoutNotes.map((note) => (
                          <div className="card shadow-sm border-0 border-start border-4 border-warning bg-white" key={note.id}>
                            <div className="card-body p-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge ${
                                    note.recommended_action === 'teklif_yap' ? 'bg-success' :
                                    note.recommended_action === 'izlemeye_al' ? 'bg-primary' :
                                    note.recommended_action === 'kiralik_dusun' ? 'bg-info text-dark' : 'bg-secondary'
                                  }`}>
                                    {note.recommended_action === 'teklif_yap' ? '🎯 TEKLİF YAP' :
                                     note.recommended_action === 'izlemeye_al' ? '👀 İZLEMEYE AL' :
                                     note.recommended_action === 'kiralik_dusun' ? '🔄 KİRALIK' : '⛔ PAS GEÇ'}
                                  </span>
                                  <span className="small text-muted">
                                    {new Date(note.created_at).toLocaleDateString('tr-TR')} • {currentUser.name}
                                  </span>
                                </div>

                                <button 
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  onClick={() => db.deleteScoutNote(note.id)}
                                  title="Notu Sil"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>

                              <p className="text-dark mb-2 leading-relaxed">
                                {note.note}
                              </p>

                              {note.tags && note.tags.length > 0 && (
                                <div className="d-flex flex-wrap gap-1">
                                  {note.tags.map((t, idx) => (
                                    <span key={idx} className="badge bg-light text-secondary border small">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: SPONSORSHIPS, NEARBY FACILITIES & GEAR DEALS */}
            {activeTab === 'sponsors' && (
              <div>
                {/* Header Banner */}
                <div 
                  className="rounded-3 p-4 mb-4 text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' }}
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                      <span className="badge bg-warning text-dark fw-bold text-uppercase mb-2">
                        {player.first_name} {player.last_name} &bull; Sponsorluk Profili
                      </span>
                      <h4 className="fw-bold mb-1 text-white">
                        Ekipman Sponsorlukları & Yakın Tesis Avantajları
                      </h4>
                      <p className="small text-emerald-100 mb-0 opacity-90">
                        {player.primary_position} mevkisi için önerilen krampon modelleri, scout GPS donanımları ve antrenman yapabileceği indirimli spor kompleksleri.
                      </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-white bg-opacity-20 text-white p-2 px-3">
                        <i className="bi bi-patch-check-fill text-warning me-1"></i>
                        Prospekt Lisanslı Oyuncu
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equipment Sponsorship Deals for this player */}
                <h6 className="fw-bold text-dark mb-3">
                  <i className="bi bi-lightning-charge-fill text-danger me-2"></i>
                  Özel Ekipman & Donanım Sponsorluk Fırsatları
                </h6>

                <div className="row g-3 mb-4">
                  {db.getEquipmentSponsors().slice(0, 3).map((eq) => (
                    <div key={eq.id} className="col-md-4">
                      <div className="card h-100 border shadow-sm rounded-3 overflow-hidden">
                        <div className="position-relative" style={{ height: '140px', backgroundColor: '#111' }}>
                          <img
                            src={eq.featured_product.image}
                            alt={eq.featured_product.name}
                            className="w-100 h-100 object-fit-cover"
                          />
                          <span className="position-absolute top-0 end-0 m-2 badge bg-warning text-dark fw-bold">
                            {eq.discount_rate}
                          </span>
                        </div>
                        <div className="card-body p-3 d-flex flex-column">
                          <strong className="text-dark small mb-1">{eq.brand_name}</strong>
                          <div className="text-muted small mb-2 text-truncate" title={eq.title}>
                            {eq.title}
                          </div>

                          <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                            <span className="badge bg-light text-dark border">
                              {eq.coupon_code}
                            </span>
                            <button
                              className="btn btn-outline-success btn-sm py-0 px-2 fw-semibold"
                              onClick={() => {
                                navigator.clipboard?.writeText(eq.coupon_code);
                                alert(`Kupon kodu kopyalandı: ${eq.coupon_code}`);
                              }}
                            >
                              Kodu Al
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nearby Sports Facilities */}
                <h6 className="fw-bold text-dark mb-3">
                  <i className="bi bi-geo-alt-fill text-success me-2"></i>
                  Önerilen Spor Kompleksleri & Halı Sahalar
                </h6>

                <div className="list-group list-group-flush border rounded-3 mb-4 overflow-hidden">
                  {db.getSportsFacilities().slice(0, 3).map((facility) => (
                    <div key={facility.id} className="list-group-item p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={facility.image_url}
                          alt={facility.name}
                          className="rounded-3 object-fit-cover"
                          style={{ width: '60px', height: '60px' }}
                        />
                        <div>
                          <strong className="text-dark d-block">{facility.name}</strong>
                          <div className="small text-muted">
                            <i className="bi bi-geo-alt text-danger"></i> {facility.district}, {facility.city} &bull; {facility.surface_type}
                          </div>
                          {facility.sponsorship_deal && (
                            <span className="badge bg-success-subtle text-success small mt-1">
                              {facility.sponsorship_deal.badge} ({facility.sponsorship_deal.coupon_code})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-secondary btn-sm"
                        >
                          <i className="bi bi-cursor-fill me-1"></i> Yol Tarifi
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Application CTA */}
                <div className="bg-light p-3 rounded-3 border d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-bold text-dark small">
                      {player.first_name} için Resmi Marka Sponsorluğu Başvurusu
                    </div>
                    <div className="text-muted small">
                      Kulübü veya oyuncu adına donanım, krampon ve içecek sponsorluğu talebi oluşturun.
                    </div>
                  </div>
                  <button
                    className="btn btn-success btn-sm fw-bold"
                    onClick={() => {
                      db.addSponsorshipApplication({
                        applicant_type: 'player',
                        applicant_name: `${player.first_name} ${player.last_name}`,
                        contact_email: currentUser.email,
                        contact_phone: '+90 ',
                        club_or_agency: player.current_team_id ? db.getTeamById(player.current_team_id)?.name : 'Serbest Oyuncu',
                        requested_category: 'Kişisel Krampon & GPS Takip Sponsorluğu',
                        notes: `${player.primary_position} mevkisindeki ${player.first_name} ${player.last_name} için Prospekt üzerinden sponsorluk talebi iletildi.`,
                      });
                      alert(`${player.first_name} ${player.last_name} için sponsorluk başvurusu kaydedildi!`);
                    }}
                  >
                    <i className="bi bi-send-fill me-1"></i> Bireysel Başvuru Oluştur
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
            <span className="text-muted small">
              <i className="bi bi-shield-check text-success me-1"></i>
              Tüm işlemler veritabanında denetim kaydıyla (Audit Log) saklanır.
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Kapat
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
