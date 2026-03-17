import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clienteService } from '@/services/clienteService';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Plus,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  User,
  History,
  Target,
  Star
} from 'lucide-react';

const ClientsCRM = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'today' | 'pending'>('all');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskFechaLimite, setNewTaskFechaLimite] = useState('');
  const [newTaskPrioridad, setNewTaskPrioridad] = useState('');
  const [newTaskEstado, setNewTaskEstado] = useState('');
  const [newInteractionType, setNewInteractionType] = useState<string>('LLAMADA');

  const [openTaskModal, setOpenTaskModal] = useState(false);

  const [clients, setClients] = useState<any[]>([]);

  const loadClients = async () => {
    const clients = await clienteService.listaCRM();
    setClients(clients);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateInteraction = async () => {
    try {
      await clienteService.createInteraction({
        cliente_id: selectedClient?.id,
        tipo: newInteractionType,
        descripcion: newNote,
      });
      loadClients();
      setNewNote('');
      setNewInteractionType('LLAMADA');
    } catch (error) {
      console.error('Error creating interaction:', error);
    }
  };

  const handleOpenTaskModal = () => {
    setOpenTaskModal(true);
  };

  const handleCreateTask = async () => {
    try {
      await clienteService.createTask({
        cliente_id: selectedClient?.id,
        titulo: newTaskTitle,
        descripcion: newTaskDescription,
        fecha_limite: newTaskFechaLimite,
        prioridad: newTaskPrioridad,
        estado: newTaskEstado,
      });
      loadClients();
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskFechaLimite('');
      setNewTaskPrioridad('');
      setNewTaskEstado('');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCompleteTask = async (id: number) => {
    try {
      await clienteService.completeTask(id);
      loadClients();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.telefono.includes(searchTerm);

    if (purchaseFilter === 'today') {
      return matchesSearch && client.compro_hoy;
    } else if (purchaseFilter === 'pending') {
      return matchesSearch && !client.compro_hoy;
    }
    return matchesSearch;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const paginatedClients = filteredClients.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const stats = {
    totalClients: clients.length,
    purchasedToday: clients.filter(c => c.compro_hoy).length,
    pendingToday: clients.filter(c => !c.compro_hoy).length,
    pendingTasks: clients.filter(c => c.tareas?.filter(t => t.estado !== 'COMPLETADA')).length
  };

  const getClientInteractions = (clientId: number) =>
    clients.find(c => c.id === clientId)?.interacciones ?? [];

  const getClientTasks = (clientId: number) =>
    clients.find(c => c.id === clientId)?.tareas ?? [];

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'LLAMADA': return <Phone className="h-4 w-4" />;
      case 'VISITA': return <MapPin className="h-4 w-4" />;
      case 'MENSAJE': return <MessageSquare className="h-4 w-4" />;
      case 'VENTA': return <ShoppingCart className="h-4 w-4" />;
      case 'COBRANZA': return <Target className="h-4 w-4" />;
      case 'RECLAMO': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getInteractionBadgeClass = (type: string) => {
    switch (type) {
      case 'VENTA': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'COBRANZA': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'LLAMADA': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'VISITA': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'RECLAMO': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'ALTA': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'BAJA': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return '';

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsed);
  };

  const formatShortDate = (date: string | null) => {
    if (!date) return 'Sin compras';

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return 'Sin compras';

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short'
    }).format(parsed);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">CRM - Seguimiento de Clientes</h1>
          <p className="text-muted-foreground">Gestiona las relaciones y seguimiento comercial</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Interacción
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clientes</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">En seguimiento activo</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Compraron Hoy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.purchasedToday}</div>
            <p className="text-xs text-green-600 dark:text-green-500">Clientes atendidos</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Sin Compra Hoy</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pendingToday}</div>
            <p className="text-xs text-amber-600 dark:text-amber-500">Pendientes de visitar</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Tareas Pendientes</CardTitle>
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.pendingTasks}</div>
            <p className="text-xs text-blue-600 dark:text-blue-500">Por completar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, negocio o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={purchaseFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setPurchaseFilter('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={purchaseFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setPurchaseFilter('today')}
                size="sm"
                className={purchaseFilter === 'today' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Compraron Hoy
              </Button>
              <Button
                variant={purchaseFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setPurchaseFilter('pending')}
                size="sm"
                className={purchaseFilter === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Sin Compra
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes ({filteredClients.length})</CardTitle>
          <CardDescription>Click en un cliente para ver detalles y gestionar interacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead className="text-right">Ticket Prom.</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className={`cursor-pointer transition-colors ${client.compro_hoy
                      ? 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20'
                      : 'hover:bg-muted/50'
                      }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {client.compro_hoy ? (
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Compró</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-amber-500" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pendiente</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{client.razon_social}</p>
                        <p className="text-sm text-muted-foreground">{client.direccion}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.ruta.nombre}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      S/ {Number(client.ticket_promocional).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{Number(client.puntos).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={client.compro_hoy ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                        {formatShortDate(client.fecha_ultima_venta) || 'Nunca'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); }}>
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedClient.razon_social}
                      {selectedClient.compro_hoy ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Compró Hoy
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Sin Compra Hoy
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>{selectedClient.telefono} • {selectedClient.ruta.nombre}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Client Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{selectedClient.total_ventas}</p>
                  <p className="text-xs text-muted-foreground">Compras Totales</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">S/ {selectedClient.ticket_promocional}</p>
                  <p className="text-xs text-muted-foreground">Ticket Promedio</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{selectedClient.frecuencia_ventas}</p>
                  <p className="text-xs text-muted-foreground">Frecuencia</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <p className="text-2xl font-bold text-foreground">{selectedClient.puntos}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Puntos Fidelización</p>
                </div>
              </div>

              {/* Contact & Credit Info */}
              <div className="grid md:grid-cols-2 gap-4 py-4 border-y border-border">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Información de Contacto</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.telefono}</span>
                    </div>
                    {selectedClient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.direccion}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Información de Crédito</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Límite de Crédito:</span>
                      <span className="font-medium">S/ {Number(selectedClient.limite_credito).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deuda Actual:</span>
                      <span className={`font-medium ${selectedClient.deuda_actual > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        S/ {Number(selectedClient.deuda_actual).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disponible:</span>
                      <span className="font-medium text-green-600">
                        S/ {(Number(selectedClient.limite_credito) - Number(selectedClient.deuda_actual)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs for Interactions and Tasks */}
              <Tabs defaultValue="interactions" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="interactions">
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <Target className="h-4 w-4 mr-2" />
                    Tareas
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Nueva Nota
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="interactions" className="mt-4">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {getClientInteractions(selectedClient.id).length > 0 ? (
                      getClientInteractions(selectedClient.id).map((interaction) => (
                        <div key={interaction.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className={`p-2 rounded-full ${getInteractionBadgeClass(interaction.tipo)}`}>
                            {getInteractionIcon(interaction.tipo)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getInteractionBadgeClass(interaction.tipo)}>
                                {interaction.tipo}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(interaction.fecha)}</span>
                            </div>
                            <p className="text-sm mt-1">{interaction.descripcion}</p>
                            <p className="text-xs text-muted-foreground mt-1">Por: {interaction.usuario.nombre}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No hay interacciones registradas</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {getClientTasks(selectedClient.id).length > 0 ? (
                      getClientTasks(selectedClient.id).map((task) => (
                        <div key={task.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.titulo}</span>
                              <Badge className={getPriorityBadge(task.prioridad)}>{task.prioridad}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{task.descripcion}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Vence: {formatShortDate(task.fecha_limite)}
                              </span>
                              <span>Asignado a: {task.usuario.nombre}</span>
                            </div>
                          </div>
                          {task.estado === 'PENDIENTE' && (
                            <Button variant="outline" size="sm" onClick={() => handleCompleteTask(task.id)}>Completar</Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No hay tareas pendientes</p>
                    )}
                  </div>
                  <Button className="w-full mt-4" variant="outline" onClick={handleOpenTaskModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                  </Button>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Tipo de Interacción</label>
                      <Select value={newInteractionType} onValueChange={setNewInteractionType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LLAMADA">Llamada</SelectItem>
                          <SelectItem value="VISITA">Visita</SelectItem>
                          <SelectItem value="MENSAJE">Mensaje</SelectItem>
                          <SelectItem value="VENTA">Venta</SelectItem>
                          <SelectItem value="COBRANZA">Cobranza</SelectItem>
                          <SelectItem value="RECLAMO">Reclamo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Descripción</label>
                      <Textarea
                        placeholder="Describe la interacción con el cliente..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                    <Button className="w-full" onClick={handleCreateInteraction}>
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar Interacción
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>

        <Dialog open={openTaskModal} onOpenChange={setOpenTaskModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Tarea</DialogTitle>
              <DialogDescription>
                Crea una nueva tarea para el cliente {selectedClient?.razon_social}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Título de la tarea"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  placeholder="Descripción de la tarea"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Límite</label>
                <Input
                  type="date"
                  value={newTaskFechaLimite}
                  onChange={(e) => setNewTaskFechaLimite(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={newTaskPrioridad} onValueChange={setNewTaskPrioridad}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="BAJA">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={newTaskEstado} onValueChange={setNewTaskEstado}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="EN_PROGRESO">En Progreso</SelectItem>
                    <SelectItem value="COMPLETADA">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crear Tarea
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </Dialog>
    </div>
  );
};

export default ClientsCRM;
