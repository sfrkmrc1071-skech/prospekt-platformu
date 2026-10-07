/**
 * Prospekt Futbolcu Pazar Yeri & Scout Platformu
 * Domain Models & Types with Laravel & MySQL conventions
 */

export type RoleSlug = 'super_admin' | 'scout' | 'coach' | 'player' | 'manager';

export type MembershipTier = 'standard' | 'premium' | 'pro_scout';

export interface AuditFields {
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  deleted_at: string | null;
  deleted_by?: number | null;
}

export interface User extends AuditFields {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  avatar?: string;
  bio?: string;
  status: 'active' | 'suspended' | 'pending';
  club_name?: string;
  membership_tier: MembershipTier;
  membership_expires_at?: string | null;
  watchlist_player_ids?: number[];
}

export type PermissionModule = 
  | 'users' 
  | 'roles' 
  | 'teams' 
  | 'players' 
  | 'player_videos' 
  | 'player_references' 
  | 'player_activities' 
  | 'player_team_histories' 
  | 'player_reviews' 
  | 'messages' 
  | 'audit_logs';

export interface RolePermission extends AuditFields {
  id: number;
  role_id: number;
  module: PermissionModule;
  can_view_page: boolean;      // Sayfayı görüntüleme yetkisi
  can_view_records: boolean;   // Kayıtları görüntüleme yetkisi
  can_create: boolean;         // Kayıt ekleme yetkisi
  can_update: boolean;         // Değiştirme / güncelleme yetkisi
  can_delete: boolean;         // Silme (soft delete) yetkisi
}

export interface Role extends AuditFields {
  id: number;
  name: string;
  slug: RoleSlug;
  description: string;
  is_system?: boolean;
}

export interface Team extends AuditFields {
  id: number;
  name: string;
  short_name: string;
  logo: string;
  league: string;
  city: string;
  stadium: string;
  founded_year: number;
  website?: string;
}

export type PlayerPosition = 
  | 'Kaleci'
  | 'Stoper'
  | 'Sol Bek'
  | 'Sağ Bek'
  | 'Ön Libero'
  | 'Merkez Orta Saha'
  | 'On Numara'
  | 'Sol Kanat'
  | 'Sağ Kanat'
  | 'Santrafor'
  | 'İkinci Forvet';

export type Foot = 'Sağ' | 'Sol' | 'Her İkisi';

export interface Player extends AuditFields {
  id: number;
  user_id: number;              // Futbolcunun bağlı olduğu kullanıcı hesabı
  first_name: string;
  last_name: string;
  birth_date: string;           // YYYY-MM-DD
  height: number;               // cm (örn: 184)
  weight: number;               // kg (örn: 78)
  preferred_foot: Foot;
  positions: PlayerPosition[];   // Çoktan seçmeli mevki listesi
  primary_position: PlayerPosition;
  current_team_id: number | null;
  photo: string;
  bio: string;
  market_value_eur: number;     // Euro
  contract_until?: string;
  nationality: string;
  jersey_number?: number;
  instagram_handle?: string;
}

export type VideoType = 'highlight' | 'match_clip' | 'training' | 'scout_report';

export interface PlayerVideo extends AuditFields {
  id: number;
  player_id: number;
  title: string;
  video_url: string;
  video_type: VideoType;
  duration?: string;
  match_date?: string;
  description?: string;
}

export type ReferenceStatus = 'beklemede' | 'onaylandi' | 'reddedildi';
export type RelationType = 'Eski Teknik Direktör' | 'Antrenör' | 'Kulüp Yöneticisi' | 'Takım Kaptanı' | 'Scout / Gözlemci' | 'Menajer';

export interface PlayerReference extends AuditFields {
  id: number;
  player_id: number;
  referee_user_id: number;      // Referans olarak seçilen sistem kullanıcısı
  relation_type: RelationType;
  status: ReferenceStatus;
  notes?: string;               // Referans onaylarken yazılan açıklama/görüş
  request_message?: string;     // Futbolcunun talebi gönderirken yazdığı mesaj
  decision_date?: string;
}

