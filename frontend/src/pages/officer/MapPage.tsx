import React, { useEffect, useState } from 'react';
import { geoApi, Facility, AccessGapVillage, CampCluster } from '../../api/geo';
import { Loader2, MapPin, AlertTriangle, Star, Users, Zap } from 'lucide-react';

// We use Leaflet for maps via CDN
declare global {
  interface Window {
    L: any;
  }
}

function useLeaflet(ready: boolean) {
  const [loaded, setLoaded] = useState(typeof window !== 'undefined' && !!window.L);
  useEffect(() => {
    if (loaded || !ready) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, [ready]);
  return loaded;
}

export default function OfficerMapPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [gaps, setGaps] = useState<AccessGapVillage[]>([]);
  const [clusters, setClusters] = useState<CampCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'facilities' | 'gaps' | 'camps'>('facilities');
  const mapRef = React.useRef<HTMLDivElement>(null);
  const leafletLoaded = useLeaflet(true);
  const mapInstance = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  useEffect(() => {
    Promise.all([
      geoApi.listFacilities(),
      geoApi.getAccessGaps(),
      geoApi.getCampClusters(5)
    ]).then(([f, g, c]) => {
      setFacilities(f.items || (f as any));
      setGaps(g.villages || (g as any));
      setClusters(c.clusters || (c as any));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([22.2587, 71.1924], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    mapInstance.current = map;
  }, [leafletLoaded]);

  // Update markers based on tab
  useEffect(() => {
    if (!mapInstance.current || !leafletLoaded) return;
    const L = window.L;
    const map = mapInstance.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (tab === 'facilities') {
      facilities.forEach(f => {
        if (!f.lat || !f.lng) return;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:#0d9488;border:2px solid white;box-shadow:0 0 6px rgba(13,148,136,0.6)"></div>`,
          iconSize: [12, 12]
        });
        const m = L.marker([f.lat, f.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${f.name}</b><br/>${f.type} | ${f.village_lgd}<br/>Capacity: ${f.capacity_daily ?? '—'}`);
        markersRef.current.push(m);
      });
    }

    if (tab === 'gaps') {
      gaps.forEach(g => {
        if (!g.lat || !g.lng) return;
        const size = Math.max(12, Math.min(32, g.access_gap_score * 3));
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(239,68,68,0.7);border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold;">${Math.round(g.access_gap_score)}</div>`,
          iconSize: [size, size]
        });
        const m = L.marker([g.lat, g.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${g.village_lgd}</b><br/>Gap Score: ${g.access_gap_score.toFixed(2)}<br/>Nearest facility: ${g.nearest_facility_name ?? '—'} (${g.nearest_facility_km?.toFixed(1) ?? '—'} km)`);
        markersRef.current.push(m);
      });
    }

    if (tab === 'camps') {
      clusters.forEach((c, i) => {
        if (!c.centroid_lat || !c.centroid_lng) return;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:#a855f7;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${i + 1}</div>`,
          iconSize: [24, 24]
        });
        const m = L.marker([c.centroid_lat, c.centroid_lng], { icon })
          .addTo(map)
          .bindPopup(`<b>Camp Zone ${i + 1}</b><br/>${c.villages.length} villages<br/>${c.estimated_beneficiaries ?? '—'} beneficiaries`);
        markersRef.current.push(m);
      });
    }
  }, [tab, facilities, gaps, clusters, leafletLoaded]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Gati Shakti Map / ગતિ શક્તિ નકશો</h1>
        <p className="text-slate-600 text-sm mt-0.5">Geospatial access gap analysis and camp planning (M6)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'facilities', label: 'Facilities', icon: MapPin },
          { key: 'gaps', label: 'Access Gaps', icon: AlertTriangle },
          { key: 'camps', label: 'Camp Clusters', icon: Zap },
        ].map(t => (
          <button
            key={t.key}
            id={`map-tab-${t.key}`}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-teal-500'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Map + sidebar split */}
      <div className="flex gap-4 h-[600px]">
        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-100">
          {!leafletLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <Loader2 size={32} className="animate-spin text-teal-700" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Sidebar list */}
        <div className="w-72 flex flex-col gap-2 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-teal-700" />
            </div>
          )}

          {tab === 'facilities' && facilities.map(f => (
            <div key={f.facility_id}
              className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:border-teal-500 transition-all cursor-pointer"
              onClick={() => {
                if (mapInstance.current && f.lat && f.lng) {
                  mapInstance.current.setView([f.lat, f.lng], 13);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <p className="text-slate-800 text-sm font-bold truncate pr-2">{f.name}</p>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-md border border-teal-200 flex-shrink-0">{f.type}</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">LGD: {f.village_lgd}</p>
              {f.capacity_daily && <p className="text-slate-500 text-xs">Daily cap: {f.capacity_daily}</p>}
            </div>
          ))}

          {tab === 'gaps' && gaps.map((g, i) => (
            <div key={g.village_lgd}
              className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-200 transition-all cursor-pointer"
              onClick={() => {
                if (mapInstance.current && g.lat && g.lng) {
                  mapInstance.current.setView([g.lat, g.lng], 12);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-700 text-sm font-medium">{g.village_lgd}</p>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-red-600 text-xs font-bold">{g.access_gap_score.toFixed(1)}</span>
                </div>
              </div>
              {g.nearest_facility_name && (
                <p className="text-slate-400 text-xs mt-1">Nearest: {g.nearest_facility_name} ({g.nearest_facility_km?.toFixed(1)} km)</p>
              )}
            </div>
          ))}

          {tab === 'camps' && clusters.map((c, i) => (
            <div key={i}
              className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-purple-200 transition-all cursor-pointer"
              onClick={() => {
                if (mapInstance.current && c.centroid_lat && c.centroid_lng) {
                  mapInstance.current.setView([c.centroid_lat, c.centroid_lng], 11);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">{i + 1}</div>
                <p className="text-slate-700 text-sm font-medium">Camp Zone {i + 1}</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <Users size={11} className="text-slate-400" />
                  <span className="text-slate-500 text-xs">{c.villages.length} villages</span>
                </div>
                {c.estimated_beneficiaries && (
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-slate-400" />
                    <span className="text-slate-500 text-xs">{c.estimated_beneficiaries} beneficiaries</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
