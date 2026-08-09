<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardService
{
    /**
     * Retorna todos los KPIs del dashboard
     */
    public function getDashboardKPIs()
    {
        return Cache::remember('dashboard_kpis', 60, function () {

            return [
                'ventas'   => $this->getVentasStats(),
                'cobros'   => $this->getCobrosStats(),
                'stock'    => $this->getStockStats(),
                'clientes' => $this->getClientesStats(),
                'rutas'    => $this->getRutasStats(),
                'ultimas_ventas' => $this->getUltimasVentas(),
                'stock_bajo' => $this->getStockBajo(),
                'clientes_totales' => $this->getClientesTotales(),
                'clientes_morosos' => $this->getClientesMorosos(),
            ];
        });
    }

    public function getDashboardKPIsVendedor()
    {
        $usuario_id = auth()->user()->id;

        return Cache::remember("dashboard_kpis_vendedor_{$usuario_id}", 15, function () use ($usuario_id) {
            $vendedor = DB::table('vendedores')
                ->where('usuario_id', $usuario_id)
                ->first();

            $vendedorId = $vendedor ? $vendedor->id : null;

            $activeSalida = null;
            if ($vendedorId) {
                $activeSalida = \App\Models\Salida::with(['vehiculo', 'ruta', 'rutas'])
                    ->where('vendedor_id', $vendedorId)
                    ->where('estado', 'EN_RUTA')
                    ->first();
            }

            if (!$activeSalida) {
                return [
                    'tiene_salida_activa' => false,
                    'salida_activa'       => null,
                    'resumen_dinero'      => [
                        'total_ventas'       => 0,
                        'ventas_contado'     => 0,
                        'ventas_credito'     => 0,
                        'adelantos_credito'  => 0,
                        'total_cobranzas'    => 0,
                        'total_entregas'     => 0,
                        'efectivo_total'     => 0,
                        'efectivo_ventas'    => 0,
                        'efectivo_cobranzas' => 0,
                        'efectivo_entregas'  => 0,
                        'yape_total'         => 0,
                        'yape_ventas'        => 0,
                        'yape_cobranzas'     => 0,
                        'yape_entregas'      => 0,
                        'plin_total'         => 0,
                        'plin_ventas'        => 0,
                        'plin_cobranzas'     => 0,
                        'plin_entregas'      => 0,
                        'deposito_total'     => 0,
                        'deposito_ventas'    => 0,
                        'deposito_cobranzas' => 0,
                        'deposito_entregas'  => 0,
                    ],
                    'creditos_pendientes' => ['total_saldo' => 0, 'cuentas' => []],
                    'stock_en_ruta'       => [],
                    'ventas_hoy'          => 0,
                    'cobros_hoy'          => 0,
                    'rutas_hoy'           => 0,
                    'clientes_visitados'  => 0,
                    'total_clientes'      => $this->getClientesStats(),
                    'tareas_hoy'          => $this->getTareasPorVendedor(),
                ];
            }

            // Nombres de las rutas asignadas a la salida vigente
            $rutasNombres = collect([$activeSalida->ruta?->nombre])
                ->concat($activeSalida->rutas ? $activeSalida->rutas->pluck('nombre') : [])
                ->filter()
                ->unique()
                ->implode(', ');

            $salidaInfo = [
                'id'         => $activeSalida->id,
                'fecha'      => $activeSalida->fecha,
                'conductor'  => $activeSalida->conductor,
                'vehiculo'   => $activeSalida->vehiculo ? ($activeSalida->vehiculo->placa . ' - ' . $activeSalida->vehiculo->marca) : 'N/A',
                'rutas'      => $rutasNombres ?: 'Sin ruta especificada',
                'zona'       => $activeSalida->zona,
            ];

            $resumenDinero = $this->getResumenDineroVendedor($vendedorId, $usuario_id, $activeSalida);
            $creditosPendientes = $this->getCreditosPendientesRutasVendedor($vendedorId, $activeSalida);
            $stockEnRuta = $this->getStockEnRutaVendedor($vendedorId, $activeSalida);

            return [
                'tiene_salida_activa' => true,
                'salida_activa'       => $salidaInfo,
                'resumen_dinero'      => $resumenDinero,
                'creditos_pendientes' => $creditosPendientes,
                'stock_en_ruta'       => $stockEnRuta,
                'ventas_hoy'          => $resumenDinero['total_ventas'],
                'cobros_hoy'          => $resumenDinero['total_cobranzas'],
                'rutas_hoy'           => $this->getRutasPorVendedor(),
                'clientes_visitados'  => $this->getClientesVisitadosPorVendedorSalida($vendedorId, $activeSalida),
                'total_clientes'      => $this->getClientesStats(),
                'tareas_hoy'          => $this->getTareasPorVendedor(),
            ];
        });
    }

    public function getDashboardKPIsAlmacenero()
    {
        return Cache::remember('dashboard_kpis_almacenero', 60, function () {

            return [
                'total_productos' => $this->getTotalProductos(),
                'total_stock' => $this->getTotalStock(),
                'total_stock_bajo' => $this->getStockBajoCantidad(),
                'valor_inventario' => $this->getValorInventario(),
                'total_movimientos_hoy' => $this->getTotalMovimientosHoy(),
                'stock_bajo' => $this->getStockBajo(),
                'ultimos_movimientos' => $this->getUltimosMovimientos(),
            ];
        });
    }

    public function getDashboardKPIsCajero()
    {
        return Cache::remember('dashboard_kpis_cajero', 60, function () {

            return [
                'total_ingresos_hoy' => $this->getTotalIngresosHoy(),
                'total_ventas_contado_hoy' => $this->getTotalVentasContadoHoy(),
                'total_cobros_hoy' => $this->getTotalCobrosHoy(),
                'estado_caja' => $this->getEstadoCaja(),
                'ventas_mas_recientes' => $this->getVentasMasRecientes(),
                'resumen_caja' => $this->getResumenCaja(),
            ];
        });
    }

    public function getDashboardKPIsMantenimiento()
    {
        return Cache::remember('dashboard_kpis_mantenimiento', 60, function () {

            return [
                'total_vehiculos' => $this->getTotalVehiculos(),
                'total_vehiculos_mantenimiento' => $this->getTotalVehiculosMantenimiento(),
                'rutas_activas' => $this->getRutasActivas(),
                'mantenimiento_mas_proximo' => $this->getMantenimientoMasProximo(),
                'mantenimientos_mas_proximos' => $this->getMantenimientosMasProximos(),
                'vehiculos' => $this->getVehiculos(),
            ];
        });
    }

    /**
     * ==========================
     * ADMIN, GERENTE, SUPERVISOR
     * ==========================
     */

    /**
     * ==========================
     * VENTAS
     * ==========================
     */
    private function getVentasStats()
    {
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $ventasHoy = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->where('estado', 'CONFIRMADA')
            ->sum('total_neto');

        $ventasSemana = DB::table('ventas')
            ->where('fecha', '>=', $startOfWeek)
            ->where('estado', 'CONFIRMADA')
            ->sum('total_neto');

        $ventasMes = DB::table('ventas')
            ->where('fecha', '>=', $startOfMonth)
            ->where('estado', 'CONFIRMADA')
            ->sum('total_neto');

        $transaccionesHoy = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->where('estado', 'CONFIRMADA')
            ->count();

        return [
            'hoy'       => (float) $ventasHoy,
            'semana'    => (float) $ventasSemana,
            'mes'       => (float) $ventasMes,
            'total_hoy' => (int) $transaccionesHoy,
        ];
    }

    /**
     * ==========================
     * COBROS
     * ==========================
     */
    private function getCobrosStats()
    {
        $today = Carbon::today();

        $cobrosHoy = DB::table('abonos')
            ->whereDate('fecha', $today)
            ->where('estado', 'ACTIVO')
            ->sum('monto');

        $pendientes = DB::table('cuentas_por_cobrar')
            ->whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->sum('saldo');

        $vencido = DB::table('cuentas_por_cobrar')
            ->where('fecha_vencimiento', '<', $today)
            ->whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->sum('saldo');

        return [
            'hoy'        => (float) $cobrosHoy,
            'pendientes' => (float) $pendientes,
            'vencido'    => (float) $vencido,
        ];
    }

    /**
     * ==========================
     * STOCK
     * ==========================
     */
    private function getStockStats()
    {
        $productosBajoStock = DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->whereColumn('stock_actual.cantidad', '<', 'productos.stock_minimo')
            ->distinct()
            ->count('productos.id');

        $totalProductos = DB::table('productos')->count();

        $valorTotal = DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->select(DB::raw('SUM(stock_actual.cantidad * productos.precio_base) as total'))
            ->value('total');

        return [
            'cuenta_stock_bajo' => (int) $productosBajoStock,
            'total_productos'   => (int) $totalProductos,
            'valor_total'       => (float) $valorTotal,
        ];
    }

    /**
     * ==========================
     * CLIENTES
     * ==========================
     */
    private function getClientesStats()
    {
        $today = Carbon::today();

        $totalClientes = DB::table('clientes')->count();

        $clientesMorosos = DB::table('clientes')
            ->join('cuentas_por_cobrar', 'clientes.id', '=', 'cuentas_por_cobrar.cliente_id')
            ->where('cuentas_por_cobrar.fecha_vencimiento', '<', $today)
            ->where('cuentas_por_cobrar.estado', 'pendiente')
            ->distinct()
            ->count('clientes.id');

        $clientesActivos = $totalClientes - $clientesMorosos;

        return [
            'total'   => (int) $totalClientes,
            'activos' => (int) $clientesActivos,
            'morosos' => (int) $clientesMorosos,
        ];
    }

    /**
     * ==========================
     * RUTAS
     * ==========================
     */
    private function getRutasStats()
    {
        $today = Carbon::today();

        $clientesVisitados = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->distinct()
            ->count('cliente_id');

        $rutasVisitadas = DB::table('ventas')
            ->join('clientes', 'ventas.cliente_id', '=', 'clientes.id')
            ->whereDate('ventas.fecha', $today)
            ->distinct()
            ->count('clientes.ruta_id');

        $clientesTotalesRutas = DB::table('clientes')->count();

        $eficiencia = 0;

        if ($clientesTotalesRutas > 0) {
            $eficiencia = ($clientesVisitados / $clientesTotalesRutas) * 100;
        }

        return [
            'visitadas_hoy'      => (int) $rutasVisitadas,
            'clientes_visitados' => (int) $clientesVisitados,
            'eficiencia'         => round($eficiencia, 1),
        ];
    }

    //Obtener ultimas 2 ventas con venta_items y data de cada producto en un subarray
    public function getUltimasVentas()
    {
        $ventas = DB::table('ventas')
            ->where('estado', 'CONFIRMADA')
            ->join('clientes', 'ventas.cliente_id', '=', 'clientes.id')
            ->select('ventas.*', 'clientes.razon_social as cliente')
            ->orderBy('ventas.fecha', 'desc')
            ->limit(2)
            ->get();

        foreach ($ventas as $venta) {
            $venta->items = DB::table('venta_items')
                ->join('productos', 'venta_items.producto_id', '=', 'productos.id')
                ->select('venta_items.*', 'productos.nombre as producto')
                ->where('venta_items.venta_id', $venta->id)
                ->get();
        }

        return $ventas;
    }

    //Obtener stock bajo 
    //Listar productos con stock bajo
    public function getStockBajo()
    {
        return DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->whereColumn('stock_actual.cantidad', '<', 'productos.stock_minimo')
            ->distinct()
            ->get();
    }

    //Obtener clientes totales
    public function getClientesTotales()
    {
        return DB::table('clientes')->get();
    }

    //Clientes morosos, estado PENDIENTE O PARCIAL, listar clientes.
    public function getClientesMorosos()
    {
        return DB::table('clientes')
            ->join('cuentas_por_cobrar', 'clientes.id', '=', 'cuentas_por_cobrar.cliente_id')
            ->where('cuentas_por_cobrar.fecha_vencimiento', '<', Carbon::today())
            ->whereIn('cuentas_por_cobrar.estado', ['PENDIENTE', 'PARCIAL'])
            ->select('clientes.*', 'cuentas_por_cobrar.saldo as deuda_actual')
            ->distinct()
            ->get();
    }

    /**
     * ==========================
     * VENDEDOR
     * ==========================
     */

    //Total neto de ventas por vendedor autenticado
    public function getVentasPorVendedor(){

        $usuario_id = auth()->user()->id;

        $vendedor = DB::table('vendedores')
            ->where('usuario_id', $usuario_id)
            ->first();

        if($vendedor){
            $ventas = DB::table('ventas')
            ->where('vendedor_id', $vendedor->id)
            ->where('estado', 'CONFIRMADA')
            ->whereDate('fecha', Carbon::today())
            ->sum('total_neto');
        }else{
            $ventas = 0;
        }

        return $ventas;
    }

    //Total de cobros del vendedor autenticado
    public function getCobrosPorVendedor(){

        $usuario_id = auth()->user()->id;

        if($usuario_id){
            $cobros = DB::table('abonos')
            ->where('usuario_id', $usuario_id)
            ->sum('monto');
        }else{
            $cobros = 0;
        }

        return $cobros;
    }

    //Total de rutas visitadas por vendedor autenticado
    public function getRutasPorVendedor(){

        $usuario_id = auth()->user()->id;

        $vendedor = DB::table('vendedores')
            ->where('usuario_id', $usuario_id)
            ->first();

        if($vendedor){
            $rutas_visitadas = DB::table('salidas')
            ->where('vendedor_id', $vendedor->id)
            ->where('estado', 'COMPLETADO')
            ->distinct()
            ->count('ruta_id');
        }else{
            $rutas_visitadas = 0;
        }

        //Calcular porcentaje de rutas visitadas
        $totalRutas = DB::table('rutas')->count();
        $porcentaje = ($rutas_visitadas / $totalRutas) * 100;

        return $porcentaje;
    }

    //Total de clientes visitados por vendedor autenticado
    public function getClientesVisitadosPorVendedor(){

        $usuario_id = auth()->user()->id;

        $vendedor = DB::table('vendedores')
            ->where('usuario_id', $usuario_id)
            ->first();

        if($vendedor){
            $clientes = DB::table('ventas')
            ->where('vendedor_id', $vendedor->id)
            ->whereDate('fecha', Carbon::today())
            ->distinct()
            ->count('cliente_id');
        }else{
            $clientes = 0;
        }

        return $clientes;
    }

    //Obtener tareas de vendedor autenticado
    public function getTareasPorVendedor(){

        $usuario_id = auth()->user()->id;

        $tareas = DB::table('tareas')
            ->where('usuario_id', $usuario_id)    
            ->where('fecha_limite', Carbon::today())
            ->where('estado', 'PENDIENTE')
            ->get();

        return $tareas;
    }



    // Total de clientes visitados durante la salida vigente
    public function getClientesVisitadosPorVendedorSalida($vendedorId, $activeSalida = null)
    {
        if (!$activeSalida) {
            $activeSalida = \App\Models\Salida::where('vendedor_id', $vendedorId)->where('estado', 'EN_RUTA')->first();
        }
        if (!$activeSalida) return 0;

        $fechaSalida = Carbon::parse($activeSalida->fecha)->toDateString();

        return DB::table('ventas')
            ->where('vendedor_id', $vendedorId)
            ->whereDate('fecha', '>=', $fechaSalida)
            ->distinct()
            ->count('cliente_id');
    }

    // Resumen de dinero por métodos separados acumulado en la Salida Vigente
    public function getResumenDineroVendedor($vendedorId, $usuarioId, $activeSalida = null)
    {
        if (!$activeSalida) {
            $activeSalida = \App\Models\Salida::where('vendedor_id', $vendedorId)->where('estado', 'EN_RUTA')->first();
        } elseif (is_numeric($activeSalida)) {
            $activeSalida = \App\Models\Salida::find($activeSalida);
        }

        if (!$activeSalida) {
            return [
                'total_ventas'       => 0,
                'ventas_contado'     => 0,
                'ventas_credito'     => 0,
                'adelantos_credito'  => 0,
                'total_cobranzas'    => 0,
                'total_entregas'     => 0,
                'efectivo_total'     => 0,
                'efectivo_ventas'    => 0,
                'efectivo_cobranzas' => 0,
                'efectivo_entregas'  => 0,
                'yape_total'         => 0,
                'yape_ventas'        => 0,
                'yape_cobranzas'     => 0,
                'yape_entregas'      => 0,
                'plin_total'         => 0,
                'plin_ventas'        => 0,
                'plin_cobranzas'     => 0,
                'plin_entregas'      => 0,
                'deposito_total'     => 0,
                'deposito_ventas'    => 0,
                'deposito_cobranzas' => 0,
                'deposito_entregas'  => 0,
            ];
        }

        $fechaSalida = Carbon::parse($activeSalida->fecha)->toDateString();

        $ventas = \App\Models\Venta::with(['pagos'])
            ->where('vendedor_id', $vendedorId)
            ->where('estado', 'CONFIRMADA')
            ->where(function ($query) use ($activeSalida, $fechaSalida) {
                $query->whereHas('items', function ($itemQ) use ($activeSalida) {
                    $itemQ->where('salida_id', $activeSalida->id);
                })->orWhereDate('fecha', '>=', $fechaSalida);
            })
            ->get();

        $abonos = DB::table('abonos')
            ->where('usuario_id', $usuarioId)
            ->where('estado', 'ACTIVO')
            ->whereDate('fecha', '>=', $fechaSalida)
            ->get();

        $efectivoVentas = 0;
        $yapeVentas = 0;
        $plinVentas = 0;
        $depositoVentas = 0;

        foreach ($ventas as $v) {
            if ($v->pagos && $v->pagos->count() > 0) {
                foreach ($v->pagos as $pago) {
                    $metodo = strtoupper(trim($pago->metodo_pago));
                    $monto = (float) $pago->monto;

                    if ($metodo === 'YAPE') {
                        $yapeVentas += $monto;
                    } elseif ($metodo === 'PLIN') {
                        $plinVentas += $monto;
                    } elseif (in_array($metodo, ['DEPOSITO', 'TRANSFERENCIA'])) {
                        $depositoVentas += $monto;
                    } else {
                        $efectivoVentas += $monto;
                    }
                }
            } else {
                $mp = strtoupper(trim($v->metodo_pago_detalle ?? ''));
                $montoVenta = $v->tipo_pago === 'CONTADO' ? (float)$v->total_neto : (float)$v->adelanto;

                if ($mp === 'YAPE') {
                    $yapeVentas += $montoVenta;
                } elseif ($mp === 'PLIN') {
                    $plinVentas += $montoVenta;
                } elseif (in_array($mp, ['DEPOSITO', 'TRANSFERENCIA'])) {
                    $depositoVentas += $montoVenta;
                } else {
                    $efectivoVentas += $montoVenta;
                }
            }
        }

        $efectivoCobranzas = 0;
        $yapeCobranzas = 0;
        $plinCobranzas = 0;
        $depositoCobranzas = 0;

        foreach ($abonos as $abono) {
            $metodo = strtoupper(trim($abono->metodo_pago));
            $monto = (float) $abono->monto;

            if ($metodo === 'YAPE') {
                $yapeCobranzas += $monto;
            } elseif ($metodo === 'PLIN') {
                $plinCobranzas += $monto;
            } elseif (in_array($metodo, ['DEPOSITO', 'TRANSFERENCIA'])) {
                $depositoCobranzas += $monto;
            } else {
                $efectivoCobranzas += $monto;
            }
        }

        // Entregas de dinero / Transferencias realizadas por el vendedor en esta salida
        $entregasItems = DB::table('entregas_dinero_item')
            ->join('entregas_de_dinero', 'entregas_dinero_item.entrega_id', '=', 'entregas_de_dinero.id')
            ->where('entregas_de_dinero.usuario_id', $usuarioId)
            ->whereIn('entregas_de_dinero.estado', ['PENDIENTE', 'ACEPTADA'])
            ->whereDate('entregas_de_dinero.created_at', '>=', $fechaSalida)
            ->select('entregas_dinero_item.metodo_pago', 'entregas_dinero_item.monto')
            ->get();

        $efectivoEntregas = 0;
        $yapeEntregas = 0;
        $plinEntregas = 0;
        $depositoEntregas = 0;

        foreach ($entregasItems as $item) {
            $metodo = strtoupper(trim($item->metodo_pago));
            $monto = (float) $item->monto;

            if ($metodo === 'YAPE') {
                $yapeEntregas += $monto;
            } elseif ($metodo === 'PLIN') {
                $plinEntregas += $monto;
            } elseif (in_array($metodo, ['DEPOSITO', 'TRANSFERENCIA'])) {
                $depositoEntregas += $monto;
            } else {
                $efectivoEntregas += $monto;
            }
        }

        $totalVentas = (float) $ventas->sum('total_neto');
        $totalVentasContado = (float) $ventas->where('tipo_pago', 'CONTADO')->sum('total_neto');
        $totalVentasCredito = (float) $ventas->where('tipo_pago', 'CREDITO')->sum('total_neto');
        $totalAdelantos = (float) $ventas->where('tipo_pago', 'CREDITO')->sum('adelanto');
        $totalCobranzas = (float) $abonos->sum('monto');
        $totalEntregas = $efectivoEntregas + $yapeEntregas + $plinEntregas + $depositoEntregas;

        return [
            'total_ventas'       => $totalVentas,
            'ventas_contado'     => $totalVentasContado,
            'ventas_credito'     => $totalVentasCredito,
            'adelantos_credito'  => $totalAdelantos,
            'total_cobranzas'    => $totalCobranzas,
            'total_entregas'     => $totalEntregas,

            'efectivo_total'     => $efectivoVentas + $efectivoCobranzas + $efectivoEntregas,
            'efectivo_ventas'    => $efectivoVentas,
            'efectivo_cobranzas' => $efectivoCobranzas,
            'efectivo_entregas'  => $efectivoEntregas,

            'yape_total'         => $yapeVentas + $yapeCobranzas + $yapeEntregas,
            'yape_ventas'        => $yapeVentas,
            'yape_cobranzas'     => $yapeCobranzas,
            'yape_entregas'      => $yapeEntregas,

            'plin_total'         => $plinVentas + $plinCobranzas + $plinEntregas,
            'plin_ventas'        => $plinVentas,
            'plin_cobranzas'     => $plinCobranzas,
            'plin_entregas'      => $plinEntregas,

            'deposito_total'     => $depositoVentas + $depositoCobranzas + $depositoEntregas,
            'deposito_ventas'    => $depositoVentas,
            'deposito_cobranzas' => $depositoCobranzas,
            'deposito_entregas'  => $depositoEntregas,
        ];
    }

    // Créditos pendientes de las rutas de la salida vigente (ordenados del más antiguo al más reciente)
    public function getCreditosPendientesRutasVendedor($vendedorId, $activeSalida = null)
    {
        if (!$activeSalida) {
            $activeSalida = \App\Models\Salida::with(['rutas'])->where('vendedor_id', $vendedorId)->where('estado', 'EN_RUTA')->first();
        } elseif (is_numeric($activeSalida)) {
            $activeSalida = \App\Models\Salida::with(['rutas'])->find($activeSalida);
        }

        if (!$activeSalida) {
            return [
                'total_saldo' => 0,
                'cuentas'     => [],
            ];
        }

        $rutaIds = collect();
        if ($activeSalida->ruta_id) {
            $rutaIds->push($activeSalida->ruta_id);
        }
        if ($activeSalida->rutas) {
            foreach ($activeSalida->rutas as $r) {
                $rutaIds->push($r->id);
            }
        }

        $rutaIds = $rutaIds->filter()->unique()->values();

        if ($rutaIds->isEmpty()) {
            return [
                'total_saldo' => 0,
                'cuentas'     => [],
            ];
        }

        $clientIds = DB::table('clientes')
            ->whereIn('ruta_id', $rutaIds)
            ->pluck('id')
            ->merge(
                DB::table('ruta_cliente')
                    ->whereIn('ruta_id', $rutaIds)
                    ->pluck('cliente_id')
            )
            ->unique()
            ->values()
            ->toArray();

        if (empty($clientIds)) {
            return [
                'total_saldo' => 0,
                'cuentas'     => [],
            ];
        }

        $cuentas = DB::table('cuentas_por_cobrar')
            ->join('clientes', 'cuentas_por_cobrar.cliente_id', '=', 'clientes.id')
            ->leftJoin('rutas', 'clientes.ruta_id', '=', 'rutas.id')
            ->leftJoin('ventas', 'cuentas_por_cobrar.venta_id', '=', 'ventas.id')
            ->whereIn('cuentas_por_cobrar.cliente_id', $clientIds)
            ->whereIn('cuentas_por_cobrar.estado', ['PENDIENTE', 'PARCIAL'])
            ->where('cuentas_por_cobrar.saldo', '>', 0)
            ->select(
                'cuentas_por_cobrar.id',
                'cuentas_por_cobrar.cliente_id',
                'cuentas_por_cobrar.venta_id',
                'cuentas_por_cobrar.fecha_vencimiento',
                'cuentas_por_cobrar.monto_total',
                'cuentas_por_cobrar.saldo',
                'cuentas_por_cobrar.estado',
                'clientes.razon_social as cliente_nombre',
                'clientes.codigo_cliente',
                'rutas.nombre as ruta_nombre',
                'ventas.codigo as venta_codigo',
                'ventas.fecha as venta_fecha'
            )
            ->orderBy('cuentas_por_cobrar.fecha_vencimiento', 'asc')
            ->get();

        return [
            'total_saldo' => (float) $cuentas->sum('saldo'),
            'cuentas'     => $cuentas,
        ];
    }

    // Stock de productos disponibles en la salida vigente (cantidad > 0)
    public function getStockEnRutaVendedor($vendedorId, $activeSalida = null)
    {
        if (!$activeSalida) {
            $activeSalida = \App\Models\Salida::where('vendedor_id', $vendedorId)->where('estado', 'EN_RUTA')->first();
        } elseif (is_numeric($activeSalida)) {
            $activeSalida = \App\Models\Salida::find($activeSalida);
        }

        if (!$activeSalida) {
            return [];
        }

        return DB::table('stock_vendedores')
            ->join('productos', 'stock_vendedores.producto_id', '=', 'productos.id')
            ->where('stock_vendedores.salida_id', $activeSalida->id)
            ->where('stock_vendedores.cantidad', '>', 0)
            ->select(
                'stock_vendedores.id',
                'stock_vendedores.producto_id',
                'stock_vendedores.salida_id',
                'stock_vendedores.cantidad as stock_disponible',
                'stock_vendedores.cantidad_entregada as stock_asignado',
                'stock_vendedores.vendido',
                'stock_vendedores.devuelto',
                'productos.nombre as producto_nombre',
                'productos.sku as producto_codigo',
                'productos.unidad_medida'
            )
            ->orderBy('productos.nombre', 'asc')
            ->get();
    }    

    /**
     * ==========================
     * ALMACENERO
     * ==========================
     */

    //Obtener total de productos
    public function getTotalProductos()
    {
        return DB::table('productos')->count();
    }

    //Obtener total de stock
    public function getTotalStock()
    {
        return DB::table('stock_actual')->sum('cantidad');
    }

    //Obtener cantidad de prodctos con stock bajo
    public function getStockBajoCantidad()
    {
        return DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->whereColumn('stock_actual.cantidad', '<', 'productos.stock_minimo')
            ->distinct()
            ->count('productos.id');
    }

    //Obtener valor del inventario actual
    public function getValorInventario()
    {
        return DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->sum(DB::raw('stock_actual.cantidad * productos.precio_base'));
    }

    //Obtener total de movimientos hoy
    public function getTotalMovimientosHoy()
    {
        return DB::table('movimiento_stock')
            ->whereDate('created_at', Carbon::today())
            ->count();
    }

    //Ultimos tres movimientos con productos
    public function getUltimosMovimientos()
    {
        return DB::table('movimiento_stock')
            ->join('productos', 'movimiento_stock.producto_id', '=', 'productos.id')
            ->orderBy('movimiento_stock.created_at', 'desc')
            ->limit(3)
            ->get();
    }

     /**
     * ==========================
     * CAJERO
     * ==========================
     */

     //Total ingresos hoy
     public function getTotalIngresosHoy()
     {
         return DB::table('cajas')
             ->whereDate('fecha', Carbon::today())
             ->sum('total_ingresos');
     }

     //Total ventas contado
     public function getTotalVentasContadoHoy()
     {
         return DB::table('ventas')
             ->where('tipo_pago', 'CONTADO')
             ->where('estado', 'CONFIRMADA')
             ->whereDate('fecha', Carbon::today())
             ->sum('total_neto');
     }

     //Total cobros hoy
     public function getTotalCobrosHoy()
     {
         return DB::table('abonos')
             ->whereDate('fecha', Carbon::today())
             ->sum('monto');
     }

     //Obtener estado de caja
     public function getEstadoCaja()
     {
        $caja = DB::table('cajas')
            ->whereDate('fecha', Carbon::today())
            ->first();

        if ($caja) {
            return $caja->estado;
        }

        return 'Cerrada';
     }

     //Obtener venta mas reciente
     public function getVentasMasRecientes()
     {
         return DB::table('ventas')
             ->join('clientes', 'ventas.cliente_id', '=', 'clientes.id')
             ->select('ventas.*', 'clientes.razon_social as cliente')
             ->orderBy('ventas.fecha', 'desc')
             ->limit(5)
             ->get();
     }

     //Resumen de caja (Ingresos, egresos, saldo actual)
     public function getResumenCaja()
     {
        $ingresos = DB::table('movimiento_caja')
            ->where('tipo', 'INGRESO')
            ->whereDate('created_at', Carbon::today())
            ->sum('monto');
        $egresos = DB::table('movimiento_caja')
            ->where('tipo', 'EGRESO')
            ->where('estado', 'APROBADO')
            ->whereDate('created_at', Carbon::today())
            ->sum('monto');
        $caja = DB::table('cajas')
            ->whereDate('fecha', Carbon::today())
            ->first();

        if ($caja) {
            return [
                'ingresos' => $ingresos,
                'egresos' => $egresos,
                'saldo' => $caja->saldo_inicial + $ingresos - $egresos,
            ];
        }

        return [
            'ingresos' => 0,
            'egresos' => 0,
            'saldo' => 0,
        ];
     }

     //FIDELIZACION Y RRHH AUN NO ESTAN IMPLEMENTADOS

     /**
     * ==========================
     * MANTENIMIENTO VEHICULAR
     * ==========================
     */

     //Obtener total de vehiculos disponibles
     public function getTotalVehiculos()
     {
         return DB::table('vehiculos')
         ->where('estado', 'DISPONIBLE')
         ->count();
     }

     //Obtener total de vehiculos en mantenimiento
     public function getTotalVehiculosMantenimiento()
     {
         return DB::table('vehiculos')
         ->where('estado', 'MANTENIMIENTO')
         ->count();
     }

     //Obtener rutas activas
     public function getRutasActivas()
     {
         return DB::table('rutas')
         ->where('activo', true)
         ->count();
     }

     //Obtener mantenimiento mas proximo
     public function getMantenimientoMasProximo()
     {
        $mantenimiento = DB::table('mantenimiento_vehiculo')
         ->join('vehiculos', 'mantenimiento_vehiculo.vehiculo_id', '=', 'vehiculos.id')
         ->where('mantenimiento_vehiculo.estado', 'PENDIENTE')
         ->orderBy('mantenimiento_vehiculo.fecha_programada', 'asc')
         ->first();

         if (!$mantenimiento) {
             return 'No hay mantenimientos programados';
         }

         return $mantenimiento;
     }

     //Obtener los tres mantenimientos mas proximos
     public function getMantenimientosMasProximos()
     {
         return DB::table('mantenimiento_vehiculo')
         ->join('vehiculos', 'mantenimiento_vehiculo.vehiculo_id', '=', 'vehiculos.id')
         ->where('mantenimiento_vehiculo.estado', 'PENDIENTE')
         ->orderBy('mantenimiento_vehiculo.fecha_programada', 'asc')
         ->limit(3)
         ->get();
     }

    public function getVehiculos()
    {
        $today = now();

        $subquery = DB::table('mantenimiento_vehiculo')
            ->select('vehiculo_id', DB::raw('MIN(fecha_programada) as proximo_mantenimiento'))
            ->where('fecha_programada', '>=', $today)
            ->groupBy('vehiculo_id');

        return DB::table('vehiculos')
            ->leftJoinSub($subquery, 'm', function ($join) {
                $join->on('vehiculos.id', '=', 'm.vehiculo_id');
            })
            ->leftJoin('mantenimiento_vehiculo as mv', function ($join) {
                $join->on('vehiculos.id', '=', 'mv.vehiculo_id')
                    ->on('mv.fecha_programada', '=', 'm.proximo_mantenimiento');
            })
            ->select(
                'vehiculos.*',
                'mv.id as mantenimiento_id',
                'mv.fecha_programada',
                'mv.descripcion',
                'mv.estado as estado_mantenimiento'
            )
            ->get();
    }
}