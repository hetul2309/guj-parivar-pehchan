import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  geoApi,
  Facility,
  AccessGapVillage,
  CampSuggestion,
  SchemeCoverageVillage,
  FacilityType
} from '../../api/geo';
import { schemesApi, Scheme } from '../../api/schemes';
import {
  Building2,
  AlertTriangle,
  Tent,
  PieChart,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  MapPin,
  Users
} from 'lucide-react';

type MapTab = 'facilities' | 'gaps' | 'camps' | 'coverage';

function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export default function OfficerMapPage() {
  const { t, i18n } = useTranslation();
  const district = localStorage.getItem('gujid_district') || 'DAHOD';

  // Tabs & Filters
  const [tab, setTab] = useState<MapTab>('facilities');
  const [facilityType, setFacilityType] = useState<FacilityType>('all');
  const [gapFacilityType, setGapFacilityType] = useState<FacilityType>('phc');
  const [thresholdKm, setThresholdKm] = useState<number>(5);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [gaps, setGaps] = useState<AccessGapVillage[]>([]);
  const [camps, setCamps] = useState<CampSuggestion[]>([]);
  const [coverage, setCoverage] = useState<SchemeCoverageVillage[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  // Status & Partial Failures
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<Record<string, string | null>>({});

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView([22.834, 74.256], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | PM Gati Shakti GIS'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Available Schemes for Filter Dropdown
  useEffect(() => {
    schemesApi.list()
      .then(res => setSchemes(res.items || (res as any) || []))
      .catch(() => {});
  }, []);

  // Fetch Data using Promise.allSettled for Resilience
  const loadMapData = async () => {
    setRefreshing(true);
    const errors: Record<string, string | null> = {
      facilities: null,
      gaps: null,
      camps: null,
      coverage: null
    };

    const [facRes, gapRes, campRes, covRes] = await Promise.allSettled([
      geoApi.getFacilities(facilityType, district),
      geoApi.getAccessGaps(district, gapFacilityType, thresholdKm),
      geoApi.getCamps(district, selectedSchemeId || undefined),
      geoApi.getCoverage(district, selectedSchemeId || undefined)
    ]);

    if (facRes.status === 'fulfilled') {
      setFacilities(facRes.value);
    } else {
      errors.facilities = facRes.reason?.message || 'Facilities load failed';
    }

    if (gapRes.status === 'fulfilled') {
      setGaps(gapRes.value);
    } else {
      errors.gaps = gapRes.reason?.message || 'Access gap load failed';
    }

    if (campRes.status === 'fulfilled') {
      setCamps(campRes.value);
    } else {
      errors.camps = campRes.reason?.message || 'Camp suggestions load failed';
    }

    if (covRes.status === 'fulfilled') {
      setCoverage(covRes.value);
    } else {
      errors.coverage = covRes.reason?.message || 'Coverage load failed';
    }

    setErrorStatus(errors);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadMapData();
  }, [district, facilityType, gapFacilityType, thresholdKm, selectedSchemeId]);

  // Update Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds = L.latLngBounds([]);

    if (tab === 'facilities') {
      const filtered = facilities.filter(f =>
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.village_lgd.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filtered.forEach(f => {
        if (!f.lat || !f.lng) return;
        const color =
          f.type === 'phc' ? '#0d9488' :
          f.type === 'school' ? '#2563eb' :
          f.type === 'anganwadi' ? '#d97706' :
          f.type === 'ration_shop' ? '#dc2626' : '#7c3aed';

        const marker = L.circleMarker([f.lat, f.lng], {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        const popupHtml = `
          <div style="font-family: inherit; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${escapeHtml(f.name)}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              ${escapeHtml(f.type.toUpperCase())} · LGD: ${escapeHtml(f.village_lgd)}
            </div>
            <div style="font-size: 11px; padding: 4px 8px; background: #f1f5f9; border-radius: 6px;">
              <strong>District:</strong> ${escapeHtml(f.district_code || district)}
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        layer.addLayer(marker);
        bounds.extend([f.lat, f.lng]);
      });
    } else if (tab === 'gaps') {
      const filtered = gaps.filter(g =>
        !searchQuery ||
        g.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.name_gu.includes(searchQuery) ||
        g.village_lgd.includes(searchQuery)
      );

      filtered.forEach(g => {
        if (!g.lat || !g.lng) return;
        const color =
          g.priority === 'HIGH' ? '#e11d48' :
          g.priority === 'MEDIUM' ? '#f59e0b' : '#10b981';

        const radius = Math.min(22, Math.max(8, 8 + (g.gap_score / 15)));

        const marker = L.circleMarker([g.lat, g.lng], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        const popupHtml = `
          <div style="font-family: inherit; min-width: 220px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${escapeHtml(g.name_en)} (${escapeHtml(g.name_gu)})
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              LGD: ${escapeHtml(g.village_lgd)} · Priority: <strong>${escapeHtml(g.priority)}</strong>
            </div>
            <div style="font-size: 11px; line-height: 1.6; background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
              <div><strong>Gap Score:</strong> ${escapeHtml(g.gap_score)}</div>
              <div><strong>Nearest Facility:</strong> ${escapeHtml(g.nearest_facility)} (${escapeHtml(g.distance_km)} km)</div>
              <div><strong>Eligible Families:</strong> ${escapeHtml(g.eligible_beneficiaries)}</div>
              <div><strong>Acceptable Threshold:</strong> ${escapeHtml(g.threshold_km)} km</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        layer.addLayer(marker);
        bounds.extend([g.lat, g.lng]);
      });
    } else if (tab === 'camps') {
      const filtered = camps.filter(c =>
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.camp_id.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filtered.forEach((c, idx) => {
        if (!c.lat || !c.lng) return;
        const radius = Math.min(20, Math.max(9, 9 + c.families_count / 3));

        const marker = L.circleMarker([c.lat, c.lng], {
          radius,
          fillColor: '#9333ea',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        });

        const popupHtml = `
          <div style="font-family: inherit; min-width: 200px;">
            <div style="font-weight: 800; font-size: 13px; color: #581c87; margin-bottom: 2px;">
              ${escapeHtml(c.name)}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              Camp ID: ${escapeHtml(c.camp_id)} · Status: <strong>${escapeHtml(c.status)}</strong>
            </div>
            <div style="font-size: 11px; background: #faf5ff; padding: 6px 8px; border-radius: 6px; border: 1px solid #f3e8ff;">
              <div><strong>Uncovered Families:</strong> ${escapeHtml(c.families_count)}</div>
              <div><strong>Location:</strong> ${escapeHtml(c.lat)}, ${escapeHtml(c.lng)}</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        layer.addLayer(marker);
        bounds.extend([c.lat, c.lng]);
      });
    } else if (tab === 'coverage') {
      const filtered = coverage.filter(v =>
        !searchQuery ||
        v.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name_gu.includes(searchQuery) ||
        v.village_lgd.includes(searchQuery)
      );

      filtered.forEach(v => {
        if (!v.lat || !v.lng) return;
        // Color based on saturation: <40% Red, 40-75% Amber, >75% Green
        const color =
          v.saturation_pct > 75 ? '#10b981' :
          v.saturation_pct >= 40 ? '#f59e0b' : '#ef4444';

        const marker = L.circleMarker([v.lat, v.lng], {
          radius: 9,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        });

        const popupHtml = `
          <div style="font-family: inherit; min-width: 220px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${escapeHtml(v.name_en)} (${escapeHtml(v.name_gu)})
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              LGD: ${escapeHtml(v.village_lgd)} · Saturation: <strong>${escapeHtml(v.saturation_pct)}%</strong>
            </div>
            <div style="font-size: 11px; line-height: 1.6; background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
              <div><strong>Eligible Families:</strong> ${escapeHtml(v.eligible)}</div>
              <div><strong>Applications Submitted:</strong> ${escapeHtml(v.applied)}</div>
              <div><strong>Disbursed:</strong> ${escapeHtml(v.disbursed)}</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        layer.addLayer(marker);
        bounds.extend([v.lat, v.lng]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [tab, facilities, gaps, camps, coverage, searchQuery]);

  const zoomToCoords = (lat: number, lng: number) => {
    if (mapInstanceRef.current && lat && lng) {
      mapInstanceRef.current.setView([lat, lng], 13, { animate: true });
    }
  };

  const hasError = errorStatus[tab];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-white/20 border border-white/30 backdrop-blur-sm">
              PM Gati Shakti · M6 Spatial GIS
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40">
              {district} District
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            ભૌગોલિક નકશો અને એક્સેસ ગેપ વિશ્લેષણ
          </h1>
          <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            PM Gati Shakti Geo-Spatial Layer: Facilities, Access Gaps, Outreach Camps & Scheme Saturation.
          </p>
        </div>

        <button
          onClick={loadMapData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>રીફ્રેશ (Refresh)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('facilities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            tab === 'facilities'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>સુવિધાઓ (Facilities)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/15">
            {facilities.length}
          </span>
        </button>

        <button
          onClick={() => setTab('gaps')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            tab === 'gaps'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>એક્સેસ ગેપ (Access Gaps)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/15">
            {gaps.length}
          </span>
        </button>

        <button
          onClick={() => setTab('camps')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            tab === 'camps'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Tent className="w-4 h-4" />
          <span>કેમ્પ સૂચનો (Camp Suggestions)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/15">
            {camps.length}
          </span>
        </button>

        <button
          onClick={() => setTab('coverage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            tab === 'coverage'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>યોજના સેચ્યુરેશન (Coverage)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/15">
            {coverage.length}
          </span>
        </button>
      </div>

      {/* Layer-Specific Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'facilities' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">કેટેગરી:</span>
              <select
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">તમામ સુવિધાઓ (All Facilities)</option>
                <option value="phc">આરોગ્ય કેન્દ્ર (PHC)</option>
                <option value="school">શાળાઓ (Schools)</option>
                <option value="anganwadi">આંગણવાડી (Anganwadi)</option>
                <option value="ration_shop">સસ્તા અનાજની દુકાન (FPS)</option>
                <option value="bank">બેંક / BC Point</option>
              </select>
            </div>
          )}

          {tab === 'gaps' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">સુવિધા પ્રકાર:</span>
                <select
                  value={gapFacilityType}
                  onChange={(e) => setGapFacilityType(e.target.value as FacilityType)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="phc">પ્રાથમિક આરોગ્ય કેન્દ્ર (PHC)</option>
                  <option value="school">શાળાઓ (Schools)</option>
                  <option value="anganwadi">આંગણવાડી (Anganwadi)</option>
                  <option value="ration_shop">સસ્તા અનાજની દુકાન (FPS)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">સ્વીકાર્ય અંતર મર્યાદા:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  {[3, 5, 10, 15].map((km) => (
                    <button
                      key={km}
                      onClick={() => setThresholdKm(km)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        thresholdKm === km
                          ? 'bg-rose-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(tab === 'camps' || tab === 'coverage') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">યોજના ફિલ્ટર:</span>
              <select
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">તમામ યોજનાઓ (All Schemes)</option>
                {schemes.map((s) => (
                  <option key={s.scheme_id} value={s.scheme_id}>
                    {s.name_gu} ({s.name_en})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search in results */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ગામ અથવા સુવિધા શોધો..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Partial Error Alert */}
      {hasError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>આ સ્તર માટે કેટલીક વિગતો ઉપલબ્ધ નથી ({hasError}). અન્ય સ્તરો સામાન્ય રીતે કાર્યરત છે.</span>
        </div>
      )}

      {/* Main Map + Sidebar Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Leaflet Map (7 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-3 border border-slate-200 shadow-sm overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-[540px] sm:h-[600px] rounded-2xl z-0"
            style={{ minHeight: '500px' }}
          />
          {/* Legend */}
          <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <span className="font-bold text-slate-700">સંકેતો (Legend):</span>
            {tab === 'facilities' && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> PHC</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> School</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Anganwadi</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> FPS</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Bank/BC</span>
              </div>
            )}
            {tab === 'gaps' && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> High Gap (&gt;50)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium (15-50)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low (&lt;15)</span>
              </div>
            )}
            {tab === 'camps' && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Suggested Camp (DBSCAN / Village Cluster)</span>
              </div>
            )}
            {tab === 'coverage' && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> High (&gt;75%)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium (40-75%)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Low (&lt;40%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Results List (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col h-[540px] sm:h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {tab === 'facilities' && 'સુવિધાઓની યાદી (Facilities)'}
                {tab === 'gaps' && 'પ્રાથમિકતા યાદી (Access Priorities)'}
                {tab === 'camps' && 'સૂચિત કેમ્પ સ્થાનો (Outreach Camps)'}
                {tab === 'coverage' && 'ગામવાર સેચ્યુરેશન (Village Saturation)'}
              </h2>
              <p className="text-[11px] text-slate-500">ગામ પર ક્લિક કરીને નકશા પર ઝૂમ કરો</p>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
              {tab === 'facilities' && facilities.length}
              {tab === 'gaps' && gaps.length}
              {tab === 'camps' && camps.length}
              {tab === 'coverage' && coverage.length}
            </span>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                <span className="text-xs font-bold">ડેટા લોડ થઈ રહ્યો છે...</span>
              </div>
            ) : tab === 'facilities' ? (
              facilities.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">કોઈ સુવિધા મળી નથી</div>
              ) : (
                facilities.map((f) => (
                  <div
                    key={f.facility_id}
                    onClick={() => zoomToCoords(f.lat, f.lng)}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-200 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {f.type.toUpperCase()} · LGD: {f.village_lgd}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition" />
                  </div>
                ))
              )
            ) : tab === 'gaps' ? (
              gaps.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">કોઈ એક્સેસ ગેપ મળ્યો નથી</div>
              ) : (
                gaps.map((g) => (
                  <div
                    key={g.village_lgd}
                    onClick={() => zoomToCoords(g.lat, g.lng)}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-rose-50/50 hover:border-rose-200 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            g.priority === 'HIGH' ? 'bg-rose-600' :
                            g.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-900 group-hover:text-rose-900">
                          {g.name_gu} ({g.name_en})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ગેપ સ્કોર: <strong>{g.gap_score}</strong> · અંતર: {g.distance_km} km
                      </div>
                      <div className="text-[10px] text-slate-400">
                        પાત્ર કુટુંબો: {g.eligible_beneficiaries} · નજીક: {g.nearest_facility}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-700 transition" />
                  </div>
                ))
              )
            ) : tab === 'camps' ? (
              camps.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  કોઈ અસંતૃપ્ત કુટુંબો મળ્યા નથી (No uncovered clusters)
                </div>
              ) : (
                camps.map((c) => (
                  <div
                    key={c.camp_id}
                    onClick={() => zoomToCoords(c.lat, c.lng)}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-200 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-purple-900">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        કેમ્પ ID: {c.camp_id} · અસંતૃપ્ત કુટુંબો: <strong>{c.families_count}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        સ્થાન: {c.lat}, {c.lng}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-extrabold text-[10px] rounded-full">
                        {c.families_count} કુટુંબો
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 transition" />
                    </div>
                  </div>
                ))
              )
            ) : tab === 'coverage' ? (
              coverage.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">કોઈ કવરેજ ડેટા મળ્યો નથી</div>
              ) : (
                coverage.map((v) => (
                  <div
                    key={v.village_lgd}
                    onClick={() => zoomToCoords(v.lat, v.lng)}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                        {v.name_gu} ({v.name_en})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        સેચ્યુરેશન: <strong className={v.saturation_pct > 75 ? 'text-emerald-700' : (v.saturation_pct >= 40 ? 'text-amber-700' : 'text-rose-700')}>{v.saturation_pct}%</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        પાત્ર: {v.eligible} · અરજી: {v.applied} · વિતરણ: {v.disbursed}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition" />
                  </div>
                ))
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
