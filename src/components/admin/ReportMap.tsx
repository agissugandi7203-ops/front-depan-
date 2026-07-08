import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { CitizenReport } from '@/services/api';

interface ReportMapProps {
  reports: CitizenReport[];
  onSelectReport?: (report: CitizenReport) => void;
}

export function ReportMap({ reports, onSelectReport }: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);

  // Regex to extract coordinates: [📍 LOKASI GPS KOORDINAT: lat, lng]
  const parseCoordinates = (description: string) => {
    if (!description) return null;
    const match = description.match(/\[📍 LOKASI GPS KOORDINAT:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  };

  useEffect(() => {
    let active = true;

    const loadLeaflet = () => {
      return new Promise<any>((resolve, reject) => {
        if ((window as any).L && (window as any).L.markerClusterGroup) {
          resolve((window as any).L);
          return;
        }

        // Add Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Add Leaflet MarkerCluster CSS
        if (!document.getElementById('leaflet-cluster-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-cluster-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
          document.head.appendChild(link);
          
          const linkDefault = document.createElement('link');
          linkDefault.id = 'leaflet-cluster-default-css';
          linkDefault.rel = 'stylesheet';
          linkDefault.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
          document.head.appendChild(linkDefault);
        }

        // Add Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          // Once Leaflet JS is loaded, load MarkerCluster JS
          const clusterScript = document.createElement('script');
          clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
          clusterScript.onload = () => {
            if ((window as any).L && (window as any).L.markerClusterGroup) {
              resolve((window as any).L);
            } else {
              reject(new Error('Leaflet MarkerCluster plugin not found'));
            }
          };
          clusterScript.onerror = () => reject(new Error('Failed to load Leaflet MarkerCluster script'));
          document.body.appendChild(clusterScript);
        };
        script.onerror = () => reject(new Error('Failed to load Leaflet script'));
        document.body.appendChild(script);
      });
    };

    loadLeaflet()
      .then((L) => {
        if (!active) return;
        setLoading(false);

        if (!mapContainerRef.current) return;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([-6.2088, 106.8456], 5); // Default to center of Indonesia (zoomed out)

        // Dark theme map tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
      })
      .catch((err) => {
        console.error('Error loading Leaflet GIS:', err);
      });

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, []);

  // Update map markers when reports change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Clear old markers from array
    markersRef.current = [];

    // Initialize or clear MarkerCluster Group
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 40,
        iconCreateFunction: (cluster: any) => {
          const childCount = cluster.getChildCount();
          let border = '#f59e0b'; // amber
          let shadow = 'rgba(245, 158, 11, 0.4)';
          
          if (childCount < 5) {
            border = '#3b82f6'; // blue
            shadow = 'rgba(59, 130, 246, 0.4)';
          } else if (childCount < 15) {
            border = '#f59e0b'; // amber
            shadow = 'rgba(245, 158, 11, 0.4)';
          } else {
            border = '#ef4444'; // red
            shadow = 'rgba(239, 68, 68, 0.4)';
          }
          
          return L.divIcon({
            html: `<div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background-color: #18181b;
              border: 2px solid ${border};
              box-shadow: 0 0 10px ${shadow};
              color: #f4f4f5;
              font-family: system-ui, sans-serif;
              font-size: 11px;
              font-weight: bold;
            ">
              <span>${childCount}</span>
            </div>`,
            className: 'custom-marker-cluster',
            iconSize: L.point(32, 32)
          });
        }
      }).addTo(map);
    } else {
      clusterGroupRef.current.clearLayers();
    }

    const bounds: any[] = [];

    reports.forEach(report => {
      let lat = report.latitude;
      let lng = report.longitude;

      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        const coords = parseCoordinates(report.description);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
        bounds.push([lat, lng]);

        // Create colored markers depending on status
        let markerColor = '#f59e0b'; // pending/amber
        if (report.status === 'Diproses') markerColor = '#3b82f6'; // blue
        if (report.status === 'Selesai') markerColor = '#10b981'; // green
        if (report.status === 'Ditolak') markerColor = '#ef4444'; // red

        // Custom Leaflet DivIcon for premium circle marker pulse
        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `<div style="
            position: relative;
            width: 14px;
            height: 14px;
            background-color: ${markerColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0,0,0,0.6);
          ">
            <span style="
              position: absolute;
              top: -4px;
              left: -4px;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background-color: ${markerColor};
              opacity: 0.4;
              animation: pulse 1.6s infinite ease-in-out;
              pointer-events: none;
            "></span>
          </div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });
        
        // Popup styling
        const cleanDescription = report.description.replace(/^\[📍 LOKASI GPS KOORDINAT:[^\]]+\]\s*/, '');
        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #f4f4f5; background-color: #18181b; padding: 6px; border-radius: 6px; width: 180px;">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 3px; border-bottom: 1px solid #27272a; padding-bottom: 2px;">
              ${report.reporter_name}
            </div>
            ${report.image_url ? `
              <div style="margin-bottom: 4px; border-radius: 4px; overflow: hidden; height: 60px; border: 1px solid #27272a;">
                <img src="${report.image_url}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : ''}
            <div style="margin-bottom: 2px;">
              <span style="color: #a1a1aa;">Kategori:</span> <b>${report.category}</b>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #a1a1aa;">Status:</span> <span style="font-weight: bold; text-transform: uppercase; color: ${markerColor};">${report.status}</span>
            </div>
            <div style="color: #d4d4d8; line-clamp: 2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 6px;">
              ${cleanDescription}
            </div>
            <button id="btn-chat-${report.id}" style="width: 100%; border: none; background: #7c3aed; color: white; padding: 5px; border-radius: 4px; font-weight: bold; font-size: 9.5px; cursor: pointer; text-align: center; display: block;">
              💬 Buka Obrolan Chat
            </button>
          </div>
        `, {
          className: 'dark-map-popup'
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-chat-${report.id}`);
          if (btn && onSelectReport) {
            btn.onclick = () => {
              onSelectReport(report);
            };
          }
        });

        // Add to cluster group
        clusterGroupRef.current.addLayer(marker);
        markersRef.current.push(marker);
      }
    });

    setHasValidCoordinates(bounds.length > 0);

    // Fit map bounds to show all report markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [reports, loading]);

  // Inject animation keyframes for pulse effect (Leaflet marker pulse)
  useEffect(() => {
    if (!document.getElementById('map-marker-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'map-marker-pulse-style';
      style.innerHTML = `
        @keyframes pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.0); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          border: 1px solid #27272a !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-popup-tip {
          background: #18181b !important;
          border: 1px solid #27272a !important;
        }
        .leaflet-popup-close-button {
          color: #a1a1aa !important;
          padding: 8px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden h-full flex flex-col min-h-[380px]">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">GIS Visualisasi Lokasi Aduan</span>
        </div>
        <span className="rounded-full bg-zinc-950 border border-zinc-850 px-2 py-0.5 text-[9px] text-zinc-500 font-mono">
          Live Map
        </span>
      </div>

      <div className="flex-1 relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <p className="text-[10px] text-zinc-400 font-medium">Memuat GIS Leaflet...</p>
            </div>
          </div>
        )}

        {!loading && !hasValidCoordinates && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/20">
            <MapPin className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Tidak Ada GPS Terlampir</p>
            <p className="text-[10px] text-zinc-500 max-w-[200px] mt-1 leading-normal">
              Saat warga melampirkan GPS pada laporan, pin lokasi koordinat akan ter-plot otomatis di sini.
            </p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />
      </div>
    </div>
  );
}
