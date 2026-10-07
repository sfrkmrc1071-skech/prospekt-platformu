import React, { useState } from 'react';
import { User, MembershipTier } from '../types';
import { db } from '../services/db';

interface MembershipPlansViewProps {
  currentUser: User;
  onClose?: () => void;
  isModal?: boolean;
}

export const MembershipPlansView: React.FC<MembershipPlansViewProps> = ({
  currentUser,
  onClose,
  isModal = false,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentTier = currentUser.membership_tier || 'standard';

  const handleSelectTier = (tier: MembershipTier) => {
    const months = billingCycle === 'annual' ? 12 : 1;
    db.upgradeUserMembership(currentUser.id, tier, months);
    
    const tierName = tier === 'pro_scout' ? 'Pro Scout & Kulüp' : tier === 'premium' ? 'Premium Scout' : 'Standart';
    setSuccessMessage(`Tebrikler! ${currentUser.name} hesabınız başarıyla "${tierName}" planına geçirildi. Veritabanına ve sistem loglarına kaydedildi.`);
    
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const content = (
    <div className="py-2">
      {/* Top Banner */}
      <div className="text-center mb-5">
        <div className="d-inline-flex align-items-center gap-2 badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm">
          <i className="bi bi-gem"></i>
          <span>PROSPEKT TRANSFER & SCOUT ÜYELİK SİSTEMİ</span>
        </div>
        <h2 className="fw-black text-dark mb-2 display-6">
          Doğru Futbolcuyu Keşfet, Doğru Kulüple Buluş
        </h2>
        <p className="text-secondary max-w-2xl mx-auto mb-4 lead fs-6">
          Normal üyeler temel pazar yerini keşfederken; Premium ve Pro Scout üyelerimiz derin scout analizlerine, sınırsız mesajlaşmaya, gizli menajer kontaklarına ve transfer izleme listesine erişir.
        </p>

        {/* Current Active Plan Status Bar */}
        <div className="card shadow-sm border-0 bg-white mx-auto mb-4" style={{ maxWidth: '750px' }}>
          <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3 text-start">
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold ${
                  currentTier === 'pro_scout' ? 'bg-info text-dark' :
                  currentTier === 'premium' ? 'bg-warning text-dark' : 'bg-secondary'
                }`}
                style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}
              >
                {currentTier === 'pro_scout' ? '👑' : currentTier === 'premium' ? '⭐' : '⚽'}
              </div>
              <div>
                <div className="small text-muted">Aktif Oturum Sahibi & Mevcut Plan:</div>
                <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                  <span>{currentUser.name}</span>
                  <span className={`badge ${
                    currentTier === 'pro_scout' ? 'bg-info text-dark' :
                    currentTier === 'premium' ? 'bg-warning text-dark' : 'bg-secondary text-white'
                  }`}>
                    {currentTier === 'pro_scout' ? 'PRO SCOUT & KULÜP' : currentTier === 'premium' ? 'PREMIUM ÜYE' : 'STANDART (NORMAL) ÜYE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-end small">
              <span className="text-muted d-block">Geçerlilik Tarihi:</span>
              <strong className="text-dark">
                {currentUser.membership_expires_at ? new Date(currentUser.membership_expires_at).toLocaleDateString('tr-TR') : 'Süresiz Temel Erişim'}
              </strong>
            </div>
          </div>
        </div>

        {/* Monthly / Annual Toggle */}
        <div className="d-inline-flex align-items-center p-1 bg-light rounded-pill border shadow-sm">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 fw-bold ${billingCycle === 'monthly' ? 'btn-white bg-white text-dark shadow-sm' : 'text-muted'}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Aylık Faturalandırma
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 fw-bold d-flex align-items-center gap-1 ${billingCycle === 'annual' ? 'btn-primary text-white shadow-sm' : 'text-muted'}`}
            onClick={() => setBillingCycle('annual')}
          >
            <span>Yıllık Plan</span>
            <span className="badge bg-warning text-dark rounded-pill">%20 İndirimli</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="alert alert-success d-flex align-items-center gap-3 shadow-sm mb-4">
          <i className="bi bi-check-circle-fill fs-3 text-success"></i>
          <div>
            <div className="fw-bold">Plan Güncellemesi Başarılı!</div>
            <div className="small">{successMessage}</div>
          </div>
        </div>
      )}

      {/* 3 Pricing Cards */}
      <div className="row g-4 mb-5 justify-content-center">
        
        {/* TIER 1: STANDART (NORMAL ÜYE) */}
        <div className="col-lg-4 col-md-6">
          <div className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden bg-white ${
            currentTier === 'standard' ? 'border-2 border-primary ring-2 ring-primary' : ''
          }`}>
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-secondary-subtle text-secondary border px-3 py-1 text-uppercase fw-bold">
                  Normal Üyelik
                </span>
                {currentTier === 'standard' && (
                  <span className="badge bg-primary text-white">Mevcut Plan</span>
                )}
              </div>

              <h4 className="fw-black text-dark mb-1">Standart</h4>
              <p className="text-muted small">Futbolcu arayan temel gözlemciler, genç oyuncular ve taraftarlar için.</p>

              <div className="my-3 py-3 border-top border-bottom">
                <div className="d-flex align-items-baseline gap-1">
                  <span className="display-5 fw-black text-dark">₺0</span>
                  <span className="text-muted small">/ kalıcı ücretsiz</span>
                </div>
                <div className="small text-muted mt-1">Kredi kartı gerektirmez</div>
              </div>

              {/* Perks list */}
              <ul className="list-unstyled small text-secondary flex-grow-1 d-flex flex-column gap-2 mb-4">
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>Pazar yerindeki futbolcuları arama & inceleme</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>Çoktan seçmeli mevkiler & fiziksel metrikler</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>Onaylı antrenör referanslarını görme</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>Kendi futbolcu profilini ekleyebilme (1 adet)</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-dash-circle text-secondary fs-5 flex-shrink-0"></i>
                  <span>Günlük en fazla 2 özel scout mesajı</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-dash-circle text-secondary fs-5 flex-shrink-0"></i>
                  <span>İzleme listesi (Watchlist) maksimum 2 oyuncu</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-x-circle text-danger fs-5 flex-shrink-0"></i>
                  <span className="text-decoration-line-through">6 Boyutlu Radar & Derin İstatistikler</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-x-circle text-danger fs-5 flex-shrink-0"></i>
                  <span className="text-decoration-line-through">Özel Scout Not Defteri</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-x-circle text-danger fs-5 flex-shrink-0"></i>
                  <span className="text-decoration-line-through">Menajer & Temsilci Doğrudan Telefonu</span>
                </li>
              </ul>

              {currentTier !== 'standard' ? (
                <button 
                  className="btn btn-outline-secondary w-100 py-2 rounded-3 fw-bold"
                  onClick={() => handleSelectTier('standard')}
                >
                  Standart Plana Düşür
                </button>
              ) : (
                <button className="btn btn-light border text-muted w-100 py-2 rounded-3 fw-bold" disabled>
                  <i className="bi bi-check2 me-1"></i> Aktif Planınız
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TIER 2: PREMIUM SCOUT & PLAYER */}
        <div className="col-lg-4 col-md-6">
          <div className={`card h-100 border-0 shadow-lg rounded-4 overflow-hidden bg-white position-relative ${
            currentTier === 'premium' ? 'border-2 border-warning ring-2 ring-warning' : ''
          }`}>
            <div className="bg-warning text-dark py-1 text-center small fw-bold text-uppercase tracking-wider">
              ⭐ EN ÇOK TERCİH EDİLEN SCOUT PAKETİ
            </div>
            
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-warning text-dark px-3 py-1 text-uppercase fw-bold">
                  ⭐ Premium Üyelik
                </span>
                {currentTier === 'premium' && (
                  <span className="badge bg-warning text-dark">Mevcut Plan</span>
                )}
              </div>

              <h4 className="fw-black text-dark mb-1">Premium Scout</h4>
              <p className="text-muted small">Aktif futbolcular, yetenek avcıları, scoutlar ve bağımsız menajerler için.</p>

              <div className="my-3 py-3 border-top border-bottom bg-warning-subtle bg-opacity-25 rounded px-3">
                <div className="d-flex align-items-baseline gap-1">
                  <span className="display-5 fw-black text-dark">
                    {billingCycle === 'annual' ? '₺319' : '₺399'}
                  </span>
                  <span className="text-muted small">/ ay</span>
                </div>
                <div className="small text-success fw-semibold mt-1">
                  {billingCycle === 'annual' ? 'Yıllık ₺3.828 tek çekim (₺960 tasarruf)' : 'Aylık yenilenen esnek abonelik'}
                </div>
              </div>

              {/* Perks list */}
              <ul className="list-unstyled small text-dark flex-grow-1 d-flex flex-column gap-2 mb-4">
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-patch-check-fill text-warning fs-5 flex-shrink-0"></i>
                  <strong>Altın Doğrulanmış Profil Rozeti (Scout/Oyuncu)</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <strong>Sınırsız Doğrudan Mesajlaşma (Kota Yok)</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <strong>Sınırsız Oyuncu İzleme Listesi (Watchlist)</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <strong>6 Boyutlu Scout Radar Grafikleri & Performans Puanları</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <strong>Özel Scout Not Defteri (Gizli Teknik Notlar)</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <strong>Menajer & Temsilci Doğrudan Telefon Numaraları</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>Gelişmiş Filtreler: U21, Piyasa Değeri, Sözleşme Yılı</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2-circle text-success fs-5 flex-shrink-0"></i>
                  <span>2 Adet Futbolcuyu Pazar Yerinde Vitrine Çıkarma</span>
                </li>
                <li className="d-flex align-items-start gap-2 text-muted">
                  <i className="bi bi-x-circle text-danger fs-5 flex-shrink-0"></i>
                  <span className="text-decoration-line-through">Resmi Kulüp Transfer Masası & Delegasyon</span>
                </li>
              </ul>

              {currentTier !== 'premium' ? (
                <button 
                  className="btn btn-warning text-dark w-100 py-3 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  onClick={() => handleSelectTier('premium')}
                >
                  <i className="bi bi-gem"></i>
                  <span>Premium Scout'a Yükselt (Simüle Et)</span>
                </button>
              ) : (
                <button className="btn btn-warning text-dark w-100 py-2 rounded-3 fw-bold opacity-75" disabled>
                  <i className="bi bi-check-circle-fill me-1"></i> Aktif Planınız
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TIER 3: PRO SCOUT & KULÜP ELİT */}
        <div className="col-lg-4 col-md-6">
          <div className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden bg-dark text-white ${
            currentTier === 'pro_scout' ? 'border-2 border-info ring-2 ring-info' : ''
          }`}>
            <div className="bg-info text-dark py-1 text-center small fw-bold text-uppercase">
              ⚡ ELİT KULÜP & PRO SCOUT DEPARTMANI
            </div>
            
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-info text-dark px-3 py-1 text-uppercase fw-bold">
                  💎 Pro Kulüp Lisansı
                </span>
                {currentTier === 'pro_scout' && (
                  <span className="badge bg-info text-dark">Mevcut Plan</span>
                )}
              </div>

              <h4 className="fw-black text-white mb-1">Pro Scout & Kulüp</h4>
              <p className="text-secondary small">Profesyonel kulüp yönetimleri, sportif direktörler ve scout ekipleri.</p>

              <div className="my-3 py-3 border-top border-bottom border-secondary bg-secondary bg-opacity-25 rounded px-3">
                <div className="d-flex align-items-baseline gap-1">
                  <span className="display-5 fw-black text-white">
                    {billingCycle === 'annual' ? '₺799' : '₺999'}
                  </span>
                  <span className="text-secondary small">/ ay</span>
                </div>
                <div className="small text-info fw-semibold mt-1">
                  {billingCycle === 'annual' ? 'Yıllık ₺9.588 kurumsal fatura' : 'Aylık kurumsal departman lisansı'}
                </div>
              </div>

              {/* Perks list */}
              <ul className="list-unstyled small text-light flex-grow-1 d-flex flex-column gap-2 mb-4">
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-patch-check-fill text-info fs-5 flex-shrink-0"></i>
                  <strong>Tüm Premium Scout Özellikleri Dahil</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-5 flex-shrink-0"></i>
                  <strong>Resmi Kulüp PDF Scout Raporu İndirme</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-shield-shaded text-info fs-5 flex-shrink-0"></i>
                  <strong>Kulüp İçi Çoklu Scout Departman Paylaşımı</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-stars text-warning fs-5 flex-shrink-0"></i>
                  <strong>Sınırsız Futbolcu Vitrini & Sponsorlu Sıralama</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-clock-history text-info fs-5 flex-shrink-0"></i>
                  <strong>Tüm Sistem Audit & Denetim Loglarına Erişim</strong>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-send-check text-info fs-5 flex-shrink-0"></i>
                  <strong>Resmi Deneme Antrenmanı & Transfer Daveti Gönderme</strong>
                </li>
              </ul>

              {currentTier !== 'pro_scout' ? (
                <button 
                  className="btn btn-info text-dark w-100 py-3 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  onClick={() => handleSelectTier('pro_scout')}
                >
                  <i className="bi bi-lightning-charge-fill"></i>
                  <span>Pro Kulüp Lisansına Geç</span>
                </button>
              ) : (
                <button className="btn btn-info text-dark w-100 py-2 rounded-3 fw-bold opacity-75" disabled>
                  <i className="bi bi-check-circle-fill me-1"></i> Aktif Planınız
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Feature Comparison Matrix */}
      <div className="card shadow-sm border-0 mb-5 bg-white overflow-hidden rounded-4">
        <div className="card-header bg-dark text-white py-3 px-4">
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-table text-primary"></i>
            <span>Detaylı Özellik Karşılaştırma Matrisi</span>
          </h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase">
              <tr>
                <th style={{ width: '40%' }}>Özellik / Yetenek</th>
                <th className="text-center" style={{ width: '20%' }}>Standart (Normal)</th>
                <th className="text-center bg-warning-subtle text-dark" style={{ width: '20%' }}>⭐ Premium Scout</th>
                <th className="text-center" style={{ width: '20%' }}>💎 Pro Kulüp</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-semibold">Futbolcu Listesi & Arama</td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i></td>
                <td className="text-center text-success bg-warning-subtle"><i className="bi bi-check-lg fs-5"></i></td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i></td>
              </tr>
              <tr>
                <td className="fw-semibold">Çoktan Seçmeli Mevkiler & Videolar</td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i></td>
                <td className="text-center text-success bg-warning-subtle"><i className="bi bi-check-lg fs-5"></i></td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i></td>
              </tr>
              <tr>
                <td className="fw-semibold">Özel Scout Mesajlaşması</td>
                <td className="text-center text-muted">2 Mesaj / Gün</td>
                <td className="text-center fw-bold text-success bg-warning-subtle">Sınırsız</td>
                <td className="text-center fw-bold text-info">Sınırsız + Öncelikli</td>
              </tr>
              <tr>
                <td className="fw-semibold">İzleme Listesi (Watchlist)</td>
                <td className="text-center text-muted">Maks. 2 Oyuncu</td>
                <td className="text-center fw-bold text-success bg-warning-subtle">Sınırsız</td>
                <td className="text-center fw-bold text-info">Sınırsız + Anlık Takip</td>
              </tr>
              <tr>
                <td className="fw-semibold">6 Boyutlu Radar & Performans Metrikleri</td>
                <td className="text-center text-danger"><i className="bi bi-x-lg fs-5"></i></td>
                <td className="text-center text-success bg-warning-subtle"><i className="bi bi-check-lg fs-5"></i></td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i></td>
              </tr>
              <tr>
                <td className="fw-semibold">Gizli Scout Not Defteri (Private Notes)</td>
                <td className="text-center text-danger"><i className="bi bi-x-lg fs-5"></i></td>
                <td className="text-center text-success bg-warning-subtle"><i className="bi bi-check-lg fs-5"></i> Açık</td>
                <td className="text-center text-success"><i className="bi bi-check-lg fs-5"></i> Sınırsız</td>
              </tr>
              <tr>
                <td className="fw-semibold">Menajer / Temsilci Doğrudan Telefonu</td>
                <td className="text-center text-muted">Gizli / Maskeli</td>
                <td className="text-center fw-bold text-success bg-warning-subtle">Tam Açık</td>
                <td className="text-center fw-bold text-info">Tam Açık + WhatsApp</td>
              </tr>
              <tr>
                <td className="fw-semibold">Resmi PDF Scout Dosyası Dışa Aktarma</td>
                <td className="text-center text-danger"><i className="bi bi-x-lg fs-5"></i></td>
                <td className="text-center text-muted bg-warning-subtle">Temel Özet</td>
                <td className="text-center text-success fw-bold"><i className="bi bi-check-lg fs-5"></i> Kulüp Formatında</td>
              </tr>
              <tr>
                <td className="fw-semibold">Vitrin / Öne Çıkarılan Futbolcu</td>
                <td className="text-center text-muted">Yok</td>
                <td className="text-center fw-bold text-warning bg-warning-subtle">2 Futbolcu</td>
                <td className="text-center fw-bold text-info">Sınırsız Vitrin</td>
              </tr>
              <tr>
                <td className="fw-semibold">Doğrulanmış Profil Rozeti</td>
                <td className="text-center text-muted">Standart</td>
                <td className="text-center bg-warning-subtle"><span className="badge bg-warning text-dark">Altın Taç ⭐</span></td>
                <td className="text-center"><span className="badge bg-info text-dark">Mavi Tik 💎</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card shadow-sm border-0 bg-white rounded-4 p-4 mb-4">
        <h5 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-question-circle text-primary"></i>
          <span>Sıkça Sorulan Sorular (Üyelik & Abonelik)</span>
        </h5>

        <div className="row g-4">
          <div className="col-md-6">
            <h6 className="fw-bold text-dark mb-1">Normal üyeler ne yapabilir?</h6>
            <p className="text-muted small">
              Normal (standart) üyeler platforma ücretsiz katılabilir, futbolcu listesini arayabilir, temel boy, kilo, mevki ve onaylı referans bilgilerini görebilir. Kendi profilini oluşturup 2 oyuncuyu takip edebilir.
            </p>
          </div>
          <div className="col-md-6">
            <h6 className="fw-bold text-dark mb-1">Premium üyeliğin farkı nedir?</h6>
            <p className="text-muted small">
              Premium üyeler futbolcuların menajer iletişim numaralarına doğrudan ulaşabilir, radar grafiklerini açabilir, sınırsız mesajlaşabilir ve her futbolcuya gizli scout notları ekleyebilir.
            </p>
          </div>
          <div className="col-md-6">
            <h6 className="fw-bold text-dark mb-1">Kulüp ve scout departmanları neden Pro lisans almalı?</h6>
            <p className="text-muted small">
              Pro lisans kulüplere tek tıkla resmi scout raporu indirme, departman içi oyuncu listesi paylaşımı ve oyuncuları pazar yerinde en üstte sponsorlu vitrine çıkarma hakkı tanır.
            </p>
          </div>
          <div className="col-md-6">
            <h6 className="fw-bold text-dark mb-1">Planlar arasında geçiş yapılabilir mi?</h6>
            <p className="text-muted small">
              Evet! Bu demo uygulamasında dilediğiniz zaman "Hemen Yükselt" veya "Plana Geç" butonlarıyla farklı üyelik seviyelerini anında test edebilir, veri tabanı ve denetim loglarını gözlemleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>

    </div>
  );

  if (isModal) {
    return (
      <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-2xl">
            <div className="modal-header bg-dark text-white border-0 py-3 px-4">
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-gem text-warning"></i>
                <span>Prospekt Üyelik & Abonelik Planları</span>
              </h5>
              {onClose && (
                <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
              )}
            </div>
            <div className="modal-body p-4 bg-light">
              {content}
            </div>
            {onClose && (
              <div className="modal-footer bg-white">
                <button type="button" className="btn btn-secondary px-4" onClick={onClose}>
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div className="container-fluid py-4">{content}</div>;
};
