import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Plus, ArrowUpCircle, ArrowDownCircle, Loader2,
    Banknote, CheckCircle2, Clock, Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

const CashDisbursements = () => {
    const [salidas, setSalidas] = useState<any[]>([]);
    const [isNewDialog, setIsNewDialog] = useState(false);
    const [isLiquidarDialog, setIsLiquidarDialog] = useState(false);
    const [filterEstado, setFilterEstado] = useState('all');
    const [selectedSalida, setSelectedSalida] = useState<any>(null);

    const [newSalida, setNewSalida] = useState({ destinatario: '', motivo: '', entregado: 0, observaciones: '' });
    const [liquidacion, setLiquidacion] = useState({ usado: 0, vuelto: 0, comprobante: '' });
    const [isLoading, setIsLoading] = useState(true);

    const fetchSalidas = async () => {
        try {
            const salidas = await cajaService.getSalidasCaja();
            setSalidas(salidas);
        } catch (error) {
            console.log("ERROR COMPLETO:", error);
            console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
            toast.error(formatErrorMessage('Error al obtener salidas de caja', error, 'No se pudieron obtener las salidas de caja.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalidas();
    }, []);

    const createSalida = useMutation({
        mutationFn: async (data: { destinatario: string; motivo: string; entregado: number }) => {
            try {
                const response = await cajaService.createSalidaCaja(data);
                return response;
            } catch (error) {
                console.error("Error al crear salida:", error);
                throw error;
            }
        },
        onSuccess: () => {
            fetchSalidas();
        },
        onError: (error) => {
            console.error("ERROR COMPLETO:", error);
            console.error("RESPUESTA DEL SERVIDOR:", error.stack);
            toast.error(formatErrorMessage('Error al crear salida de caja', error, 'No se pudo crear la salida de caja.'));
        }
    });

    const liquidarSalida = useMutation({
        mutationFn: async (data: { id: number; usado: number; vuelto: number; comprobante: string }) => {
            try {
                const response = await cajaService.liquidarSalidaCaja(data);
                return response;
            } catch (error) {
                console.error("Error al liquidar salida:", error);
                throw error;
            }
        },
        onSuccess: () => {
            fetchSalidas();
        },
        onError: (error) => {
            console.error("ERROR COMPLETO:", error);
            console.error("RESPUESTA DEL SERVIDOR:", error.stack);
            toast.error(formatErrorMessage('Error al liquidar salida de caja', error, 'No se pudo liquidar la salida de caja.'));
        }
    });

    const totalEntregado = salidas?.reduce((acc, s) => acc + Number(s.entregado), 0);
    const totalDevuelto = salidas?.reduce((acc, s) => acc + Number(s.vuelto), 0);
    const pendientes = salidas?.filter(s => s.estado === 'ENTREGADO').length;

    const handleCreate = async () => {
        try {
            if (!newSalida.destinatario || !newSalida.motivo || newSalida.entregado <= 0) return;
            await createSalida.mutateAsync(newSalida);
            setIsNewDialog(false);
            setNewSalida({ destinatario: '', motivo: '', entregado: 0, observaciones: '' });
        } catch (error) {
            console.log("ERROR COMPLETO:", error);
            console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
            toast.error(formatErrorMessage('Error al crear salida', error, 'No se pudo crear la salida.'));
        }
    };

    const handleLiquidar = async () => {
        try {
            if (!selectedSalida) return;
            await liquidarSalida.mutateAsync({
                id: selectedSalida.id,
                usado: liquidacion.usado,
                vuelto: liquidacion.vuelto,
                comprobante: liquidacion.comprobante,
            });
            setIsLiquidarDialog(false);
            setSelectedSalida(null);
            setLiquidacion({ usado: 0, vuelto: 0, comprobante: '' });
        } catch (error) {
            console.log("ERROR COMPLETO:", error);
            console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
            toast.error(formatErrorMessage('Error al liquidar salida', error, 'No se pudo liquidar la salida.'));
            if (error.response?.status === 403) {
                toast.error("Usted no tiene autorización para realizar esta acción");
            }
        }
    };

    const itemsPerPage = 6;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(salidas.length / itemsPerPage);

    const paginatedSalidas = salidas.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    const openLiquidar = (salida: any) => {
        setSelectedSalida(salida);
        const montoEntregado = Number(salida.entregado);
        setLiquidacion({ usado: montoEntregado, vuelto: 0, comprobante: '' });
        setIsLiquidarDialog(true);
    };

    const HandleEntregar = async (salida: any) => {
        setSelectedSalida(salida);
        try {
            if (!selectedSalida) return;
            await cajaService.entregarSalidaCaja({
                id: selectedSalida.id,
            });
            setSelectedSalida(null);
            fetchSalidas();
        } catch (error) {
            console.log("ERROR COMPLETO:", error);
            console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
            toast.error(formatErrorMessage('Error al entregar salida', error, 'No se pudo entregar la salida.'));
            if (error.response?.status === 403) {
                toast.error("Usted no tiene autorización para realizar esta acción");
            }
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE': return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">Pendiente</Badge>;
            case 'ENTREGADO': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Entregado</Badge>;
            case 'LIQUIDADO': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Liquidado</Badge>;
            default: return <Badge variant="outline">{estado}</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Salidas de Caja</h1>
                    <p className="text-muted-foreground">Dinero entregado al personal para compras y su liquidación</p>
                </div>
                <Dialog open={isNewDialog} onOpenChange={setIsNewDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-warm hover:opacity-90"><Plus className="h-4 w-4 mr-2" />Nueva Salida</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Registrar Salida de Caja</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Destinatario</Label>
                                <Input placeholder="Nombre del receptor" value={newSalida.destinatario} onChange={(e) => setNewSalida({ ...newSalida, destinatario: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Motivo</Label>
                                <Input placeholder="¿Para qué se necesita?" value={newSalida.motivo} onChange={(e) => setNewSalida({ ...newSalida, motivo: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Monto Entregado (S/)</Label>
                                <Input type="number" placeholder="0.00" value={newSalida.entregado || ''} onChange={(e) => setNewSalida({ ...newSalida, entregado: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Observaciones</Label>
                                <Textarea placeholder="Notas adicionales..." value={newSalida.observaciones} onChange={(e) => setNewSalida({ ...newSalida, observaciones: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewDialog(false)}>Cancelar</Button>
                            <Button onClick={handleCreate} disabled={createSalida.isPending}>
                                {createSalida.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Registrar Salida
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
                            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <ArrowDownCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Entregado</p>
                                <p className="text-xl font-bold text-red-600">S/ {totalEntregado.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <ArrowUpCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Devuelto</p>
                                <p className="text-xl font-bold text-emerald-600">S/ {totalDevuelto.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pendientes de Liquidar</p>
                                <p className="text-xl font-bold text-amber-600">{pendientes}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ENTREGADO">Entregado</SelectItem>
                        <SelectItem value="LIQUIDADO">Liquidado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Registro de Salidas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Destinatario</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Entregado</TableHead>
                                <TableHead className="text-right">Usado</TableHead>
                                <TableHead className="text-right">Vuelto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salidas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay salidas registradas</TableCell>
                                </TableRow>
                            ) : (
                                paginatedSalidas.map((salida) => (
                                    <TableRow key={salida.id}>
                                        <TableCell>{format(new Date(salida.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                        <TableCell className="font-medium">{salida.destinatario}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{salida.motivo}</TableCell>
                                        <TableCell className="text-right font-bold text-red-600">S/ {Number(salida.entregado).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{salida.estado === 'LIQUIDADO' ? `S/ ${Number(salida.usado).toFixed(2)}` : '-'}</TableCell>
                                        <TableCell className="text-right text-emerald-600">{salida.estado === 'LIQUIDADO' ? `S/ ${Number(salida.vuelto).toFixed(2)}` : '-'}</TableCell>
                                        <TableCell>{getEstadoBadge(salida.estado)}</TableCell>
                                        <TableCell className="text-right">
                                            {salida.estado === 'PENDIENTE' && (
                                                <Button variant="outline" size="sm" onClick={() => HandleEntregar(salida)}>
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />Entregar
                                                </Button>
                                            )}
                                            {salida.estado === 'ENTREGADO' && (
                                                <Button variant="outline" size="sm" onClick={() => openLiquidar(salida)}>
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />Liquidar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
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

            {/* Liquidar Dialog */}
            <Dialog open={isLiquidarDialog} onOpenChange={setIsLiquidarDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Liquidar Salida de Caja</DialogTitle></DialogHeader>
                    {selectedSalida && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Destinatario:</span>
                                    <span className="font-medium">{selectedSalida.destinatario}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Monto Entregado:</span>
                                    <span className="font-bold text-red-600">S/ {Number(selectedSalida.entregado).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Monto Usado (S/)</Label>
                                <Input
                                    type="number" placeholder="0.00"
                                    value={liquidacion.usado || ''}
                                    onChange={(e) => {
                                        const usado = parseFloat(e.target.value) || 0;
                                        setLiquidacion({
                                            ...liquidacion,
                                            usado: usado,
                                            vuelto: Math.max(0, Number(selectedSalida.entregado) - usado),
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vuelto (S/)</Label>
                                <Input type="number" readOnly className="bg-muted" value={Number(liquidacion.vuelto).toFixed(2)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Comprobante / Referencia</Label>
                                <Input placeholder="Nro. de boleta, etc." value={liquidacion.comprobante} onChange={(e) => setLiquidacion({ ...liquidacion, comprobante: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLiquidarDialog(false)}>Cancelar</Button>
                        <Button onClick={handleLiquidar} disabled={liquidarSalida.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                            {liquidarSalida.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmar Liquidación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CashDisbursements;
