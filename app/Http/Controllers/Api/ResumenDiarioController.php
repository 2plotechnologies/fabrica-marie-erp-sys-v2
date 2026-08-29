<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\ResumenDiario;
use App\Models\Venta;
use App\Models\Gasto;
use App\Models\Abono;
use App\Models\Viatico;
use App\Models\Vendedor;
use App\Models\Salida;
use App\Models\Vehiculo;
use App\Models\EntregaDinero;
use App\Models\Ruta;
use Carbon\Carbon;

class ResumenDiarioController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = ResumenDiario::with('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'rutas', 'salida')
            ->orderBy('fecha', 'desc');

        if ($vendedor) {
            $query->where('vendedor_id', $vendedor->id);
        }

        $resumenes = $query->get()->map(function ($resumen) {
            $data = $resumen->toArray();
            $data['stock_audit'] = $this->getStockAuditForSalida($resumen->salida_id, $resumen->vendedor_id, $resumen->fecha);
            return $data;
        });

        return response()->json($resumenes);
    }

    public function getSalidas(Request $request)
    {
        $query = Salida::with('vendedor.usuario', 'vehiculo', 'ruta', 'rutas')
            ->where('estado', '!=', 'PENDIENTE');

        if ($request->filled('vendedor_id')) {
            $query->where('vendedor_id', $request->vendedor_id);
        }

        if ($request->filled('fecha')) {
            $fecha = $request->fecha;
            $query->where(function($q) use ($fecha) {
                $q->whereIn('estado', ['EN RUTA', 'EN_RUTA'])
                  ->orWhereDate('fecha', $fecha);
            });
        } else {
            $query->whereDate('fecha', '>=', Carbon::today()->subWeek(1));
        }

        $salidas = $query->orderBy('fecha', 'desc')->get();
        return response()->json($salidas);
    }

    public function autoResumenDiario(Request $request, $vendedor_id)
    {
        $vendedor = Vendedor::findOrFail($vendedor_id);

        $fecha = $request->filled('fecha')
            ? Carbon::parse($request->fecha)->startOfDay()
            : Carbon::today();

        $ventas = Venta::where('vendedor_id', $vendedor_id)
            ->where('estado', 'CONFIRMADA')
            ->whereDate('fecha', $fecha)
            ->get();
        
        $ventasContado = Venta::where('vendedor_id', $vendedor_id)
            ->where('estado', 'CONFIRMADA')
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'CONTADO')
            ->get();

        $gastos = Gasto::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('estado','!=', 'RECHAZADO')
            ->get();

        $cobranzas = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->where(function($q) { $q->whereNull('estado')->orWhere('estado', '!=', 'ANULADO'); })
            ->get();

        $cobranzas_deposito = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago', ['DEPOSITO', 'TRANSFERENCIA'])
            ->where(function($q) { $q->whereNull('estado')->orWhere('estado', '!=', 'ANULADO'); })
            ->get();

        $cobranzas_monedero_virtual = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago', ['YAPE', 'PLIN'])
            ->where(function($q) { $q->whereNull('estado')->orWhere('estado', '!=', 'ANULADO'); })
            ->get();

        $credito = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'CREDITO')
            ->where('estado', 'CONFIRMADA')
            ->get();

        $adelantos = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'CREDITO')
            ->where('estado', 'CONFIRMADA')
            ->get();

        $depositos = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('estado', 'CONFIRMADA')
            ->where(function($q) {
                $q->whereIn('metodo_pago_detalle', ['deposito', 'transferencia'])
                  ->orWhereHas('pagos', function($p) {
                      $p->whereIn('metodo_pago', ['DEPOSITO', 'TRANSFERENCIA']);
                  });
            })
            ->get();

        $monederoVirtual = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('estado', 'CONFIRMADA')
            ->where(function($q) {
                $q->whereIn('metodo_pago_detalle', ['yape', 'plin'])
                  ->orWhereHas('pagos', function($p) {
                      $p->whereIn('metodo_pago', ['YAPE', 'PLIN']);
                  });
            })
            ->get();

        $depositosVentas = 0;
        $monederoVirtualVentas = 0;

        foreach ($ventas as $v) {
            if ($v->pagos->count() > 0) {
                foreach ($v->pagos as $pago) {
                    $metodo = strtoupper($pago->metodo_pago);
                    if (in_array($metodo, ['DEPOSITO', 'TRANSFERENCIA'])) {
                        $depositosVentas += (float)$pago->monto;
                    } else if (in_array($metodo, ['YAPE', 'PLIN'])) {
                        $monederoVirtualVentas += (float)$pago->monto;
                    }
                }
            } else {
                $mp = strtolower($v->metodo_pago_detalle ?? '');
                $montoVentaPago = $v->tipo_pago === 'CONTADO' ? (float)$v->total_neto : (float)$v->adelanto;
                if (in_array($mp, ['deposito', 'transferencia'])) {
                    $depositosVentas += $montoVentaPago;
                } else if (in_array($mp, ['yape', 'plin'])) {
                    $monederoVirtualVentas += $montoVentaPago;
                }
            }
        }

        // Prioridad 1: Salida vigente EN RUTA del vendedor (para viajes largos / multidía)
        $salidaActiva = Salida::with('vehiculo', 'ruta', 'rutas')
            ->where('vendedor_id', $vendedor_id)
            ->whereIn('estado', ['EN RUTA', 'EN_RUTA'])
            ->orderBy('id', 'desc')
            ->first();

        // Prioridad 2: Si no hay salida EN RUTA, buscar salidas asociadas a la fecha especificada
        if (!$salidaActiva) {
            $salidaActiva = Salida::with('vehiculo', 'ruta', 'rutas')
                ->where('vendedor_id', $vendedor_id)
                ->whereDate('fecha', $fecha)
                ->whereIn('estado', ['FINALIZADO', 'COMPLETADO', 'EN RUTA', 'EN_RUTA', 'PENDIENTE'])
                ->orderBy('id', 'desc')
                ->first();
        }

        // Prioridad 3: Fallback a salida previa a la fecha
        if (!$salidaActiva) {
            $salidaActiva = Salida::with('vehiculo', 'ruta', 'rutas')
                ->where('vendedor_id', $vendedor_id)
                ->whereDate('fecha', '<=', $fecha)
                ->whereIn('estado', ['FINALIZADO', 'COMPLETADO', 'EN RUTA', 'EN_RUTA', 'PENDIENTE'])
                ->orderBy('fecha', 'desc')
                ->first();
        }

        $salidaId = $request->get('salida_id') ?: ($salidaActiva ? $salidaActiva->id : null);

        // Entregas de dinero aprobadas desde MoneyDelivery (estado ACEPTADA estrictamente)
        $entregasDinero = EntregaDinero::with('items')
            ->where('usuario_id', $vendedor->usuario_id)
            ->where('estado', 'ACEPTADA')
            ->whereDate('created_at', $fecha)
            ->get();
        $totalEntregasDinero = (float) $entregasDinero->sum('monto_total');

        $viaticos = Viatico::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('estado', ['APROBADO', 'LIQUIDADO'])
            ->get();
        $totalVentas = $ventas->sum('total_neto');
        $totalGastos = $gastos->sum('monto');
        $totalCobranzas = $cobranzas->sum('monto');
        $totalVentasContado = $ventasContado->sum('total_neto');
        $totalCredito = $credito->sum('total_neto');
        $totalAdelantos = $adelantos->sum('adelanto');
        $totalDepositos = $depositosVentas + $cobranzas_deposito->sum('monto');
        $totalMonederoVirtual = $monederoVirtualVentas + $cobranzas_monedero_virtual->sum('monto');
        $totalViaticos = $viaticos->sum('monto');

        $saldoEntregar = $totalVentasContado + $totalCobranzas + $totalAdelantos + $totalViaticos - $totalGastos - $totalDepositos - $totalMonederoVirtual - $totalEntregasDinero;
        if ($saldoEntregar < 0) {
            $saldoEntregar = 0;
        }

        $stockAudit = $this->getStockAuditForSalida($salidaId, $vendedor_id, $fecha);

        return response()->json([
            'ventas' => $ventas,
            'gastos' => $gastos,
            'cobranzas' => $cobranzas,
            'adelantos' => $adelantos,
            'credito' => $credito,
            'depositos' => $depositos,
            'monederoVirtual' => $monederoVirtual,
            'viaticos' => $viaticos,
            'entregasDinero' => $entregasDinero,
            'stockAudit' => $stockAudit,
            'totalVentas' => $totalVentas,
            'totalVentasContado' => $totalVentasContado,
            'totalCredito' => $totalCredito,
            'totalGastos' => $totalGastos,
            'totalCobranzas' => $totalCobranzas,
            'totalAdelantos' => $totalAdelantos,
            'totalDepositos' => $totalDepositos,
            'totalMonederoVirtual' => $totalMonederoVirtual,
            'totalViaticos' => $totalViaticos,
            'totalEntregasDinero' => $totalEntregasDinero,
            'saldoEntregar' => $saldoEntregar,
            'salida_id' => $salidaId,
            'salida' => $salidaActiva,
        ]);
    }

    public function store(Request $request)
    {
        //fecha	vendedor_id	vehiculo_id	ruta_id	salida_id	conductor	zona	contado	credito	cobranza	depositos	viaticos	total_gastos	saldo_a_entregar	saldo_entregado	diferencia	estado	firma	created_at	
        $request->validate([
            'vendedor_id' => 'required',
            'vehiculo_id' => 'nullable',
            'ruta_id' => 'nullable',
            'salida_id' => 'nullable',
            'conductor' => 'nullable',
            'zona' => 'nullable',
            'contado' => 'required',
            'credito' => 'required',
            'cobranza' => 'required',
            'depositos' => 'required',
            'monederoVirtual' => 'nullable',
            'viaticos' => 'required',
            'adelantos' => 'required',
            'total_gastos' => 'required|numeric|min:0',
            'saldo_a_entregar' => 'required|numeric|min:0',
            'saldo_entregado' => 'required|numeric|min:0',
            'diferencia' => 'required|numeric',
            'estado' => 'required',
            'firma' => 'required',
        ]);
        //Sumar depositos + monederoVirtual
        if($request->monederoVirtual){
            $request->depositos = $request->depositos + $request->monederoVirtual;
        }

        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;
        $vendedorId = $vendedor ? $vendedor->id : $request->vendedor_id;

        $salidaId = ($request->salida_id && $request->salida_id !== 'sin_salida' && $request->salida_id !== '0') ? $request->salida_id : null;
        
        $rutaIds = $request->input('ruta_ids', []);
        if (empty($rutaIds) && $request->filled('ruta_id') && $request->ruta_id !== 'sin_ruta' && $request->ruta_id !== '0') {
            $rutaIds = [(int)$request->ruta_id];
        }

        if (!empty($rutaIds) && $request->filled('zona')) {
            $rutasBD = Ruta::whereIn('id', $rutaIds)->get();
            foreach ($rutasBD as $r) {
                if ($r->zona !== $request->zona) {
                    return response()->json([
                        'error' => 'Todas las rutas seleccionadas deben pertenecer a la zona especificada (' . $request->zona . ').'
                    ], 400);
                }
            }
        }

        $resumenDiario = ResumenDiario::create(
            [
                'fecha' => $request->fecha,
                'vendedor_id' => $vendedorId,
                'vehiculo_id' => $request->vehiculo_id,
                'ruta_id' => !empty($rutaIds) ? $rutaIds[0] : null,
                'salida_id' => $salidaId,
                'conductor' => $request->conductor,
                'zona' => $request->zona,
                'contado' => $request->contado,
                'credito' => $request->credito,
                'cobranza' => $request->cobranza,
                'depositos' => $request->depositos,
                'viaticos' => $request->viaticos,
                'adelanto' => $request->adelantos,
                'total_gastos' => $request->total_gastos,
                'saldo_a_entregar' => $request->saldo_a_entregar,
                'saldo_entregado' => $request->saldo_entregado,
                'diferencia' => $request->diferencia,
                'estado' => $request->estado,
                'firma' => $request->firma,
                'created_at' => now(),
            ]
        );

        if (!empty($rutaIds)) {
            $resumenDiario->rutas()->sync($rutaIds);
        }

        //Asignar resumen_diario_id a gastos
        $gastos = Gasto::where('vendedor_id', $request->vendedor_id)->whereDate('fecha', $request->fecha)->get();
        foreach ($gastos as $gasto) {
            $gasto->resumen_diario_id = $resumenDiario->id;
            $gasto->save();
        }

        return response()->json($resumenDiario->load('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'rutas', 'salida'), 201);
    }

    public function updateEstado(Request $request, $id)
    {
        $resumenDiario = ResumenDiario::findOrFail($id);
        $resumenDiario->estado = $request->estado;
        // NOTA: El estado del resumen diario ya NO cambia automáticamente el estado del gasto
        // ni elimina su egreso en la caja. El estado del gasto se gestiona vía conciliación en caja.
        $resumenDiario->save();
        return response()->json($resumenDiario);
    }

    //Listar gastos
    public function getGastos()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = Gasto::with('vendedor.usuario')->orderBy('fecha', 'desc');

        if ($vendedor) {
            $query->where('vendedor_id', $vendedor->id);
        }

        $gastos = $query->get();
        return response()->json($gastos);
    }

    //Crear gasto
    public function storeGasto(Request $request)
    {
        $request->validate([
            'vendedor_id' => 'required',
            'monto' => 'required',
            'comprobante' => 'nullable',
            'tipo_comprobante' => 'required|string',
            'tipo' => 'required',
            'fecha' => 'required',
        ]);

        // Verificar que exista una caja abierta para registrar el gasto
        $cajaAbierta = \App\Models\Caja::whereDate('fecha', \Carbon\Carbon::today())
            ->where('estado', 'ABIERTA')
            ->first();

        if (!$cajaAbierta) {
            return response()->json([
                'message' => 'No se puede registrar el gasto porque no existe una caja abierta para el día de hoy.'
            ], 403);
        }

        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;
        $vendedorId = $vendedor ? $vendedor->id : $request->vendedor_id;

        $gasto = Gasto::create(
            [
                'vendedor_id' => $vendedorId,
                'monto' => $request->monto,
                'comprobante' => $request->comprobante,
                'tipo_comprobante' => $request->tipo_comprobante ?? 'Otro/Ninguno',
                'tipo' => $request->tipo,
                'fecha' => $request->fecha,
                'estado' => 'PENDIENTE',
            ]
        );

        // Obtener el objeto del vendedor con su usuario para construir la descripción de forma segura
        $vendedorObj = \App\Models\Vendedor::with('usuario')->find($vendedorId);
        $nombreVendedor = $vendedorObj?->usuario?->nombre ?? ('ID ' . $vendedorId);

        // Registrar egreso PENDIENTE en caja para conciliación por administradores.
        try {
            \App\Services\CajaService::registrarMovimiento([
                'tipo' => 'EGRESO',
                'estado' => 'PENDIENTE',
                'monto' => $request->monto,
                'metodo_pago' => 'EFECTIVO',
                'comprobante' => $request->comprobante,
                'categoria' => 'GASTO',
                'descripcion' => 'Gasto vendedor (' . $request->tipo . ') - Vendedor: ' . $nombreVendedor,
                'referencia_tipo' => 'GASTO',
                'referencia_id' => $gasto->id,
                'created_at' => $request->fecha ? \Carbon\Carbon::parse($request->fecha)->setTimeFrom(now()) : now(),
            ]);
        } catch (\Throwable $e) {
            // Silencioso si no existe caja abierta o error no crítico.
        }

        return response()->json($gasto, 201);
    }

    //Aprobar gasto
    public function aprobarGasto(Request $request, $id)
    {
        $gasto = Gasto::findOrFail($id);
        $gasto->estado = $request->estado;
        $gasto->save();
        return response()->json($gasto);
    }

    //Eliminar gasto (Solo en estado PENDIENTE)
    public function destroyGasto($id)
    {
        $gasto = Gasto::findOrFail($id);

        if ($gasto->estado !== 'PENDIENTE') {
            return response()->json([
                'message' => 'No se puede eliminar un gasto en estado ' . ($gasto->estado ?? 'NO PENDIENTE') . '. Solo se pueden eliminar gastos en estado PENDIENTE.'
            ], 422);
        }

        // Eliminar egreso pendiente en caja si existe
        \App\Models\MovimientoCaja::where('referencia_tipo', 'GASTO')
            ->where('referencia_id', $gasto->id)
            ->where('estado', 'PENDIENTE')
            ->delete();

        $gasto->delete();

        return response()->json([
            'message' => 'Gasto eliminado correctamente'
        ]);
    }

    public function getResumenGeneral(){
        $resumenDiario = ResumenDiario::with('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'rutas', 'salida')
        ->where('estado', '!=', 'PENDIENTE')
        ->where('estado', '!=', 'RECHAZADO')
        ->orderBy('fecha', 'desc')
        ->get();

        //Calcular totales
        $totalGastos = $resumenDiario->sum('total_gastos');
        $totalCobranzas = $resumenDiario->sum('cobranza');
        $totalVentasContado = $resumenDiario->sum('contado');
        $totalCredito = $resumenDiario->sum('credito');
        $totalAdelantos = $resumenDiario->sum('adelanto');
        $totalDepositos = $resumenDiario->sum('depositos');
        $totalViaticos = $resumenDiario->sum('viaticos');

        return response()->json([
            'resumenDiario' => $resumenDiario,
            'totalGastos' => $totalGastos,
            'totalCobranzas' => $totalCobranzas,
            'totalVentasContado' => $totalVentasContado,
            'totalCredito' => $totalCredito,
            'totalAdelantos' => $totalAdelantos,
            'totalDepositos' => $totalDepositos,
            'totalViaticos' => $totalViaticos,
        ]);
    }

    public function getResumenAcumuladoSalidas(Request $request)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $targetSalidaId = $request->input('salida_id');
        $result = collect();

        // 1. Obtener Salidas de fábrica en ruta (reales)
        if ($targetSalidaId !== 'sin_salida' && $targetSalidaId !== '0') {
            $query = Salida::with(['vendedor.usuario', 'vehiculo', 'ruta', 'rutas'])
                ->orderBy('fecha', 'desc');

            if ($vendedor) {
                $query->where('vendedor_id', $vendedor->id);
            }

            if ($request->filled('vendedor_id') && $request->vendedor_id !== 'all') {
                $query->where('vendedor_id', $request->vendedor_id);
            }

            if ($request->filled('salida_id') && $request->salida_id !== 'all') {
                $query->where('id', $request->salida_id);
            }

            $salidas = $query->get();

            $resultSalidas = $salidas->map(function ($salida) {
                $resumenes = ResumenDiario::with(['gastos', 'vendedor.usuario', 'vehiculo', 'ruta', 'rutas'])
                    ->where('salida_id', $salida->id)
                    ->orderBy('fecha', 'asc')
                    ->get();



                // Obtener fechas de los resúmenes de la salida
                $fechasResumenes = $resumenes->pluck('fecha')->map(function($f) {
                    return \Carbon\Carbon::parse($f)->toDateString();
                })->filter()->unique()->toArray();

                if (empty($fechasResumenes)) {
                    $fechasResumenes = [\Carbon\Carbon::parse($salida->fecha)->toDateString()];
                }

                // Viáticos de la salida (por salida_id o fechas del viaje del vendedor)
                $viaticosSalida = Viatico::where('vendedor_id', $salida->vendedor_id)
                    ->whereIn('estado', ['APROBADO', 'LIQUIDADO'])
                    ->where(function($q) use ($salida, $fechasResumenes) {
                        $q->where('salida_id', $salida->id)
                          ->orWhereIn(\Illuminate\Support\Facades\DB::raw('DATE(fecha)'), $fechasResumenes);
                    })
                    ->get();

                $totalContado = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('contado');
                $totalCredito = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('credito');
                $totalCobranza = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('cobranza');
                $totalAdelanto = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('adelanto');
                $totalDepositos = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('depositos');
                $totalGastos = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('total_gastos');
                $totalViaticos = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('viaticos');
                if ($totalViaticos == 0 && $viaticosSalida->isNotEmpty()) {
                    $totalViaticos = (float)$viaticosSalida->sum('monto');
                }
                $totalEntregado = (float)$resumenes->where('estado', 'CONFIRMADO')->sum('saldo_entregado');

                $saldoAcumuladoEntregar = $totalContado + $totalCobranza + $totalAdelanto + $totalViaticos - $totalGastos - $totalDepositos;
                if ($saldoAcumuladoEntregar < 0) {
                    $saldoAcumuladoEntregar = 0;
                }
                $diferenciaAcumulada = $totalEntregado - $saldoAcumuladoEntregar;

                $stockAudit = $this->getStockAuditForSalida($salida->id);

                return [
                    'salida' => $salida,
                    'resumenes' => $resumenes,
                    'viaticos' => $viaticosSalida,
                    'stockAudit' => $stockAudit,
                    'totales' => [
                        'totalContado' => $totalContado,
                        'totalCredito' => $totalCredito,
                        'totalCobranza' => $totalCobranza,
                        'totalAdelanto' => $totalAdelanto,
                        'totalDepositos' => $totalDepositos,
                        'totalGastos' => $totalGastos,
                        'totalViaticos' => $totalViaticos,
                        'saldoAcumuladoEntregar' => $saldoAcumuladoEntregar,
                        'totalEntregado' => $totalEntregado,
                        'diferenciaAcumulada' => $diferenciaAcumulada,
                        'cantDias' => $resumenes->count(),
                    ]
                ];
            });

            $result = $result->concat($resultSalidas);
        }

        // 2. Incluir resúmenes de Ventas de Fábrica (Sin Salida)
        if (!$targetSalidaId || $targetSalidaId === 'all' || $targetSalidaId === 'sin_salida' || $targetSalidaId === '0') {
            $sinSalidaQuery = ResumenDiario::with(['gastos', 'vendedor.usuario', 'vehiculo', 'ruta', 'rutas'])
                ->where(function($q) {
                    $q->whereNull('salida_id')->orWhere('salida_id', 0);
                })
                ->orderBy('fecha', 'desc');

            if ($vendedor) {
                $sinSalidaQuery->where('vendedor_id', $vendedor->id);
            }

            if ($request->filled('vendedor_id') && $request->vendedor_id !== 'all') {
                $sinSalidaQuery->where('vendedor_id', $request->vendedor_id);
            }

            $resumenesSinSalida = $sinSalidaQuery->get();

            if ($resumenesSinSalida->isNotEmpty()) {
                $grouped = $resumenesSinSalida->groupBy('vendedor_id');

                foreach ($grouped as $vendedorIdGroup => $resumenesGrupo) {
                    $primerResumen = $resumenesGrupo->first();
                    $vendedorObj = $primerResumen ? $primerResumen->vendedor : null;

                    $virtualSalida = [
                        'id' => 0,
                        'vendedor_id' => $vendedorIdGroup,
                        'fecha' => $primerResumen ? $primerResumen->fecha : date('Y-m-d'),
                        'estado' => 'VENTAS DE FÁBRICA',
                        'conductor' => 'Ventas de Fábrica',
                        'zona' => 'FÁBRICA (Sin Salida)',
                        'vendedor' => $vendedorObj,
                        'vehiculo' => null,
                        'ruta' => null,
                    ];

                    // Ventas de Fábrica no llevan viáticos de viaje.
                    $viaticosSalida = collect();
                    $totalViaticos = 0;

                    $totalContado = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('contado');
                    $totalCredito = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('credito');
                    $totalCobranza = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('cobranza');
                    $totalAdelanto = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('adelanto');
                    $totalDepositos = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('depositos');
                    $totalGastos = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('total_gastos');
                    $totalEntregado = (float)$resumenesGrupo->where('estado', 'CONFIRMADO')->sum('saldo_entregado');

                    $saldoAcumuladoEntregar = $totalContado + $totalCobranza + $totalAdelanto + $totalViaticos - $totalGastos - $totalDepositos;
                    if ($saldoAcumuladoEntregar < 0) {
                        $saldoAcumuladoEntregar = 0;
                    }
                    $diferenciaAcumulada = $totalEntregado - $saldoAcumuladoEntregar;

                    $result->push([
                        'salida' => $virtualSalida,
                        'resumenes' => $resumenesGrupo->values(),
                        'viaticos' => $viaticosSalida,
                        'stockAudit' => [],
                        'totales' => [
                            'totalContado' => $totalContado,
                            'totalCredito' => $totalCredito,
                            'totalCobranza' => $totalCobranza,
                            'totalAdelanto' => $totalAdelanto,
                            'totalDepositos' => $totalDepositos,
                            'totalGastos' => $totalGastos,
                            'totalViaticos' => $totalViaticos,
                            'saldoAcumuladoEntregar' => $saldoAcumuladoEntregar,
                            'totalEntregado' => $totalEntregado,
                            'diferenciaAcumulada' => $diferenciaAcumulada,
                            'cantDias' => $resumenesGrupo->count(),
                        ]
                    ]);
                }
            }
        }

        return response()->json($result->values());
    }

    private function getStockAuditForSalida($salidaId, $vendedorId = null, $fecha = null)
    {
        if (!$salidaId && $vendedorId && $fecha) {
            $salidaActiva = Salida::where('vendedor_id', $vendedorId)
                ->whereDate('fecha', '<=', $fecha)
                ->whereIn('estado', ['EN RUTA', 'EN_RUTA', 'PENDIENTE', 'FINALIZADO', 'COMPLETADO'])
                ->orderBy('fecha', 'desc')
                ->first();
            if ($salidaActiva) {
                $salidaId = $salidaActiva->id;
            }
        }

        if (!$salidaId) {
            return [
                'dias' => [],
                'items' => [],
            ];
        }

        $salidaModel = Salida::find($salidaId);
        $fechaSalida = $salidaModel ? Carbon::parse($salidaModel->fecha)->toDateString() : null;

        // Obtener todas las fechas únicas de ventas o resúmenes de esta salida
        $fechasVentas = \App\Models\VentaItem::where('salida_id', $salidaId)
            ->whereHas('venta', function($q) {
                $q->where('estado', 'CONFIRMADA');
            })
            ->join('ventas', 'venta_items.venta_id', '=', 'ventas.id')
            ->selectRaw('DATE(ventas.fecha) as fecha_dia')
            ->pluck('fecha_dia')
            ->toArray();

        $fechasResumenes = \App\Models\ResumenDiario::where('salida_id', $salidaId)
            ->selectRaw('DATE(fecha) as fecha_dia')
            ->pluck('fecha_dia')
            ->toArray();

        $todasFechas = array_values(array_unique(array_filter(array_merge(
            $fechaSalida ? [$fechaSalida] : [],
            $fechasVentas,
            $fechasResumenes
        ))));

        sort($todasFechas);

        if (empty($todasFechas)) {
            $todasFechas = [$fecha ? Carbon::parse($fecha)->toDateString() : date('Y-m-d')];
        }

        $dias = [];
        foreach ($todasFechas as $index => $fechaDia) {
            $dias[] = [
                'numero' => $index + 1,
                'etiqueta' => 'Día ' . ($index + 1),
                'fecha' => $fechaDia,
                'fecha_formateada' => Carbon::parse($fechaDia)->format('d/m'),
            ];
        }

        $stocks = \App\Models\StockVendedor::with('producto')
            ->where('salida_id', $salidaId)
            ->get();

        $salidaItems = \App\Models\SalidaItem::with('producto')
            ->where('salida_id', $salidaId)
            ->get();

        // Agrupar productos únicos de StockVendedor o SalidaItem.
        $productosList = collect();
        foreach ($stocks as $s) {
            if (!$productosList->contains('id', $s->producto_id)) {
                $productosList->push([
                    'id' => $s->producto_id,
                    'producto' => $s->producto,
                    'asignado' => (float) ($s->cantidad_entregada ?? ($s->cantidad + $s->vendido)),
                    'sobrante_actual' => (float) ($s->cantidad ?? 0),
                    'devueltos' => (float) ($s->devuelto ?? 0) + (float) ($s->defectuosos ?? 0),
                ]);
            }
        }

        foreach ($salidaItems as $item) {
            if (!$productosList->contains('id', $item->producto_id)) {
                $productosList->push([
                    'id' => $item->producto_id,
                    'producto' => $item->producto,
                    'asignado' => (float) $item->cantidad,
                    'sobrante_actual' => null,
                    'devueltos' => 0,
                ]);
            }
        }

        $itemsAudit = [];
        $vendedorIdAudit = $salidaModel ? $salidaModel->vendedor_id : $vendedorId;

        foreach ($productosList as $pInfo) {
            $productoId = $pInfo['id'];
            $productoObj = $pInfo['producto'];
            $stockAsignado = $pInfo['asignado'];

            $ventasPorDia = [];
            $totalVendido = 0;

            foreach ($dias as $d) {
                $fDia = $d['fecha'];
                $etiquetaDia = $d['etiqueta'];

                $cantVendidoDia = (float) \App\Models\VentaItem::where('producto_id', $productoId)
                    ->where(function($q) use ($salidaId) {
                        $q->where('salida_id', $salidaId)
                          ->orWhereHas('venta', function($vq) use ($salidaId) {
                              $vq->where('salida_id', $salidaId);
                          });
                    })
                    ->whereHas('venta', function($q) use ($fDia) {
                        $q->where('estado', 'CONFIRMADA')
                          ->whereDate('fecha', $fDia);
                    })
                    ->sum('cantidad');

                $ventasPorDia[$etiquetaDia] = $cantVendidoDia;
                $totalVendido += $cantVendidoDia;
            }

            $cantDevuelto = $pInfo['devueltos'];

            if ($pInfo['sobrante_actual'] !== null) {
                $sobrante = $pInfo['sobrante_actual'];
            } else {
                $sobrante = max(0, $stockAsignado - $totalVendido - $cantDevuelto);
            }

            $itemsAudit[] = [
                'producto_id' => $productoId,
                'producto' => $productoObj ? $productoObj->nombre : 'Producto #' . $productoId,
                'codigo' => $productoObj ? $productoObj->codigo : '',
                'stock_asignado' => $stockAsignado,
                'ventas_dias' => $ventasPorDia,
                'total_vendido' => $totalVendido,
                'total_devuelto' => $cantDevuelto,
                'sobrante' => $sobrante,
            ];
        }

        return [
            'dias' => $dias,
            'items' => $itemsAudit,
        ];
    }
}
