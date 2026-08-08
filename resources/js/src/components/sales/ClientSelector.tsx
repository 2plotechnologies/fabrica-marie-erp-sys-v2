/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { User, Search, MapPin, Route, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { salidaService } from '@/services/salidaService';

interface ClientSelectorProps {
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  lista_clientes: any[];
  rutas?: any[];
}

export const ClientSelector = ({
  selectedClient,
  onClientChange,
  lista_clientes,
  rutas: rutasProp,
}: ClientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('');
  const [selectedRuta, setSelectedRuta] = useState<string>('');
  const [rutasState, setRutasState] = useState<any[]>(rutasProp || []);

  const clientes = lista_clientes;

  useEffect(() => {
    if (rutasProp && rutasProp.length > 0) {
      setRutasState(rutasProp);
    } else {
      salidaService.getRutas().then((data) => {
        if (Array.isArray(data)) setRutasState(data);
      }).catch((err) => console.log('Error al cargar rutas en ClientSelector:', err));
    }
  }, [rutasProp]);

  // Zonas únicas extraídas de las rutas y de la lista de clientes
  const zonas = useMemo(() => {
    const zoneSet = new Set<string>();
    rutasState.forEach((r: any) => {
      if (r.zona && typeof r.zona === 'string' && r.zona.trim() !== '') {
        zoneSet.add(r.zona.trim());
      }
    });
    clientes.forEach((c: any) => {
      if (c.ruta?.zona && typeof c.ruta.zona === 'string' && c.ruta.zona.trim() !== '') {
        zoneSet.add(c.ruta.zona.trim());
      }
    });
    return Array.from(zoneSet).sort();
  }, [rutasState, clientes]);

  // Rutas filtradas según la zona seleccionada
  const filteredRutas = useMemo(() => {
    if (!selectedZona) return rutasState;
    return rutasState.filter((r: any) => r.zona === selectedZona);
  }, [rutasState, selectedZona]);

  // Cambio de Zona
  const handleZonaChange = (newZona: string) => {
    setSelectedZona(newZona);
    if (selectedRuta) {
      const isRutaInNewZona = rutasState.some(
        (r: any) => String(r.id) === String(selectedRuta) && (!newZona || r.zona === newZona)
      );
      if (!isRutaInNewZona) {
        setSelectedRuta('');
      }
    }
  };

  // Clientes filtrados por Zona, Ruta y término de búsqueda
  const filteredClientes = useMemo(() => {
    return clientes.filter((c: any) => {
      // 1. Filtro por Zona
      if (selectedZona) {
        const cZona =
          c.ruta?.zona ||
          rutasState.find(
            (r: any) =>
              r.id === c.ruta_id ||
              r.clientes?.some((rc: any) => String(rc.id) === String(c.id))
          )?.zona;
        if (cZona !== selectedZona) return false;
      }

      // 2. Filtro por Ruta
      if (selectedRuta) {
        const targetRutaId = Number(selectedRuta);
        const isClientInRuta =
          Number(c.ruta_id) === targetRutaId ||
          Number(c.ruta?.id) === targetRutaId ||
          c.rutas?.some((r: any) => Number(r.id) === targetRutaId) ||
          rutasState
            .find((r: any) => Number(r.id) === targetRutaId)
            ?.clientes?.some((rc: any) => String(rc.id) === String(c.id));

        if (!isClientInRuta) return false;
      }

      // 3. Filtro por término de búsqueda (nombre, código, documento)
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchSearch =
          c.razon_social?.toLowerCase().includes(lowerTerm) ||
          c.codigo?.toLowerCase().includes(lowerTerm) ||
          c.codigo_cliente?.toLowerCase().includes(lowerTerm) ||
          c.documento?.toLowerCase().includes(lowerTerm);

        if (!matchSearch) return false;
      }

      return true;
    }).slice(0, 50);
  }, [clientes, selectedZona, selectedRuta, searchTerm, rutasState]);

  const selectedClientData = clientes.find((c: any) => String(c.id) === String(selectedClient));

  return (
    <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Cliente</h3>
        </div>

        {/* Resumen rápido de filtros aplicados si los hay */}
        {(selectedZona || selectedRuta) && (
          <div className="flex items-center gap-1.5 text-xs">
            {selectedZona && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 text-[11px]">
                <MapPin className="h-3 w-3" />
                {selectedZona}
              </Badge>
            )}
            {selectedRuta && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 text-[11px]">
                <Route className="h-3 w-3" />
                {rutasState.find(r => String(r.id) === String(selectedRuta))?.nombre || `Ruta #${selectedRuta}`}
              </Badge>
            )}
            <button
              onClick={() => { setSelectedZona(''); setSelectedRuta(''); }}
              className="text-muted-foreground hover:text-foreground text-[11px] underline ml-1"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      <Select value={selectedClient} onValueChange={onClientChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar cliente..." />
        </SelectTrigger>
        <SelectContent>
          <div
            className="p-2 sticky top-0 bg-popover z-10 border-b space-y-2"
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              {/* Buscador */}
              <div className="sm:col-span-5 flex items-center gap-2 px-2 py-1.5 border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className="w-full bg-transparent border-none focus:outline-none text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Selector de Zona */}
              <div className="sm:col-span-3">
                <select
                  value={selectedZona}
                  onChange={(e) => handleZonaChange(e.target.value)}
                  className="w-full h-full min-h-[32px] text-xs border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Todas las zonas</option>
                  {zonas.map((z) => (
                    <option key={z} value={z}>📍 {z}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Ruta */}
              <div className="sm:col-span-4">
                <select
                  value={selectedRuta}
                  onChange={(e) => setSelectedRuta(e.target.value)}
                  className="w-full h-full min-h-[32px] text-xs border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Todas las rutas {selectedZona ? `(${filteredRutas.length})` : ''}</option>
                  {filteredRutas.map((r: any) => (
                    <option key={r.id} value={String(r.id)}>
                      🚚 {r.nombre} {r.zona && !selectedZona ? `(${r.zona})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subcabecera informativa / Limpiar */}
            {(selectedZona || selectedRuta || searchTerm) && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 px-0.5">
                <span>
                  Mostrando {filteredClientes.length} resultados
                  {selectedRuta ? ' de la ruta seleccionada' : selectedZona ? ' de la zona seleccionada' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZona('');
                    setSelectedRuta('');
                    setSearchTerm('');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {filteredClientes.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground space-y-1">
              <p>No se encontraron clientes.</p>
              {(selectedZona || selectedRuta) && (
                <p className="text-xs text-muted-foreground">
                  Prueba cambiando la zona o ruta seleccionada.
                </p>
              )}
            </div>
          ) : (
            filteredClientes.map((client: any) => (
              <SelectItem key={client.id} value={String(client.id)}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{client.razon_social}</span>
                  <div className="flex items-center shrink-0 space-x-2">
                    {client.ruta?.nombre && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {client.ruta.nombre}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{client.codigo || client.codigo_cliente}</span>
                    {client.estado === 'moroso' && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1 leading-none">Moroso</Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
          {clientes.length > 50 && !searchTerm && !selectedZona && !selectedRuta && (
            <div className="py-2 text-center text-xs text-muted-foreground border-t mt-1">
              Mostrando 50 de {clientes.length}. Use el buscador o los filtros para encontrar más.
            </div>
          )}
        </SelectContent>
      </Select>

      {selectedClientData && (
        <div className="mt-3 p-3 rounded-lg bg-secondary/50 space-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Código:</span>
            <span className="font-medium truncate ml-2">{selectedClientData.codigo_cliente || selectedClientData.codigo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Zona / Ruta:</span>
            <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">
              {selectedClientData.ruta?.zona ? `${selectedClientData.ruta.zona} / ` : ''}
              {selectedClientData.ruta?.nombre || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Dirección:</span>
            <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">{selectedClientData.direccion || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Teléfono:</span>
            <span className="font-medium truncate ml-2">{selectedClientData.telefono || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Deuda actual:</span>
            <span className="font-medium ml-2">S/ {Number(selectedClientData.deuda_actual || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Límite de crédito:</span>
            <span className="font-medium ml-2">S/ {Number(selectedClientData.limite_credito || 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

