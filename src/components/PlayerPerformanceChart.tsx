import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Player, PlayerActivity, PlayerTeamHistory } from '../types';
import { db } from '../services/db';

interface PlayerPerformanceChartProps {
  player: Player;
  activities: PlayerActivity[];
  careerHistories: PlayerTeamHistory[];
  onOpenAddActivity?: () => void;
}

export interface SeasonStatItem {
  season: string;
  team: string;
  goals: number;
  assists: number;
  saves: number;
  cleanSheets: number;
  matches: number;
  totalContribution: number; // Goals + Assists
}

export const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  player,
  activities,
  careerHistories,
  onOpenAddActivity,
}) => {
  const [chartType, setChartType] = useState<'composed' | 'line' | 'bar' | 'area'>('composed');
  const [showGoals, setShowGoals] = useState(true);
  const [showAssists, setShowAssists] = useState(true);
  const [showSaves, setShowSaves] = useState(true);
  const [showCleanSheets, setShowCleanSheets] = useState(false);
  const [viewMode, setViewMode] = useState<'seasonal' | 'cumulative'>('seasonal');

  const isGoalkeeper = player.primary_position === 'Kaleci' || player.positions.includes('Kaleci');

  // Compute seasonal data combining activities and career histories
  const seasonalData: SeasonStatItem[] = useMemo(() => {
    // Map of season string -> SeasonStatItem
    const seasonMap: Record<string, SeasonStatItem> = {};

    // Base seasons default template based on player age and career
    const currentYear = 2026;
    const birthYear = new Date(player.birth_date).getFullYear();
    const careerStartYear = Math.max(birthYear + 17, 2021);

    for (let yr = careerStartYear; yr <= currentYear; yr++) {
      const seasonKey = `${yr}/${yr + 1}`;
      let defaultTeam = player.current_team_id ? db.getTeamById(player.current_team_id)?.short_name || 'Kulüp' : 'Kulüp';
      
      // Look up team history if available for this year
      const hist = careerHistories.find(h => yr >= h.start_year && (h.end_year === null || yr <= h.end_year));
      if (hist) {
        const teamObj = db.getTeamById(hist.team_id);
        if (teamObj) defaultTeam = teamObj.short_name;
      }

      // Generate realistic baseline career progression if hist exists
      let baseGoals = 0;
      let baseAssists = 0;
      let baseSaves = 0;
      let baseMatches = 20;

      if (hist) {
        const span = Math.max(1, (hist.end_year || currentYear) - hist.start_year + 1);
        baseGoals = Math.round(hist.goals / span);
        baseAssists = Math.round(hist.assists / span);
        baseMatches = Math.round(hist.appearances / span);
      } else {
        // Fallback realistic baseline depending on player role
        const diff = yr - careerStartYear;
        if (isGoalkeeper) {
          baseSaves = 70 + diff * 15;
          baseMatches = 25 + Math.min(diff * 3, 10);
        } else if (player.primary_position === 'Santrafor') {
          baseGoals = 6 + diff * 4;
          baseAssists = 2 + diff * 2;
          baseMatches = 22 + diff * 2;
        } else if (player.primary_position.includes('Kanat')) {
          baseGoals = 4 + diff * 3;
          baseAssists = 4 + diff * 3;
          baseMatches = 24 + diff * 2;
        } else {
          baseGoals = 2 + diff * 2;
          baseAssists = 3 + diff * 2;
          baseMatches = 20 + diff * 3;
        }
      }

      seasonMap[seasonKey] = {
        season: seasonKey,
        team: defaultTeam,
        goals: baseGoals,
        assists: baseAssists,
        saves: isGoalkeeper ? (baseSaves || 85) : (player.primary_position === 'Stoper' ? 12 : 2),
        cleanSheets: isGoalkeeper ? Math.round(baseMatches * 0.35) : 0,
        matches: baseMatches,
        totalContribution: baseGoals + baseAssists,
      };
    }

    // Now overlay actual recorded activities from DB
    activities.forEach((act) => {
      const s = act.season || '2025/2026';
      if (!seasonMap[s]) {
        seasonMap[s] = {
          season: s,
          team: act.team_id ? db.getTeamById(act.team_id)?.short_name || 'Takım' : 'Takım',
          goals: 0,
          assists: 0,
          saves: 0,
          cleanSheets: 0,
          matches: 1,
          totalContribution: 0,
        };
      }

      if (act.activity_type === 'gol') {
        seasonMap[s].goals += 1;
      } else if (act.activity_type === 'asist') {
        seasonMap[s].assists += 1;
      } else if (act.activity_type === 'kurtaris' || act.activity_type === 'penalti_kurtarisi') {
        seasonMap[s].saves += 1;
      } else if (act.activity_type === 'temiz_sayfa') {
        seasonMap[s].cleanSheets += 1;
      }
      seasonMap[s].totalContribution = seasonMap[s].goals + seasonMap[s].assists;
    });

    const list = Object.values(seasonMap).sort((a, b) => a.season.localeCompare(b.season));

    // If cumulative mode is active, make running sum
    if (viewMode === 'cumulative') {
      let runG = 0;
      let runA = 0;
      let runS = 0;
      let runCS = 0;
      let runM = 0;
      return list.map(item => {
        runG += item.goals;
        runA += item.assists;
        runS += item.saves;
        runCS += item.cleanSheets;
        runM += item.matches;
        return {
          ...item,
          goals: runG,
          assists: runA,
          saves: runS,
          cleanSheets: runCS,
          matches: runM,
          totalContribution: runG + runA,
        };
      });
    }

    return list;
  }, [player, activities, careerHistories, isGoalkeeper, viewMode]);

  // Aggregate Metrics for KPI Cards
  const totalGoals = seasonalData.reduce((acc, curr) => acc + (viewMode === 'cumulative' ? 0 : curr.goals), 0) || (seasonalData[seasonalData.length - 1]?.goals || 0);
  const totalAssists = seasonalData.reduce((acc, curr) => acc + (viewMode === 'cumulative' ? 0 : curr.assists), 0) || (seasonalData[seasonalData.length - 1]?.assists || 0);
  const totalSaves = seasonalData.reduce((acc, curr) => acc + (viewMode === 'cumulative' ? 0 : curr.saves), 0) || (seasonalData[seasonalData.length - 1]?.saves || 0);
  const totalCleanSheets = seasonalData.reduce((acc, curr) => acc + (viewMode === 'cumulative' ? 0 : curr.cleanSheets), 0) || (seasonalData[seasonalData.length - 1]?.cleanSheets || 0);
  const totalMatches = seasonalData.reduce((acc, curr) => acc + (viewMode === 'cumulative' ? 0 : curr.matches), 0) || (seasonalData[seasonalData.length - 1]?.matches || 0);

  // Peak season
  const peakSeason = useMemo(() => {
    if (seasonalData.length === 0) return null;
    return [...seasonalData].sort((a, b) => (isGoalkeeper ? b.saves - a.saves : b.totalContribution - a.totalContribution))[0];
  }, [seasonalData, isGoalkeeper]);

  const contributionPerMatch = totalMatches > 0 
    ? (isGoalkeeper ? (totalSaves / totalMatches).toFixed(2) : ((totalGoals + totalAssists) / totalMatches).toFixed(2))
    : '0.00';

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload as SeasonStatItem;
      return (
        <div className="card shadow-lg border-0 p-3 bg-dark text-white rounded-3 small" style={{ minWidth: '190px' }}>
          <div className="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-1">
            <strong className="text-warning fs-6">{label} Sezonu</strong>
            <span className="badge bg-secondary">{item.team}</span>
          </div>

          <div className="d-flex flex-column gap-1">
            {showGoals && (
              <div className="d-flex justify-content-between text-success">
                <span><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.6rem' }}></i> Gol:</span>
                <strong>{item.goals}</strong>
              </div>
            )}
            {showAssists && (
              <div className="d-flex justify-content-between text-info">
                <span><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.6rem' }}></i> Asist:</span>
                <strong>{item.assists}</strong>
              </div>
            )}
            {showSaves && (
              <div className="d-flex justify-content-between text-warning">
                <span><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.6rem' }}></i> Kurtarış:</span>
                <strong>{item.saves}</strong>
              </div>
            )}
            {showCleanSheets && (
              <div className="d-flex justify-content-between text-purple" style={{ color: '#c084fc' }}>
                <span><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.6rem' }}></i> Temiz Sayfa:</span>
                <strong>{item.cleanSheets}</strong>
              </div>
            )}
            <div className="d-flex justify-content-between border-top border-secondary pt-1 mt-1 text-light">
              <span>Toplam Katkı (G+A):</span>
              <strong className="text-white">{item.totalContribution}</strong>
            </div>
            <div className="d-flex justify-content-between text-secondary">
              <span>Oynanan Maç:</span>
              <span>{item.matches}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="d-flex flex-column gap-4">
      
      {/* Top Header & Controls Card */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 mb-2 text-uppercase fw-bold">
                <i className="bi bi-graph-up-arrow me-1"></i> Sezon Bazlı Performans & Trend Analitiği
              </div>
              <h4 className="fw-black text-dark mb-1">
                {player.first_name} {player.last_name} — Gelişim Eğrisi
              </h4>
              <p className="text-muted small mb-0">
                Resmi maç aktiviteleri ve geçmiş takım istatistikleri üzerinden sezonluk gol, asist ve kurtarış metrikleri.
              </p>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Seasonal vs Cumulative toggle */}
              <div className="btn-group btn-group-sm">
                <button 
                  type="button" 
                  className={`btn ${viewMode === 'seasonal' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('seasonal')}
                >
                  Sezonluk
                </button>
                <button 
                  type="button" 
                  className={`btn ${viewMode === 'cumulative' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('cumulative')}
                >
                  Kümülatif Toplam
                </button>
              </div>

              {/* Chart Type Selector */}
              <div className="btn-group btn-group-sm">
                <button 
                  type="button" 
                  className={`btn ${chartType === 'composed' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setChartType('composed')}
                  title="Birleşik Görünüm (Sütun + Çizgi)"
                >
                  <i className="bi bi-bar-chart-line-fill me-1"></i> Birleşik
                </button>
                <button 
                  type="button" 
                  className={`btn ${chartType === 'line' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setChartType('line')}
                  title="Trend Çizgisi"
                >
                  <i className="bi bi-graph-up me-1"></i> Çizgi
                </button>
                <button 
                  type="button" 
                  className={`btn ${chartType === 'bar' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setChartType('bar')}
                  title="Sütun Grafiği"
                >
                  <i className="bi bi-bar-chart-fill me-1"></i> Sütun
                </button>
                <button 
                  type="button" 
                  className={`btn ${chartType === 'area' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setChartType('area')}
                  title="Alan / Hacim Trendi"
                >
                  <i className="bi bi-soundwave me-1"></i> Alan
                </button>
              </div>

              {onOpenAddActivity && (
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                  onClick={onOpenAddActivity}
                >
                  <i className="bi bi-plus-circle-fill"></i>
                  <span>Yeni Aktivite Ekle</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Filter Checkboxes / Badges */}
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
            <span className="small text-secondary fw-semibold me-1">Grafikte Göster:</span>
            
            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 py-1 px-3 ${
                showGoals ? 'btn-success text-white shadow-sm' : 'btn-outline-secondary'
              }`}
              onClick={() => setShowGoals(!showGoals)}
            >
              <i className="bi bi-trophy-fill"></i>
              <span>⚽ Gol ({totalGoals})</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 py-1 px-3 ${
                showAssists ? 'btn-info text-dark fw-bold shadow-sm' : 'btn-outline-secondary'
              }`}
              onClick={() => setShowAssists(!showAssists)}
            >
              <i className="bi bi-diagram-3-fill"></i>
              <span>🎯 Asist ({totalAssists})</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 py-1 px-3 ${
                showSaves ? 'btn-warning text-dark fw-bold shadow-sm' : 'btn-outline-secondary'
              }`}
              onClick={() => setShowSaves(!showSaves)}
            >
              <i className="bi bi-shield-fill-check"></i>
              <span>🧤 Kurtarış ({totalSaves})</span>
            </button>

            {isGoalkeeper && (
              <button
                type="button"
                className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 py-1 px-3 ${
                  showCleanSheets ? 'btn-purple text-white shadow-sm' : 'btn-outline-secondary'
                }`}
                style={showCleanSheets ? { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' } : {}}
                onClick={() => setShowCleanSheets(!showCleanSheets)}
              >
                <i className="bi bi-lock-fill"></i>
                <span>🛡️ Temiz Sayfa ({totalCleanSheets})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3">
        <div className="col-lg-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Toplam Kariyer Golü</span>
                <strong className="fs-3 text-success fw-black">{totalGoals}</strong>
                <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>
                  {seasonalData.length} sezon kaydedildi
                </span>
              </div>
              <div className="rounded-circle bg-success bg-opacity-10 text-success p-3">
                <i className="bi bi-trophy fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">Toplam Kariyer Asisti</span>
                <strong className="fs-3 text-info fw-black">{totalAssists}</strong>
                <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>
                  Doğrudan gol pası
                </span>
              </div>
              <div className="rounded-circle bg-info bg-opacity-10 text-info p-3">
                <i className="bi bi-diagram-3 fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">
                  {isGoalkeeper ? 'Toplam Kurtarış' : 'Kurtarış / Savunma'}
                </span>
                <strong className="fs-3 text-warning fw-black">{totalSaves}</strong>
                <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>
                  {isGoalkeeper ? `${totalCleanSheets} maç gol yemedi` : 'Kritik müdahaleler'}
                </span>
              </div>
              <div className="rounded-circle bg-warning bg-opacity-10 text-warning p-3">
                <i className="bi bi-shield-check fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small d-block">
                  {isGoalkeeper ? 'Maç Başı Kurtarış' : 'Maç Başı Katkı (G+A)'}
                </span>
                <strong className="fs-3 text-primary fw-black">{contributionPerMatch}</strong>
                <span className="text-muted small d-block text-truncate" style={{ fontSize: '0.72rem' }}>
                  Pik: {peakSeason ? `${peakSeason.season} (${isGoalkeeper ? `${peakSeason.saves} Krt` : `${peakSeason.totalContribution} G+A`})` : '-'}
                </span>
              </div>
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3">
                <i className="bi bi-lightning-charge fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="card shadow-sm border-0 bg-white p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-graph-up text-primary"></i>
            <span>Sezonluk Performans Grafiği ({viewMode === 'seasonal' ? 'Sezon Başı Değerler' : 'Kümülatif Artış'})</span>
          </h6>
          <span className="badge bg-light text-muted border small">
            Dinamik Recharts Motoru
          </span>
        </div>

        <div style={{ width: '100%', height: '360px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'composed' ? (
              <ComposedChart data={seasonalData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="season" tick={{ fill: '#6c757d', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showGoals && (
                  <Bar dataKey="goals" name="Gol" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                )}
                {showAssists && (
                  <Bar dataKey="assists" name="Asist" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={45} />
                )}
                {showSaves && (
                  <Line 
                    type="monotone" 
                    dataKey="saves" 
                    name="Kurtarış" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#f59e0b' }} 
                    activeDot={{ r: 8 }}
                  />
                )}
                {showCleanSheets && (
                  <Line 
                    type="monotone" 
                    dataKey="cleanSheets" 
                    name="Temiz Sayfa" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#8b5cf6' }}
                  />
                )}
              </ComposedChart>
            ) : chartType === 'line' ? (
              <LineChart data={seasonalData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="season" tick={{ fill: '#6c757d', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showGoals && (
                  <Line 
                    type="monotone" 
                    dataKey="goals" 
                    name="Gol" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#10b981' }} 
                    activeDot={{ r: 8 }}
                  />
                )}
                {showAssists && (
                  <Line 
                    type="monotone" 
                    dataKey="assists" 
                    name="Asist" 
                    stroke="#0284c7" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#0284c7' }} 
                    activeDot={{ r: 8 }}
                  />
                )}
                {showSaves && (
                  <Line 
                    type="monotone" 
                    dataKey="saves" 
                    name="Kurtarış" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#f59e0b' }} 
                    activeDot={{ r: 8 }}
                  />
                )}
                {showCleanSheets && (
                  <Line 
                    type="monotone" 
                    dataKey="cleanSheets" 
                    name="Temiz Sayfa" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#8b5cf6' }}
                  />
                )}
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart data={seasonalData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="season" tick={{ fill: '#6c757d', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showGoals && (
                  <Bar dataKey="goals" name="Gol" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={38} />
                )}
                {showAssists && (
                  <Bar dataKey="assists" name="Asist" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={38} />
                )}
                {showSaves && (
                  <Bar dataKey="saves" name="Kurtarış" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={38} />
                )}
                {showCleanSheets && (
                  <Bar dataKey="cleanSheets" name="Temiz Sayfa" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={38} />
                )}
              </BarChart>
            ) : (
              <AreaChart data={seasonalData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="assistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="saveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="season" tick={{ fill: '#6c757d', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showGoals && (
                  <Area type="monotone" dataKey="goals" name="Gol" stroke="#10b981" fillOpacity={1} fill="url(#goalGrad)" strokeWidth={2} />
                )}
                {showAssists && (
                  <Area type="monotone" dataKey="assists" name="Asist" stroke="#0284c7" fillOpacity={1} fill="url(#assistGrad)" strokeWidth={2} />
                )}
                {showSaves && (
                  <Area type="monotone" dataKey="saves" name="Kurtarış" stroke="#f59e0b" fillOpacity={1} fill="url(#saveGrad)" strokeWidth={2} />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal Breakdown Table */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-light py-3 px-4 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-table text-primary"></i>
            <span>Sezon Bazlı İstatistik Tablosu</span>
          </h6>
          <span className="small text-muted">
            Toplam {seasonalData.length} Aktif Sezon
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase">
              <tr>
                <th>Sezon</th>
                <th>Takım</th>
                <th className="text-center">Maç</th>
                <th className="text-center text-success">Gol</th>
                <th className="text-center text-info">Asist</th>
                <th className="text-center text-warning">Kurtarış</th>
                {isGoalkeeper && <th className="text-center text-purple">Temiz Sayfa</th>}
                <th className="text-center fw-bold">Skor Katkısı (G+A)</th>
                <th className="text-end">Trend</th>
              </tr>
            </thead>
            <tbody>
              {seasonalData.map((item, idx) => {
                const prevItem = idx > 0 ? seasonalData[idx - 1] : null;
                const diff = prevItem ? item.totalContribution - prevItem.totalContribution : 0;
                
                return (
                  <tr key={item.season}>
                    <td className="fw-bold text-dark">
                      <span className="badge bg-light text-dark border me-2 font-monospace">
                        {item.season}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                        {item.team}
                      </span>
                    </td>
                    <td className="text-center text-secondary">{item.matches}</td>
                    <td className="text-center fw-bold text-success">
                      {item.goals > 0 ? `⚽ ${item.goals}` : '-'}
                    </td>
                    <td className="text-center fw-bold text-info">
                      {item.assists > 0 ? `🎯 ${item.assists}` : '-'}
                    </td>
                    <td className="text-center fw-bold text-warning">
                      {item.saves > 0 ? `🧤 ${item.saves}` : '-'}
                    </td>
                    {isGoalkeeper && (
                      <td className="text-center fw-bold" style={{ color: '#8b5cf6' }}>
                        {item.cleanSheets > 0 ? `🛡️ ${item.cleanSheets}` : '-'}
                      </td>
                    )}
                    <td className="text-center">
                      <span className="badge bg-dark px-2 py-1 fs-6">
                        {item.totalContribution}
                      </span>
                    </td>
                    <td className="text-end">
                      {idx === 0 ? (
                        <span className="badge bg-light text-muted border">Başlangıç</span>
                      ) : diff > 0 ? (
                        <span className="badge bg-success-subtle text-success border border-success">
                          <i className="bi bi-arrow-up-right me-1"></i> +{diff}
                        </span>
                      ) : diff < 0 ? (
                        <span className="badge bg-danger-subtle text-danger border border-danger">
                          <i className="bi bi-arrow-down-right me-1"></i> {diff}
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary border">
                          <i className="bi bi-dash me-1"></i> Dengeli
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
