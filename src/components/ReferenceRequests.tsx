import React, { useState } from 'react';
import { User, PlayerReference, RelationType } from '../types';
import { db } from '../services/db';

interface ReferenceRequestsProps {
  currentUser: User;
  onOpenPlayer: (playerId: number) => void;
}

export const ReferenceRequests: React.FC<ReferenceRequestsProps> = ({
  currentUser,
  onOpenPlayer,
}) => {
  const [filterTab, setFilterTab] = useState<'incoming' | 'all'>('incoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalModalId, setApprovalModalId] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const [newRequestModal, setNewRequestModal] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState<number>(1);
  const [refereeUserId, setRefereeUserId] = useState<number>(2);
  const [relationType, setRelationType] = useState<RelationType>('Antrenör');
  const [requestMsg, setRequestMsg] = useState('');

  const canViewPage = db.hasPermission('player_references', 'can_view_page');

  if (!canViewPage) {
    return (
      <div className="alert alert-danger m-4 d-flex align-items-center gap-3">
        <i className="bi bi-shield-x fs-2"></i>
        <div>
          <h5 className="alert-heading mb-1">Erişim Engellendi (403 Yetkisiz İşlem)</h5>
          <p className="mb-0">
            Mevcut rolünüz için "Referans Sistemi" modülü görüntüleme yetkisi bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  const allReferences = db.getReferences(undefined, undefined, false);
  const players = db.getPlayers();
  const users = db.getUsers();

  const myIncoming = allReferences.filter(r => r.referee_user_id === currentUser.id);

  const displayedList = (filterTab === 'incoming' ? myIncoming : allReferences).filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleOpenApproveModal = (refId: number) => {
    setApprovalModalId(refId);
    setApprovalNotes('Futbolcu disiplinli, takım ruhuna uygun ve elit potansiyele sahip bir sporcudur.');
  };

  const handleConfirmApproval = (status: 'onaylandi' | 'reddedildi') => {
    if (!approvalModalId) return;
    db.updateReferenceStatus(approvalModalId, status, approvalNotes);
    setApprovalModalId(null);
    setApprovalNotes('');
  };

  const handleSendNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    db.requestReference({
      player_id: targetPlayerId,
      referee_user_id: refereeUserId,
      relation_type: relationType,
      request_message: requestMsg,
    });
    setNewRequestModal(false);
    setRequestMsg('');
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-patch-check-fill text-primary"></i>
            Referans Sistemi & Onay Merkezi
          </h1>
          <p className="text-muted mb-0 small">
            Futbolcuların sistemdeki antrenör ve yöneticilerden talep ettiği referanslar, onay süreçleri ve profilde sergilenme durumu.
          </p>
        </div>

        <button 
          className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
          onClick={() => setNewRequestModal(true)}
        >
          <i className="bi bi-plus-lg"></i>
          <span>Yeni Referans Talebi Gönder</span>
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="btn-group">
              <button 
                className={`btn ${filterTab === 'incoming' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterTab('incoming')}
              >
                <i className="bi bi-inbox-fill me-1"></i>
                Bana Gelen Referans Talepleri
                {myIncoming.filter(r => r.status === 'beklemede').length > 0 && (
                  <span className="badge bg-warning text-dark ms-2">
                    {myIncoming.filter(r => r.status === 'beklemede').length}
                  </span>
                )}
              </button>
              <button 
                className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterTab('all')}
              >
                <i className="bi bi-globe me-1"></i>
                Tüm Sistem Referansları ({allReferences.length})
              </button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted">Durum:</span>
              <select 
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tümü</option>
                <option value="beklemede">Onay Bekleyenler</option>
                <option value="onaylandi">Onaylananlar</option>
                <option value="reddedildi">Reddedilenler</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="row g-4">
        {displayedList.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-patch-question fs-1 d-block mb-2"></i>
            Gösterilecek referans talebi bulunamadı.
          </div>
        ) : (
          displayedList.map((ref) => {
            const player = db.getPlayerById(ref.player_id);
            const referee = db.getUserById(ref.referee_user_id);
            const isApproved = ref.status === 'onaylandi';
            const isPending = ref.status === 'beklemede';
            const isCurrentUserReferee = currentUser.id === ref.referee_user_id;

            return (
              <div className="col-lg-6" key={ref.id}>
                <div className={`card h-100 shadow-sm border ${
                  isApproved ? 'border-success' : isPending ? 'border-warning' : 'border-danger'
                }`}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      {/* Player info */}
                      <div className="d-flex align-items-center gap-3">
                        <img 
                          src={player?.photo} 
                          alt={player?.first_name}
                          className="rounded-circle border"
                          style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        />
                        <div>
                          <h5 className="fw-bold text-dark mb-0">
                            {player?.first_name} {player?.last_name}
                          </h5>
                          <small className="text-muted">{player?.primary_position} • {player?.nationality}</small>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isApproved && (
                        <span className="badge bg-success-subtle text-success border border-success px-3 py-2">
                          <i className="bi bi-patch-check-fill me-1"></i> Onaylı Referans
                        </span>
                      )}
                      {isPending && (
                        <span className="badge bg-warning-subtle text-warning border border-warning px-3 py-2">
                          <i className="bi bi-clock-history me-1"></i> Onay Bekliyor
                        </span>
                      )}
                      {ref.status === 'reddedildi' && (
                        <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2">
                          Reddedildi
                        </span>
                      )}
                    </div>

                    {/* Referee info */}
                    <div className="p-3 bg-light rounded border mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="text-muted small">Referans Veren / İstenen:</span>
                        <span className="badge bg-secondary">{ref.relation_type}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <img 
                          src={referee?.avatar} 
                          alt={referee?.name} 
                          className="rounded-circle"
                          style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                        />
                        <div>
                          <strong className="text-dark">{referee?.name}</strong>
                          <span className="text-muted small ms-2">({referee?.club_name || 'Antrenör / Scout'})</span>
                        </div>
                      </div>
                    </div>

                    {/* Request message */}
                    {ref.request_message && (
                      <div className="mb-3 small">
                        <span className="text-muted fw-semibold">Talep Mesajı:</span>
                        <p className="mb-0 text-secondary fst-italic bg-light p-2 rounded">
                          "{ref.request_message}"
                        </p>
                      </div>
                    )}

                    {/* Approved Notes */}
                    {isApproved && ref.notes && (
                      <div className="mb-3 small">
                        <span className="text-success fw-bold d-flex align-items-center gap-1">
                          <i className="bi bi-quote"></i> Referans Açıklaması:
                        </span>
                        <blockquote className="border-start border-3 border-success ps-2 my-1 text-dark">
                          "{ref.notes}"
                        </blockquote>
                        <small className="text-muted d-block mt-1">Onay Tarihi: {ref.decision_date}</small>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => player && onOpenPlayer(player.id)}
                      >
                        <i className="bi bi-person-badge me-1"></i> Futbolcu Profilini Aç
                      </button>

                      {isPending && (isCurrentUserReferee || currentUser.role_id === 1) && (
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-success"
                            onClick={() => handleOpenApproveModal(ref.id)}
                          >
                            <i className="bi bi-check2-circle me-1"></i> Onayla & Görüş Yaz
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => db.updateReferenceStatus(ref.id, 'reddedildi', 'Talebiniz uygun görülmedi.')}
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

      {/* Approval Modal */}
      {approvalModalId && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-patch-check-fill"></i>
                  Referansı Onayla & Görüş Belirt
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setApprovalModalId(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-3">
                  Bu futbolcu için yazacağınız referans metni, futbolcunun vitrin profilinde "Onaylı Referans" rozetiyle birlikte yayınlanacaktır.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Referans Görüşünüz / Tavsiye Metni *</label>
                  <textarea 
                    className="form-control" 
                    rows={4}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Oyuncunun yeteneği, ahlakı ve profesyonelliği hakkında görüşünüz..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setApprovalModalId(null)}>İptal</button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={() => handleConfirmApproval('onaylandi')}
                >
                  Onayla ve Yayınla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {newRequestModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-send-plus-fill text-primary"></i>
                  Yeni Referans Talebi Oluştur
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setNewRequestModal(false)}></button>
              </div>
              <form onSubmit={handleSendNewRequest}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Referans Alınacak Futbolcu *</label>
                    <select 
                      className="form-select"
                      value={targetPlayerId}
                      onChange={(e) => setTargetPlayerId(Number(e.target.value))}
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} ({p.primary_position})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Referans Olması İstenen Kullanıcı *</label>
                    <select 
                      className="form-select"
                      value={refereeUserId}
                      onChange={(e) => setRefereeUserId(Number(e.target.value))}
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.club_name || db.getRole(u.role_id)?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
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

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Talep Notu</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      placeholder="Sayın Hocam, gelişimimi ve potansiyelimi referans olarak profilimde onaylar mısınız?"
                      value={requestMsg}
                      onChange={(e) => setRequestMsg(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setNewRequestModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Talebi Gönder</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
