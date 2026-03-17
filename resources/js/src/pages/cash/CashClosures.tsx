import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Lock,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';
import { toast } from 'sonner';

const CashClosures = () => {
  const [cajasCerradas, setCajasCerradas] = useState<any>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClosure, setSelectedClosure] = useState<typeof cajasCerradas[0] | null>(null);

  useEffect(() => {
    const fetchCajasCerradas = async () => {
      try {
        const response = await cajaService.getCajasCerradas();
        setCajasCerradas(response);
      } catch (error) {
        toast.error('Error al obtener las cajas cerradas: ' + error);
      }
    };
    fetchCajasCerradas();
  }, []);

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(cajasCerradas.length / itemsPerPage);

  const paginatedCajasCerradas = cajasCerradas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: string, difference: number) => {
    switch (status) {
      case 'CUADRADO':
        return (
          <Badge className="bg-emerald-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Cuadrado
          </Badge>
        );
      case 'FALTANTE':
        return (
          <Badge variant="destructive">
            <TrendingDown className="h-3 w-3 mr-1" />
            Faltante S/ {Math.abs(difference).toFixed(2)}
          </Badge>
        );
      case 'SOBRANTE':
        return (
          <Badge className="bg-amber-500">
            <TrendingUp className="h-3 w-3 mr-1" />
            Sobrante S/ {difference.toFixed(2)}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalCuadrados = cajasCerradas.filter(c => c.cierre_caja.estado === 'CUADRADO').length;
  const totalDifferences = cajasCerradas.reduce((acc, c) => acc + Number(c.cierre_caja.diferencia), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cierres de Caja
          </h1>
          <p className="text-muted-foreground">
            Historial de cierres y cuadres de caja
          </p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cierres</p>
                <p className="text-2xl font-bold text-foreground">{cajasCerradas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuadrados</p>
                <p className="text-2xl font-bold text-emerald-600">{totalCuadrados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Con Diferencia</p>
                <p className="text-2xl font-bold text-foreground">
                  {cajasCerradas.length - totalCuadrados}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${Number(totalDifferences) >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                {Number(totalDifferences) >= 0
                  ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                  : <TrendingDown className="h-6 w-6 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diferencia Neta</p>
                <p className={`text-2xl font-bold ${Number(totalDifferences) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                  S/ {Number(totalDifferences).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por fecha o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Closures Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historial de Cierres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Apertura</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Egresos</TableHead>
                <TableHead className="text-right">Cierre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cerrado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCajasCerradas.map((closure) => (
                <TableRow key={closure.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {format(closure.cerrado_at, "EEEE, dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    S/ {Number(closure.saldo_inicial).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    + S/ {Number(closure.total_ingresos).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    - S/ {Number(closure.total_egresos).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    S/ {Number(closure.cierre_caja.conteo_real).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(closure.cierre_caja.estado, Number(closure.cierre_caja.diferencia))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>
                      <p>{closure.usuario_cerrado.nombre}</p>
                      <p className="text-xs">{format(closure.cerrado_at, "HH:mm")}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedClosure(closure)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Detalle del Cierre</DialogTitle>
                          <DialogDescription>
                            {format(closure.cerrado_at, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">Apertura</p>
                              <p className="text-xl font-bold">S/ {Number(closure.saldo_inicial).toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                              <p className="text-sm text-muted-foreground">Ingresos</p>
                              <p className="text-xl font-bold text-emerald-600">
                                S/ {Number(closure.total_ingresos).toFixed(2)}
                              </p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <p className="text-sm text-muted-foreground">Egresos</p>
                              <p className="text-xl font-bold text-red-600">
                                S/ {Number(closure.total_egresos).toFixed(2)}
                              </p>
                            </div>
                            <div className="p-4 bg-primary/10 rounded-lg">
                              <p className="text-sm text-muted-foreground">Teórico</p>
                              <p className="text-xl font-bold">S/ {Number(closure.cierre_caja.saldo_teorico).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-muted-foreground">Conteo real:</span>
                              <span className="font-bold text-lg">S/ {Number(closure.cierre_caja.conteo_real).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Diferencia:</span>
                              <span className={`font-bold text-lg ${Number(closure.cierre_caja.diferencia) === 0
                                ? 'text-emerald-600'
                                : Number(closure.cierre_caja.diferencia) > 0
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                                }`}>
                                S/ {Number(closure.cierre_caja.diferencia).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">Cerrado por</p>
                            <p className="font-medium">{closure.usuario_cerrado.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(closure.cerrado_at, "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>

              <span className="px-3 py-2 text-sm">
                Página {page} de {totalPages}
              </span>

              <Button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
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

export default CashClosures;
