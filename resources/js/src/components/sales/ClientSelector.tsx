/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from 'lucide-react';
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
  const clientes = lista_clientes;
  console.log(clientes);
  const selectedClientData = clientes.find(c => c.id === selectedClient);

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
            {clientes.map(client => (
              <SelectItem key={client.id} value={client.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{client.razon_social}</span>
                  {client.estado === 'moroso' && (
                    <Badge variant="destructive" className="ml-2 text-xs">Moroso</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      {selectedClientData && (
        <div className="mt-3 p-3 rounded-lg bg-secondary/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-medium">{selectedClientData.codigo}</span>
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
