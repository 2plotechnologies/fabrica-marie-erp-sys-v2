import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Route,
  Store,
  Plus,
  Trash2,
  Save,
  Navigation,
  Key,
  Pentagon,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Route as RouteType } from '@/types';
import { mapaInteractivoService } from '@/services/mapaInteractivoService';

interface MapPoint {
  id: string;
  lng: number;
  lat: number;
  type: 'route-point' | 'client';
  name?: string;
}

interface SavedRoute {
  id: string;
  nombre: string;
  zona: string;
  descripcion?: string;
  vendedor_id?: string;
  clientes_count: number;
  activo: boolean;
  points: MapPoint[];
}

interface ZonePolygon {
  id: string;
  name: string;
  color: string;
  points: { lng: number; lat: number }[];
}

interface NewClient {
  name: string;
  address: string;
  phone: string;
  zone: string;
}

interface RouteMapProps {
  routes: any[];
  onRoutesChange: (routes: any[]) => void;
  initialZoneId?: string | number;
}

type MapMode = 'view' | 'create-route' | 'create-client' | 'create-zone' | 'edit-routes' | 'edit-zones';

const RouteMap = ({ routes, onRoutesChange, initialZoneId }: RouteMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const modeRef = useRef<MapMode>('view');

  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mode, setMode] = useState<MapMode>('view');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false);
  const [showEditZoneDialog, setShowEditZoneDialog] = useState(false);
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteZone, setEditRouteZone] = useState('');
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneColor, setEditZoneColor] = useState('#d97706');

  // Convert routes from props to map routes with points
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => {
    // Generate mock points for each route based on zone
    const zoneOffsets: Record<string, { lng: number; lat: number }> = {
      'Norte': { lng: 0, lat: 0.02 },
      'Sur': { lng: 0, lat: -0.02 },
      'Centro': { lng: 0, lat: 0 },
      'Este': { lng: 0.02, lat: 0 },
      'Oeste': { lng: -0.02, lat: 0 },
    };

    return routes.map(route => {
      const offset = zoneOffsets[route.zona] || { lng: 0, lat: 0 };
      const baseLng = -75.2048 + offset.lng;
      const baseLat = -12.0651 + offset.lat;

      return {
        id: route.id,
        nombre: route.nombre,
        zona: route.zona,
        descripcion: route.descripcion,
        vendedor_id: route.vendedor_id,
        clientes_count: route.clientes_count,
        activo: route.activo,
        points: [
          { id: `${route.id}-p1`, lng: baseLng - 0.01, lat: baseLat - 0.005, type: 'route-point' as const },
          { id: `${route.id}-p2`, lng: baseLng, lat: baseLat + 0.005, type: 'route-point' as const },
          { id: `${route.id}-p3`, lng: baseLng + 0.01, lat: baseLat - 0.003, type: 'route-point' as const },
        ]
      };
    });
  });

  // Initialize zones from unique zones in routes
  const [zones, setZones] = useState<ZonePolygon[]>(() => {
    const zoneColors: Record<string, string> = {
      'Norte': '#2563eb',
      'Sur': '#16a34a',
      'Centro': '#d97706',
      'Este': '#9333ea',
      'Oeste': '#db2777',
    };

    const zoneOffsets: Record<string, { lng: number; lat: number }> = {
      'Norte': { lng: 0, lat: 0.02 },
      'Sur': { lng: 0, lat: -0.02 },
      'Centro': { lng: 0, lat: 0 },
      'Este': { lng: 0.02, lat: 0 },
      'Oeste': { lng: -0.02, lat: 0 },
    };

    // Get unique zones
    const uniqueZones = [...new Set(routes.map(r => r.zona))];

    return uniqueZones.map(zoneName => {
      const offset = zoneOffsets[zoneName] || { lng: 0, lat: 0 };
      const baseLng = -75.2048 + offset.lng;
      const baseLat = -12.0651 + offset.lat;
      const size = 0.015;

      return {
        id: `zone-${zoneName.toLowerCase()}`,
        name: `Zona ${zoneName}`,
        color: zoneColors[zoneName] || '#d97706',
        points: [
          { lng: baseLng - size, lat: baseLat - size },
          { lng: baseLng + size, lat: baseLat - size },
          { lng: baseLng + size, lat: baseLat + size },
          { lng: baseLng - size, lat: baseLat + size },
        ]
      };
    });
  });

  const [routePoints, setRoutePoints] = useState<MapPoint[]>([]);
  const [clients, setClients] = useState<MapPoint[]>([]);
  const [zonePoints, setZonePoints] = useState<{ lng: number; lat: number }[]>([]);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [pendingClientLocation, setPendingClientLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [rutasList, setRutasList] = useState<any[]>([]);
  const [selectedRutaId, setSelectedRutaId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [routeZone, setRouteZone] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#d97706');
  const [selectedZoneIdForSave, setSelectedZoneIdForSave] = useState<string>('new');

  const zoneColors = [
    { name: 'Ámbar', value: '#d97706' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Verde', value: '#16a34a' },
    { name: 'Rojo', value: '#dc2626' },
    { name: 'Morado', value: '#9333ea' },
    { name: 'Rosa', value: '#db2777' },
  ];

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await mapaInteractivoService.getMapboxToken();

        if (res?.token) {
          setMapboxToken(res.token);
          setIsTokenSet(true);
        }
      } catch (error) {
        console.log('No hay token guardado');
      } finally {
        setLoadingToken(false);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await mapaInteractivoService.getClientes();
        setClientesList(res.data || res);
      } catch (error) {
        toast.error('Error cargando clientes');
      }
    };

    fetchClientes();
  }, []);

  useEffect(() => {
    const fetchRutas = async () => {
      const res = await mapaInteractivoService.getRutas();
      setRutasList(res.data || res);
    };

    fetchRutas();
  }, []);

  // Keep modeRef in sync with mode state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (initialZoneId && zones.length > 0) {
      const foundZone = zones.find(z => String(z.id) === String(initialZoneId));
      if (foundZone) {
        setSelectedZoneIdForSave(String(foundZone.id));
        setZoneName(foundZone.name);
        setZoneColor(foundZone.color);
        setMode('create-zone');
        toast.info(`Modo "Crear Zona" activado para "${foundZone.name}". Haz clic en el mapa para trazar sus vértices.`);
      }
    }
  }, [initialZoneId, zones]);

  const saveToken = async () => {
    if (mapboxToken.trim()) {
      await mapaInteractivoService.saveMapboxToken(mapboxToken);
      setIsTokenSet(true);
      toast.success('Token de Mapbox guardado correctamente');
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    // Set token before creating map
    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-75.2048, -12.0651], // Huancayo, Peru
        zoom: 13,
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        const error = e.error as { status?: number } | undefined;
        if (error?.status === 401) {
          toast.error('Token de Mapbox inválido o expirado. Por favor genera uno nuevo.');
          //localStorage.removeItem('mapbox_token');
          setIsTokenSet(false);
          setMapboxToken('');
        }
      });

      map.current.on('load', () => {
        // Add controls after map loads
        map.current?.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        map.current?.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
          }),
          'top-right'
        );

        // Mark map as fully loaded for style operations
        setIsMapLoaded(true);
      });

      map.current.on('click', handleMapClick);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Error al cargar el mapa. Verifica tu token de Mapbox.');
    }

    return () => {
      setIsMapLoaded(false);
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  // Load map data initially when map is loaded
  useEffect(() => {
    if (isMapLoaded) {
      loadClientesMapa();
      loadRutasMapa();
      loadZonas();
    }
  }, [isMapLoaded]);

  // Update markers when points change
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add client markers
    clients.forEach(client => {
      const el = document.createElement('div');
      el.className = 'client-marker';
      el.innerHTML = `
        <div class="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
          </svg>
        </div>
      `;

      if (isNaN(client.lat) || isNaN(client.lng)) return;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([client.lng, client.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${client.name}</h3>
            <p class="text-sm text-gray-500">Cliente</p>
          </div>
        `))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add route point markers
    routePoints.forEach((point, index) => {
      const el = document.createElement('div');
      el.className = 'route-marker';
      el.innerHTML = `
        <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white font-bold text-sm">
          ${index + 1}
        </div>
      `;

      if (!point.lat || !point.lng) return;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Draw route line if we have multiple points
    if (routePoints.length >= 2) {
      const sourceId = 'route-line';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePoints.map(p => [p.lng, p.lat])
          }
        });
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routePoints.map(p => [p.lng, p.lat])
            }
          }
        });

        map.current.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#d97706',
            'line-width': 4,
            'line-dasharray': [2, 1]
          }
        });
      }
    }
  }, [clients, routePoints, isMapLoaded]);

  // Draw zone polygons
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Draw temporary zone polygon being created
    const tempZoneId = 'temp-zone';
    if (zonePoints.length >= 2) {
      const coordinates = [...zonePoints.map(p => [p.lng, p.lat])];
      // Close the polygon for display
      if (zonePoints.length >= 3) {
        coordinates.push(coordinates[0]);
      }

      const geometry = zonePoints.length >= 3
        ? { type: 'Polygon' as const, coordinates: [coordinates] }
        : { type: 'LineString' as const, coordinates: coordinates };

      if (map.current.getSource(tempZoneId)) {
        (map.current.getSource(tempZoneId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry
        });
      } else {
        map.current.addSource(tempZoneId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry
          }
        });

        map.current.addLayer({
          id: 'temp-zone-fill',
          type: 'fill',
          source: tempZoneId,
          paint: {
            'fill-color': zoneColor,
            'fill-opacity': 0.3
          }
        });

        map.current.addLayer({
          id: 'temp-zone-line',
          type: 'line',
          source: tempZoneId,
          paint: {
            'line-color': zoneColor,
            'line-width': 2
          }
        });
      }
    } else {
      // Remove temp zone if no points
      if (map.current.getLayer('temp-zone-fill')) {
        map.current.removeLayer('temp-zone-fill');
      }
      if (map.current.getLayer('temp-zone-line')) {
        map.current.removeLayer('temp-zone-line');
      }
      if (map.current.getSource(tempZoneId)) {
        map.current.removeSource(tempZoneId);
      }
    }

    // Draw saved zones
    zones.forEach(zone => {
      if (!zone.points || zone.points.length < 3) return;

      const sourceId = `zone-${zone.id}`;
      const coordinates = [...zone.points.map(p => [p.lng, p.lat]), [zone.points[0].lng, zone.points[0].lat]];

      if (!map.current!.getSource(sourceId)) {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          }
        });

        map.current!.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': zone.color,
            'fill-opacity': 0.25
          }
        });

        map.current!.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': zone.color,
            'line-width': 2
          }
        });
      }
    });
  }, [zonePoints, zones, zoneColor, isMapLoaded]);

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    const currentMode = modeRef.current;
    if (currentMode === 'create-route') {
      const newPoint: MapPoint = {
        id: `rp-${Date.now()}`,
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        type: 'route-point'
      };
      setRoutePoints(prev => {
        toast.success(`Punto ${prev.length + 1} agregado a la ruta`);
        return [...prev, newPoint];
      });
    } else if (currentMode === 'create-client') {
      setPendingClientLocation({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      setShowClientDialog(true);
    } else if (currentMode === 'create-zone') {
      setZonePoints(prev => {
        toast.success(`Vértice ${prev.length + 1} agregado a la zona`);
        return [...prev, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      });
    }
  };

  const handleSaveClient = async () => {
    if (!pendingClientLocation || !selectedClienteId) {
      toast.error('Selecciona un cliente');
      return;
    }

    try {
      await mapaInteractivoService.saveClienteUbicacion({
        cliente_id: selectedClienteId,
        latitud: pendingClientLocation.lat,
        longitud: pendingClientLocation.lng
      });

      toast.success('Ubicación guardada');

      // Refrescar clientes en mapa
      loadClientesMapa();

      setShowClientDialog(false);
      setPendingClientLocation(null);
      setSelectedClienteId('');
      setMode('view');

    } catch (error) {
      console.log("ERROR COMPLETO: ", error);
      console.log("ERROR RESPONSE: ", error.response);
      console.log("ERROR MESSAGE: ", error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      toast.error('Error al guardar ubicación: ' + errorMessage);
    }
  };

  const loadClientesMapa = async () => {
    try {
      const res = await mapaInteractivoService.getClientesMapa();

      const data = res.data || res;
      const mapped = data.map((c: any) => {
        const lat = parseFloat(c.latitud);
        const lng = parseFloat(c.longitud);

        // 🔥 VALIDACIÓN CLAVE
        if (isNaN(lat) || isNaN(lng)) return null;

        return {
          id: c.id,
          lng,
          lat,
          type: 'client',
          name: c.razon_social
        };
      }).filter(Boolean);

      setClients(mapped);
    } catch (error) {
      toast.error('Error cargando clientes en mapa');
    }
  };

  const loadRutasMapa = async () => {
    try {
      const res = await mapaInteractivoService.getRutasMapa();

      const data = res.data || res;
      const mapped = data.map((r: any) => {
        return {
          id: r.id,
          nombre: r.nombre,
          zona: r.zona,
          points: (r.puntos || []).map((p: any) => ({
            id: p.id,
            lng: parseFloat(p.longitud),
            lat: parseFloat(p.latitud),
            type: 'route-point'
          })).filter((p: any) => !isNaN(p.lat) && !isNaN(p.lng))
        };
      }).filter(Boolean);

      setSavedRoutes(mapped);
    } catch (error) {
      toast.error('Error cargando rutas');
    }
  };

  const loadZonas = async () => {
    try {
      const res = await mapaInteractivoService.getZonas();

      const data = res.data || res;
      const mapped = data.map((z: any) => {
        return {
          id: z.id,
          name: z.nombre,
          color: z.color || '#d97706',
          points: (z.puntos || []).map((p: any) => ({
            lng: parseFloat(p.longitud),
            lat: parseFloat(p.latitud)
          })).filter((p: any) => !isNaN(p.lat) && !isNaN(p.lng))
        };
      }).filter(Boolean);

      setZones(mapped);
    } catch (error) {
      toast.error('Error cargando zonas');
    }
  };

  const handleSaveRoute = async () => {
    if (routePoints.length < 2) {
      toast.error('La ruta debe tener al menos 2 puntos');
      return;
    }
    if (!routeName) {
      toast.error('Por favor ingresa un nombre para la ruta');
      return;
    }

    try {
      await mapaInteractivoService.saveRuta({
        ruta_id: selectedRutaId,
        nombre: routeName || 'N/A',
        zona: routeZone || 'N/A',
        puntos: routePoints.map((p, index) => ({
          orden: index + 1,
          latitud: p.lat,
          longitud: p.lng
        }))
      });

      toast.success('Ruta guardada');

      setRoutePoints([]);
      setSelectedRutaId('');
      setMode('view');

      loadRutasMapa();

    } catch (error) {
      console.log("ERROR COMPLETO: ", error);
      console.log("ERROR RESPONSE: ", error.response);
      console.log("ERROR MESSAGE: ", error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      toast.error('Error al guardar ruta: ' + errorMessage);
    }

    // Clear the route line from map
    if (map.current?.getLayer('route-line-layer')) {
      map.current.removeLayer('route-line-layer');
      map.current.removeSource('route-line');
    }
  };

  const clearRoute = () => {
    setRoutePoints([]);
    if (map.current?.getLayer('route-line-layer')) {
      map.current.removeLayer('route-line-layer');
      map.current.removeSource('route-line');
    }
    toast.info('Ruta limpiada');
  };

  const handleSaveZone = async () => {
    if (zonePoints.length < 3) {
      toast.error('La zona debe tener al menos 3 vértices');
      return;
    }
    if (!zoneName.trim()) {
      toast.error('Por favor ingresa o selecciona un nombre para la zona');
      return;
    }

    try {
      const payload: any = {
        nombre: zoneName.trim(),
        color: zoneColor,
        puntos: zonePoints.map((p, index) => ({
          latitud: p.lat,
          longitud: p.lng,
          orden: index + 1
        }))
      };

      if (selectedZoneIdForSave && selectedZoneIdForSave !== 'new') {
        payload.zona_id = selectedZoneIdForSave;
      }

      await mapaInteractivoService.saveZona(payload);

      toast.success(selectedZoneIdForSave !== 'new' ? 'Puntos asignados a la zona exitosamente' : 'Zona guardada exitosamente');

      clearZone();
      setZoneName('');
      setSelectedZoneIdForSave('new');
      setMode('view');

      loadZonas();

    } catch (error: any) {
      console.log("ERROR COMPLETO: ", error);
      console.log("ERROR RESPONSE: ", error?.response);
      console.log("ERROR MESSAGE: ", error?.message);
      const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido';
      toast.error('Error al guardar zona: ' + errorMessage);
    }
  };

  const clearZone = () => {
    setZonePoints([]);
    if (map.current?.getLayer('temp-zone-fill')) {
      map.current.removeLayer('temp-zone-fill');
    }
    if (map.current?.getLayer('temp-zone-line')) {
      map.current.removeLayer('temp-zone-line');
    }
    if (map.current?.getSource('temp-zone')) {
      map.current.removeSource('temp-zone');
    }
    toast.info('Zona limpiada');
  };

  const handleSelectRouteForEdit = (routeId: string) => {
    const route = savedRoutes.find(r => r.id === routeId);
    if (route) {
      setSelectedRouteId(routeId);
      setEditRouteName(route.nombre);
      setEditRouteZone(route.zona);
      setShowEditRouteDialog(true);
    }
  };

  const handleSelectZoneForEdit = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setSelectedZoneId(zoneId);
      setEditZoneName(zone.name);
      setEditZoneColor(zone.color);
      setShowEditZoneDialog(true);
    }
  };

  const handleUpdateRoute = async () => {
    if (!selectedRouteId || !editRouteName) {
      toast.error('Por favor ingresa un nombre para la ruta');
      return;
    }

    try {
      const route = savedRoutes.find(r => r.id === selectedRouteId);
      
      await mapaInteractivoService.saveRuta({
        ruta_id: selectedRouteId,
        nombre: editRouteName,
        zona: editRouteZone,
        puntos: route?.points?.map((p, index) => ({
          orden: index + 1,
          latitud: p.lat,
          longitud: p.lng
        })) || []
      });

      // Update savedRoutes local state
      setSavedRoutes(prev => prev.map(r =>
        r.id === selectedRouteId
          ? { ...r, nombre: editRouteName, zona: editRouteZone }
          : r
      ));

      // Update parent routes
      const updatedRoutes = routes.map(r =>
        r.id === selectedRouteId
          ? { ...r, nombre: editRouteName, zona: editRouteZone }
          : r
      );
      onRoutesChange(updatedRoutes);

      toast.success(`Ruta "${editRouteName}" actualizada`);
      setShowEditRouteDialog(false);
      setSelectedRouteId(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido';
      toast.error('Error al actualizar ruta: ' + errorMessage);
    }
  };

  const handleDeleteRoute = () => {
    if (!selectedRouteId) return;
    const route = savedRoutes.find(r => r.id === selectedRouteId);

    // Update local state
    setSavedRoutes(prev => prev.filter(r => r.id !== selectedRouteId));

    // Update parent routes
    const updatedRoutes = routes.filter(r => r.id !== selectedRouteId);
    onRoutesChange(updatedRoutes);

    toast.success(`Ruta "${route?.nombre}" eliminada`);
    setShowEditRouteDialog(false);
    setSelectedRouteId(null);
  };

  const handleUpdateZone = () => {
    if (!selectedZoneId || !editZoneName) {
      toast.error('Por favor ingresa un nombre para la zona');
      return;
    }

    // Update zone in state
    setZones(prev => prev.map(z =>
      z.id === selectedZoneId
        ? { ...z, name: editZoneName, color: editZoneColor }
        : z
    ));

    // Update zone on map
    if (map.current) {
      const sourceId = `zone-${selectedZoneId}`;
      if (map.current.getLayer(`${sourceId}-fill`)) {
        map.current.setPaintProperty(`${sourceId}-fill`, 'fill-color', editZoneColor);
      }
      if (map.current.getLayer(`${sourceId}-line`)) {
        map.current.setPaintProperty(`${sourceId}-line`, 'line-color', editZoneColor);
      }
    }

    toast.success(`Zona "${editZoneName}" actualizada`);
    setShowEditZoneDialog(false);
    setSelectedZoneId(null);
  };

  const handleDeleteZone = () => {
    if (!selectedZoneId) return;
    const zone = zones.find(z => z.id === selectedZoneId);

    // Remove from map
    if (map.current) {
      const sourceId = `zone-${selectedZoneId}`;
      if (map.current.getLayer(`${sourceId}-fill`)) {
        map.current.removeLayer(`${sourceId}-fill`);
      }
      if (map.current.getLayer(`${sourceId}-line`)) {
        map.current.removeLayer(`${sourceId}-line`);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    }

    setZones(prev => prev.filter(z => z.id !== selectedZoneId));
    toast.success(`Zona "${zone?.name}" eliminada`);
    setShowEditZoneDialog(false);
    setSelectedZoneId(null);
  };

  if (loadingToken) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-muted-foreground">Cargando configuración del mapa...</p>
      </div>
    );
  }

  if (!isTokenSet) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-card rounded-xl border p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-display font-semibold mb-2">Configurar Mapbox</h3>
            <p className="text-muted-foreground text-sm">
              Para usar el mapa interactivo, necesitas un token de Mapbox.
              Puedes obtenerlo gratis en{' '}
              <a
                href="https://mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="pk.eyJ1Ijoi..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={saveToken} className="w-full" variant="gradient">
              <Key className="h-4 w-4 mr-2" />
              Guardar Token
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Modo:</span>
          <Badge
            variant={mode === 'view' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'view' && 'bg-primary'
            )}
            onClick={() => setMode('view')}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Ver
          </Badge>
          <Badge
            variant={mode === 'create-route' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'create-route' && 'bg-amber-500'
            )}
            onClick={() => setMode('create-route')}
          >
            <Route className="h-3 w-3 mr-1" />
            Crear Ruta
          </Badge>
          <Badge
            variant={mode === 'create-client' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'create-client' && 'bg-success'
            )}
            onClick={() => setMode('create-client')}
          >
            <Store className="h-3 w-3 mr-1" />
            Crear Cliente
          </Badge>
          <Badge
            variant={mode === 'create-zone' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'create-zone' && 'bg-purple-500'
            )}
            onClick={() => setMode('create-zone')}
          >
            <Pentagon className="h-3 w-3 mr-1" />
            Crear Zona
          </Badge>
          <Badge
            variant={mode === 'edit-routes' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'edit-routes' && 'bg-blue-500'
            )}
            onClick={() => setMode('edit-routes')}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar Rutas
          </Badge>
          <Badge
            variant={mode === 'edit-zones' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              mode === 'edit-zones' && 'bg-pink-500'
            )}
            onClick={() => setMode('edit-zones')}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar Zonas
          </Badge>
        </div>

        <div className="flex-1" />

        {mode === 'create-route' && routePoints.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {routePoints.length} punto(s)
            </span>
            <Button variant="outline" size="sm" onClick={clearRoute}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => setShowRouteDialog(true)}
              disabled={routePoints.length < 2}
            >
              <Save className="h-4 w-4 mr-1" />
              Guardar Ruta
            </Button>
          </div>
        )}

        {mode === 'create-zone' && zonePoints.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {zonePoints.length} vértice(s)
            </span>
            <Button variant="outline" size="sm" onClick={clearZone}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => setShowZoneDialog(true)}
              disabled={zonePoints.length < 3}
            >
              <Save className="h-4 w-4 mr-1" />
              Guardar Zona
            </Button>
          </div>
        )}

        {mode === 'create-client' && (
          <p className="text-sm text-muted-foreground">
            Haz clic en el mapa para ubicar el nuevo cliente
          </p>
        )}

        {mode === 'create-zone' && zonePoints.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Haz clic en el mapa para dibujar los vértices de la zona (mínimo 3)
          </p>
        )}

        {mode === 'edit-routes' && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Selecciona una ruta para editar:
            </p>
            {savedRoutes.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {savedRoutes.map(route => (
                  <Badge
                    key={route.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-500/20"
                    onClick={() => handleSelectRouteForEdit(route.id)}
                  >
                    <Route className="h-3 w-3 mr-1" />
                    {route.nombre}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">No hay rutas guardadas</span>
            )}
          </div>
        )}

        {mode === 'edit-zones' && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Selecciona una zona para editar:
            </p>
            {zones.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {zones.map(zone => (
                  <Badge
                    key={zone.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-pink-500/20"
                    style={{ borderColor: zone.color }}
                    onClick={() => handleSelectZoneForEdit(zone.id)}
                  >
                    <Pentagon className="h-3 w-3 mr-1" style={{ color: zone.color }} />
                    {zone.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">No hay zonas guardadas</span>
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[600px] rounded-xl overflow-hidden border shadow-card">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '600px' }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
          <p className="text-xs font-medium mb-2">Leyenda</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full" />
              <span className="text-xs">Clientes/Tiendas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center text-white text-[8px] font-bold">1</div>
              <span className="text-xs">Puntos de ruta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-amber-500 border-dashed border-t-2 border-amber-500" />
              <span className="text-xs">Trayecto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500/30 border border-purple-500 rounded-sm" />
              <span className="text-xs">Zonas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Route Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Guardar Nueva Ruta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleccionar Ruta *</Label>
              <Select
                value={selectedRutaId}
                onValueChange={setSelectedRutaId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una ruta" />
                </SelectTrigger>
                <SelectContent>
                  {rutasList.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="route-name">Nombre de la Ruta en Mapa</Label>
              <Input
                id="route-name"
                placeholder="Ej: Ruta 1"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="route-zone">Zona</Label>
              <Select value={routeZone} onValueChange={setRouteZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.name}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta ruta tiene <strong>{routePoints.length} puntos</strong> definidos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleSaveRoute}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-success" />
              Nuevo Cliente / Tienda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleccionar Cliente *</Label>
              <Select
                value={selectedClienteId}
                onValueChange={(value) => setSelectedClienteId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientesList.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pendingClientLocation && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Ubicación: {pendingClientLocation.lat.toFixed(6)}, {pendingClientLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowClientDialog(false);
              setPendingClientLocation(null);
            }}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleSaveClient}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pentagon className="h-5 w-5 text-purple-500" />
              Guardar / Asignar Puntos a Zona
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asignar a Zona</Label>
              <Select
                value={selectedZoneIdForSave}
                onValueChange={(val) => {
                  setSelectedZoneIdForSave(val);
                  if (val !== 'new') {
                    const found = zones.find(z => String(z.id) === val);
                    if (found) {
                      setZoneName(found.name);
                      setZoneColor(found.color);
                    }
                  } else {
                    setZoneName('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Crear nueva o seleccionar existente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Crear Nueva Zona</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>
                      {z.name} {(!z.points || z.points.length < 3) ? '(Sin puntos en mapa)' : `(${z.points.length} puntos)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nombre de la Zona *</Label>
              <Input
                id="zone-name"
                placeholder="Ej: Zona Norte Industrial"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color de la Zona</Label>
              <div className="flex gap-2 flex-wrap">
                {zoneColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      zoneColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setZoneColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta zona tiene <strong>{zonePoints.length} vértices</strong> definidos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleSaveZone}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={showEditRouteDialog} onOpenChange={setShowEditRouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              Editar Ruta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-route-name">Nombre de la Ruta</Label>
              <Input
                id="edit-route-name"
                placeholder="Ej: Ruta Norte - Mañana"
                value={editRouteName}
                onChange={(e) => setEditRouteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-route-zone">Zona</Label>
              <Select value={editRouteZone} onValueChange={setEditRouteZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.name}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteRoute}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditRouteDialog(false)}>
                Cancelar
              </Button>
              <Button variant="gradient" onClick={handleUpdateRoute}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog */}
      <Dialog open={showEditZoneDialog} onOpenChange={setShowEditZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-pink-500" />
              Editar Zona
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-zone-name">Nombre de la Zona</Label>
              <Input
                id="edit-zone-name"
                placeholder="Ej: Zona Norte Industrial"
                value={editZoneName}
                onChange={(e) => setEditZoneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color de la Zona</Label>
              <div className="flex gap-2 flex-wrap">
                {zoneColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      editZoneColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEditZoneColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteZone}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditZoneDialog(false)}>
                Cancelar
              </Button>
              <Button variant="gradient" onClick={handleUpdateZone}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteMap;
