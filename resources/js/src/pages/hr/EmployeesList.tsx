/* eslint-disable @typescript-eslint/no-explicit-any */
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  UserCog,
  Plus,
  Mail,
  Phone,
  Users,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Pencil,
  Lock,
  Timer,
} from 'lucide-react';
import { mockUsers } from '@/data/mockData';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, UserRole } from '@/types';
import { empleadoService, Role } from '@/services/empleadoService';
import { toast, useToast } from '@/hooks/use-toast';


/*
// Extended mock users for HR
const mockEmployees: User[] = [
  ...mockUsers,
  {
    id: 'seller-3',
    email: 'carlos.mendez@galletas.com',
    firstName: 'Carlos',
    lastName: 'Méndez',
    phone: '999555444',
    role: 'VENDEDOR',
    status: 'ACTIVO',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'cajero-1',
    email: 'maria.fernandez@galletas.com',
    firstName: 'María',
    lastName: 'Fernández',
    phone: '999444333',
    role: 'CAJERO',
    status: 'ACTIVO',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'supervisor-1',
    email: 'roberto.silva@galletas.com',
    firstName: 'Roberto',
    lastName: 'Silva',
    phone: '999333222',
    role: 'SUPERVISOR',
    status: 'ACTIVO',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'admin-1',
    email: 'admin@galletas.com',
    firstName: 'Juan',
    lastName: 'Domínguez',
    phone: '999111000',
    role: 'ADMIN',
    status: 'ACTIVO',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2024-12-01'),
  },
];

*/

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  SUPERVISOR: 'Supervisor',
  VENDEDOR: 'Vendedor',
  ALMACENERO: 'Almacenero',
  CAJERO: 'Cajero',
  RRHH: 'Recursos Humanos',
  FIDELIZACION: 'Fidelización',
  MANTENIMIENTO: 'Mant. Vehicular',
};

