import { 
  User, 
  Role, 
  RolePermission, 
  Team, 
  Player, 
  PlayerVideo, 
  PlayerReference, 
  PlayerActivity, 
  PlayerTeamHistory, 
  PlayerReview, 
  Message, 
  AuditLog,
  AuditFields,
  PermissionModule,
  MembershipTier,
  ScoutNote,
  SportsFacility,
  EquipmentSponsor,
  SponsorshipApplication
} from '../types';
import { 
  SEED_ROLES, 
  SEED_PERMISSIONS, 
  SEED_USERS, 
  SEED_TEAMS, 
  SEED_PLAYERS, 
  SEED_VIDEOS, 
  SEED_REFERENCES, 
  SEED_ACTIVITIES, 
  SEED_TEAM_HISTORIES, 
  SEED_REVIEWS, 
  SEED_MESSAGES, 
  SEED_AUDIT_LOGS 
} from './seedData';
import {
  SEED_SPORTS_FACILITIES,
  SEED_EQUIPMENT_SPONSORS,
  SEED_SPONSORSHIP_APPLICATIONS
} from './sponsorshipSeedData';

const STORAGE_KEY = 'prospekt_database_v1';

export interface DatabaseState {
  users: User[];
  roles: Role[];
  permissions: RolePermission[];
  teams: Team[];
  players: Player[];
  player_videos: PlayerVideo[];
  player_references: PlayerReference[];
  player_activities: PlayerActivity[];
  player_team_histories: PlayerTeamHistory[];
  player_reviews: PlayerReview[];
  messages: Message[];
  scout_notes: ScoutNote[];
  sports_facilities: SportsFacility[];
  equipment_sponsors: EquipmentSponsor[];
  sponsorship_applications: SponsorshipApplication[];
  audit_logs: AuditLog[];
  currentUserId: number;
}

