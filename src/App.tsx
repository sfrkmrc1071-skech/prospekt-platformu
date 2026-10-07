/**
 * Prospekt Futbolcu Pazar Yeri & Scout Platformu
 * Full Stack Architecture: Laravel 11 + MySQL Relational Database + Bootstrap 5 UI
 */

import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { Navbar } from './components/Navbar';
import { PlayerMarketplace } from './components/PlayerMarketplace';
import { TeamManagement } from './components/TeamManagement';
import { UserManagement } from './components/UserManagement';
import { RolePermissionManagement } from './components/RolePermissionManagement';
import { ReferenceRequests } from './components/ReferenceRequests';
import { DirectMessaging } from './components/DirectMessaging';
import { AuditLogViewer } from './components/AuditLogViewer';
import { LaravelArchitectureModal } from './components/LaravelArchitectureModal';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { PricingModal } from './components/PricingModal';
import { MembershipPlansView } from './components/MembershipPlansView';
import { SponsorshipFacilitiesHub } from './components/SponsorshipFacilitiesHub';
import { Player } from './types';
import { AuthProvider } from './context/AuthContext';
import { initFirestoreLiveSync } from './services/firestoreSync';

function MainAppContent() {
  const [currentUser, setCurrentUser] = useState(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('marketplace');
  const [architectureModalOpen, setArchitectureModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  // Direct Message targeting state (when redirected from a player profile)
  const [chatTarget, setChatTarget] = useState<{
    targetUserId: number | null;
    playerId: number | null;
    subject?: string;
  }>({ targetUserId: null, playerId: null });

  // Direct Player detail opener (e.g. from Reference Requests)
  const [openedPlayerId, setOpenedPlayerId] = useState<number | null>(null);

  // Force re-render whenever db notifies changes
  const [, setTick] = useState(0);

  useEffect(() => {
    initFirestoreLiveSync();
    const unsubscribe = db.subscribe(() => {
      setCurrentUser(db.getCurrentUser());
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  const handleOpenSendMessageToUser = (receiverId: number, playerId: number, defaultSubject?: string) => {
    setChatTarget({
      targetUserId: receiverId,
      playerId,
      subject: defaultSubject,
    });
    setActiveTab('messages');
  };

  const handleOpenPlayerFromRef = (playerId: number) => {
    setOpenedPlayerId(playerId);
  };

  const openedPlayer: Player | undefined = openedPlayerId ? db.getPlayerById(openedPlayerId) : undefined;

  // Unread messages and pending references counts
  const unreadMessagesCount = db.getMessages(currentUser.id).filter(
    m => m.receiver_id === currentUser.id && !m.is_read
  ).length;

  const pendingReferencesCount = db.getReferences(undefined, currentUser.id).filter(
    r => r.status === 'beklemede'
  ).length;

  const auditLogsCount = db.getAuditLogs().length;

  return (
    <div className="min-vh-100 d-flex flex-column bg-light font-sans">
      {/* Bootstrap 5 Navbar with live user/role switcher */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenArchitectureModal={() => setArchitectureModalOpen(true)}
        onOpenPricingModal={() => setPricingModalOpen(true)}
        unreadMessagesCount={unreadMessagesCount}
        pendingReferencesCount={pendingReferencesCount}
        auditLogsCount={auditLogsCount}
      />

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {activeTab === 'marketplace' && (
          <PlayerMarketplace
            currentUser={currentUser}
            onOpenSendMessageToUser={handleOpenSendMessageToUser}
            onOpenPricingModal={() => setPricingModalOpen(true)}
            onNavigateToSponsorships={() => setActiveTab('sponsorships')}
          />
        )}

        {activeTab === 'teams' && (
          <TeamManagement currentUser={currentUser} />
        )}

        {activeTab === 'users' && (
          <UserManagement currentUser={currentUser} />
        )}

        {activeTab === 'roles' && (
          <RolePermissionManagement currentUser={currentUser} />
        )}

        {activeTab === 'references' && (
          <ReferenceRequests
            currentUser={currentUser}
            onOpenPlayer={handleOpenPlayerFromRef}
          />
        )}

        {activeTab === 'messages' && (
          <DirectMessaging
            currentUser={currentUser}
            initialTargetUserId={chatTarget.targetUserId}
            initialPlayerId={chatTarget.playerId}
            initialSubject={chatTarget.subject}
            onOpenPricingModal={() => setPricingModalOpen(true)}
          />
        )}

        {activeTab === 'logs' && (
          <AuditLogViewer currentUser={currentUser} />
        )}

        {activeTab === 'membership' && (
          <MembershipPlansView currentUser={currentUser} />
        )}

        {activeTab === 'sponsorships' && (
          <SponsorshipFacilitiesHub 
            currentUser={currentUser}
            onOpenPricingModal={() => setPricingModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-top py-3 mt-auto">
        <div className="container-fluid d-flex flex-wrap justify-content-between align-items-center small text-muted">
          <div>
            <strong>PROSPEKT</strong> &copy; {new Date().getFullYear()} Futbolcu Pazar Yeri & Scout Platformu. Tüm hakları saklıdır.
          </div>
          <div className="d-flex align-items-center gap-3">
            <span><i className="bi bi-code-slash text-primary"></i> Laravel 11 Framework</span>
            <span><i className="bi bi-database text-success"></i> MySQL 8.0 (InnoDB)</span>
            <span><i className="bi bi-bootstrap text-info"></i> Bootstrap 5.3</span>
            <button 
              className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
              onClick={() => {
                if (window.confirm('Tüm veritabanını fabrika ayarlarına sıfırlamak istiyor musunuz?')) {
                  db.resetToFactory();
                }
              }}
            >
              <i className="bi bi-arrow-repeat me-1"></i> Veritabanını Sıfırla
            </button>
          </div>
        </div>
      </footer>

      {/* Architecture & Code Modal */}
      {architectureModalOpen && (
        <LaravelArchitectureModal onClose={() => setArchitectureModalOpen(false)} />
      )}

      {/* Pricing / Membership Modal */}
      {pricingModalOpen && (
        <PricingModal 
          currentUser={currentUser} 
          onClose={() => setPricingModalOpen(false)} 
        />
      )}

      {/* Opened Player Modal from References */}
      {openedPlayer && (
        <PlayerDetailModal
          player={openedPlayer}
          currentUser={currentUser}
          onClose={() => setOpenedPlayerId(null)}
          onOpenSendMessageToUser={handleOpenSendMessageToUser}
          onOpenPricingModal={() => setPricingModalOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
