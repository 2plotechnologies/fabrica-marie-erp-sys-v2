import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pentagon,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/axios-error';
import { zonaService, ZonaData } from '@/services/zonaService';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/RoleContext';

const PRESET_COLORS = [
  { name: 'Ámbar', value: '#d97706' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Morado', value: '#9333ea' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Cian', value: '#0891b2' },
  { name: 'Gris Oscuro', value: '#4b5563' },
];

export const ZonesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const isVendedor = currentRole === 'VENDEDOR';

  const [zonas, setZonas] = useState<ZonaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Estados de formularios
  const [newNombre, setNewNombre] = useState('');
  const [newColor, setNewColor] = useState('#d97706');

  const [selectedZona, setSelectedZona] = useState<ZonaData | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editColor, setEditColor] = useState('#d97706');

  const fetchZonas = async () => {
    setIsLoading(true);
    try {
      const data = await zonaService.getAll();
      setZonas(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudieron cargar las zonas.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZonas();
  }, []);

  const filteredZonas = useMemo(() => {
    if (!searchQuery.trim()) return zonas;
    return zonas.filter((z) =>
      z.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [zonas, searchQuery]);

  const stats = useMemo(() => {
    const total = zonas.length;
    const conPuntos = zonas.filter((z) => z.puntos && z.puntos.length >= 3).length;
    const sinPuntos = total - conPuntos;
    return { total, conPuntos, sinPuntos };
  }, [zonas]);

  const handleCreateZona = async () => {
    if (!newNombre.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor ingresa el nombre de la zona.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await zonaService.create({
        nombre: newNombre.trim(),
        color: newColor,
      });

      toast({
        title: 'Zona creada',
        description: `La zona "${newNombre.trim()}" fue creada exitosamente.`,
      });

      setNewNombre('');
      setNewColor('#d97706');
      setShowNewDialog(false);
      fetchZonas();
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo crear la zona.'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenEdit = (zona: ZonaData) => {
    setSelectedZona(zona);
    setEditNombre(zona.nombre);
    setEditColor(zona.color || '#d97706');
    setShowEditDialog(true);
  };

  const handleUpdateZona = async () => {
    if (!selectedZona?.id || !editNombre.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor ingresa el nombre de la zona.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await zonaService.update(selectedZona.id, {
        nombre: editNombre.trim(),
        color: editColor,
      });

      toast({
        title: 'Zona actualizada',
        description: 'Los cambios fueron guardados exitosamente.',
      });

      setShowEditDialog(false);
      setSelectedZona(null);
      fetchZonas();
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo actualizar la zona.'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenDelete = (zona: ZonaData) => {
    setSelectedZona(zona);
    setShowDeleteDialog(true);
  };

  const handleDeleteZona = async () => {
    if (!selectedZona?.id) return;

    try {
      await zonaService.delete(selectedZona.id);
      toast({
        title: 'Zona eliminada',
        description: `La zona "${selectedZona.nombre}" fue eliminada.`,
      });

      setShowDeleteDialog(false);
      setSelectedZona(null);
      fetchZonas();
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo eliminar la zona.'),
        variant: 'destructive',
      });
    }
  };

  const handleGoToMap = (zonaId?: number | string) => {
    if (zonaId) {
      navigate(`/mapa-interactivo?zoneId=${zonaId}`);
    } else {
      navigate('/mapa-interactivo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Gestión de Zonas</h1>
          <p className="text-muted-foreground mt-1">
            Crea y administra las zonas comerciales de distribución
          </p>
        </div>
        {!isVendedor && (
          <Button variant="gradient" className="gap-2" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" />
            Nueva Zona
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
        <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Pentagon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Zonas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Con Delimitación Mapa</p>
            <p className="text-2xl font-bold">{stats.conPuntos}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendientes de Trazado</p>
            <p className="text-2xl font-bold">{stats.sinPuntos}</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar zona por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid de Zonas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredZonas.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center space-y-3">
          <Pentagon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="font-semibold text-lg">No se encontraron zonas</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Prueba con otra búsqueda o ' : 'Crea tu primera zona comercial.'}
          </p>
          {!isVendedor && (
            <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Crear Zona
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZonas.map((zona) => {
            const hasPoints = zona.puntos && zona.puntos.length >= 3;
            const pointsCount = zona.puntos?.length || 0;

            return (
              <div
                key={zona.id}
                className="bg-card rounded-xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-sm"
                        style={{ backgroundColor: zona.color || '#d97706' }}
                      >
                        <Pentagon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-base">{zona.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="inline-block w-3 h-3 rounded-full border"
                            style={{ backgroundColor: zona.color || '#d97706' }}
                          />
                          <span className="text-xs text-muted-foreground font-mono">
                            {zona.color || '#d97706'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGoToMap(zona.id)}>
                          <MapPin className="h-4 w-4 mr-2 text-primary" />
                          {hasPoints ? 'Ver / Editar en Mapa' : 'Asignar Puntos en Mapa'}
                        </DropdownMenuItem>
                        {!isVendedor && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenEdit(zona)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar nombre/color
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(zona)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Eliminar zona
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Estado Geográfico:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          hasPoints
                            ? 'border-success/30 text-success bg-success/10'
                            : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                        )}
                      >
                        {hasPoints ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {pointsCount} Vértices Trazados
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Sin Puntos
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => handleGoToMap(zona.id)}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {hasPoints ? 'Ver Polígono en Mapa' : 'Asignar Puntos en Mapa'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Crear Zona */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pentagon className="h-5 w-5 text-primary" />
              Nueva Zona Comercial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-zone-name">Nombre de la Zona *</Label>
              <Input
                id="new-zone-name"
                placeholder="Ej: Huancayo Centro"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color Distintivo *</Label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                      newColor === c.value
                        ? "border-foreground scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setNewColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border p-0 bg-transparent"
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="font-mono text-xs max-w-[120px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleCreateZona}>
              Guardar Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Zona */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Zona
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-zone-name">Nombre de la Zona *</Label>
              <Input
                id="edit-zone-name"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color Distintivo *</Label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                      editColor === c.value
                        ? "border-foreground scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setEditColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border p-0 bg-transparent"
                />
                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="font-mono text-xs max-w-[120px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleUpdateZona}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Zona */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Zona</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Estás seguro de que deseas eliminar la zona{' '}
            <strong>"{selectedZona?.nombre}"</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteZona}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZonesList;
