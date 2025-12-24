
import React, { useEffect, useRef, useState } from 'react';
import { DroneMedia } from '../types';
import { searchAddress, geocodeAddress } from '../services/exifService';

// @ts-ignore
const L = window.L;

interface MapViewProps {
  mediaList: DroneMedia[];
  onMarkerClick: (media: DroneMedia) => void;
  onDelete: (media: DroneMedia) => void;
  onFullScreen: (media: DroneMedia) => void;
  onAnalyze: (media: DroneMedia) => void;
  center?: [number, number];
  onDownload: (media: DroneMedia) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedId?: string;
}

type MapLayer = 'satellite' | 'standard';

const MapView: React.FC<MapViewProps> = ({ 
  mediaList, 
  onMarkerClick, 
  onDelete,
  onFullScreen,
  onAnalyze,
  onDownload,
  center, 
  selectedId
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<any>(null);
  const [mapType, setMapType] = useState<MapLayer>('satellite');
  const [mapReady, setMapReady] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const satelliteLayerRef = useRef<any>(null);
  const standardLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !L) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([-3.7172, -38.5283], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    satelliteLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    standardLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    satelliteLayerRef.current.addTo(mapRef.current);

    if (L.markerClusterGroup) {
        clusterGroupRef.current = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 45,
            disableClusteringAtZoom: 17
        });
        mapRef.current.addLayer(clusterGroupRef.current);
    }

    setMapReady(true);

    setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 500);

    const observer = new ResizeObserver(() => { if (mapRef.current) mapRef.current.invalidateSize(); });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (mapType === 'satellite') {
      if (mapRef.current.hasLayer(standardLayerRef.current)) mapRef.current.removeLayer(standardLayerRef.current);
      satelliteLayerRef.current.addTo(mapRef.current);
    } else {
      if (mapRef.current.hasLayer(satelliteLayerRef.current)) mapRef.current.removeLayer(satelliteLayerRef.current);
      standardLayerRef.current.addTo(mapRef.current);
    }
  }, [mapType, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current || !mapReady) return;
    clusterGroupRef.current.clearLayers();

    mediaList.filter(m => m.hasGps).forEach(m => {
      const isSelected = m.id === selectedId;
      const markerColor = m.type === 'video' ? '#ef4444' : '#3b82f6';
      
      const customIcon = L.divIcon({
        className: `mira-custom-icon ${isSelected ? 'is-active' : ''}`,
        html: `<div style="background-color: ${markerColor}; width: ${isSelected ? '28px' : '16px'}; height: ${isSelected ? '28px' : '16px'}; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px ${markerColor};"></div>`,
        iconSize: isSelected ? [28, 28] : [16, 16],
        iconAnchor: isSelected ? [14, 14] : [8, 8]
      });

      const marker = L.marker([m.latitude!, m.longitude!], { icon: customIcon });
      
      const popupContainer = document.createElement('div');
      popupContainer.className = 'w-72 overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl font-sans';
      
      const content = `
        <div class="relative h-36 w-full cursor-pointer btn-fullscreen">
           <img src="${m.previewUrl}" class="w-full h-full object-cover" />
           <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
           <div class="absolute bottom-3 left-3 right-3">
              <p class="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">${m.timestamp || 'Sem Data'}</p>
              <p class="text-[10px] font-bold text-white truncate uppercase">${m.name}</p>
           </div>
           <div class="absolute top-2 right-2 bg-blue-600 text-white text-[6px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Ativo Online</div>
        </div>
        <div class="p-3 grid grid-cols-3 gap-2 bg-slate-900">
           <button class="btn-analyze bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 flex flex-col items-center justify-center transition-all active:scale-95">
              <svg class="w-3.5 h-3.5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <span class="text-[7px] font-black uppercase tracking-tighter">Analisar</span>
           </button>
           <button class="btn-open bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2.5 flex flex-col items-center justify-center transition-all active:scale-95">
              <svg class="w-3.5 h-3.5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span class="text-[7px] font-black uppercase tracking-tighter">Ver</span>
           </button>
           <button class="btn-down bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2.5 flex flex-col items-center justify-center transition-all active:scale-95">
              <svg class="w-3.5 h-3.5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span class="text-[7px] font-black uppercase tracking-tighter">Download</span>
           </button>
        </div>
      `;
      
      popupContainer.innerHTML = content;
      
      popupContainer.querySelector('.btn-analyze')?.addEventListener('click', () => onAnalyze(m));
      popupContainer.querySelector('.btn-open')?.addEventListener('click', () => onFullScreen(m));
      popupContainer.querySelector('.btn-down')?.addEventListener('click', () => onDownload(m));
      popupContainer.querySelector('.btn-fullscreen')?.addEventListener('click', () => onFullScreen(m));

      marker.bindPopup(popupContainer, { maxWidth: 300, minWidth: 280, className: 'mira-tactical-popup' });
      clusterGroupRef.current.addLayer(marker);
    });
  }, [mediaList, selectedId, mapReady, onAnalyze, onMarkerClick, onDownload, onFullScreen]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (val.length > 3) {
      searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        const res = await searchAddress(val);
        setSuggestions(res);
        setIsSearching(false);
      }, 600);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (s: string) => {
    setSearchQuery(s);
    setSuggestions([]);
    const coords = await geocodeAddress(s);
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 1.5 });
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-950">
      <div ref={containerRef} className="w-full h-full z-10" />
      
      {/* Tactical Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[40] w-full max-w-md px-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            )}
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR COORDENADA OU ENDEREÇO..." 
            className="w-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black text-white uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-2xl"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-2 duration-200">
              {suggestions.map((s, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-5 py-4 text-[9px] font-bold text-slate-300 uppercase border-b border-white/5 last:border-0 hover:bg-blue-600/20 hover:text-white transition-all flex items-center"
                >
                  <svg className="w-3 h-3 mr-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-[40] bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl flex space-x-2">
        <button onClick={() => setMapType('satellite')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${mapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>🛰️ Satélite</button>
        <button onClick={() => setMapType('standard')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${mapType === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>🗺️ Mapa</button>
      </div>
      <style>{`
        .leaflet-popup-content-wrapper { background: transparent; border-radius: 1rem; color: white; padding: 0; box-shadow: none; }
        .leaflet-popup-content { margin: 0; width: 280px !important; }
        .leaflet-popup-tip { display: none; }
        .mira-custom-icon.is-active div { animation: marker-pulse 1.2s infinite; }
        @keyframes marker-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default MapView;
