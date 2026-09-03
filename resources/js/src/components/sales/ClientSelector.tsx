/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { User, Search, MapPin, Route, X, ChevronsUpDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { salidaService } from '@/services/salidaService';
import { formatDireccionCompleta } from '@/lib/ubigeo';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
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
          c.nombre_comercial?.toLowerCase().includes(lowerTerm) ||
          c.persona_juridica?.toLowerCase().includes(lowerTerm) ||
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10 px-3 text-left bg-background text-xs sm:text-sm border-input"
          >
            <span className="truncate">
              {selectedClientData ? selectedClientData.razon_social : "Seleccionar cliente..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-2.5rem)] sm:w-[520px] p-2 max-h-[85vh] flex flex-col gap-2 shadow-lg border"
          align="start"
        >
          {/* Barra de Búsqueda y Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-2 border-b">
            {/* Buscador */}
            <div className="sm:col-span-5 flex items-center gap-2 px-2.5 py-1.5 border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
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
                  <X className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                Mostrando {filteredClientes.length} resultados
                {selectedRuta ? ' de la ruta' : selectedZona ? ' de la zona' : ''}
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

          {/* Lista de clientes scrollable */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredClientes.length === 0 ? (
              <div className="py-6 text-center text-xs sm:text-sm text-muted-foreground space-y-1">
                <p>No se encontraron clientes.</p>
                {(selectedZona || selectedRuta) && (
                  <p className="text-[11px] text-muted-foreground">
                    Prueba cambiando la zona o ruta seleccionada.
                  </p>
                )}
              </div>
            ) : (
              filteredClientes.map((client: any) => {
                const isSelected = String(client.id) === String(selectedClient);
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onClientChange(String(client.id));
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2 transition-colors",
                      isSelected && "bg-accent/80 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <span className="truncate">{client.razon_social}</span>
                    </div>
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
                  </button>
                );
              })
            )}
            {clientes.length > 50 && !searchTerm && !selectedZona && !selectedRuta && (
              <div className="py-2 text-center text-xs text-muted-foreground border-t mt-1">
                Mostrando 50 de {clientes.length}. Use el buscador o los filtros para encontrar más.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedClientData && (
        <div className="mt-3 p-3 rounded-lg bg-secondary/50 space-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Código:</span>
            <span className="font-medium truncate ml-2">{selectedClientData.codigo_cliente || selectedClientData.codigo}</span>
          </div>
          {selectedClientData.nombre_comercial && String(selectedClientData.nombre_comercial).trim() !== '' && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground shrink-0">Nombre comercial:</span>
              <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">{selectedClientData.nombre_comercial}</span>
            </div>
          )}
          {selectedClientData.persona_juridica && String(selectedClientData.persona_juridica).trim() !== '' && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground shrink-0">Persona jurídica:</span>
              <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">{selectedClientData.persona_juridica}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Zona / Ruta:</span>
            <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">
              {selectedClientData.ruta?.zona ? `${selectedClientData.ruta.zona} / ` : ''}
              {selectedClientData.ruta?.nombre || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground shrink-0">Dirección:</span>
            <span className="font-medium text-right max-w-[160px] sm:max-w-[250px] truncate ml-2">{formatDireccionCompleta(selectedClientData) || selectedClientData.direccion || '-'}</span>
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
