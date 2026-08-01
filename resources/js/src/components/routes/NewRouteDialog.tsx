/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { rutaService } from '@/services/rutaService';
import { mapaInteractivoService } from '@/services/mapaInteractivoService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Plus, Route } from 'lucide-react';
import { toast } from 'sonner';
import { mockUsers } from '@/data/mockData';
import { getErrorMessage } from '@/lib/axios-error';

interface NewRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRouteCreated?: (route: any) => void;
  vendedores: any[];
}

const NewRouteDialog = ({ open, onOpenChange, onRouteCreated, vendedores }: NewRouteDialogProps) => {
  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    descripcion: '',
    vendedor_id: '',
    clientes_estimados: '',
    frecuencia: 'diaria',
  });

  const [dbZones, setDbZones] = useState<any[]>([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await mapaInteractivoService.getZonas();
        setDbZones(res);
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };
    if (open) {
      fetchZones();
    }
  }, [open]);

  const frequencies = [
    { id: 'diaria', label: 'Diaria' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'quincenal', label: 'Quincenal' },
    { id: 'mensual', label: 'Mensual' },
  ];

  const sellers = vendedores;

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.zona) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      const response = await rutaService.create({
        nombre: formData.nombre,
        zona: formData.zona,
        descripcion: formData.descripcion,
        vendedor_id:
          formData.vendedor_id === 'none'
            ? null
            : Number(formData.vendedor_id),
        clientes_estimados: parseInt(formData.clientes_estimados) || 0,
        frecuencia: formData.frecuencia,
      });

      onRouteCreated?.(response);

      toast.success(`Ruta "${formData.nombre}" creada exitosamente`);

      setFormData({
        nombre: '',
        zona: '',
        descripcion: '',
        vendedor_id: '',
        clientes_estimados: '',
        frecuencia: 'diaria',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.log(error);
      toast.error(getErrorMessage(error, 'Error al crear la ruta'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Nueva Ruta de Venta
          </DialogTitle>
          <DialogDescription>
            Crea una nueva ruta y asígnala a un vendedor para comenzar a gestionar clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Nombre de la Ruta *</Label>
              <Input
                id="routeName"
                placeholder="Ej: Ruta Miraflores"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zona *</Label>
              <Select
                value={formData.zona}
                onValueChange={(value) => setFormData(prev => ({ ...prev, zona: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona zona" />
                </SelectTrigger>
                <SelectContent>
                  {dbZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.nombre}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color || '#3b82f6' }}
                        />
                        {zone.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe los límites o características de la ruta..."
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seller">Vendedor Asignado</Label>
              <Select
                value={formData.vendedor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendedor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.usuario?.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia de Visita</Label>
              <Select
                value={formData.frecuencia}
                onValueChange={(value) => setFormData(prev => ({ ...prev, frecuencia: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.id} value={freq.id}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedClients">Clientes Estimados</Label>
            <Input
              id="estimatedClients"
              type="number"
              placeholder="0"
              value={formData.clientes_estimados}
              onChange={(e) => setFormData(prev => ({ ...prev, clientes_estimados: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Número aproximado de clientes que se espera cubrir en esta ruta
            </p>
          </div>

          {formData.zona && (
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (dbZones.find(z => z.nombre === formData.zona)?.color || '#3b82f6') + '20' }}
              >
                <MapPin
                  className="h-5 w-5"
                  style={{ color: dbZones.find(z => z.nombre === formData.zona)?.color || '#3b82f6' }}
                />
              </div>
              <div>
                <p className="font-medium">{formData.nombre || 'Nueva Ruta'}</p>
                <p className="text-sm text-muted-foreground">
                  {dbZones.find(z => z.nombre === formData.zona)?.nombre || formData.zona} • {frequencies.find(f => f.id === formData.frecuencia)?.label}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Ruta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewRouteDialog;
