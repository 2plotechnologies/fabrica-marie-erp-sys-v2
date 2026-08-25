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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  Calendar as CalendarIcon,
  Wallet,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';

const CashMovements = () => {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchMovimientos = async () => {
      const movimientos = await cajaService.getMovimientosTotales();
      setMovimientos(movimientos);
    };
    fetchMovimientos();
  }, []);

  const filteredMovements = movimientos.filter((movement) => {
    const desc = (movement.descripcion || '') + ' ' + (movement.comprobante || '') + ' ' + (movement.caja?.usuario?.nombre || '');
    const matchesSearch = desc
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || movement.tipo === typeFilter;
    const matchesCategory = categoryFilter === 'all' || movement.categoria === categoryFilter;
    
    let matchesDate = true;
    if (dateFilter && movement.created_at) {
      const movementDate = format(new Date(movement.created_at), 'yyyy-MM-dd');
      const filterDate = format(dateFilter, 'yyyy-MM-dd');
      matchesDate = movementDate === filterDate;
    }

    return matchesSearch && matchesType && matchesCategory && matchesDate;
  });

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  const paginatedMovements = filteredMovements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'INGRESO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'EGRESO' && m.estado === 'APROBADO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const categories = [...new Set(movimientos.map(m => m.categoria))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Movimientos de Caja
          </h1>
          <p className="text-muted-foreground">
            Historial de ingresos y egresos
          </p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ingresos</p>
                <p className="text-2xl font-bold text-emerald-600">
                  S/ {Number(totalIngresos).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Egresos</p>
                <p className="text-2xl font-bold text-red-600">
                  S/ {Number(totalEgresos).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-2xl font-bold ${Number(totalIngresos) - Number(totalEgresos) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  S/ {Number(totalIngresos - totalEgresos).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-full sm:w-auto justify-start text-left font-normal ${!dateFilter && "text-muted-foreground"}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "dd MMM yyyy", { locale: es }) : "Filtrar por fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  locale={es}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Button variant="ghost" className="w-full text-sm" onClick={() => setDateFilter(undefined)}>
                    Limpiar filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INGRESO">Ingresos</SelectItem>
                <SelectItem value="EGRESO">Egresos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMovements.map((movement) => (
                <TableRow key={movement.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">
                    {format(movement.created_at, "dd MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {movement.tipo === 'INGRESO'
                        ? <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                        : <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      }
                      <Badge variant={movement.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                        {movement.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{movement.categoria}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{movement.descripcion}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.caja?.usuario?.nombre || movement.conciliador?.nombre || '-'}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${movement.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                    {movement.tipo === 'INGRESO' ? '+' : '-'} S/ {Number(movement.monto).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={movement.estado === 'APROBADO' ? 'default' : movement.estado === 'PENDIENTE' ? 'secondary' : 'destructive'}>
                      {movement.estado === 'APROBADO' ? 'Aprobado' : movement.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
                    </Badge>
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

export default CashMovements;
