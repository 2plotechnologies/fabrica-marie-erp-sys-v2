import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Loader2, Banknote, CheckCircle2, Clock, Trash2, FileText, Download, UploadCloud, ShieldCheck, XCircle, Eye, AlertTriangle, Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { entregaDineroService } from '@/services/entregaDineroService';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:8000';

interface DeliveryItem {
    id: string; // frontend-only for unique keys
    metodo_pago: string;
    monto: string | number;
    comprobante: File | null;
}

const MoneyDelivery = () => {
    const navigate = useNavigate();
    const { user, hasRole, hasPermission } = useAuth();
    const { currentRole } = useRole();
    const isVendedor = currentRole === 'VENDEDOR' || hasRole('VENDEDOR');
    const [entregas, setEntregas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [maxVentasConfirmadas, setMaxVentasConfirmadas] = useState<number | null>(null);

    const [isNewDialog, setIsNewDialog] = useState(false);
    const [isViewDialog, setIsViewDialog] = useState(false);
    const [isCajaCerradaModalOpen, setIsCajaCerradaModalOpen] = useState(false);
    const [confirmWarningDialog, setConfirmWarningDialog] = useState<{ id: number, estado: string, message: string } | null>(null);

    // Form state
    const [nombreReceptor, setNombreReceptor] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [fechaEntrega, setFechaEntrega] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [items, setItems] = useState<DeliveryItem[]>([{
        id: crypto.randomUUID(),
        metodo_pago: '',
        monto: '',
        comprobante: null
    }]);

    const [selectedEntrega, setSelectedEntrega] = useState<any>(null);

    const fetchEntregas = async () => {
        try {
            setIsLoading(true);
            const data = await entregaDineroService.getAll();
            setEntregas(data);
        } catch (error: any) {
            toast.error(formatErrorMessage('Error al obtener entregas de dinero', error, 'No se pudieron obtener las entregas de dinero.'));
        } finally {
            setIsLoading(false);
        }
    };

    const [resumenVendedorData, setResumenVendedorData] = useState<{
        total_recabado: number;
        total_disponible: number;
        cobranzas: number;
        ventas_contado: number;
        adelantos_credito: number;
        gastos: number;
        entregas_previas: number;
    } | null>(null);

    const fetchResumenVendedor = async () => {
        try {
            const data = await entregaDineroService.getResumenVendedor();
            if (data) {
                setResumenVendedorData(data);
            }
        } catch (error) {
            console.error('Error al obtener datos del vendedor:', error);
        }
    };

    useEffect(() => {
        fetchEntregas();
    }, []);

    useEffect(() => {
        if (isNewDialog && (hasRole('VENDEDOR') || currentRole === 'VENDEDOR')) {
            fetchResumenVendedor();
        }
    }, [isNewDialog, currentRole]);

    const createEntrega = useMutation({
        mutationFn: async (formData: FormData) => {
            return await entregaDineroService.create(formData);
        },
        onSuccess: () => {
            toast.success('Entrega registrada exitosamente');
            fetchEntregas();
            resetForm();
            setIsNewDialog(false);
        },
        onError: (error: any) => {
            console.log("ERROR COMPLETO:", error);
            console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);

            const errorMessage = error.response?.data?.message || error.response?.data?.error || '';
            const isCajaCerrada = error.response?.status === 403 &&
                (errorMessage.toLowerCase().includes('caja abierta') ||
                    errorMessage.toLowerCase().includes('caja cerrada'));

            if (isCajaCerrada) {
                setIsNewDialog(false);
                setIsCajaCerradaModalOpen(true);
            } else {
                toast.error(formatErrorMessage('Error al crear la entrega de dinero', error, 'No se pudo crear. Verifique los datos o adjuntos.'));
            }
        }
    });

    const updateEstado = useMutation({
        mutationFn: async ({ id, estado, confirmar_cierre_irregular }: { id: number, estado: string, confirmar_cierre_irregular?: boolean }) => {
            return await entregaDineroService.updateEstado(id, estado, confirmar_cierre_irregular);
        },
        onSuccess: () => {
            toast.success('Estado actualizado exitosamente');
            fetchEntregas();
            setIsViewDialog(false);
            setConfirmWarningDialog(null);
        },
        onError: (error: any) => {
            const errData = error.response?.data;
            if (error.response?.status === 409 && errData?.warning) {
                setConfirmWarningDialog({
                    id: selectedEntrega?.id,
                    estado: 'ACEPTADA',
                    message: errData.message
                });
                return; // Stop standard error message
            }
            toast.error(formatErrorMessage('Error al actualizar estado', error, 'No se pudo actualizar el estado.'));
        }
    });

    const resetForm = () => {
        setNombreReceptor('');
        setObservaciones('');
        setFechaEntrega(format(new Date(), 'yyyy-MM-dd'));
        setItems([{
            id: crypto.randomUUID(),
            metodo_pago: '',
            monto: '',
            comprobante: null
        }]);
    };

    const handleAddItem = () => {
        setItems([...items, { id: crypto.randomUUID(), metodo_pago: '', monto: '', comprobante: null }]);
    };

    const handleRemoveItem = (idToRemove: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== idToRemove));
        } else {
            toast.error('Debe haber al menos un ítem.');
        }
    };

    const handleItemChange = (id: string, field: keyof DeliveryItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const onSubmit = () => {
        if (!user) return;

        // Validation
        let totalMonto = 0;
        for (const item of items) {
            if (!item.metodo_pago) {
                toast.error('Todos los ítems deben tener un método de pago.');
                return;
            }
            if (Number(item.monto) <= 0) {
                toast.error('Todos los ítems deben tener un monto mayor a 0.');
                return;
            }
            totalMonto += Number(item.monto);
        }

        // SE ELIMINÓ LA RESTRICCIÓN DE MONTO DISPONIBLE PARA VENDEDORES
        // if ((hasRole('VENDEDOR') || currentRole === 'VENDEDOR') && resumenVendedorData !== null) {
        //     if (totalMonto > resumenVendedorData.total_disponible) {
        //         toast.error(`El monto total a entregar (S/ ${totalMonto.toFixed(2)}) no puede superar el disponible de ventas y cobranzas (S/ ${resumenVendedorData.total_disponible.toFixed(2)}).`);
        //         return;
        //     }
        // }

        const formData = new FormData();
        formData.append('usuario_id', String(user.id));
        formData.append('fecha', fechaEntrega || format(new Date(), 'yyyy-MM-dd'));
        if (nombreReceptor.trim()) {
            formData.append('nombre_receptor', nombreReceptor.trim());
        }
        formData.append('monto_total', String(totalMonto));
        if (observaciones) {
            formData.append('observaciones', observaciones);
        }

        items.forEach((item, index) => {
            formData.append(`items[${index}][metodo_pago]`, item.metodo_pago);
            formData.append(`items[${index}][monto]`, String(item.monto));
            if (item.comprobante) {
                formData.append(`items[${index}][comprobante]`, item.comprobante as File);
            }
        });

        createEntrega.mutate(formData);
    };

    const openView = (entrega: any) => {
        setSelectedEntrega(entrega);
        setIsViewDialog(true);
    };

    const handleAprobar = () => {
        if (!selectedEntrega) return;
        updateEstado.mutate({ id: selectedEntrega.id, estado: 'ACEPTADA' });
    };

    const handleRechazar = () => {
        if (!selectedEntrega) return;
        updateEstado.mutate({ id: selectedEntrega.id, estado: 'RECHAZADA' });
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pendiente</Badge>;
            case 'ACEPTADA': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Aceptada</Badge>;
            case 'RECHAZADA': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Rechazada</Badge>;
            default: return <Badge variant="outline">{estado}</Badge>;
        }
    };

    // Calculate totals
    const totalPendiente = entregas.filter(e => e.estado === 'PENDIENTE').reduce((acc, curr) => acc + Number(curr.monto_total), 0);
    const totalAceptado = entregas.filter(e => e.estado === 'ACEPTADA').reduce((acc, curr) => acc + Number(curr.monto_total), 0);
    const countPendientes = entregas.filter(e => e.estado === 'PENDIENTE').length;

    // Pagination
    const itemsPerPage = 8;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(entregas.length / itemsPerPage);
    const paginatedEntregas = entregas.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Determines if current user can approve (has admin / caja roles)
    const canApprove = hasRole('ADMIN') || hasRole('GERENTE') || hasPermission('caja_verificar_entrega');

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Entregas de Dinero</h1>
                    <p className="text-muted-foreground">Registro de dinero entregado a gerentes o administradores.</p>
                </div>
                <Dialog open={isNewDialog} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsNewDialog(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-warm hover:opacity-90"><Plus className="h-4 w-4 mr-2" />Nueva Entrega</Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
                        <DialogHeader><DialogTitle className="text-lg sm:text-xl">Registrar Nueva Entrega</DialogTitle></DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fecha_entrega">Fecha de Entrega</Label>
                                    <Input
                                        id="fecha_entrega"
                                        type="date"
                                        value={fechaEntrega}
                                        onChange={(e) => setFechaEntrega(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nombre_receptor">Nombre del receptor</Label>
                                    <Input
                                        id="nombre_receptor"
                                        placeholder="Nombre de la persona que recibe el dinero"
                                        value={nombreReceptor}
                                        onChange={(e) => setNombreReceptor(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Ítems de Entrega</Label>
                                    <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-2" /> Agregar Pago</Button>
                                </div>

                                {items.map((item, index) => (
                                    <div key={item.id} className="p-4 bg-muted/50 rounded-lg border border-border relative">
                                        <div className="absolute right-4 top-4">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <h4 className="text-sm font-medium mb-3"># {index + 1}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Método de Pago</Label>
                                                <Select value={item.metodo_pago} onValueChange={(val) => handleItemChange(item.id, 'metodo_pago', val)}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione un método" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                                        <SelectItem value="yape">Yape</SelectItem>
                                                        <SelectItem value="plin">Plin</SelectItem>
                                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                                        <SelectItem value="deposito">Depósito en Agente</SelectItem>
                                                        <SelectItem value="deposito_bancario">Depósito Bancario</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Monto (S/)</Label>
                                                <Input type="number" step="0.01" min="0" placeholder="0.00" value={item.monto} onChange={(e) => handleItemChange(item.id, 'monto', e.target.value)} />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Comprobante Adjunto (Opcional)</Label>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                        className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                handleItemChange(item.id, 'comprobante', e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                    {item.comprobante && (
                                                        <Badge variant="secondary" className="max-w-[200px] truncate">
                                                            <UploadCloud className="h-3 w-3 mr-1" />
                                                            {item.comprobante.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">Formatos soportados: JPG, PNG, PDF (Max 4MB).</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Observaciones Generales</Label>
                                <Textarea placeholder="Opcional: Detalles sobre la entrega..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                            </div>

                            <div className="flex justify-end p-4 bg-muted/30 rounded-lg">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Monto Total Calculado</p>
                                    <p className="text-2xl font-bold font-display text-primary">
                                        S/ {items.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewDialog(false)}>Cancelar</Button>
                            <Button onClick={onSubmit} disabled={createEntrega.isPending}>
                                {createEntrega.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Registrar Entrega
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Monto por Aceptar (Pendiente)</p>
                                <p className="text-xl font-bold text-amber-600">S/ {totalPendiente.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{countPendientes} entregas sin revisar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Monto Aceptado General</p>
                                <p className="text-xl font-bold text-emerald-600">S/ {totalAceptado.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Historial de Entregas</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                    {/* Mobile Card View */}
                    <div className="space-y-3 sm:hidden">
                        {entregas.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No hay entregas registradas
                            </div>
                        ) : (
                            paginatedEntregas.map((entrega) => (
                                <div key={entrega.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className="font-bold text-sm text-foreground truncate block">{entrega.usuario?.nombre || 'Desconocido'}</span>
                                            <p className="text-[11px] text-muted-foreground">Receptor: <strong>{entrega.nombre_receptor || '—'}</strong></p>
                                        </div>
                                        {getEstadoBadge(entrega.estado)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                                        <div>📅 <strong>{format(new Date(entrega.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: es })}</strong></div>
                                        <div>📎 <Badge variant="secondary" className="text-[10px] py-0">{entrega.items?.length || 0} adjuntos</Badge></div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Monto Total</span>
                                            <span className="text-base font-bold text-primary">S/ {Number(entrega.monto_total).toFixed(2)}</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1" onClick={() => openView(entrega)}>
                                            <Eye className="h-3.5 w-3.5" /> Ver Detalle
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto w-full border rounded-lg">
                        <Table className="w-full min-w-[750px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Usuario/Remitente</TableHead>
                                    <TableHead>Nombre del Receptor</TableHead>
                                    <TableHead>Monto Total</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entregas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay entregas registradas</TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedEntregas.map((entrega) => (
                                        <TableRow key={entrega.id} className="hover:bg-muted/30">
                                            <TableCell className="whitespace-nowrap">{format(new Date(entrega.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                                            <TableCell className="font-medium whitespace-nowrap">{entrega.usuario?.nombre || 'Desconocido'}</TableCell>
                                            <TableCell className="text-muted-foreground whitespace-nowrap">{entrega.nombre_receptor || '—'}</TableCell>
                                            <TableCell className="font-bold text-foreground whitespace-nowrap">S/ {Number(entrega.monto_total).toFixed(2)}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" /> {entrega.items?.length || 0} adjuntos</Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{getEstadoBadge(entrega.estado)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <Button variant="ghost" size="sm" onClick={() => openView(entrega)}>
                                                    <Eye className="h-4 w-4 mr-1" /> Ver Detalle
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                            <span className="px-3 py-2 text-sm">Página {page} de {totalPages}</span>
                            <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View & Process Dialog */}
            <Dialog open={isViewDialog} onOpenChange={setIsViewDialog}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader><DialogTitle className="text-lg sm:text-xl">Detalle de Entrega #{selectedEntrega?.id}</DialogTitle></DialogHeader>
                    {selectedEntrega && (
                        <><div className="space-y-6 py-4">
                            <div className="flex flex-col sm:flex-row justify-between bg-muted/40 p-4 rounded-xl gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Remitente</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm">{selectedEntrega.usuario?.nombre}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Receptor</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm">{selectedEntrega.nombre_receptor || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Fecha / Hora</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm">{format(new Date(selectedEntrega.created_at || new Date()), "d 'de' MMMM, yyyy HH:mm", { locale: es })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Total Entregado</p>
                                    <p className="font-bold text-base sm:text-lg text-primary">S/ {Number(selectedEntrega.monto_total).toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Estado</p>
                                    {getEstadoBadge(selectedEntrega.estado)}
                                </div>
                            </div>

                            {selectedEntrega.observaciones && (
                                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-xs sm:text-sm">
                                    <span className="font-semibold text-amber-700 dark:text-amber-400">Observaciones: </span>
                                    {selectedEntrega.observaciones}
                                </div>
                            )}

                            <div>
                                <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center"><FileText className="h-5 w-5 mr-2 text-primary" /> Ítems Registrados y Comprobantes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedEntrega.items?.map((item: any) => (
                                        <Card key={item.id} className="shadow-sm border-muted">
                                            <CardContent className="p-4 flex flex-col justify-between h-full group">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <Badge variant="outline" className="bg-primary/5">{item.metodo_pago}</Badge>
                                                        <span className="font-bold text-foreground">S/ {Number(item.monto).toFixed(2)}</span>
                                                    </div>

                                                    {/* Mostrar vista previa si es imagen */}
                                                    <div className="mt-4 rounded-lg overflow-hidden border border-border bg-muted/20 flex flex-col">
                                                        <div className="p-3 border-b border-border flex justify-between items-center bg-muted/40">
                                                            <div className="flex items-center text-sm font-medium">
                                                                <FileText className="h-4 w-4 mr-2" /> Comprobante Adjunto
                                                            </div>
                                                        </div>
                                                        <div className="p-4 flex justify-center items-center h-40 bg-zinc-100 dark:bg-zinc-900 border-b border-border/50 relative overflow-hidden group-hover:bg-zinc-200 transition-colors">
                                                            {item.comprobante_path ? (
                                                                // Si es imagen, intentamos mostrarla
                                                                item.comprobante_path.toLowerCase().match(/\.(jpeg|jpg|png)$/) ? (
                                                                    <div className="relative w-full h-full flex justify-center items-center">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img
                                                                            src={`${API_BASE_URL}/storage/${item.comprobante_path}`}
                                                                            alt="Comprobante"
                                                                            className="max-w-full max-h-full object-contain drop-shadow-md rounded" />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <a
                                                                                href={`${API_BASE_URL}/storage/${item.comprobante_path}`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-white flex items-center shadow-lg"
                                                                            >
                                                                                <Eye className="h-4 w-4 mr-2" /> Ampliar
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center text-muted-foreground w-full h-full">
                                                                        <FileText className="h-10 w-10 mb-2 opacity-50" />
                                                                        <span className="text-sm font-medium">Documento PDF / Archivo</span>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">Sin comprobante</span>
                                                            )}
                                                        </div>
                                                        <div className="p-3 bg-muted/20">
                                                            <a
                                                                href={`${API_BASE_URL}/storage/${item.comprobante_path}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                download
                                                            >
                                                                <Button variant="default" size="sm" className="w-full bg-primary/90 hover:bg-primary">
                                                                    <Download className="h-4 w-4 mr-2" /> Descargar Archivo
                                                                </Button>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div><DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewDialog(false)}>Cerrar</Button>

                                {selectedEntrega.estado === 'PENDIENTE' && canApprove && (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <Button
                                            variant="destructive"
                                            className="w-full sm:w-auto"
                                            onClick={handleRechazar}
                                            disabled={updateEstado.isPending}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" /> Rechazar
                                        </Button>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                                            onClick={handleAprobar}
                                            disabled={updateEstado.isPending}
                                        >
                                            <ShieldCheck className="h-4 w-4 mr-2" /> Aceptar Entrega
                                        </Button>
                                    </div>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            {/* Warning Dialog for Irregular Cash Close */}
            <Dialog open={!!confirmWarningDialog} onOpenChange={(open) => !open && setConfirmWarningDialog(null)}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-amber-600 text-base sm:text-lg">
                            <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                            Advertencia de Cierre
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-xs sm:text-sm text-muted-foreground">{confirmWarningDialog?.message}</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setConfirmWarningDialog(null)}>Cancelar</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                            disabled={updateEstado.isPending}
                            onClick={() => {
                                if (confirmWarningDialog) {
                                    updateEstado.mutate({
                                        id: confirmWarningDialog.id,
                                        estado: confirmWarningDialog.estado,
                                        confirmar_cierre_irregular: true
                                    });
                                }
                            }}
                        >
                            {updateEstado.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Continuar de todos modos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal de Caja Cerrada para Vendedores */}
            <Dialog open={isCajaCerradaModalOpen} onOpenChange={setIsCajaCerradaModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
                        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 animate-bounce">
                            <Lock className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-xl font-bold font-display text-red-600 dark:text-red-400">
                            Apertura de Caja Requerida
                        </DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground mt-2">
                            No se ha detectado una caja abierta para el día de hoy. Es indispensable contar con una caja abierta antes de registrar entregas de dinero.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 text-center">
                        {isVendedor ? (
                            <div className="bg-muted p-4 rounded-lg text-sm font-medium border border-border text-left">
                                Por favor, solicite a un <span className="text-primary font-bold">administrador, gerente, supervisor o cajero</span> que aperture la caja para continuar con la entrega.
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Como usuario administrador o de gestión, puede proceder a realizar la apertura de caja directamente en la vista de caja.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="flex sm:justify-center gap-2">
                        {isVendedor ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsCajaCerradaModalOpen(false)}
                            >
                                Entendido
                            </Button>
                        ) : (
                            <div className="flex w-full gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCajaCerradaModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="gradient"
                                    className="gap-2"
                                    onClick={() => {
                                        setIsCajaCerradaModalOpen(false);
                                        navigate('/caja');
                                    }}
                                >
                                    Ir a la Vista de Caja
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MoneyDelivery;
