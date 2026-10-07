import React, { useState } from 'react';
import { User, Message, Player } from '../types';
import { db } from '../services/db';

interface DirectMessagingProps {
  currentUser: User;
  initialTargetUserId?: number | null;
  initialPlayerId?: number | null;
  initialSubject?: string;
  onOpenPricingModal?: () => void;
}

export const DirectMessaging: React.FC<DirectMessagingProps> = ({
  currentUser,
  initialTargetUserId,
  initialPlayerId,
  initialSubject,
  onOpenPricingModal,
}) => {
  const allUsers = db.getUsers();
  const allPlayers = db.getPlayers();
  const allMessages = db.getMessages(currentUser.id);

  const isPremiumOrPro = currentUser.membership_tier === 'premium' || currentUser.membership_tier === 'pro_scout' || currentUser.role_id === 1;

  // Group messages into conversations by the other party
  const conversationPartnerIds = Array.from(
    new Set(
      allMessages.map(m => m.sender_id === currentUser.id ? m.receiver_id : m.sender_id)
    )
  );

  // If initialTargetUserId is passed, ensure it is in the list
  const defaultSelectedPartnerId = initialTargetUserId 
    ? initialTargetUserId 
    : (conversationPartnerIds[0] || (allUsers.find(u => u.id !== currentUser.id)?.id || 2));

  const [activePartnerId, setActivePartnerId] = useState<number>(defaultSelectedPartnerId);
  const [newChatModal, setNewChatModal] = useState<boolean>(false);

  // Send message form state
  const [newMessageText, setNewMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState(initialSubject || '');
  const [relatedPlayerId, setRelatedPlayerId] = useState<number | null>(initialPlayerId || null);

  // New conversation form
  const [newChatTargetUser, setNewChatTargetUser] = useState<number>(
    allUsers.find(u => u.id !== currentUser.id)?.id || 2
  );
  const [newChatSubject, setNewChatSubject] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');

  const activePartner = db.getUserById(activePartnerId);

  // Messages between current user and active partner
  const thread = allMessages
    .filter(m => 
      (m.sender_id === currentUser.id && m.receiver_id === activePartnerId) ||
      (m.sender_id === activePartnerId && m.receiver_id === currentUser.id)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Mark unread incoming messages as read
  React.useEffect(() => {
    thread.forEach(m => {
      if (m.receiver_id === currentUser.id && !m.is_read) {
        db.markMessageAsRead(m.id);
      }
    });
  }, [activePartnerId, thread.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    db.sendMessage({
      receiver_id: activePartnerId,
      player_id: relatedPlayerId,
      subject: messageSubject || 'Futbolcu Transfer & Scout Görüşmesi',
      message_text: newMessageText,
    });

    setNewMessageText('');
  };

  const handleStartNewConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    db.sendMessage({
      receiver_id: newChatTargetUser,
      player_id: relatedPlayerId,
      subject: newChatSubject || 'Doğrudan İletişim',
      message_text: newChatMessage,
    });

    setActivePartnerId(newChatTargetUser);
    setNewChatModal(false);
    setNewChatSubject('');
    setNewChatMessage('');
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-chat-dots-fill text-primary"></i>
            Özel Mesajlaşma (Direct Scout-Player Messaging)
          </h1>
          <p className="text-muted mb-0 small">
            Kulüp gözlemcileri, menajerler, antrenörler ve futbolcular arasında şifreli doğrudan iletişim merkezi.
          </p>
        </div>

        <button 
          className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
          onClick={() => setNewChatModal(true)}
        >
          <i className="bi bi-pencil-square"></i>
          <span>Yeni Sohbet Başlat</span>
        </button>
      </div>

      <div className="row g-4">
        {/* Left: Conversations list */}
        <div className="col-lg-4 col-md-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-inbox me-1 text-primary"></i> Konuşmalar
              </h6>
              <span className="badge bg-secondary-subtle text-secondary small">
                {conversationPartnerIds.length} Kişi
              </span>
            </div>

            <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '600px' }}>
              {conversationPartnerIds.length === 0 ? (
                <div className="p-4 text-center text-muted small">
                  Henüz bir mesajlaşma geçmişiniz yok. "Yeni Sohbet Başlat" butonundan ilk mesajınızı gönderin.
                </div>
              ) : (
                conversationPartnerIds.map(partnerId => {
                  const partner = db.getUserById(partnerId);
                  const partnerRole = partner ? db.getRole(partner.role_id) : null;
                  const isSelected = partnerId === activePartnerId;

                  // Last message in thread
                  const partnerThread = allMessages
                    .filter(m => (m.sender_id === partnerId && m.receiver_id === currentUser.id) || (m.sender_id === currentUser.id && m.receiver_id === partnerId))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const lastMsg = partnerThread[0];

                  const unreadCount = partnerThread.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;

                  return (
                    <button
                      key={partnerId}
                      type="button"
                      onClick={() => setActivePartnerId(partnerId)}
                      className={`list-group-item list-group-item-action p-3 border-0 border-bottom d-flex align-items-start gap-3 ${
                        isSelected ? 'bg-primary-subtle text-dark border-start border-4 border-primary' : ''
                      }`}
                    >
                      <img 
                        src={partner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'} 
                        alt={partner?.name}
                        className="rounded-circle border"
                        style={{ width: '44px', height: '44px', objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1 text-start overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-dark text-truncate">{partner?.name || 'Kullanıcı'}</strong>
                          {lastMsg && (
                            <span className="small text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                          <span className="badge bg-light text-secondary border small" style={{ fontSize: '0.68rem' }}>
                            {partner?.club_name || partnerRole?.name.split(' ')[0]}
                          </span>
                          {unreadCount > 0 && (
                            <span className="badge bg-danger rounded-pill">
                              {unreadCount} yeni
                            </span>
                          )}
                        </div>

                        {lastMsg && (
                          <small className="text-muted d-block text-truncate mt-1" style={{ fontSize: '0.75rem' }}>
                            {lastMsg.sender_id === currentUser.id ? 'Siz: ' : ''}{lastMsg.message_text}
                          </small>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        <div className="col-lg-8 col-md-7">
          <div className="card shadow-sm border-0 d-flex flex-column" style={{ height: '650px' }}>
            
            {/* Chat Header */}
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <img 
                  src={activePartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'} 
                  alt={activePartner?.name}
                  className="rounded-circle border"
                  style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                />
                <div>
                  <h6 className="fw-bold mb-0 text-dark">{activePartner?.name || 'Kullanıcı Seçiniz'}</h6>
                  <small className="text-muted">
                    {activePartner?.club_name} • {db.getRole(activePartner?.role_id || 4)?.name}
                  </small>
                </div>
              </div>

              {relatedPlayerId && (
                <div className="badge bg-primary-subtle text-primary border border-primary-subtle p-2">
                  <i className="bi bi-person-fill me-1"></i>
                  Futbolcu: {db.getPlayerById(relatedPlayerId)?.first_name} {db.getPlayerById(relatedPlayerId)?.last_name}
                </div>
              )}
            </div>

            {/* Chat Thread Messages */}
            <div className="card-body p-4 overflow-auto flex-grow-1 bg-light d-flex flex-column gap-3">
              {thread.length === 0 ? (
                <div className="my-auto text-center text-muted">
                  <i className="bi bi-chat-heart fs-1 d-block mb-2 text-primary opacity-50"></i>
                  Henüz mesaj bulunmuyor. Aşağıdaki alandan yazışmayı başlatabilirsiniz.
                </div>
              ) : (
                thread.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  const sender = isMe ? currentUser : activePartner;

                  return (
                    <div 
                      key={msg.id} 
                      className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}
                    >
                      <div className="d-flex align-items-end gap-2" style={{ maxWidth: '75%' }}>
                        {!isMe && (
                          <img 
                            src={sender?.avatar} 
                            alt={sender?.name} 
                            className="rounded-circle mb-1" 
                            style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                          />
                        )}

                        <div 
                          className={`p-3 rounded-4 shadow-sm ${
                            isMe ? 'bg-primary text-white' : 'bg-white text-dark border'
                          }`}
                        >
                          {msg.subject && msg.subject !== 'Futbolcu Transfer & Scout Görüşmesi' && (
                            <div className={`fw-bold small mb-1 border-bottom pb-1 ${isMe ? 'border-white-50 text-white-70' : 'border-light text-primary'}`}>
                              Konu: {msg.subject}
                            </div>
                          )}
                          <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}>
                            {msg.message_text}
                          </p>
                        </div>
                      </div>

                      <div className="text-muted small mt-1 px-1" style={{ fontSize: '0.7rem' }}>
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        {isMe && (
                          <span className="ms-1 text-primary">
                            <i className="bi bi-check2-all"></i>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Box */}
            <div className="card-footer bg-white border-top p-3">
              <form onSubmit={handleSendMessage}>
                <div className="input-group">
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="Bir mesaj yazın... (Enter ile gönderin)"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-1 px-4">
                    <i className="bi bi-send-fill"></i>
                    <span>Gönder</span>
                  </button>
                </div>
              </form>

              {!isPremiumOrPro ? (
                <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 px-1 small text-muted">
                  <span>
                    <i className="bi bi-info-circle me-1 text-primary"></i> Standart Üyelik Kotası: <strong>Günlük 2 mesaj</strong> (Kalan: 1)
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-link btn-sm p-0 text-warning text-decoration-none fw-bold"
                    onClick={() => onOpenPricingModal && onOpenPricingModal()}
                  >
                    ⭐ Sınırsız Mesajlaşma İçin Premium'a Geç
                  </button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-1 mt-2 px-1 small text-success">
                  <i className="bi bi-patch-check-fill"></i>
                  <span>⭐ {currentUser.membership_tier === 'pro_scout' ? 'Pro Kulüp Lisansı' : 'Premium Scout'}: Sınırsız scout ve transfer doğrudan iletişimi aktif.</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Start New Conversation Modal */}
      {newChatModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-chat-plus-fill text-primary"></i>
                  Yeni Özel Mesaj Başlat
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setNewChatModal(false)}></button>
              </div>
              <form onSubmit={handleStartNewConversation}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Alıcı Kullanıcı / Futbolcu *</label>
                    <select 
                      className="form-select"
                      value={newChatTargetUser}
                      onChange={(e) => setNewChatTargetUser(Number(e.target.value))}
                    >
                      {allUsers.filter(u => u.id !== currentUser.id).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.club_name || db.getRole(u.role_id)?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">İlgili Futbolcu (Opsiyonel)</label>
                    <select 
                      className="form-select"
                      value={relatedPlayerId || ''}
                      onChange={(e) => setRelatedPlayerId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Genel Konu</option>
                      {allPlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Konu Başlığı</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: Transfer Teklifi Görüşmesi"
                      value={newChatSubject}
                      onChange={(e) => setNewChatSubject(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mesajınız *</label>
                    <textarea 
                      required 
                      rows={3} 
                      className="form-control" 
                      placeholder="Mesajınızı detaylı şekilde yazınız..."
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setNewChatModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Mesajı İlet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
