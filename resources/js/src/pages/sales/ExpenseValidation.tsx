import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search, ShieldCheck, ShieldX, ShieldAlert, Loader2,
  FileCheck, Eye, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';
import { toast } from 'sonner';

const ExpenseValidation = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [observacionDialog, setObservacionDialog] = useState<{ gastoId: string; accion: string } | null>(null);
  const [observacion, setObservacion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [egresos, setEgresos] = useState<any[]>([]);
  //const [vendedores, setVendedores] = useState<any[]>([]);

  const getEgresos = async () => {
    try {
      setIsLoading(true);
      const response = await cajaService.getEgresos();
      console.log("RESPUESTA DEL SERVIDOR:", response);
      setEgresos(response);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al obtener egresos: " + error.response?.data.message || error?.message || "Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getEgresos();
  }, []);

  const filteredGastos = egresos.filter(g => {
    const matchesSearch = g.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    //const matchesVendedor = filterVendedor === 'all' || g.caja.usuario_id === filterVendedor;
    const matchesEstado = filterEstado === 'all' || g.estado === filterEstado;
    return matchesSearch /* matchesVendedor */ && matchesEstado;
  });

  const stats = {
    total: egresos.length,
    noVerificado: egresos.filter(g => g.estado === 'PENDIENTE').length,
    verificado: egresos.filter(g => g.estado === 'APROBADO').length,
    noAceptado: egresos.filter(g => g.estado === 'RECHAZADO').length,
  };

  const handleVerificar = async (gastoId: string, estado: 'APROBADO' | 'RECHAZADO', obs?: string) => {
    try {
      await cajaService.actualizarEstadoEgreso(gastoId, {
        estado: estado,
        motivo: obs
      });
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al actualizar egreso: " + error.response?.data.message || error?.message || "Error desconocido.");
      //Si el error es de tipo 403 forbideen mostrar toast que diga "Usted no tiene autorización para realizar esta acción"
      if (error.response?.status === 403) {
        toast.error("Usted no tiene autorización para realizar esta acción");
      }
    }
    setObservacionDialog(null);
    setObservacion('');
    getEgresos();
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'APROBADO':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><ShieldCheck className="h-3 w-3 mr-1" />Verificado</Badge>;
      case 'RECHAZADO':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><ShieldX className="h-3 w-3 mr-1" />No Aceptado</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><ShieldAlert className="h-3 w-3 mr-1" />No Verificado</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Validación de Egresos</h1>
        <p className="text-muted-foreground">Verifica y aprueba los gastos reportados por vendedores</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Egresos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-amber-200 dark:border-amber-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No Verificados</p>
            <p className="text-2xl font-bold text-amber-600">{stats.noVerificado}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-emerald-200 dark:border-emerald-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Verificados</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.verificado}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-red-200 dark:border-red-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No Aceptados</p>
            <p className="text-2xl font-bold text-red-600">{stats.noAceptado}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por descripción o usuario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            {/* 
            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            */}
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">No Verificado</SelectItem>
                <SelectItem value="APROBADO">Verificado</SelectItem>
                <SelectItem value="RECHAZADO">No Aceptado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Egresos por Validar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay egresos registrados</TableCell>
                </TableRow>
              ) : (
                filteredGastos.map((gasto) => (
                  <TableRow key={gasto.id}>
                    <TableCell>{format(new Date(gasto.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{gasto.caja.usuario.nombre}</TableCell>
                    <TableCell className="capitalize">{gasto.categoria}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{gasto.descripcion}</TableCell>
                    <TableCell className="text-right font-bold">S/ {Number(gasto.monto).toFixed(2)}</TableCell>
                    <TableCell>
                      {gasto.comprobante ? (
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin adjunto</span>
                      )}
                    </TableCell>
                    <TableCell>{getEstadoBadge(gasto.estado)}</TableCell>
                    <TableCell className="text-right">
                      {gasto.estado === 'PENDIENTE' && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost" size="sm"
                            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            onClick={() => handleVerificar(gasto.id, 'APROBADO')}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />Verificar
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setObservacionDialog({ gastoId: gasto.id, accion: 'RECHAZADO' })}
                          >
                            <ShieldX className="h-4 w-4 mr-1" />Rechazar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Observación Dialog */}
      <Dialog open={!!observacionDialog} onOpenChange={() => setObservacionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de Rechazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                placeholder="Explique por qué no se acepta este egreso..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservacionDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => observacionDialog && handleVerificar(observacionDialog.gastoId, 'RECHAZADO', observacion)}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseValidation;