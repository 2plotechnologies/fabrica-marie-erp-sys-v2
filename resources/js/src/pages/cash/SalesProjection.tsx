import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { proyeccionVentaService } from '@/services/proyecccionVentaService';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

const SalesProjection = () => {
  const [proyecciones, setProyecciones] = useState<any[]>([]);
  const [isNewDialog, setIsNewDialog] = useState(false);
  const [newProjection, setNewProjection] = useState({ mes: '', monto: '' });

  //Paginacion
  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(proyecciones.length / itemsPerPage);

  const paginatedProyecciones = proyecciones.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const loadProyecciones = async () => {
    const data = await proyeccionVentaService.index();
    setProyecciones(data);
  };

  useEffect(() => {
    loadProyecciones();
  }, []);

  const handleNewProjection = async () => {
    try {
      await proyeccionVentaService.store(newProjection);
      loadProyecciones();
      setIsNewDialog(false);
      setNewProjection({ mes: '', monto: '' });
      toast.success("Proyección creada correctamente");
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear proyección', error, 'No se pudo crear la proyección.'));
    }
  };

  // Calcular KPIs
  const mesActual = new Date().toISOString().slice(0, 7);
  const proyeccionActual = proyecciones.find(p => p.mes === mesActual);
  const proyectadoActual = proyeccionActual ? Number(proyeccionActual.proyectado) : 0;
  const realActual = proyeccionActual ? Number(proyeccionActual.real) : 0;
  const cumplimientoActual = proyeccionActual ? Number(proyeccionActual.porcentaje) : 0;

  const chartData = proyecciones.map(p => ({
    name: new Date(p.mes + '-01T00:00:00').toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
    Proyectado: p.proyectado,
    Real: p.real,
  })).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Proyectado de Ventas</h1>
          <p className="text-muted-foreground">Estimados mensuales vs ventas reales</p>
        </div>
        <Dialog open={isNewDialog} onOpenChange={setIsNewDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90"><Plus className="h-4 w-4 mr-2" />Nuevo Proyectado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Proyectado Mensual</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Input type="month" value={newProjection.mes} onChange={(e) => setNewProjection({ ...newProjection, mes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Monto Proyectado (S/)</Label>
                <Input type="number" placeholder="0.00" value={newProjection.monto} onChange={(e) => setNewProjection({ ...newProjection, monto: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDialog(false)}>Cancelar</Button>
              <Button onClick={handleNewProjection}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proyectado Este Mes</p>
                <p className="text-2xl font-bold">S/ {proyectadoActual.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venta Real</p>
                <p className="text-2xl font-bold text-emerald-600">S/ {realActual.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cumplimiento</p>
                <p className="text-2xl font-bold text-blue-600">{cumplimientoActual.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Proyectado vs Real</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `S/ ${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Proyectado" fill="hsl(var(--primary))" opacity={0.6} />
              <Bar dataKey="Real" fill="hsl(142, 71%, 45%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="shadow-card">
        <CardHeader><CardTitle>Historial de Proyectados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Proyectado</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Cumplimiento</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProyecciones.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {new Date(p.mes + '-01T00:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">S/ {Number(p.proyectado).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold">S/ {Number(p.real).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={p.porcentaje >= 100 ? 'text-emerald-600' : p.porcentaje >= 90 ? 'text-amber-600' : 'text-red-600'}>
                      {Number(p.porcentaje).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      Number(p.porcentaje) >= 100 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                        Number(p.porcentaje) >= 90 ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                          'bg-red-500/10 text-red-600 border-red-500/30'
                    }>
                      {Number(p.porcentaje) >= 100 ? 'Superado' : Number(p.porcentaje) >= 90 ? 'Cerca' : 'Por debajo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="mx-4">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesProjection;
