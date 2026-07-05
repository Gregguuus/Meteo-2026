import { useEffect, useRef, useState, useCallback } from 'react';

const CDN = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet';
const API = 'https://api.rainviewer.com/public/weather-maps.json';
const TILE = 'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/2/1_1.png';
const BOUFFEMONT = [49.0442, 2.3000];

export default function RadarMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const radarLayer = useRef(null);
  const frameRef = useRef(0);
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) { setLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = `${CDN}.css`;
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = `${CDN}.js`;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Fetch RainViewer frames
  useEffect(() => {
    if (!loaded) return;
    fetch(API).then(r => r.json()).then(d => {
      const f = d?.radar?.past || [];
      setFrames(f);
    }).catch(() => setFrames([]));
  }, [loaded]);

  // Init map once
  useEffect(() => {
    if (!loaded || mapInstance.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: BOUFFEMONT, zoom: 8, zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    map.attributionControl.setPrefix('');
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [loaded]);

  // Update radar overlay
  useEffect(() => {
    if (!loaded || !frames.length || !mapInstance.current) return;
    const L = window.L;
    const frame = frames[frameIdx];
    if (!frame) return;

    if (radarLayer.current) mapInstance.current.removeLayer(radarLayer.current);
    const url = TILE.replace('{time}', frame.time);
    radarLayer.current = L.tileLayer(url, { opacity: 0.5, minZoom: 0, maxZoom: 7 });
    radarLayer.current.addTo(mapInstance.current);
  }, [loaded, frames, frameIdx]);

  // Animation loop
  useEffect(() => {
    if (!playing || !frames.length) return;
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % frames.length;
      setFrameIdx(frameRef.current);
    }, 800);
    return () => clearInterval(interval);
  }, [playing, frames.length]);

  if (!loaded && !frames.length) return (
    <div style={{ height: 420, display:'flex', alignItems:'center', justifyContent:'center', gap: 8, color:'var(--text-secondary)', fontSize:'0.85rem' }}>
      <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'var(--accent-blue)', animation:'spin 0.8s linear infinite' }} />
      Chargement de la carte radar…
    </div>
  );

  return (
    <div style={{ position:'relative', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: 420, width:'100%', background:'#06060e' }} />
      {frames.length > 0 && (
        <div style={{
          position:'absolute', bottom:12, left:12, right:12, zIndex:1000,
          display:'flex', alignItems:'center', gap:10,
          padding:'6px 12px', borderRadius:10,
          background:'rgba(6,6,14,0.85)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,255,255,0.06)',
        }}>
          <button onClick={() => setPlaying(p => !p)} style={{
            background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8,
            width:32, height:32, fontSize:14, cursor:'pointer', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{playing ? '⏸' : '▶'}</button>
          <div style={{ flex:1, height:4, borderRadius:2, background:'rgba(255,255,255,0.08)', position:'relative' }}>
            <div style={{
              width:`${(frameIdx / frames.length) * 100}%`, height:'100%', borderRadius:2,
              background:'linear-gradient(90deg, var(--accent-blue), #7c5cfc)',
              transition:'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize:'0.65rem', color:'var(--text-tertiary)', whiteSpace:'nowrap', minWidth:36 }}>
            {String(new Date(frames[frameIdx]?.time * 1000).getHours()).padStart(2,'0')}h
            {String(new Date(frames[frameIdx]?.time * 1000).getMinutes()).padStart(2,'0')}
          </span>
        </div>
      )}
    </div>
  );
}
