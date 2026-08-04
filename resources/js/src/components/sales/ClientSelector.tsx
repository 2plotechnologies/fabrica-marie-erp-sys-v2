/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { User, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ClientSelectorProps {
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  lista_clientes: any[];
}

export const ClientSelector = ({ selectedClient, onClientChange, lista_clientes }: ClientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const clientes = lista_clientes;

  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes.slice(0, 50); // Muestra los primeros 50 para evitar lag inicialmente

    const lowerTerm = searchTerm.toLowerCase();
    return clientes.filter(c =>
      c.razon_social?.toLowerCase().includes(lowerTerm) ||
      c.codigo?.toLowerCase().includes(lowerTerm) ||
      c.documento?.toLowerCase().includes(lowerTerm)
    ).slice(0, 50); // Limitamos a 50 resultados inclusive en búsquedas
  }, [clientes, searchTerm]);

  const selectedClientData = clientes.find(c => String(c.id) === String(selectedClient));

  return (
    <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Cliente</h3>
      </div>

      <Select value={selectedClient} onValueChange={onClientChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar cliente..." />
        </SelectTrigger>
        <SelectContent>
          <div
            className="p-2 sticky top-0 bg-popover z-10 mb-1"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, código..."
                className="w-full bg-transparent border-none focus:outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredClientes.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </div>
          ) : (
            filteredClientes.map(client => (
              <SelectItem key={client.id} value={String(client.id)}>
                <div className="flex items-center justify-between w-full">
                  <span>{client.razon_social}</span>
                  <div className="flex items-center ml-2 space-x-2">
                    <span className="text-xs text-muted-foreground">{client.codigo}</span>
                    {client.estado === 'moroso' && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1 leading-none">Moroso</Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
          {clientes.length > 50 && !searchTerm && (
            <div className="py-2 text-center text-xs text-muted-foreground border-t mt-1">
              Mostrando 50 de {clientes.length}. Use el buscador para encontrar más.
            </div>
          )}
        </SelectContent>
      </Select>

      {selectedClientData && (
        <div className="mt-3 p-3 rounded-lg bg-secondary/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-medium">{selectedClientData.codigo_cliente}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Dirección:</span>
            <span className="font-medium text-right max-w-[200px] truncate">{selectedClientData.direccion || '-'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Teléfono:</span>
            <span className="font-medium">{selectedClientData.telefono || '-'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Deuda actual:</span>
            <span className="font-medium">S/ {Number(selectedClientData.deuda_actual || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Límite de crédito:</span>
            <span className="font-medium">S/ {Number(selectedClientData.limite_credito || 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