class RelationalDatabaseService {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.scout_notes) parsed.scout_notes = [];
        if (!parsed.sports_facilities || parsed.sports_facilities.length === 0) {
          parsed.sports_facilities = [...SEED_SPORTS_FACILITIES];
        }
        if (!parsed.equipment_sponsors || parsed.equipment_sponsors.length === 0) {
          parsed.equipment_sponsors = [...SEED_EQUIPMENT_SPONSORS];
        }
        if (!parsed.sponsorship_applications || parsed.sponsorship_applications.length === 0) {
          parsed.sponsorship_applications = [...SEED_SPONSORSHIP_APPLICATIONS];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage load failed, resetting to initial seed.', e);
    }

    return {
      users: [...SEED_USERS],
      roles: [...SEED_ROLES],
      permissions: [...SEED_PERMISSIONS],
      teams: [...SEED_TEAMS],
      players: [...SEED_PLAYERS],
      player_videos: [...SEED_VIDEOS],
      player_references: [...SEED_REFERENCES],
      player_activities: [...SEED_ACTIVITIES],
      player_team_histories: [...SEED_TEAM_HISTORIES],
      player_reviews: [...SEED_REVIEWS],
      messages: [...SEED_MESSAGES],
      scout_notes: [
        {
          id: 1,
          user_id: 3,
          player_id: 1,
          note: 'Hızlı hücum geçişlerinde kanatta çok etkili. Son vuruş soğukkanlılığı Avrupa standartlarının üstünde. Gözlem listesine alındı.',
          tags: ['Sürat', 'Dripling', 'Avrupa Hedefi'],
          recommended_action: 'izlemeye_al',
          created_at: new Date().toISOString(),
          created_by: 3,
          updated_at: new Date().toISOString(),
          updated_by: 3,
          deleted_at: null,
        },
        {
          id: 2,
          user_id: 2,
          player_id: 2,
          note: 'Top kontrolü ve saha görüşü dahi seviyesinde. Fiziksel dayanıklılık antrenmanlarıyla birlikte dünya yıldızı olma potansiyeli çok yüksek.',
          tags: ['Oyun Kurucu', 'Sol Ayak', 'Dünya Çapı'],
          recommended_action: 'teklif_yap',
          created_at: new Date().toISOString(),
          created_by: 2,
          updated_at: new Date().toISOString(),
          updated_by: 2,
          deleted_at: null,
        }
      ],
      sports_facilities: [...SEED_SPORTS_FACILITIES],
      equipment_sponsors: [...SEED_EQUIPMENT_SPONSORS],
      sponsorship_applications: [...SEED_SPONSORSHIP_APPLICATIONS],
      audit_logs: [...SEED_AUDIT_LOGS],
      currentUserId: 1, // Super Admin serkan
    };
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getCurrentUser(): User {
    const user = this.state.users.find(u => u.id === this.state.currentUserId && !u.deleted_at);
    if (user) return user;
    return this.state.users[0];
  }

  public setCurrentUserId(userId: number) {
    this.state.currentUserId = userId;
    this.saveToStorage();
  }

  public getRole(roleId: number): Role | undefined {
    return this.state.roles.find(r => r.id === roleId && !r.deleted_at);
  }

  public hasPermission(
    module: PermissionModule, 
    action: 'view_page' | 'view_records' | 'create' | 'update' | 'delete' | 'can_view_page' | 'can_view_records' | 'can_create' | 'can_update' | 'can_delete'
  ): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role_id === 1) return true; // Super Admin has wildcard full access

    const perm = this.state.permissions.find(
      p => p.role_id === currentUser.role_id && p.module === module && !p.deleted_at
    );

    if (!perm) return false;

    switch (action) {
      case 'view_page':
      case 'can_view_page': 
        return perm.can_view_page;
      case 'view_records':
      case 'can_view_records': 
        return perm.can_view_records;
      case 'create':
      case 'can_create': 
        return perm.can_create;
      case 'update':
      case 'can_update': 
        return perm.can_update;
      case 'delete':
      case 'can_delete': 
        return perm.can_delete;
      default: 
        return false;
    }
  }

  // --- Audit Logger ---
  private logAudit(
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE',
    table_name: string,
    record_id: number,
    summary: string,
    old_values?: any,
    new_values?: any
  ) {
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      action,
      table_name,
      record_id,
      user_id: currentUser ? currentUser.id : 1,
      user_name: currentUser ? currentUser.name : 'Sistem',
      ip_address: '192.168.1.' + (100 + ((currentUser?.id || 1) % 50)),
      changes_summary: summary,
      old_values,
      new_values,
      created_at: new Date().toISOString(),
    };

    this.state.audit_logs.unshift(newLog);
  }

  // --- Generic Helpers for Soft Deletes ---
  private now(): string {
    return new Date().toISOString();
  }

  // ================= USERS =================
  public getUsers(includeDeleted = false): User[] {
    return includeDeleted 
      ? this.state.users 
      : this.state.users.filter(u => !u.deleted_at);
  }

  public getUserById(id: number): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public insertUser(data: Omit<User, keyof AuditFields | 'id'>): User {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newUser: User = {
      ...data,
      membership_tier: data.membership_tier || 'standard',
      watchlist_player_ids: data.watchlist_player_ids || [],
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.users.push(newUser);
    this.logAudit('INSERT', 'users', newUser.id, `Yeni kullanıcı tanımlandı: ${newUser.name} (${newUser.email}) - Plan: ${newUser.membership_tier.toUpperCase()}`, null, newUser);
    this.saveToStorage();
    return newUser;
  }

  public upgradeUserMembership(userId: number, tier: MembershipTier, months = 12): boolean {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return false;
    const oldTier = user.membership_tier;
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + months);

    user.membership_tier = tier;
    user.membership_expires_at = expDate.toISOString().split('T')[0];
    user.updated_at = this.now();
    user.updated_by = this.getCurrentUser().id;

    this.logAudit(
      'UPDATE', 
      'users', 
      userId, 
      `Üyelik planı yükseltildi: ${oldTier.toUpperCase()} -> ${tier.toUpperCase()} (${months} ay geçerli)`,
      { membership_tier: oldTier },
      { membership_tier: tier, membership_expires_at: user.membership_expires_at }
    );
    this.saveToStorage();
    return true;
  }

  public toggleWatchlist(userId: number, playerId: number): boolean {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return false;
    const currentWatchlist = user.watchlist_player_ids || [];
    const exists = currentWatchlist.includes(playerId);
    if (exists) {
      user.watchlist_player_ids = currentWatchlist.filter(id => id !== playerId);
    } else {
      user.watchlist_player_ids = [...currentWatchlist, playerId];
    }
    user.updated_at = this.now();
    this.saveToStorage();
    return !exists; // true if added, false if removed
  }

  public isWatchlisted(userId: number, playerId: number): boolean {
    const user = this.state.users.find(u => u.id === userId);
    return Boolean(user?.watchlist_player_ids?.includes(playerId));
  }

  public updateUser(id: number, data: Partial<User>): User | null {
    const index = this.state.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    const old = { ...this.state.users[index] };
    const currentUserId = this.getCurrentUser().id;
    const updated: User = {
      ...old,
      ...data,
      updated_at: this.now(),
      updated_by: currentUserId,
    };
    this.state.users[index] = updated;
    this.logAudit('UPDATE', 'users', id, `Kullanıcı bilgileri güncellendi: ${updated.name}`, old, data);
    this.saveToStorage();
    return updated;
  }

  public softDeleteUser(id: number): boolean {
    const user = this.state.users.find(u => u.id === id);
    if (!user) return false;
    const currentUserId = this.getCurrentUser().id;
    user.deleted_at = this.now();
    user.deleted_by = currentUserId;
    this.logAudit('DELETE', 'users', id, `Kullanıcı silindi (soft delete): ${user.name}`, { deleted_at: null }, { deleted_at: user.deleted_at });
    this.saveToStorage();
    return true;
  }

  public restoreUser(id: number): boolean {
    const user = this.state.users.find(u => u.id === id);
    if (!user) return false;
    user.deleted_at = null;
    user.deleted_by = null;
    user.updated_at = this.now();
    user.updated_by = this.getCurrentUser().id;
    this.logAudit('RESTORE', 'users', id, `Kullanıcı geri yüklendi: ${user.name}`, null, { restored: true });
    this.saveToStorage();
    return true;
  }

  // ================= ROLES & PERMISSIONS =================
  public getRoles(includeDeleted = false): Role[] {
    return includeDeleted 
      ? this.state.roles 
      : this.state.roles.filter(r => !r.deleted_at);
  }

  public getPermissions(roleId?: number): RolePermission[] {
    if (roleId) {
      return this.state.permissions.filter(p => p.role_id === roleId && !p.deleted_at);
    }
    return this.state.permissions.filter(p => !p.deleted_at);
  }

  public updateRolePermission(id: number, changes: Partial<RolePermission>): boolean {
    const index = this.state.permissions.findIndex(p => p.id === id);
    if (index === -1) return false;
    const old = { ...this.state.permissions[index] };
    const currentUserId = this.getCurrentUser().id;
    this.state.permissions[index] = {
      ...old,
      ...changes,
      updated_at: this.now(),
      updated_by: currentUserId,
    };
    this.logAudit('UPDATE', 'role_permissions', id, `Rol yetkisi güncellendi: Modül ${old.module}`, old, changes);
    this.saveToStorage();
    return true;
  }

  public insertRole(data: { name: string; slug: any; description: string }): Role {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newRole: Role = {
      id: Date.now(),
      name: data.name,
      slug: data.slug,
      description: data.description,
      is_system: false,
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.roles.push(newRole);

    // Bootstrap default permissions for all modules
    const modules: PermissionModule[] = [
      'users', 'roles', 'teams', 'players', 'player_videos',
      'player_references', 'player_activities', 'player_team_histories',
      'player_reviews', 'messages', 'audit_logs'
    ];

    modules.forEach((mod, idx) => {
      this.state.permissions.push({
        id: Date.now() + idx + 1,
        role_id: newRole.id,
        module: mod,
        can_view_page: true,
        can_view_records: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        created_at: now,
        created_by: currentUserId,
        updated_at: now,
        updated_by: currentUserId,
        deleted_at: null,
      });
    });

    this.logAudit('INSERT', 'roles', newRole.id, `Yeni rol oluşturuldu: ${newRole.name}`, null, newRole);
    this.saveToStorage();
    return newRole;
  }

  // ================= TEAMS =================
  public getTeams(includeDeleted = false): Team[] {
    return includeDeleted 
      ? this.state.teams 
      : this.state.teams.filter(t => !t.deleted_at);
  }

  public getTeamById(id: number): Team | undefined {
    return this.state.teams.find(t => t.id === id);
  }

  public insertTeam(data: Omit<Team, keyof AuditFields | 'id'>): Team {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newTeam: Team = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.teams.push(newTeam);
    this.logAudit('INSERT', 'teams', newTeam.id, `Yeni takım oluşturuldu: ${newTeam.name} (${newTeam.league})`, null, newTeam);
    this.saveToStorage();
    return newTeam;
  }

  public updateTeam(id: number, data: Partial<Team>): Team | null {
    const index = this.state.teams.findIndex(t => t.id === id);
    if (index === -1) return null;
    const old = { ...this.state.teams[index] };
    const currentUserId = this.getCurrentUser().id;
    const updated: Team = {
      ...old,
      ...data,
      updated_at: this.now(),
      updated_by: currentUserId,
    };
    this.state.teams[index] = updated;
    this.logAudit('UPDATE', 'teams', id, `Takım güncellendi: ${updated.name}`, old, data);
    this.saveToStorage();
    return updated;
  }

  public softDeleteTeam(id: number): boolean {
    const team = this.state.teams.find(t => t.id === id);
    if (!team) return false;
    team.deleted_at = this.now();
    team.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'teams', id, `Takım silindi (soft delete): ${team.name}`, null, { deleted_at: team.deleted_at });
    this.saveToStorage();
    return true;
  }

  public restoreTeam(id: number): boolean {
    const team = this.state.teams.find(t => t.id === id);
    if (!team) return false;
    team.deleted_at = null;
    team.deleted_by = null;
    team.updated_at = this.now();
    team.updated_by = this.getCurrentUser().id;
    this.logAudit('RESTORE', 'teams', id, `Takım geri yüklendi: ${team.name}`, null, { restored: true });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYERS =================
  public getPlayers(includeDeleted = false): Player[] {
    return includeDeleted 
      ? this.state.players 
      : this.state.players.filter(p => !p.deleted_at);
  }

  public getPlayerById(id: number): Player | undefined {
    return this.state.players.find(p => p.id === id);
  }

  public insertPlayer(data: Omit<Player, keyof AuditFields | 'id'>): Player {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newPlayer: Player = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.players.push(newPlayer);
    this.logAudit('INSERT', 'players', newPlayer.id, `Yeni futbolcu kaydedildi: ${newPlayer.first_name} ${newPlayer.last_name}`, null, newPlayer);
    this.saveToStorage();
    return newPlayer;
  }

  public updatePlayer(id: number, data: Partial<Player>): Player | null {
    const index = this.state.players.findIndex(p => p.id === id);
    if (index === -1) return null;
    const old = { ...this.state.players[index] };
    const currentUserId = this.getCurrentUser().id;
    const updated: Player = {
      ...old,
      ...data,
      updated_at: this.now(),
      updated_by: currentUserId,
    };
    this.state.players[index] = updated;
    this.logAudit('UPDATE', 'players', id, `Futbolcu profili güncellendi: ${updated.first_name} ${updated.last_name}`, old, data);
    this.saveToStorage();
    return updated;
  }

  public softDeletePlayer(id: number): boolean {
    const player = this.state.players.find(p => p.id === id);
    if (!player) return false;
    player.deleted_at = this.now();
    player.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'players', id, `Futbolcu silindi (soft delete): ${player.first_name} ${player.last_name}`, null, { deleted_at: player.deleted_at });
    this.saveToStorage();
    return true;
  }

  public restorePlayer(id: number): boolean {
    const player = this.state.players.find(p => p.id === id);
    if (!player) return false;
    player.deleted_at = null;
    player.deleted_by = null;
    player.updated_at = this.now();
    player.updated_by = this.getCurrentUser().id;
    this.logAudit('RESTORE', 'players', id, `Futbolcu geri yüklendi: ${player.first_name} ${player.last_name}`, null, { restored: true });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYER VIDEOS =================
  public getVideosByPlayer(playerId: number, includeDeleted = false): PlayerVideo[] {
    return this.state.player_videos.filter(v => 
      v.player_id === playerId && (includeDeleted || !v.deleted_at)
    );
  }

  public insertVideo(data: Omit<PlayerVideo, keyof AuditFields | 'id'>): PlayerVideo {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newVideo: PlayerVideo = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.player_videos.push(newVideo);
    this.logAudit('INSERT', 'player_videos', newVideo.id, `Futbolcu video eklendi: ${newVideo.title} (Oyuncu #${newVideo.player_id})`, null, newVideo);
    this.saveToStorage();
    return newVideo;
  }

  public softDeleteVideo(id: number): boolean {
    const video = this.state.player_videos.find(v => v.id === id);
    if (!video) return false;
    video.deleted_at = this.now();
    video.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'player_videos', id, `Futbolcu videosu silindi: ${video.title}`, null, { deleted_at: video.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYER REFERENCES =================
  public getReferences(playerId?: number, refereeUserId?: number, includeDeleted = false): PlayerReference[] {
    return this.state.player_references.filter(r => {
      if (!includeDeleted && r.deleted_at) return false;
      if (playerId && r.player_id !== playerId) return false;
      if (refereeUserId && r.referee_user_id !== refereeUserId) return false;
      return true;
    });
  }

  public requestReference(data: { player_id: number; referee_user_id: number; relation_type: any; request_message?: string }): PlayerReference {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newRef: PlayerReference = {
      id: Date.now(),
      player_id: data.player_id,
      referee_user_id: data.referee_user_id,
      relation_type: data.relation_type,
      status: 'beklemede',
      request_message: data.request_message,
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.player_references.push(newRef);
    const referee = this.getUserById(data.referee_user_id);
    this.logAudit('INSERT', 'player_references', newRef.id, `Referans talebi oluşturuldu: Referans verilen kullanıcı ${referee?.name}`, null, newRef);
    this.saveToStorage();
    return newRef;
  }

  public updateReferenceStatus(id: number, status: 'onaylandi' | 'reddedildi', notes?: string): boolean {
    const ref = this.state.player_references.find(r => r.id === id);
    if (!ref) return false;
    const old = { ...ref };
    const now = this.now();
    ref.status = status;
    if (notes !== undefined) ref.notes = notes;
    ref.decision_date = now.split('T')[0];
    ref.updated_at = now;
    ref.updated_by = this.getCurrentUser().id;
    this.logAudit('UPDATE', 'player_references', id, `Referans durumu güncellendi: ${status.toUpperCase()}`, old, { status, notes });
    this.saveToStorage();
    return true;
  }

  public softDeleteReference(id: number): boolean {
    const ref = this.state.player_references.find(r => r.id === id);
    if (!ref) return false;
    ref.deleted_at = this.now();
    ref.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'player_references', id, `Referans kaydı silindi (soft delete)`, null, { deleted_at: ref.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYER ACTIVITIES =================
  public getActivitiesByPlayer(playerId: number, includeDeleted = false): PlayerActivity[] {
    return this.state.player_activities.filter(a => 
      a.player_id === playerId && (includeDeleted || !a.deleted_at)
    );
  }

  public insertActivity(data: Omit<PlayerActivity, keyof AuditFields | 'id'>): PlayerActivity {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newAct: PlayerActivity = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.player_activities.push(newAct);
    this.logAudit('INSERT', 'player_activities', newAct.id, `Maç aktivitesi kaydedildi: ${newAct.activity_type.toUpperCase()} (Dk. ${newAct.minute})`, null, newAct);
    this.saveToStorage();
    return newAct;
  }

  public softDeleteActivity(id: number): boolean {
    const act = this.state.player_activities.find(a => a.id === id);
    if (!act) return false;
    act.deleted_at = this.now();
    act.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'player_activities', id, `Aktivite silindi: ${act.activity_type}`, null, { deleted_at: act.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYER TEAM HISTORIES =================
  public getTeamHistoriesByPlayer(playerId: number, includeDeleted = false): PlayerTeamHistory[] {
    return this.state.player_team_histories.filter(h => 
      h.player_id === playerId && (includeDeleted || !h.deleted_at)
    );
  }

  public insertTeamHistory(data: Omit<PlayerTeamHistory, keyof AuditFields | 'id'>): PlayerTeamHistory {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newHist: PlayerTeamHistory = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.player_team_histories.push(newHist);
    const team = this.getTeamById(data.team_id);
    this.logAudit('INSERT', 'player_team_histories', newHist.id, `Kariyer geçmişi eklendi: ${team?.name} (${newHist.start_year}-${newHist.end_year || 'Günümüz'})`, null, newHist);
    this.saveToStorage();
    return newHist;
  }

  public softDeleteTeamHistory(id: number): boolean {
    const hist = this.state.player_team_histories.find(h => h.id === id);
    if (!hist) return false;
    hist.deleted_at = this.now();
    hist.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'player_team_histories', id, `Takım geçmişi kaydı silindi`, null, { deleted_at: hist.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= PLAYER REVIEWS =================
  public getReviewsByPlayer(playerId: number, includeDeleted = false): PlayerReview[] {
    return this.state.player_reviews.filter(r => 
      r.player_id === playerId && (includeDeleted || !r.deleted_at)
    );
  }

  public insertReview(data: Omit<PlayerReview, keyof AuditFields | 'id'>): PlayerReview {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newRev: PlayerReview = {
      ...data,
      id: Date.now(),
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.player_reviews.push(newRev);
    this.logAudit('INSERT', 'player_reviews', newRev.id, `Oyuncu değerlendirmesi yapıldı: ${newRev.rating_overall}/5 Yıldız (${newRev.scout_verdict})`, null, newRev);
    this.saveToStorage();
    return newRev;
  }

  public softDeleteReview(id: number): boolean {
    const rev = this.state.player_reviews.find(r => r.id === id);
    if (!rev) return false;
    rev.deleted_at = this.now();
    rev.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'player_reviews', id, `Oyuncu değerlendirmesi silindi`, null, { deleted_at: rev.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= MESSAGES =================
  public getMessages(userId?: number, includeDeleted = false): Message[] {
    return this.state.messages.filter(m => {
      if (!includeDeleted && m.deleted_at) return false;
      if (userId && m.sender_id !== userId && m.receiver_id !== userId) return false;
      return true;
    });
  }

  public sendMessage(data: { receiver_id: number; player_id?: number | null; subject: string; message_text: string }): Message {
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newMsg: Message = {
      id: Date.now(),
      sender_id: currentUserId,
      receiver_id: data.receiver_id,
      player_id: data.player_id,
      subject: data.subject,
      message_text: data.message_text,
      is_read: false,
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.messages.push(newMsg);
    const receiver = this.getUserById(data.receiver_id);
    this.logAudit('INSERT', 'messages', newMsg.id, `Özel mesaj gönderildi -> ${receiver?.name}: "${newMsg.subject}"`, null, newMsg);
    this.saveToStorage();
    return newMsg;
  }

  public markMessageAsRead(id: number): boolean {
    const msg = this.state.messages.find(m => m.id === id);
    if (!msg || msg.is_read) return false;
    msg.is_read = true;
    msg.updated_at = this.now();
    msg.updated_by = this.getCurrentUser().id;
    this.saveToStorage();
    return true;
  }

  public softDeleteMessage(id: number): boolean {
    const msg = this.state.messages.find(m => m.id === id);
    if (!msg) return false;
    msg.deleted_at = this.now();
    msg.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'messages', id, `Mesaj silindi: "${msg.subject}"`, null, { deleted_at: msg.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= SCOUT NOTES (PREMIUM & PRO SCOUT) =================
  public getScoutNotes(playerId?: number, userId?: number): ScoutNote[] {
    if (!this.state.scout_notes) this.state.scout_notes = [];
    return this.state.scout_notes.filter(note => {
      if (note.deleted_at) return false;
      if (playerId && note.player_id !== playerId) return false;
      if (userId && note.user_id !== userId) return false;
      return true;
    });
  }

  public insertScoutNote(data: Omit<ScoutNote, keyof AuditFields | 'id'>): ScoutNote {
    if (!this.state.scout_notes) this.state.scout_notes = [];
    const currentUserId = this.getCurrentUser().id;
    const now = this.now();
    const newNote: ScoutNote = {
      id: Date.now(),
      ...data,
      created_at: now,
      created_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
      deleted_at: null,
    };
    this.state.scout_notes.unshift(newNote);
    this.logAudit('INSERT', 'scout_notes', newNote.id, `Özel scout notu eklendi (Futbolcu #${newNote.player_id})`, null, newNote);
    this.saveToStorage();
    return newNote;
  }

  public deleteScoutNote(id: number): boolean {
    if (!this.state.scout_notes) return false;
    const note = this.state.scout_notes.find(n => n.id === id);
    if (!note) return false;
    note.deleted_at = this.now();
    note.deleted_by = this.getCurrentUser().id;
    this.logAudit('DELETE', 'scout_notes', id, `Özel scout notu silindi`, null, { deleted_at: note.deleted_at });
    this.saveToStorage();
    return true;
  }

  // ================= SPONSORSHIPS & SPORTS FACILITIES =================
  public getSportsFacilities(city?: string, type?: string): SportsFacility[] {
    if (!this.state.sports_facilities) this.state.sports_facilities = [...SEED_SPORTS_FACILITIES];
    return this.state.sports_facilities.filter(f => {
      if (city && city !== 'all' && f.city.toLowerCase() !== city.toLowerCase()) return false;
      if (type && type !== 'all' && f.type !== type) return false;
      return true;
    });
  }

  public getSportsFacilityById(id: number): SportsFacility | undefined {
    if (!this.state.sports_facilities) this.state.sports_facilities = [...SEED_SPORTS_FACILITIES];
    return this.state.sports_facilities.find(f => f.id === id);
  }

  public addSportsFacility(facility: Omit<SportsFacility, 'id'>): SportsFacility {
    if (!this.state.sports_facilities) this.state.sports_facilities = [...SEED_SPORTS_FACILITIES];
    const newFacility: SportsFacility = {
      ...facility,
      id: Date.now(),
    };
    this.state.sports_facilities.unshift(newFacility);
    this.logAudit('INSERT', 'sports_facilities', newFacility.id, `Yeni spor tesisi eklendi (${newFacility.name})`, null, newFacility);
    this.saveToStorage();
    return newFacility;
  }

  public getEquipmentSponsors(category?: string): EquipmentSponsor[] {
    if (!this.state.equipment_sponsors) this.state.equipment_sponsors = [...SEED_EQUIPMENT_SPONSORS];
    return this.state.equipment_sponsors.filter(s => {
      if (category && category !== 'all' && s.category !== category) return false;
      return true;
    });
  }

  public getEquipmentSponsorById(id: number): EquipmentSponsor | undefined {
    if (!this.state.equipment_sponsors) this.state.equipment_sponsors = [...SEED_EQUIPMENT_SPONSORS];
    return this.state.equipment_sponsors.find(s => s.id === id);
  }

  public getSponsorshipApplications(): SponsorshipApplication[] {
    if (!this.state.sponsorship_applications) this.state.sponsorship_applications = [...SEED_SPONSORSHIP_APPLICATIONS];
    return this.state.sponsorship_applications;
  }

  public addSponsorshipApplication(app: Omit<SponsorshipApplication, 'id' | 'created_at' | 'status'>): SponsorshipApplication {
    if (!this.state.sponsorship_applications) this.state.sponsorship_applications = [...SEED_SPONSORSHIP_APPLICATIONS];
    const newApp: SponsorshipApplication = {
      ...app,
      id: Date.now(),
      status: 'beklemede',
      created_at: new Date().toISOString(),
    };
    this.state.sponsorship_applications.unshift(newApp);
    this.logAudit('INSERT', 'sponsorship_applications', newApp.id, `Yeni sponsorluk başvurusu (${newApp.applicant_name} - ${newApp.requested_category})`, null, newApp);
    this.saveToStorage();
    return newApp;
  }

  public updateSponsorshipApplicationStatus(id: number, status: 'beklemede' | 'inceleniyor' | 'onaylandi' | 'reddedildi'): boolean {
    if (!this.state.sponsorship_applications) return false;
    const app = this.state.sponsorship_applications.find(a => a.id === id);
    if (!app) return false;
    const oldStatus = app.status;
    app.status = status;
    this.logAudit('UPDATE', 'sponsorship_applications', id, `Sponsorluk başvuru durumu güncellendi: ${oldStatus} -> ${status}`, { status: oldStatus }, { status });
    this.saveToStorage();
    return true;
  }

  // ================= AUDIT LOGS =================
  public getAuditLogs(tableName?: string, action?: string): AuditLog[] {
    return this.state.audit_logs.filter(log => {
      if (tableName && log.table_name !== tableName) return false;
      if (action && log.action !== action) return false;
      return true;
    });
  }

  // ================= DATABASE RESET =================
  public resetToFactory() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadFromStorage();
    this.notify();
  }
}

export const db = new RelationalDatabaseService();