const EmployeesList = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [passwordCountdown, setPasswordCountdown] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showViewPassword) {
      setPasswordCountdown(30);
      timer = setInterval(() => {
        setPasswordCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setShowViewPassword(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPasswordCountdown(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showViewPassword]);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    nombre: '',
    rol: '',
    sueldo_base: '',
    horas_extra: '',
    afp: '',
    venta_directa: false,
    venta_en_ruta: true,
  });

  const selectedRole = roles.find(r => r.id.toString() === form.rol);
  const isVendedorSelected = selectedRole?.nombre === 'VENDEDOR';

  /* =========================
      OBTENER empleados
   ========================= */

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await empleadoService.getAll();
      console.log('Usuarios:', data);
      setEmployees(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await empleadoService.getRoles();
        setRoles(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchRoles();
  }, []);

  /* =========================
    CREAR Usuario/empleado
========================= */

  const handleCreate = async () => {
    if (!form.username || !form.nombre) return;

    try {
      await empleadoService.create({
        username: form.username,
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        rol: Number(form.rol),
        sueldo_base: Number(form.sueldo_base),
        horas_extra: Number(form.horas_extra),
        afp: Number(form.afp),
        venta_directa: form.venta_directa,
        venta_en_ruta: form.venta_en_ruta,
      });

      await fetchEmployees();

      setForm({
        username: '',
        email: '',
        password: '',
        nombre: '',
        rol: '',
        sueldo_base: '',
        horas_extra: '',
        afp: '',
        venta_directa: false,
        venta_en_ruta: true,
      });

      setIsAddDialogOpen(false);
      setShowCreatePassword(false);

    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo obtener el usuario.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (id: number) => {
    setEditId(id);
    try {
      const data = await empleadoService.getById(id);
      console.log("DATOS DEL EMPLEADO:", data);
      setForm({
        username: data.username || '',
        email: data.email || '',
        password: '', // Should be empty for edit unless changing it
        nombre: data.nombre || '',
        rol: data.roles?.[0]?.id?.toString() || '',
        sueldo_base: data.informacion_salarial?.sueldo_base || '',
        horas_extra: data.informacion_salarial?.horas_extra || '',
        afp: data.informacion_salarial?.afp || '',
        venta_directa: data.vendedor?.venta_directa ?? false,
        venta_en_ruta: data.vendedor?.venta_en_ruta ?? true,
      });
      setIsEditDialogOpen(true);
    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      toast({
        title: "Error",
        description: err?.message || "No se pudo obtener el usuario.",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!id) return;
    try {
      await empleadoService.update(id, {
        username: form.username,
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        rol: Number(form.rol),
        sueldo_base: Number(form.sueldo_base),
        horas_extra: Number(form.horas_extra),
        afp: Number(form.afp),
        venta_directa: form.venta_directa,
        venta_en_ruta: form.venta_en_ruta,
      });

      await fetchEmployees();

      setForm({
        username: '',
        email: '',
        password: '',
        nombre: '',
        rol: '',
        sueldo_base: '',
        horas_extra: '',
        afp: '',
        venta_directa: false,
        venta_en_ruta: true,
      });
      setEditId(null);

      setIsEditDialogOpen(false);

    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar el usuario.",
        variant: "destructive",
      });
    }
  };

  const handleView = (id: number) => {
    setShowViewPassword(false);
    setIsViewDialogOpen(true);
    setSelectedEmployee(employees.find((employee) => employee.id === id));
  };

  const handleDelete = async (id: number) => {
    try {
      await empleadoService.delete(id);
      await fetchEmployees();
      setIsViewDialogOpen(false);
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado exitosamente.",
      });
    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo eliminar el empleado.",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || employee.roles[0]?.nombre === roleFilter;
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const paginatedEmployees = filteredEmployees.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: 'bg-purple-500',
      GERENTE: 'bg-blue-500',
      SUPERVISOR: 'bg-cyan-500',
      VENDEDOR: 'bg-emerald-500',
      ALMACENERO: 'bg-amber-500',
      CAJERO: 'bg-pink-500',
      RRHH: 'bg-indigo-500',
      FIDELIZACION: 'bg-orange-500',
      MANTENIMIENTO: 'bg-slate-500',
    };
    return (
      <Badge className={colors[role]}>
        {roleLabels[role]}
      </Badge>
    );
  };

  const getInitials = (username: string) => {
    return username.charAt(0).toUpperCase();
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.deleted === 0).length,
    sellers: employees.filter(e => e.roles[0]?.nombre === 'VENDEDOR').length,
  };

  //const roles = Object.keys(roleLabels) as UserRole[];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Recursos Humanos
          </h1>
          <p className="text-muted-foreground">
            Gestión de empleados y colaboradores
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Empleado</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo colaborador
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombres</Label>
                  <Input placeholder="Juan Quispe"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre de Usuario</Label>
                  <Input type="email" placeholder="juanquispe02"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" placeholder="juan.quispe@fabrica.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showCreatePassword ? "text" : "password"} placeholder="******"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="show-create-password"
                    checked={showCreatePassword}
                    onCheckedChange={(checked) => setShowCreatePassword(!!checked)}
                  />
                  <Label htmlFor="show-create-password" className="text-sm font-normal cursor-pointer">
                    Mostrar contraseña
                  </Label>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={form.rol}
                    onValueChange={(v) =>
                      setForm({ ...form, rol: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>

                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem
                          key={role.id}
                          value={role.id.toString()} // 👈 convertir a string
                        >
                          {role.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campos de salario */}
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Información Salarial</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Sueldo Base (S/)</Label>
                    <Input type="number" placeholder="1500" min="0"
                      onChange={(e) => setForm({ ...form, sueldo_base: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Extra (S/)</Label>
                    <Input type="number" placeholder="15" min="0"
                      onChange={(e) => setForm({ ...form, horas_extra: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>AFP (%)</Label>
                    <Input type="number" placeholder="13" min="0" max="100"
                      onChange={(e) => setForm({ ...form, afp: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Salario del mes = Sueldo Base + (Horas Extras x Tarifa) - (Sueldo x AFP%)
                </p>
              </div>

              {/* Opciones Vendedor */}
              {isVendedorSelected && (
                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Opciones de Venta</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="venta_directa"
                        checked={form.venta_directa}
                        onCheckedChange={(checked) => setForm({ ...form, venta_directa: checked })}
                      />
                      <Label htmlFor="venta_directa">Permitir Venta Directa (Fábrica)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="venta_en_ruta"
                        checked={form.venta_en_ruta}
                        onCheckedChange={(checked) => setForm({ ...form, venta_en_ruta: checked })}
                      />
                      <Label htmlFor="venta_en_ruta">Permitir Venta en Ruta (Con Salida)</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleCreate}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UserCog className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendedores</p>
                <p className="text-2xl font-bold text-foreground">{stats.sellers}</p>
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
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.nombre}>
                    {roleLabels[role.nombre]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Lista de Empleados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(employee.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {employee.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Username: {employee.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {employee.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(employee.roles[0]?.nombre)}</TableCell>
                  <TableCell>
                    <Badge variant={!employee.deleted ? 'default' : 'secondary'}>
                      {!employee.deleted ? (
                        <><UserCheck className="h-3 w-3 mr-1" /> Activo</>
                      ) : (
                        <><UserX className="h-3 w-3 mr-1" /> Inactivo</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.created_at && !isNaN(new Date(employee.created_at).getTime())
                      ? format(new Date(employee.created_at.replace(" ", "T")), "dd MMM yyyy", { locale: es })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleView(employee.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee.id)}>
                        <Pencil className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setForm({ username: '', email: '', password: '', nombre: '', rol: '', sueldo_base: '', horas_extra: '', afp: '', venta_directa: false, venta_en_ruta: true });
          setEditId(null);
        }
        setIsEditDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Modifica la información del empleado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => handleEditSubmit(e, editId!)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Dejar en blanco para mantener la actual"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={form.rol}
                  onValueChange={(value) => setForm({ ...form, rol: value })}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sueldo_base">Sueldo Base</Label>
                <Input
                  id="sueldo_base"
                  type="number"
                  value={form.sueldo_base}
                  onChange={(e) => setForm({ ...form, sueldo_base: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas_extra">Horas Extra</Label>
                <Input
                  id="horas_extra"
                  type="number"
                  value={form.horas_extra}
                  onChange={(e) => setForm({ ...form, horas_extra: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="afp">AFP</Label>
                <Input
                  id="afp"
                  type="number"
                  value={form.afp}
                  onChange={(e) => setForm({ ...form, afp: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Opciones Vendedor (Edición) */}
            {isVendedorSelected && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Opciones de Venta</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit_venta_directa"
                      checked={form.venta_directa}
                      onCheckedChange={(checked) => setForm({ ...form, venta_directa: checked })}
                    />
                    <Label htmlFor="edit_venta_directa">Permitir Venta Directa (Fábrica)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit_venta_en_ruta"
                      checked={form.venta_en_ruta}
                      onCheckedChange={(checked) => setForm({ ...form, venta_en_ruta: checked })}
                    />
                    <Label htmlFor="edit_venta_en_ruta">Permitir Venta en Ruta (Con Salida)</Label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditId(null); setForm({ username: '', email: '', password: '', nombre: '', rol: '', sueldo_base: '', horas_extra: '', afp: '', venta_directa: false, venta_en_ruta: true }); }}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ver Empleado</DialogTitle>
            <DialogDescription>
              Información detallada del empleado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                type="text"
                value={selectedEmployee?.username}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={selectedEmployee?.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                type="text"
                value={selectedEmployee?.nombre}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Input
                id="rol"
                type="text"
                value={selectedEmployee?.roles[0]?.nombre}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sueldo_base">Sueldo Base</Label>
              <Input
                id="sueldo_base"
                type="number"
                value={selectedEmployee?.informacion_salarial?.sueldo_base || 0}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_extra">Horas Extra</Label>
              <Input
                id="horas_extra"
                type="number"
                value={selectedEmployee?.informacion_salarial?.horas_extra || 0}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afp">AFP</Label>
              <Input
                id="afp"
                type="number"
                value={selectedEmployee?.informacion_salarial?.afp || 0}
                disabled
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
            <Button type="button" variant="destructive" onClick={() => handleDelete(selectedEmployee.id)}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesList;
