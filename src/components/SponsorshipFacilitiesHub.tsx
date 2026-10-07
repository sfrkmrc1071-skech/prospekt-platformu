import React, { useState, useEffect, useMemo } from 'react';
import { User, SportsFacility, EquipmentSponsor, SponsorshipApplication, FacilityType, EquipmentCategory } from '../types';
import { db } from '../services/db';

interface SponsorshipFacilitiesHubProps {
  currentUser: User;
  onOpenPricingModal?: () => void;
}

// Preset popular locations for easy switching & fallback when browser GPS is blocked
const PRESET_LOCATIONS: { name: string; city: string; lat: number; lng: number; description: string }[] = [
  { name: 'İstanbul - Kadıköy', city: 'İstanbul', lat: 40.9850, lng: 29.0350, description: 'Kalamış, Moda & Anadolu Yakası' },
  { name: 'İstanbul - Beşiktaş', city: 'İstanbul', lat: 41.0450, lng: 29.0050, description: 'Fulya, Levent & Avrupa Yakası' },
  { name: 'İstanbul - Bakırköy', city: 'İstanbul', lat: 40.9780, lng: 28.8200, description: 'Florya & Sahil Bölgesi' },
  { name: 'İstanbul - Ataşehir', city: 'İstanbul', lat: 40.9856, lng: 29.1124, description: 'Doğu Ataşehir & Spor Vadisi' },
  { name: 'Ankara - Çankaya', city: 'Ankara', lat: 39.9208, lng: 32.8541, description: 'Anıttepe & Kızılay Çevresi' },
  { name: 'İzmir - Konak / Alsancak', city: 'İzmir', lat: 38.4357, lng: 27.1428, description: 'Alsancak & Kordon Bölgesi' },
];

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Haversine distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const SponsorshipFacilitiesHub: React.FC<SponsorshipFacilitiesHubProps> = ({
  currentUser,
  onOpenPricingModal,
}) => {
  // Tabs
  const [activeMainTab, setActiveMainTab] = useState<'facilities' | 'equipment' | 'applications'>('facilities');

  // Location state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 40.9850,
    lng: 29.0350, // Default to Kadıköy
  });
  const [locationName, setLocationName] = useState<string>('İstanbul - Kadıköy (Varsayılan)');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationAlert, setLocationAlert] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // Facilities filters
  const [facilitySearch, setFacilitySearch] = useState<string>('');
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(30); // in KM
  const [selectedFacilityForModal, setSelectedFacilityForModal] = useState<SportsFacility | null>(null);
  const [bookingModalFacility, setBookingModalFacility] = useState<SportsFacility | null>(null);

  // Equipment filters
  const [equipmentCategory, setEquipmentCategory] = useState<string>('all');
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Application form state
  const [applicantType, setApplicantType] = useState<'player' | 'team' | 'brand_partner'>('player');
  const [applicantName, setApplicantName] = useState<string>(currentUser.name || '');
  const [applicantEmail, setApplicantEmail] = useState<string>(currentUser.email || '');
  const [applicantPhone, setApplicantPhone] = useState<string>('+90 ');
  const [clubOrAgency, setClubOrAgency] = useState<string>('');
  const [requestedCategory, setRequestedCategory] = useState<string>('Krampon & Ekipman Sponsorluğu');
  const [applicationNotes, setApplicationNotes] = useState<string>('');
  const [formSubmittedSuccess, setFormSubmittedSuccess] = useState<boolean>(false);

  // Booking modal form state
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('20:00 - 21:00');
  const [bookingName, setBookingName] = useState<string>(currentUser.name);
  const [bookingPhone, setBookingPhone] = useState<string>('+90 ');
  const [bookingAppliedCoupon, setBookingAppliedCoupon] = useState<boolean>(true);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Data from DB
  const [facilities, setFacilities] = useState<SportsFacility[]>(db.getSportsFacilities());
  const [equipmentList, setEquipmentList] = useState<EquipmentSponsor[]>(db.getEquipmentSponsors());
  const [applications, setApplications] = useState<SponsorshipApplication[]>(db.getSponsorshipApplications());

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setFacilities(db.getSportsFacilities());
      setEquipmentList(db.getEquipmentSponsors());
      setApplications(db.getSponsorshipApplications());
    });
    return unsub;
  }, []);

  // Request actual browser geolocation
  const handleRequestLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationAlert({
        type: 'warning',
        message: 'Tarayıcınız konum servisini desteklemiyor. Lütfen aşağıdaki hazır şehir listesinden seçim yapınız.',
      });
      return;
    }

    setIsLocating(true);
    setLocationAlert(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocationName(`Canlı GPS Konumunuz (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`);
        setLocationAlert({
          type: 'success',
          message: `Konumunuz başarıyla alındı! Tesisler mesafenize göre otomatik olarak en yakından en uzağa sıralandı.`,
        });
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Konum izni alınamadı. Hazır şehir seçeneklerinden birini seçerek yakındaki tesisleri keşfedebilirsiniz.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Konum izni verilmedi. Aşağıdaki hazır il/ilçe butonlarını kullanarak anında arama yapabilirsiniz.';
        }
        setLocationAlert({
          type: 'warning',
          message: msg,
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPresetLocation = (loc: typeof PRESET_LOCATIONS[0]) => {
    setUserCoords({ lat: loc.lat, lng: loc.lng });
    setLocationName(`${loc.name} (${loc.description})`);
    setLocationAlert({
      type: 'info',
      message: `Konum olarak "${loc.name}" seçildi.`,
    });
  };

  // Copy coupon with visual toast
  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => {
      setCopiedCoupon(null);
    }, 2500);
  };

  // Filter and sort facilities with distances
  const facilitiesWithDistance = useMemo(() => {
    return facilities.map((f) => {
      const distance = userCoords
        ? calculateDistance(userCoords.lat, userCoords.lng, f.lat, f.lng)
        : null;
      return {
        ...f,
        distanceKm: distance,
      };
    });
  }, [facilities, userCoords]);

  const filteredFacilities = useMemo(() => {
    return facilitiesWithDistance
      .filter((f) => {
        // Search term
        if (facilitySearch.trim()) {
          const q = facilitySearch.toLowerCase();
          const match =
            f.name.toLowerCase().includes(q) ||
            f.district.toLowerCase().includes(q) ||
            f.city.toLowerCase().includes(q) ||
            f.surface_type.toLowerCase().includes(q) ||
            f.features.some((feat) => feat.toLowerCase().includes(q)) ||
            (f.sponsorship_deal && f.sponsorship_deal.title.toLowerCase().includes(q));
          if (!match) return false;
        }

        // City
        if (selectedCity !== 'all' && f.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }

        // Type
        if (selectedFacilityType !== 'all' && f.type !== selectedFacilityType) {
          return false;
        }

        // Distance threshold
        if (f.distanceKm !== null && maxDistanceKm < 100) {
          if (f.distanceKm > maxDistanceKm) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return b.rating - a.rating;
      });
  }, [facilitiesWithDistance, facilitySearch, selectedCity, selectedFacilityType, maxDistanceKm]);

  // Equipment deals filter
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      if (equipmentCategory !== 'all' && eq.category !== equipmentCategory) {
        return false;
      }
      if (equipmentSearch.trim()) {
        const q = equipmentSearch.toLowerCase();
        const match =
          eq.brand_name.toLowerCase().includes(q) ||
          eq.title.toLowerCase().includes(q) ||
          eq.description.toLowerCase().includes(q) ||
          eq.featured_product.name.toLowerCase().includes(q) ||
          eq.coupon_code.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [equipmentList, equipmentCategory, equipmentSearch]);

  // Handle application submission
  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail) return;

    db.addSponsorshipApplication({
      applicant_type: applicantType,
      applicant_name: applicantName,
      contact_email: applicantEmail,
      contact_phone: applicantPhone,
      club_or_agency: clubOrAgency,
      requested_category: requestedCategory,
      notes: applicationNotes,
    });

    setFormSubmittedSuccess(true);
    setApplicationNotes('');
    setTimeout(() => {
      setFormSubmittedSuccess(false);
    }, 4000);
  };

  // Handle booking submission
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalFacility) return;

    const discountText = bookingAppliedCoupon && bookingModalFacility.sponsorship_deal
      ? `%${bookingModalFacility.sponsorship_deal.discount_percent} Prospekt İndirimi (${bookingModalFacility.sponsorship_deal.coupon_code}) uygulandı!`
      : '';

    setBookingSuccessMsg(
      `Rezervasyon & İndirim Talebiniz Alındı! ${bookingDate} günü ${bookingTime} için tesis yetkilisine SMS ve bildirim iletildi. ${discountText}`
    );

    setTimeout(() => {
      setBookingSuccessMsg(null);
      setBookingModalFacility(null);
    }, 3500);
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      {/* Top Banner & Header */}
      <div 
        className="rounded-4 p-4 p-lg-5 mb-4 text-white shadow position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 75%, #0d9488 100%)',
        }}
      >
        <div className="row align-items-center position-relative" style={{ zIndex: 2 }}>
          <div className="col-lg-8">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className="badge bg-warning text-dark px-3 py-1 fw-bold rounded-pill text-uppercase tracking-wider">
                <i className="bi bi-geo-alt-fill me-1"></i> Konum Tabanlı Tesis & Sponsorluk Ağı
              </span>
              <span className="badge bg-white bg-opacity-20 text-white px-3 py-1 rounded-pill">
                <i className="bi bi-shield-check me-1"></i> Doğrulanmış Spor Tesisleri & Partnerler
              </span>
            </div>
            <h1 className="display-6 fw-bold mb-2">
              Sponsorluklar & Yakındaki Spor Kompleksleri
            </h1>
            <p className="lead fs-6 text-emerald-100 mb-4 opacity-90" style={{ maxWidth: '780px' }}>
              Konumunuzu paylaşarak çevrenizdeki FIFA onaylı halı saha, stadyum ve atletik gelişim merkezlerine ulaşın; 
              Prospekt üyelerine özel %20 - %40 tesis ve krampon/GPS spor ekipmanı sponsorluk indirimlerini hemen kullanın.
            </p>

            {/* Quick Action Badges */}
            <div className="d-flex flex-wrap gap-3">
              <button 
                className={`btn btn-lg fw-bold rounded-pill shadow-sm px-4 ${
                  activeMainTab === 'facilities' ? 'btn-light text-success' : 'btn-outline-light'
                }`}
                onClick={() => setActiveMainTab('facilities')}
              >
                <i className="bi bi-compass me-2"></i> Yakındaki Spor Tesisleri ({facilities.length})
              </button>
              <button 
                className={`btn btn-lg fw-bold rounded-pill shadow-sm px-4 ${
                  activeMainTab === 'equipment' ? 'btn-warning text-dark' : 'btn-outline-light'
                }`}
                onClick={() => setActiveMainTab('equipment')}
              >
                <i className="bi bi-lightning-charge-fill me-2 text-danger"></i> Spor Ekipmanları Sponsorlukları ({equipmentList.length})
              </button>
              <button 
                className={`btn btn-lg fw-bold rounded-pill shadow-sm px-4 ${
                  activeMainTab === 'applications' ? 'btn-info text-dark' : 'btn-outline-light'
                }`}
                onClick={() => setActiveMainTab('applications')}
              >
                <i className="bi bi-envelope-paper-heart-fill me-2"></i> Sponsorluk Başvurusu
              </button>
            </div>
          </div>

          <div className="col-lg-4 text-center mt-4 mt-lg-0">
            <div className="bg-white bg-opacity-10 backdrop-blur border border-white border-opacity-25 rounded-4 p-3 text-start shadow-sm">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-white-50 text-uppercase fw-semibold">
                  <i className="bi bi-broadcast me-1 text-warning"></i> Aktif Konum Algılama
                </span>
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  GPS Hazır
                </span>
              </div>
              <div className="fw-bold fs-6 text-white mb-2 text-truncate" title={locationName}>
                📍 {locationName}
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-warning btn-sm fw-bold flex-grow-1"
                  onClick={handleRequestLiveLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Konum Alınıyor...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-crosshair me-1"></i> Konumumu Güncelle
                    </>
                  )}
                </button>
              </div>

              {/* City quick buttons */}
              <div className="mt-3 pt-2 border-top border-white border-opacity-15">
                <div className="small text-white-50 mb-1">Popüler Şehirler:</div>
                <div className="d-flex flex-wrap gap-1">
                  {PRESET_LOCATIONS.slice(0, 4).map((p) => (
                    <button
                      key={p.name}
                      className="btn btn-sm btn-outline-light py-0 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleSelectPresetLocation(p)}
                    >
                      {p.city} ({p.name.split('-')[1]?.trim()})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location notification alert */}
      {locationAlert && (
        <div className={`alert alert-${locationAlert.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
          <div className="d-flex align-items-center gap-2">
            <i className={`bi ${locationAlert.type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} fs-5`}></i>
            <div>{locationAlert.message}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setLocationAlert(null)}></button>
        </div>
      )}

      {/* Copy toast feedback */}
      {copiedCoupon && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
          <div className="toast show align-items-center text-bg-dark border-0 shadow-lg">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i className="bi bi-clipboard-check-fill text-success fs-5"></i>
                <div>
                  Kupon Kodu Kopyalandı: <strong>{copiedCoupon}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 1: NEARBY SPORTS FACILITIES & TURF COMPLEXES */}
      {/* =============================================================== */}
      {activeMainTab === 'facilities' && (
        <div>
          {/* Filter Bar */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-lg-4">
              <div className="row g-3 align-items-center">
                {/* Search */}
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-bold text-muted mb-1">
                    <i className="bi bi-search me-1"></i> Tesis / İlçe / Olanak Ara
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0"
                      placeholder="Örn: Veo kamera, Kadıköy, suni çim..."
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                    />
                    {facilitySearch && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setFacilitySearch('')}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* City Filter */}
                <div className="col-6 col-md-2">
                  <label className="form-label small fw-bold text-muted mb-1">
                    <i className="bi bi-building me-1"></i> Şehir
                  </label>
                  <select
                    className="form-select bg-light"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <option value="all">Tüm Şehirler</option>
                    <option value="İstanbul">İstanbul</option>
                    <option value="Ankara">Ankara</option>
                    <option value="İzmir">İzmir</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="col-6 col-md-3">
                  <label className="form-label small fw-bold text-muted mb-1">
                    <i className="bi bi-tag me-1"></i> Tesis Tipi
                  </label>
                  <select
                    className="form-select bg-light"
                    value={selectedFacilityType}
                    onChange={(e) => setSelectedFacilityType(e.target.value)}
                  >
                    <option value="all">Tüm Tesisler (Halı Saha & Stadyum)</option>
                    <option value="hali_saha">⚽ Halı Sahalar</option>
                    <option value="stadyum">🏟️ Stadyumlar & Şehir Kompleksleri</option>
                    <option value="akademi">⚡ Futbol Akademisi & Atletik Merkez</option>
                  </select>
                </div>

                {/* Distance Filter */}
                <div className="col-12 col-md-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-bold text-muted mb-0">
                      <i className="bi bi-speedometer2 me-1"></i> Maksimum Mesafe
                    </label>
                    <span className="badge bg-primary-subtle text-primary fw-bold">
                      {maxDistanceKm >= 50 ? 'Sınırsız (Tümü)' : `${maxDistanceKm} km`}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min="2"
                    max="50"
                    step="2"
                    value={maxDistanceKm}
                    onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-muted small" style={{ fontSize: '0.7rem' }}>
                    <span>2 km</span>
                    <span>15 km</span>
                    <span>30 km</span>
                    <span>Tümü</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Radar & Results Summary */}
          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-pin-map-fill text-danger me-2"></i>
                  Yakınınızdaki Spor Kompleksleri ({filteredFacilities.length} Bulundu)
                </h5>
                <span className="small text-muted">
                  En yakın tesisler ilk sırada listelenir
                </span>
              </div>

              {filteredFacilities.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                  <div className="display-4 text-muted mb-3">🏟️</div>
                  <h5 className="fw-bold">Belirtilen kriterlere uygun tesis bulunamadı</h5>
                  <p className="text-muted small">
                    Mesafe çubuğunu artırabilir veya şehir filtresini &quot;Tüm Şehirler&quot; olarak değiştirebilirsiniz.
                  </p>
                  <div className="mt-2">
                    <button
                      className="btn btn-outline-primary btn-sm rounded-pill"
                      onClick={() => {
                        setFacilitySearch('');
                        setSelectedCity('all');
                        setSelectedFacilityType('all');
                        setMaxDistanceKm(50);
                      }}
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  {filteredFacilities.map((facility) => {
                    const isVeryClose = facility.distanceKm !== null && facility.distanceKm <= 5;
                    return (
                      <div key={facility.id} className="col-12">
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden hover-shadow transition-all">
                          <div className="row g-0">
                            {/* Photo & Distance Badge */}
                            <div className="col-md-4 position-relative" style={{ minHeight: '220px' }}>
                              <img
                                src={facility.image_url}
                                alt={facility.name}
                                className="w-100 h-100 object-fit-cover"
                                style={{ minHeight: '220px' }}
                              />
                              <div className="position-absolute top-0 start-0 m-2 d-flex flex-column gap-1">
                                {facility.distanceKm !== null && (
                                  <span className={`badge px-2 py-1 shadow-sm fw-bold ${
                                    isVeryClose ? 'bg-success text-white' : 'bg-dark bg-opacity-80 text-white'
                                  }`}>
                                    <i className="bi bi-geo-alt-fill me-1 text-warning"></i>
                                    {facility.distanceKm.toFixed(1)} km mesafede
                                  </span>
                                )}
                                <span className="badge bg-primary text-white shadow-sm">
                                  {facility.type_label}
                                </span>
                              </div>

                              {facility.is_verified_partner && (
                                <div className="position-absolute bottom-0 start-0 m-2">
                                  <span className="badge bg-warning text-dark fw-bold shadow-sm">
                                    <i className="bi bi-patch-check-fill me-1"></i> Resmi Partner Tesis
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Info Body */}
                            <div className="col-md-8 d-flex flex-column p-3 p-lg-4">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div>
                                  <h5 className="fw-bold mb-1 text-dark">
                                    {facility.name}
                                  </h5>
                                  <div className="small text-muted mb-2">
                                    <i className="bi bi-geo-alt me-1 text-danger"></i>
                                    {facility.district}, {facility.city} &bull; <span className="text-dark">{facility.surface_type}</span>
                                  </div>
                                </div>

                                <div className="text-end">
                                  <div className="d-flex align-items-center gap-1 justify-content-end text-warning fw-bold">
                                    <i className="bi bi-star-fill"></i>
                                    <span>{facility.rating}</span>
                                    <span className="text-muted small fw-normal">({facility.reviews_count})</span>
                                  </div>
                                  <div className="small text-muted mt-1">
                                    Saatlik: <strong className="text-success fs-6">{facility.price_hourly} ₺</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Features Pills */}
                              <div className="d-flex flex-wrap gap-1 mb-3">
                                {facility.features.slice(0, 4).map((feat, idx) => (
                                  <span key={idx} className="badge bg-light text-secondary border small">
                                    <i className="bi bi-check-lg text-success me-1"></i>
                                    {feat}
                                  </span>
                                ))}
                                {facility.features.length > 4 && (
                                  <span className="badge bg-light text-muted small">
                                    +{facility.features.length - 4} diğer olanak
                                  </span>
                                )}
                              </div>

                              {/* Sponsorship Perk Banner */}
                              {facility.sponsorship_deal && (
                                <div className="bg-success-subtle border border-success-subtle rounded-3 p-2 px-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                  <div>
                                    <div className="fw-bold text-success-emphasis small">
                                      <i className="bi bi-ticket-perforated-fill me-1"></i>
                                      {facility.sponsorship_deal.title}
                                    </div>
                                    <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                                      {facility.sponsorship_deal.description}
                                    </div>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-warning text-dark fw-bold">
                                      {facility.sponsorship_deal.badge}
                                    </span>
                                    <button
                                      className="btn btn-outline-success btn-sm fw-bold py-1 px-2"
                                      title="Kuponu Kopyala"
                                      onClick={() => handleCopyCoupon(facility.sponsorship_deal!.coupon_code)}
                                    >
                                      <i className="bi bi-copy me-1"></i>
                                      {facility.sponsorship_deal.coupon_code}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="mt-auto d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                                <div className="small text-muted">
                                  <i className="bi bi-clock me-1"></i> {facility.opening_hours}
                                </div>
                                <div className="d-flex gap-2">
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline-secondary btn-sm"
                                  >
                                    <i className="bi bi-cursor-fill me-1 text-primary"></i> Yol Tarifi
                                  </a>
                                  <button
                                    className="btn btn-outline-dark btn-sm"
                                    onClick={() => setSelectedFacilityForModal(facility)}
                                  >
                                    <i className="bi bi-info-circle me-1"></i> Detaylar
                                  </button>
                                  <button
                                    className="btn btn-success btn-sm fw-bold"
                                    onClick={() => setBookingModalFacility(facility)}
                                  >
                                    <i className="bi bi-calendar2-check-fill me-1"></i> İndirimli Rezervasyon
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Visual Interactive Map & Quick Locator */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 mb-4 sticky-top" style={{ top: '80px' }}>
                <div className="card-header bg-dark text-white p-3 rounded-top-4 d-flex justify-content-between align-items-center">
                  <div className="fw-bold small text-uppercase">
                    <i className="bi bi-map-fill text-warning me-2"></i>
                    Görsel Konum & Radar Haritası
                  </div>
                  <span className="badge bg-warning text-dark small">
                    Canlı Görünüm
                  </span>
                </div>
                <div className="card-body p-3">
                  {/* SVG / Canvas styled radar map container */}
                  <div 
                    className="rounded-3 position-relative overflow-hidden mb-3 border"
                    style={{
                      height: '280px',
                      background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)',
                    }}
                  >
                    {/* Concentric radar circles */}
                    <div 
                      className="position-absolute top-50 start-50 translate-middle rounded-circle border border-primary border-opacity-25"
                      style={{ width: '90px', height: '90px' }}
                    ></div>
                    <div 
                      className="position-absolute top-50 start-50 translate-middle rounded-circle border border-primary border-opacity-20"
                      style={{ width: '180px', height: '180px' }}
                    ></div>
                    <div 
                      className="position-absolute top-50 start-50 translate-middle rounded-circle border border-primary border-opacity-15"
                      style={{ width: '260px', height: '260px' }}
                    ></div>

                    {/* Radar Crosshairs */}
                    <div className="position-absolute top-50 start-0 w-100 border-top border-primary border-opacity-15"></div>
                    <div className="position-absolute top-0 start-50 h-100 border-start border-primary border-opacity-15"></div>

                    {/* Center: User position */}
                    <div 
                      className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center"
                      style={{ zIndex: 10 }}
                    >
                      <div className="spinner-grow text-primary position-absolute" style={{ width: '28px', height: '28px', opacity: 0.6 }} role="status"></div>
                      <div className="bg-primary text-white rounded-circle p-1 shadow border border-white" style={{ width: '16px', height: '16px' }}></div>
                      <span className="badge bg-primary text-white mt-1 shadow-sm" style={{ fontSize: '0.65rem' }}>
                        Siz Buradasınız
                      </span>
                    </div>

                    {/* Facility Pins positioned relative to user coords */}
                    {filteredFacilities.slice(0, 6).map((f, idx) => {
                      // Simulated coordinate projection on radar
                      const dLat = (f.lat - (userCoords?.lat || 40.98)) * 1200;
                      const dLng = (f.lng - (userCoords?.lng || 29.03)) * 1200;
                      const topPercent = Math.max(15, Math.min(85, 50 - dLat));
                      const leftPercent = Math.max(15, Math.min(85, 50 + dLng));

                      return (
                        <div
                          key={f.id}
                          className="position-absolute cursor-pointer transition-all hover-scale"
                          style={{
                            top: `${topPercent}%`,
                            left: `${leftPercent}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 5,
                          }}
                          onClick={() => setSelectedFacilityForModal(f)}
                          title={`${f.name} - ${f.distanceKm ? `${f.distanceKm.toFixed(1)} km` : ''}`}
                        >
                          <div className="d-flex flex-column align-items-center">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm border border-white"
                              style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: idx === 0 ? '#10b981' : '#f59e0b',
                                fontSize: '11px',
                              }}
                            >
                              ⚽
                            </div>
                            <span 
                              className="badge bg-dark bg-opacity-80 text-white border border-secondary shadow-sm text-truncate"
                              style={{ fontSize: '0.6rem', maxWidth: '80px' }}
                            >
                              {f.district}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="position-absolute bottom-0 start-0 m-2 text-white-50" style={{ fontSize: '0.65rem' }}>
                      <i className="bi bi-broadcast me-1 text-success"></i> 5km / 15km / 30km menzil
                    </div>
                  </div>

                  {/* Preset Locations Box */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted mb-2">
                      <i className="bi bi-geo me-1"></i> Hızlı Şehir / Bölge Seçimi:
                    </label>
                    <div className="list-group list-group-flush border rounded-3 overflow-hidden">
                      {PRESET_LOCATIONS.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2"
                          onClick={() => handleSelectPresetLocation(loc)}
                        >
                          <div>
                            <div className="fw-semibold small">{loc.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{loc.description}</div>
                          </div>
                          <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pitch owner call-to-action */}
                  <div className="bg-light border rounded-3 p-3 text-center">
                    <i className="bi bi-building-add text-success fs-4 mb-2 d-block"></i>
                    <div className="fw-bold small mb-1">Spor Kompleksiniz mi Var?</div>
                    <p className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
                      Tesisinizi binlerce futbolcu ve scout ile buluşturun, Prospekt onaylı tesis ağına ücretsiz katılın.
                    </p>
                    <button
                      className="btn btn-outline-success btn-sm w-100 fw-bold"
                      onClick={() => {
                        setApplicantType('brand_partner');
                        setRequestedCategory('Yeni Spor Kompleksi Tesis Sponsorluğu');
                        setActiveMainTab('applications');
                      }}
                    >
                      <i className="bi bi-plus-circle me-1"></i> Tesis Kaydı Başvurusu Yap
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 2: SPORTS EQUIPMENT DEALS & BRAND SPONSORSHIPS */}
      {/* =============================================================== */}
      {activeMainTab === 'equipment' && (
        <div>
          {/* Categories Pill Bar */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-lg-4">
              <div className="row g-3 align-items-center justify-content-between">
                <div className="col-12 col-lg-8">
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'all' ? 'btn-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('all')}
                    >
                      Tüm Ekipmanlar ({equipmentList.length})
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'krampon' ? 'btn-success text-white' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('krampon')}
                    >
                      👟 Krampon & Ayakkabı
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'forma_top' ? 'btn-primary text-white' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('forma_top')}
                    >
                      ⚽ Forma, Top & Eldiven
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'gps_teknoloji' ? 'btn-info text-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('gps_teknoloji')}
                    >
                      📡 GPS & Performans Takip
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'beslenme_hidrasyon' ? 'btn-warning text-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('beslenme_hidrasyon')}
                    >
                      💧 Beslenme & Hidrasyon
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        equipmentCategory === 'saglik_fizyoterapi' ? 'btn-danger text-white' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setEquipmentCategory('saglik_fizyoterapi')}
                    >
                      🩺 Fizyoterapi & İyileşme
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="col-12 col-lg-4">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0"
                      placeholder="Marka, krampon modeli, kupon ara..."
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                    />
                    {equipmentSearch && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setEquipmentSearch('')}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deals Grid */}
          <div className="row g-4">
            {filteredEquipment.map((eq) => (
              <div key={eq.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column hover-shadow transition-all">
                  {/* Card Header & Product Image */}
                  <div className="position-relative overflow-hidden" style={{ height: '210px', backgroundColor: '#111827' }}>
                    <img
                      src={eq.featured_product.image}
                      alt={eq.featured_product.name}
                      className="w-100 h-100 object-fit-cover opacity-90 transition-all"
                    />
                    <div className="position-absolute top-0 start-0 m-3">
                      <span className="badge bg-warning text-dark fw-bold px-2 py-1 shadow-sm">
                        <i className="bi bi-lightning-charge-fill me-1 text-danger"></i>
                        {eq.discount_rate}
                      </span>
                    </div>

                    <div className="position-absolute top-0 end-0 m-3">
                      <span className="badge bg-dark bg-opacity-75 text-white border border-secondary shadow-sm">
                        {eq.category_label}
                      </span>
                    </div>

                    {/* Brand Banner Overlay */}
                    <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black via-black/70 to-transparent text-white d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={eq.brand_logo}
                          alt={eq.brand_name}
                          className="rounded-circle border border-white"
                          style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                        />
                        <span className="fw-bold fs-6">{eq.brand_name}</span>
                        {eq.is_verified && (
                          <i className="bi bi-patch-check-fill text-info" title="Doğrulanmış Resmi Sponsor"></i>
                        )}
                      </div>
                      <span className="badge bg-secondary-subtle text-light small" style={{ fontSize: '0.7rem' }}>
                        {eq.target_audience}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="card-body p-4 d-flex flex-column flex-grow-1">
                    <h5 className="fw-bold mb-2 text-dark">
                      {eq.title}
                    </h5>
                    <p className="text-muted small mb-3 flex-grow-1" style={{ fontSize: '0.86rem' }}>
                      {eq.description}
                    </p>

                    {/* Featured Product Box */}
                    <div className="bg-light rounded-3 p-3 mb-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-dark text-truncate" style={{ maxWidth: '200px' }}>
                          {eq.featured_product.name}
                        </span>
                        {eq.featured_product.discounted_price ? (
                          <div className="text-end">
                            <span className="text-decoration-line-through text-muted small me-2">
                              {eq.featured_product.original_price} ₺
                            </span>
                            <strong className="text-success fs-6">
                              {eq.featured_product.discounted_price} ₺
                            </strong>
                          </div>
                        ) : null}
                      </div>

                      {eq.featured_product.specs && (
                        <ul className="list-unstyled mb-0 small text-muted">
                          {eq.featured_product.specs.slice(0, 2).map((sp, sIdx) => (
                            <li key={sIdx} className="d-flex align-items-center gap-1 mb-1">
                              <i className="bi bi-check2 text-success"></i>
                              <span>{sp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Coupon Code Strip */}
                    <div className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 bg-warning-subtle border border-warning-subtle mb-3">
                      <div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>SPONSORLUK KODU:</div>
                        <strong className="text-dark tracking-wider">{eq.coupon_code}</strong>
                      </div>
                      <button
                        className="btn btn-warning btn-sm fw-bold px-3 shadow-sm"
                        onClick={() => handleCopyCoupon(eq.coupon_code)}
                      >
                        <i className="bi bi-copy me-1"></i>
                        Kodu Al
                      </button>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-muted">
                      <span>
                        <i className="bi bi-calendar-event me-1"></i> Son Gün: {eq.valid_until}
                      </span>
                      {eq.external_url && (
                        <a
                          href={eq.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold text-primary"
                        >
                          Markaya Git <i className="bi bi-arrow-up-right"></i>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Player Personal Sponsorship Callout Banner */}
          <div className="card border-0 rounded-4 shadow-sm mt-5 bg-gradient text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
            <div className="card-body p-4 p-lg-5">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold text-uppercase mb-2">
                    🌟 Futbolcu Bireysel Sponsorluğu
                  </span>
                  <h3 className="fw-bold mb-2">
                    Kişisel Krampon veya Performans Sponsorluğu mu Arıyorsunuz?
                  </h3>
                  <p className="text-blue-100 mb-0 opacity-90">
                    Prospekt scout platformundaki performans istatistikleriniz (gol, asist, scout maç notları ve videolarınız) 
                    anlaşmalı spor giyim ve donanım markalarına sunulur. Profilinizi bağlayarak bireysel sponsorluk başvurusu yapın.
                  </p>
                </div>
                <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
                  <button
                    className="btn btn-light btn-lg text-primary fw-bold rounded-pill shadow px-4"
                    onClick={() => {
                      setApplicantType('player');
                      setRequestedCategory('Kişisel Krampon & Ekipman Sponsorluğu');
                      setActiveMainTab('applications');
                    }}
                  >
                    <i className="bi bi-send-fill me-2"></i> Bireysel Başvuru Yap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 3: SPONSORSHIP APPLICATIONS & PARTNERSHIP FORM */}
      {/* =============================================================== */}
      {activeMainTab === 'applications' && (
        <div className="row g-4">
          {/* Application Form */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white border-bottom p-4">
                <h5 className="fw-bold mb-1 text-dark">
                  <i className="bi bi-file-earmark-text-fill text-success me-2"></i>
                  Sponsorluk Başvuru & İletişim Formu
                </h5>
                <p className="text-muted small mb-0">
                  Futbolcular bireysel sponsorluk, kulüpler forma/göğüs ve saha içi sponsorluk, tesisler ise Prospekt partnerliği için başvurabilir.
                </p>
              </div>

              <div className="card-body p-4">
                {formSubmittedSuccess && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="alert">
                    <i className="bi bi-check-circle-fill fs-5"></i>
                    <div>
                      <strong>Başvurunuz Başarıyla Alındı!</strong> Sponsorluk koordinasyon ekibimiz en geç 48 saat içinde belirttiğiniz iletişim adresinden sizinle temasa geçecektir.
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitApplication}>
                  {/* Applicant Type Selection */}
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted mb-2">
                      Başvuru Türünü Seçiniz:
                    </label>
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={`btn py-2 fw-semibold ${
                          applicantType === 'player' ? 'btn-primary' : 'btn-outline-primary'
                        }`}
                        onClick={() => {
                          setApplicantType('player');
                          setRequestedCategory('Kişisel Krampon & GPS Takip Sponsorluğu');
                        }}
                      >
                        <i className="bi bi-person-fill me-1"></i> Futbolcu (Bireysel)
                      </button>
                      <button
                        type="button"
                        className={`btn py-2 fw-semibold ${
                          applicantType === 'team' ? 'btn-success' : 'btn-outline-success'
                        }`}
                        onClick={() => {
                          setApplicantType('team');
                          setRequestedCategory('Kulüp Forma / Saha Kenarı Sponsorluğu');
                        }}
                      >
                        <i className="bi bi-shield-fill me-1"></i> Kulüp / Takım
                      </button>
                      <button
                        type="button"
                        className={`btn py-2 fw-semibold ${
                          applicantType === 'brand_partner' ? 'btn-dark' : 'btn-outline-dark'
                        }`}
                        onClick={() => {
                          setApplicantType('brand_partner');
                          setRequestedCategory('Spor Kompleksi & Saha Tesis Ortaklığı');
                        }}
                      >
                        <i className="bi bi-building me-1"></i> Tesis / Marka Partneri
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark">
                        Ad Soyad / Yetkili Kişi <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="Örn: Kerem Aktürkoğlu veya Kulüp Müdürü"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark">
                        E-posta Adresi <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="ornek@kulup.com"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark">
                        Telefon Numarası
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        placeholder="+90 5XX XXX XX XX"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark">
                        Kulüp, Akademi veya Tesis Adı
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={clubOrAgency}
                        onChange={(e) => setClubOrAgency(e.target.value)}
                        placeholder="Örn: Beşiktaş JK U19, Kadıköy Halı Saha Tesisleri"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold text-dark">
                        Talep Edilen Sponsorluk Kategorisi
                      </label>
                      <select
                        className="form-select"
                        value={requestedCategory}
                        onChange={(e) => setRequestedCategory(e.target.value)}
                      >
                        <option value="Kişisel Krampon & GPS Takip Sponsorluğu">👟 Kişisel Krampon & GPS Takip Sponsorluğu</option>
                        <option value="Kulüp Forma / Saha Kenarı Sponsorluğu">👕 Kulüp Forma Göğüs / Sırt / Şort Sponsorluğu</option>
                        <option value="Resmi Maç Topu & Malzeme Desteği">⚽ 30 Adet Resmi FIFA Maç Topu & Antrenman Yeleği Desteği</option>
                        <option value="Spor Kompleksi & Saha Tesis Ortaklığı">🏟️ Tesis / Halı Saha Prospekt İndirim Ağına Katılma</option>
                        <option value="Beslenme & Hidrasyon Sponsorluğu">💧 Saka Su & Elektrolit İçecek Sponsorluğu</option>
                        <option value="Fizyoterapi & Sağlık Desteği">🩺 Fizyoterapi & Maç Sonrası Toparlanma Desteği</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold text-dark">
                        Başvuru Notu & İhtiyaç Detayları
                      </label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Takımınızın lig durumu, oyuncunun sezonluk maç/gol istatistikleri veya tesisinizin olanakları hakkında kısa bilgi verin..."
                        value={applicationNotes}
                        onChange={(e) => setApplicationNotes(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="col-12 mt-3">
                      <button type="submit" className="btn btn-success btn-lg w-100 fw-bold shadow-sm">
                        <i className="bi bi-send-check me-2"></i> Sponsorluk Başvurusunu Gönder
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Live List of Recent Applications */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-list-check text-primary me-2"></i>
                  Son Başvurular ({applications.length})
                </h6>
                <span className="badge bg-light text-secondary border small">
                  Canlı Durum Takibi
                </span>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {applications.map((app) => (
                    <div key={app.id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div>
                          <strong className="text-dark small d-block">
                            {app.applicant_name}
                          </strong>
                          <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                            {app.club_or_agency || 'Bireysel Oyuncu'}
                          </span>
                        </div>
                        <span className={`badge ${
                          app.status === 'onaylandi' ? 'bg-success text-white' :
                          app.status === 'inceleniyor' ? 'bg-warning text-dark' : 'bg-secondary text-white'
                        } small`}>
                          {app.status === 'onaylandi' ? '✓ Onaylandı' :
                           app.status === 'inceleniyor' ? '⏳ İnceleniyor' : 'Beklemede'}
                        </span>
                      </div>

                      <div className="bg-light p-2 rounded-2 small text-dark my-2" style={{ fontSize: '0.8rem' }}>
                        <i className="bi bi-tag-fill text-muted me-1"></i> {app.requested_category}
                      </div>

                      {app.notes && (
                        <p className="text-muted small mb-1 fst-italic" style={{ fontSize: '0.78rem' }}>
                          &quot;{app.notes}&quot;
                        </p>
                      )}

                      <div className="d-flex justify-content-between align-items-center mt-2 pt-1 border-top" style={{ fontSize: '0.72rem' }}>
                        <span className="text-muted">
                          {new Date(app.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="text-primary">
                          <i className="bi bi-envelope me-1"></i> {app.contact_email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium Scout Perk Callout */}
            <div className="card border-0 rounded-4 shadow-sm bg-dark text-white p-4">
              <div className="d-flex align-items-center gap-2 mb-2 text-warning">
                <i className="bi bi-gem-fill fs-5"></i>
                <span className="fw-bold small text-uppercase">Pro Scout Özel Avantajı</span>
              </div>
              <h6 className="fw-bold mb-2">
                Sponsorlu Tesislerde Scout İzleme Odaları Ücretsiz!
              </h6>
              <p className="text-light text-opacity-75 small mb-3">
                Pro Scout üyelerimiz, anlaşmalı sahalarda düzenlenen maçlarda Veo kamera canlı akışına ve VIP scout kabinine sınırsız ücretsiz erişim sağlar.
              </p>
              {currentUser.membership_tier !== 'pro_scout' && onOpenPricingModal && (
                <button
                  className="btn btn-warning btn-sm fw-bold w-100"
                  onClick={onOpenPricingModal}
                >
                  <i className="bi bi-arrow-up-circle-fill me-1"></i> Pro Scout Planına Yükselt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 1: FACILITY DETAILS MODAL */}
      {/* =============================================================== */}
      {selectedFacilityForModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="position-relative" style={{ height: '240px', backgroundColor: '#0f172a' }}>
                <img
                  src={selectedFacilityForModal.image_url}
                  alt={selectedFacilityForModal.name}
                  className="w-100 h-100 object-fit-cover"
                />
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3 shadow"
                  onClick={() => setSelectedFacilityForModal(null)}
                ></button>
                <div className="position-absolute bottom-0 start-0 p-3 w-100 bg-gradient-to-t from-black via-black/70 to-transparent text-white">
                  <span className="badge bg-primary mb-1">{selectedFacilityForModal.type_label}</span>
                  <h4 className="fw-bold mb-0 text-white">{selectedFacilityForModal.name}</h4>
                  <div className="small text-white-50">
                    <i className="bi bi-geo-alt-fill text-danger me-1"></i> {selectedFacilityForModal.address}
                  </div>
                </div>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-sm-6">
                    <div className="bg-light p-3 rounded-3">
                      <div className="small text-muted mb-1">Zemin Türü:</div>
                      <strong className="text-dark">{selectedFacilityForModal.surface_type}</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="bg-light p-3 rounded-3">
                      <div className="small text-muted mb-1">Saatlik Ücret & İndirim:</div>
                      <strong className="text-success fs-5">{selectedFacilityForModal.price_hourly} ₺</strong>
                      {selectedFacilityForModal.sponsorship_deal && (
                        <span className="badge bg-warning text-dark ms-2">
                          %{selectedFacilityForModal.sponsorship_deal.discount_percent} İndirimli
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mb-2 text-dark">Tesis Olanakları & Hizmetler:</h6>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {selectedFacilityForModal.features.map((feat, idx) => (
                    <span key={idx} className="badge bg-light text-secondary border p-2 px-3 small">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      {feat}
                    </span>
                  ))}
                </div>

                {selectedFacilityForModal.sponsorship_deal && (
                  <div className="card border-success border-opacity-50 bg-success-subtle p-3 rounded-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-success-emphasis">
                        <i className="bi bi-ticket-detailed-fill me-1"></i>
                        {selectedFacilityForModal.sponsorship_deal.title}
                      </strong>
                      <span className="badge bg-warning text-dark fw-bold">
                        {selectedFacilityForModal.sponsorship_deal.badge}
                      </span>
                    </div>
                    <p className="small text-dark mb-2">
                      {selectedFacilityForModal.sponsorship_deal.description}
                    </p>
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted">Kupon Kodu:</span>
                      <code className="fs-6 fw-bold px-2 py-1 bg-white rounded border">
                        {selectedFacilityForModal.sponsorship_deal.coupon_code}
                      </code>
                      <button
                        className="btn btn-outline-success btn-sm fw-bold"
                        onClick={() => handleCopyCoupon(selectedFacilityForModal.sponsorship_deal!.coupon_code)}
                      >
                        <i className="bi bi-copy me-1"></i> Kopyala
                      </button>
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <div className="small text-muted">
                    <i className="bi bi-telephone-fill text-primary me-1"></i>
                    {selectedFacilityForModal.phone}
                  </div>
                  <div className="d-flex gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedFacilityForModal.lat},${selectedFacilityForModal.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="bi bi-cursor-fill me-1"></i> Yol Tarifi
                    </a>
                    <button
                      className="btn btn-success btn-sm fw-bold"
                      onClick={() => {
                        const target = selectedFacilityForModal;
                        setSelectedFacilityForModal(null);
                        setBookingModalFacility(target);
                      }}
                    >
                      <i className="bi bi-calendar2-check-fill me-1"></i> İndirimli Rezervasyon Yap
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 2: BOOKING INQUIRY & COUPON APPLICATION */}
      {/* =============================================================== */}
      {bookingModalFacility && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-success text-white p-3 px-4">
                <h5 className="modal-title fw-bold fs-6">
                  <i className="bi bi-calendar-check me-2"></i>
                  {bookingModalFacility.name} Rezervasyonu
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setBookingModalFacility(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {bookingSuccessMsg ? (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-check-circle-fill fs-4"></i>
                    <div>{bookingSuccessMsg}</div>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit}>
                    <p className="text-muted small mb-3">
                      Tesis için rezervasyon talebinizi iletin. Prospekt sponsorluk indiriminiz otomatik olarak hesaplanacaktır.
                    </p>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Tarih</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Saat Aralığı</label>
                      <select
                        className="form-select"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                      >
                        <option value="18:00 - 19:00">18:00 - 19:00</option>
                        <option value="19:00 - 20:00">19:00 - 20:00</option>
                        <option value="20:00 - 21:00">20:00 - 21:00 (Popüler)</option>
                        <option value="21:00 - 22:00">21:00 - 22:00 (Popüler)</option>
                        <option value="22:00 - 23:00">22:00 - 23:00</option>
                        <option value="23:00 - 00:00">23:00 - 00:00</option>
                      </select>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-bold">Ad Soyad</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold">Telefon</label>
                        <input
                          type="tel"
                          className="form-control"
                          required
                          value={bookingPhone}
                          onChange={(e) => setBookingPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    {bookingModalFacility.sponsorship_deal && (
                      <div className="form-check form-switch bg-light p-3 rounded-3 mb-3">
                        <input
                          className="form-check-input ms-0 me-2"
                          type="checkbox"
                          id="couponCheck"
                          checked={bookingAppliedCoupon}
                          onChange={(e) => setBookingAppliedCoupon(e.target.checked)}
                        />
                        <label className="form-check-label small fw-semibold text-success d-block" htmlFor="couponCheck">
                          %{bookingModalFacility.sponsorship_deal.discount_percent} Sponsorluk İndirimi ({bookingModalFacility.sponsorship_deal.coupon_code}) Uygulansın
                        </label>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          Saatlik {bookingModalFacility.price_hourly} ₺ yerine <strong>{Math.round(bookingModalFacility.price_hourly * (1 - bookingModalFacility.sponsorship_deal.discount_percent / 100))} ₺</strong> ödeyin.
                        </span>
                      </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setBookingModalFacility(null)}
                      >
                        İptal
                      </button>
                      <button type="submit" className="btn btn-success fw-bold px-4">
                        <i className="bi bi-check-lg me-1"></i> Rezervasyonu Onayla
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