export type ActivityType = 
  | 'gol' 
  | 'asist' 
  | 'kurtaris' 
  | 'sari_kart' 
  | 'kirmizi_kart' 
  | 'macin_adami' 
  | 'temiz_sayfa' 
  | 'penalti_kurtarisi';

export interface PlayerActivity extends AuditFields {
  id: number;
  player_id: number;
  season: string;               // örn: '2025/2026'
  team_id: number;              // Oynadığı takım
  opponent_team_id: number;     // Karşı takım
  activity_type: ActivityType;
  minute: number;               // Dakika (örn: 74)
  match_week?: string;          // örn: 'Hafta 18'
  match_score?: string;         // örn: '2 - 1'
  notes?: string;
}

export interface PlayerTeamHistory extends AuditFields {
  id: number;
  player_id: number;
  team_id: number;
  start_year: number;
  end_year: number | null;      // null ise devam ediyor
  position: PlayerPosition;
  appearances: number;          // Oynadığı maç sayısı
  goals: number;
  assists: number;
  achievements?: string;        // Şampiyonluk, Kupa vb.
}

export interface PlayerReview extends AuditFields {
  id: number;
  player_id: number;
  reviewer_user_id: number;
  rating_overall: number;       // 1 - 5 yıldız
  rating_technical: number;     // 1 - 5
  rating_physical: number;      // 1 - 5
  rating_mental: number;        // 1 - 5
  comment: string;
  scout_verdict: 'İlk 11 Oyuncusu' | 'Yüksek Potansiyelli Genç' | 'Gelişime Açık' | 'Yıldız Adayı' | 'Rotasyon Oyuncusu';
}

export interface Message extends AuditFields {
  id: number;
  sender_id: number;
  receiver_id: number;
  player_id?: number | null;    // İlgili futbolcu bağlamı
  subject: string;
  message_text: string;
  is_read: boolean;
}

export interface ScoutNote extends AuditFields {
  id: number;
  user_id: number;
  player_id: number;
  note: string;
  tags?: string[];
  recommended_action?: 'izlemeye_al' | 'teklif_yap' | 'kiralik_dusun' | 'pas_gec';
}

export type FacilityType = 'hali_saha' | 'stadyum' | 'akademi' | 'fitness_performans';

export interface SportsFacility {
  id: number;
  name: string;
  type: FacilityType;
  type_label: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  surface_type: string;
  features: string[];
  rating: number;
  reviews_count: number;
  price_hourly: number;
  sponsorship_deal?: {
    title: string;
    badge: string;
    discount_percent: number;
    coupon_code: string;
    description: string;
    perks: string[];
  };
  image_url: string;
  opening_hours: string;
  is_verified_partner: boolean;
}

export type EquipmentCategory = 
  | 'krampon' 
  | 'forma_top' 
  | 'gps_teknoloji' 
  | 'beslenme_hidrasyon' 
  | 'saglik_fizyoterapi';

export interface EquipmentSponsor {
  id: number;
  brand_name: string;
  brand_logo: string;
  category: EquipmentCategory;
  category_label: string;
  title: string;
  description: string;
  discount_rate: string;
  coupon_code: string;
  valid_until: string;
  featured_product: {
    name: string;
    image: string;
    original_price?: number;
    discounted_price?: number;
    specs?: string[];
  };
  target_audience: 'Tüm Oyuncular' | 'Scoutlar & Antrenörler' | 'Akademiler & Kulüpler';
  external_url?: string;
  is_verified: boolean;
}

export interface SponsorshipApplication {
  id: number;
  applicant_type: 'player' | 'team' | 'brand_partner';
  applicant_name: string;
  contact_email: string;
  contact_phone: string;
  club_or_agency?: string;
  requested_category: string;
  notes: string;
  status: 'beklemede' | 'inceleniyor' | 'onaylandi' | 'reddedildi';
  created_at: string;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';

export interface AuditLog {
  id: number;
  action: AuditAction;
  table_name: string;
  record_id: number;
  user_id: number;
  user_name: string;
  ip_address: string;
  changes_summary: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}
