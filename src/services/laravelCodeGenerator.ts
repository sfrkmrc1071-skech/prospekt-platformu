/**
 * Laravel 11 / 12 & MySQL Architecture Generator
 * Produces production-ready PHP Migrations, Eloquent Models, and MySQL DDL Dump
 */

export const LARAVEL_MIGRATIONS_CODE = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

/**
 * 2026_10_04_000001_create_prospekt_football_marketplace_tables.php
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. ROLLER TABLOSU
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            
            // Standart Denetim ve Soft Delete Alanları
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. KULLANICILAR TABLOSU
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone')->nullable();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('avatar')->nullable();
            $table->text('bio')->nullable();
            $table->enum('status', ['active', 'suspended', 'pending'])->default('active');
            $table->string('club_name')->nullable();
            $table->enum('membership_tier', ['standard', 'premium', 'pro_scout'])->default('standard');
            $table->date('membership_expires_at')->nullable();
            $table->json('watchlist_player_ids')->nullable();
            $table->rememberToken();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. ROL VE YETKİ TABLOSU (Sayfa, Kayıt, Ekleme, Güncelleme, Silme Yetkileri)
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('module'); // users, teams, players, videos, etc.
            $table->boolean('can_view_page')->default(false);
            $table->boolean('can_view_records')->default(false);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_update')->default(false);
            $table->boolean('can_delete')->default(false);
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['role_id', 'module']);
        });

        // 4. TAKIMLAR TABLOSU
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('short_name', 10);
            $table->string('logo')->nullable();
            $table->string('league');
            $table->string('city');
            $table->string('stadium');
            $table->integer('founded_year');
            $table->string('website')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. FUTBOLCULAR TABLOSU (Çoktan seçmeli mevkiler JSON olarak saklanır)
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('birth_date');
            $table->unsignedSmallInteger('height'); // cm
            $table->unsignedSmallInteger('weight'); // kg
            $table->enum('preferred_foot', ['Sağ', 'Sol', 'Her İkisi'])->default('Sağ');
            $table->json('positions'); // Çoktan seçmeli mevki array
            $table->string('primary_position');
            $table->foreignId('current_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('photo')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedBigInteger('market_value_eur')->default(0);
            $table->date('contract_until')->nullable();
            $table->string('nationality')->default('Türkiye');
            $table->unsignedTinyInteger('jersey_number')->nullable();
            $table->string('instagram_handle')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. FUTBOLCU VİDEOLARI TABLOSU
        Schema::create('player_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('title');
            $table->string('video_url');
            $table->enum('video_type', ['highlight', 'match_clip', 'training', 'scout_report'])->default('highlight');
            $table->string('duration')->nullable();
            $table->date('match_date')->nullable();
            $table->text('description')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. FUTBOLCU REFERANSLARI TABLOSU
        Schema::create('player_references', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('referee_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('relation_type'); // Eski Antrenör, Kulüp Yöneticisi vb.
            $table->enum('status', ['beklemede', 'onaylandi', 'reddedildi'])->default('beklemede');
            $table->text('request_message')->nullable();
            $table->text('notes')->nullable();
            $table->date('decision_date')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. FUTBOLCU MAÇ AKTİVİTELERİ TABLOSU
        Schema::create('player_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('season', 15);
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('opponent_team_id')->constrained('teams')->cascadeOnDelete();
            $table->enum('activity_type', ['gol', 'asist', 'kurtaris', 'sari_kart', 'kirmizi_kart', 'macin_adami', 'temiz_sayfa', 'penalti_kurtarisi']);
            $table->unsignedSmallInteger('minute');
            $table->string('match_week')->nullable();
            $table->string('match_score', 10)->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 9. FUTBOLCU TAKIM GEÇMİŞİ (KARİYER) TABLOSU
        Schema::create('player_team_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedSmallInteger('start_year');
            $table->unsignedSmallInteger('end_year')->nullable();
            $table->string('position');
            $table->unsignedSmallInteger('appearances')->default(0);
            $table->unsignedSmallInteger('goals')->default(0);
            $table->unsignedSmallInteger('assists')->default(0);
            $table->string('achievements')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 10. FUTBOLCU DEĞERLENDİRME & YILDIZLAMA TABLOSU
        Schema::create('player_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating_overall'); // 1 - 5
            $table->unsignedTinyInteger('rating_technical')->default(3);
            $table->unsignedTinyInteger('rating_physical')->default(3);
            $table->unsignedTinyInteger('rating_mental')->default(3);
            $table->text('comment');
            $table->enum('scout_verdict', ['İlk 11 Oyuncusu', 'Yüksek Potansiyelli Genç', 'Gelişime Açık', 'Yıldız Adayı', 'Rotasyon Oyuncusu']);
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 11. ÖZEL MESAJLAŞMA TABLOSU
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->string('subject');
            $table->text('message_text');
            $table->boolean('is_read')->default(false);
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. GİZLİ SCOUT NOTLARI (Premium & Pro Scout Üyelerine Özel)
        Schema::create('scout_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->text('note');
            $table->json('tags')->nullable();
            $table->enum('recommended_action', ['izlemeye_al', 'teklif_yap', 'kiralik_dusun', 'pas_gec'])->default('izlemeye_al');
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 13. TÜM İŞLEMLERİN KAYDEDİLDİĞİ SİSTEM LOGLARI TABLOSU (Audit Log)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->enum('action', ['INSERT', 'UPDATE', 'DELETE', 'RESTORE']);
            $table->string('table_name', 100);
            $table->unsignedBigInteger('record_id');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('changes_summary');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('player_reviews');
        Schema::dropIfExists('player_team_histories');
        Schema::dropIfExists('player_activities');
        Schema::dropIfExists('player_references');
        Schema::dropIfExists('player_videos');
        Schema::dropIfExists('players');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};
`;

export const LARAVEL_ELOQUENT_MODEL_CODE = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\SoftDeletes;
use App\\Traits\\Auditable;

class Player extends Model
{
    use HasFactory, SoftDeletes, Auditable;

    protected $table = 'players';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'birth_date',
        'height',
        'weight',
        'preferred_foot',
        'positions',
        'primary_position',
        'current_team_id',
        'photo',
        'bio',
        'market_value_eur',
        'contract_until',
        'nationality',
        'jersey_number',
        'instagram_handle',
        'created_by',
        'updated_by',
        'deleted_by'
    ];

    protected $casts = [
        'positions' => 'array',
        'birth_date' => 'date',
        'contract_until' => 'date',
        'height' => 'integer',
        'weight' => 'integer',
        'market_value_eur' => 'integer',
    ];

    // İlişkiler
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function currentTeam()
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    public function videos()
    {
        return $this->hasMany(PlayerVideo::class);
    }

    public function references()
    {
        return $this->hasMany(PlayerReference::class);
    }

    public function activities()
    {
        return $this->hasMany(PlayerActivity::class);
    }

    public function teamHistories()
    {
        return $this->hasMany(PlayerTeamHistory::class);
    }

    public function reviews()
    {
        return $this->hasMany(PlayerReview::class);
    }

    // Tam İsim Aksesuarı
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
`;

export const MYSQL_DDL_DUMP = `-- ========================================================
-- PROSPEKT FUTBOLCU PAZAR YERİ & SCOUT PLATFORMU
-- MySQL 8.0+ / MariaDB 10.6+ DDL & DML Schema Dump
-- Tüm tablolarda Soft Delete & Audit Alanları tanımlıdır
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLLER
CREATE TABLE IF NOT EXISTS \`roles\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL UNIQUE,
  \`description\` TEXT NULL,
  \`is_system\` TINYINT(1) DEFAULT 0,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. KULLANICILAR
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(50) NULL,
  \`role_id\` BIGINT UNSIGNED NOT NULL,
  \`avatar\` VARCHAR(500) NULL,
  \`bio\` TEXT NULL,
  \`status\` ENUM('active', 'suspended', 'pending') DEFAULT 'active',
  \`club_name\` VARCHAR(255) NULL,
  \`remember_token\` VARCHAR(100) NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROL YETKİLERİ
CREATE TABLE IF NOT EXISTS \`role_permissions\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`role_id\` BIGINT UNSIGNED NOT NULL,
  \`module\` VARCHAR(100) NOT NULL,
  \`can_view_page\` TINYINT(1) DEFAULT 0,
  \`can_view_records\` TINYINT(1) DEFAULT 0,
  \`can_create\` TINYINT(1) DEFAULT 0,
  \`can_update\` TINYINT(1) DEFAULT 0,
  \`can_delete\` TINYINT(1) DEFAULT 0,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY \`role_module_unique\` (\`role_id\`, \`module\`),
  FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TAKIMLAR
CREATE TABLE IF NOT EXISTS \`teams\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`short_name\` VARCHAR(10) NOT NULL,
  \`logo\` VARCHAR(500) NULL,
  \`league\` VARCHAR(150) NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`stadium\` VARCHAR(200) NOT NULL,
  \`founded_year\` INT NOT NULL,
  \`website\` VARCHAR(255) NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. FUTBOLCULAR
CREATE TABLE IF NOT EXISTS \`players\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`first_name\` VARCHAR(100) NOT NULL,
  \`last_name\` VARCHAR(100) NOT NULL,
  \`birth_date\` DATE NOT NULL,
  \`height\` SMALLINT UNSIGNED NOT NULL,
  \`weight\` SMALLINT UNSIGNED NOT NULL,
  \`preferred_foot\` ENUM('Sağ', 'Sol', 'Her İkisi') DEFAULT 'Sağ',
  \`positions\` JSON NOT NULL,
  \`primary_position\` VARCHAR(100) NOT NULL,
  \`current_team_id\` BIGINT UNSIGNED NULL,
  \`photo\` VARCHAR(500) NULL,
  \`bio\` TEXT NULL,
  \`market_value_eur\` BIGINT UNSIGNED DEFAULT 0,
  \`contract_until\` DATE NULL,
  \`nationality\` VARCHAR(100) DEFAULT 'Türkiye',
  \`jersey_number\` TINYINT UNSIGNED NULL,
  \`instagram_handle\` VARCHAR(100) NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`current_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. FUTBOLCU VİDEOLARI
CREATE TABLE IF NOT EXISTS \`player_videos\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`player_id\` BIGINT UNSIGNED NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`video_url\` VARCHAR(500) NOT NULL,
  \`video_type\` ENUM('highlight', 'match_clip', 'training', 'scout_report') DEFAULT 'highlight',
  \`duration\` VARCHAR(20) NULL,
  \`match_date\` DATE NULL,
  \`description\` TEXT NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. FUTBOLCU REFERANSLARI
CREATE TABLE IF NOT EXISTS \`player_references\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`player_id\` BIGINT UNSIGNED NOT NULL,
  \`referee_user_id\` BIGINT UNSIGNED NOT NULL,
  \`relation_type\` VARCHAR(150) NOT NULL,
  \`status\` ENUM('beklemede', 'onaylandi', 'reddedildi') DEFAULT 'beklemede',
  \`request_message\` TEXT NULL,
  \`notes\` TEXT NULL,
  \`decision_date\` DATE NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`referee_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. FUTBOLCU MAÇ AKTİVİTELERİ
CREATE TABLE IF NOT EXISTS \`player_activities\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`player_id\` BIGINT UNSIGNED NOT NULL,
  \`season\` VARCHAR(20) NOT NULL,
  \`team_id\` BIGINT UNSIGNED NOT NULL,
  \`opponent_team_id\` BIGINT UNSIGNED NOT NULL,
  \`activity_type\` ENUM('gol', 'asist', 'kurtaris', 'sari_kart', 'kirmizi_kart', 'macin_adami', 'temiz_sayfa', 'penalti_kurtarisi') NOT NULL,
  \`minute\` SMALLINT UNSIGNED NOT NULL,
  \`match_week\` VARCHAR(50) NULL,
  \`match_score\` VARCHAR(15) NULL,
  \`notes\` TEXT NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`opponent_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. FUTBOLCU TAKIM GEÇMİŞİ (KARİYER)
CREATE TABLE IF NOT EXISTS \`player_team_histories\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`player_id\` BIGINT UNSIGNED NOT NULL,
  \`team_id\` BIGINT UNSIGNED NOT NULL,
  \`start_year\` SMALLINT UNSIGNED NOT NULL,
  \`end_year\` SMALLINT UNSIGNED NULL,
  \`position\` VARCHAR(100) NOT NULL,
  \`appearances\` SMALLINT UNSIGNED DEFAULT 0,
  \`goals\` SMALLINT UNSIGNED DEFAULT 0,
  \`assists\` SMALLINT UNSIGNED DEFAULT 0,
  \`achievements\` VARCHAR(255) NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. FUTBOLCU DEĞERLENDİRME & YILDIZLAMA
CREATE TABLE IF NOT EXISTS \`player_reviews\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`player_id\` BIGINT UNSIGNED NOT NULL,
  \`reviewer_user_id\` BIGINT UNSIGNED NOT NULL,
  \`rating_overall\` TINYINT UNSIGNED NOT NULL,
  \`rating_technical\` TINYINT UNSIGNED DEFAULT 3,
  \`rating_physical\` TINYINT UNSIGNED DEFAULT 3,
  \`rating_mental\` TINYINT UNSIGNED DEFAULT 3,
  \`comment\` TEXT NOT NULL,
  \`scout_verdict\` ENUM('İlk 11 Oyuncusu', 'Yüksek Potansiyelli Genç', 'Gelişime Açık', 'Yıldız Adayı', 'Rotasyon Oyuncusu') NOT NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`reviewer_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ÖZEL MESAJLAŞMA
CREATE TABLE IF NOT EXISTS \`messages\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`sender_id\` BIGINT UNSIGNED NOT NULL,
  \`receiver_id\` BIGINT UNSIGNED NOT NULL,
  \`player_id\` BIGINT UNSIGNED NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`message_text\` TEXT NOT NULL,
  \`is_read\` TINYINT(1) DEFAULT 0,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`deleted_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TÜM İŞLEMLERİN LOGLANDIĞI AUDIT TABLOSU
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`action\` ENUM('INSERT', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
  \`table_name\` VARCHAR(100) NOT NULL,
  \`record_id\` BIGINT UNSIGNED NOT NULL,
  \`user_id\` BIGINT UNSIGNED NULL,
  \`user_name\` VARCHAR(255) NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`changes_summary\` TEXT NOT NULL,
  \`old_values\` JSON NULL,
  \`new_values\` JSON NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_audit_table_record\` (\`table_name\`, \`record_id\`),
  INDEX \`idx_audit_user\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;
