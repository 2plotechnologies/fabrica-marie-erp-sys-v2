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
use Carbon\Carbon;

class ResumenDiarioController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = ResumenDiario::with('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'salida')
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

    public function getSalidas()
    {
        //Solo salidas de la ultima semana.
        $salidas = Salida::with('vendedor.usuario', 'vehiculo', 'ruta')
        ->whereDate('fecha', '>=', Carbon::today()->subWeek(1))
        ->where('estado', '!=', 'PENDIENTE')
        ->orderBy('fecha', 'desc')
        ->get();
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
            ->get();

        $cobranzas_deposito = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago', ['DEPOSITO', 'TRANSFERENCIA'])
            ->get();

        $cobranzas_monedero_virtual = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago', ['YAPE', 'PLIN'])
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

        $salidaId = $request->get('salida_id');
        if (!$salidaId) {
            $salidaActiva = Salida::where('vendedor_id', $vendedor_id)
                ->whereDate('fecha', '<=', $fecha)
                ->whereIn('estado', ['EN RUTA', 'EN_RUTA', 'PENDIENTE', 'FINALIZADO', 'COMPLETADO'])
                ->orderBy('fecha', 'desc')
                ->first();
            if ($salidaActiva) {
                $salidaId = $salidaActiva->id;
            }
        }

        $viaticosQuery = Viatico::where('vendedor_id', $vendedor_id)
            ->whereIn('estado', ['APROBADO', 'LIQUIDADO']);

        if ($salidaId) {
            $viaticosQuery->where(function($q) use ($fecha, $salidaId) {
                $q->where('salida_id', $salidaId)
                  ->orWhereDate('fecha', $fecha);
            });
        } else {
            $viaticosQuery->whereDate('fecha', $fecha);
        }

        $viaticos = $viaticosQuery->get();
        $totalVentas = $ventas->sum('total_neto');
        $totalGastos = $gastos->sum('monto');
        $totalCobranzas = $cobranzas->sum('monto');
        $totalVentasContado = $ventasContado->sum('total_neto');
        $totalCredito = $credito->sum('total_neto');
        $totalAdelantos = $adelantos->sum('adelanto');
        $totalDepositos = $depositosVentas + $cobranzas_deposito->sum('monto');
        $totalMonederoVirtual = $monederoVirtualVentas + $cobranzas_monedero_virtual->sum('monto');
        $totalViaticos = $viaticos->sum('monto');

        $saldoEntregar = $totalVentasContado + $totalCobranzas + $totalAdelantos + $totalViaticos - $totalGastos - $totalDepositos - $totalMonederoVirtual;
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
            'saldoEntregar' => $saldoEntregar,
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
        $rutaId = ($request->ruta_id && $request->ruta_id !== 'sin_ruta' && $request->ruta_id !== '0') ? $request->ruta_id : null;

        $resumenDiario = ResumenDiario::create(
            [
                'fecha' => $request->fecha,
                'vendedor_id' => $vendedorId,
                'vehiculo_id' => $request->vehiculo_id,
                'ruta_id' => $rutaId,
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

        //Asignar resumen_diario_id a gastos
        $gastos = Gasto::where('vendedor_id', $request->vendedor_id)->whereDate('fecha', $request->fecha)->get();
        foreach ($gastos as $gasto) {
            $gasto->resumen_diario_id = $resumenDiario->id;
            $gasto->save();
        }


        return response()->json($resumenDiario, 201);
    }

    public function updateEstado(Request $request, $id)
    {
        $resumenDiario = ResumenDiario::findOrFail($id);
        $resumenDiario->estado = $request->estado;
        //Aprobar gastos automaticamente si es estado es CONFIRMADO (Usar resumen_diario_id).
        if($request->estado == 'CONFIRMADO'){
            $gastos = Gasto::where('resumen_diario_id', $id)->get();
            foreach ($gastos as $gasto) {
                $gasto->estado = 'CONFIRMADO';
                $gasto->save();
            }
        }
        //Rechazar gastos automaticamente si es estado es RECHAZADO (Usar resumen_diario_id)
        if($request->estado == 'RECHAZADO'){
            $gastos = Gasto::where('resumen_diario_id', $id)->get();
            foreach ($gastos as $gasto) {
                $gasto->estado = 'RECHAZADO';
                $gasto->save();
            }
        }
        $resumenDiario->save();
        return response()->json($resumenDiario);
    }

    //Listar gastos
    public function getGastos()
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        $query = Gasto::with('vendedor.usuario')->orderBy('id', 'desc');

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
            'tipo' => 'required',
            'fecha' => 'required',
        ]);

        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;
        $vendedorId = $vendedor ? $vendedor->id : $request->vendedor_id;

        $gasto = Gasto::create(
            [
                'vendedor_id' => $vendedorId,
                'monto' => $request->monto,
                'comprobante' => $request->comprobante,
                'tipo' => $request->tipo,
                'fecha' => $request->fecha,
                'estado' => 'PENDIENTE',
            ]
        );
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

    public function getResumenGeneral(){
        $resumenDiario = ResumenDiario::with('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'salida')
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
                $resumenes = ResumenDiario::with(['gastos', 'vendedor.usuario', 'vehiculo', 'ruta'])
                    ->where('salida_id', $salida->id)
                    ->orderBy('fecha', 'asc')
                    ->get();

                // Si no hay resúmenes asignados directamente por salida_id, buscar por vendedor y coincidencia de fecha
                if ($resumenes->isEmpty()) {
                    $resumenes = ResumenDiario::with(['gastos', 'vendedor.usuario', 'vehiculo', 'ruta'])
                        ->where('vendedor_id', $salida->vendedor_id)
                        ->whereDate('fecha', '>=', $salida->fecha)
                        ->orderBy('fecha', 'asc')
                        ->get();
                }

                // Viáticos de la salida
                $viaticosSalida = Viatico::where('salida_id', $salida->id)
                    ->orWhere(function($q) use ($salida) {
                        $q->where('vendedor_id', $salida->vendedor_id)
                          ->whereDate('fecha', $salida->fecha);
                    })
                    ->whereIn('estado', ['APROBADO', 'LIQUIDADO'])
                    ->get();

                $totalContado = (float)$resumenes->sum('contado');
                $totalCredito = (float)$resumenes->sum('credito');
                $totalCobranza = (float)$resumenes->sum('cobranza');
                $totalAdelanto = (float)$resumenes->sum('adelanto');
                $totalDepositos = (float)$resumenes->sum('depositos');
                $totalGastos = (float)$resumenes->sum('total_gastos');
                $totalViaticos = (float)$viaticosSalida->sum('monto');
                $totalEntregado = (float)$resumenes->sum('saldo_entregado');

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
            $sinSalidaQuery = ResumenDiario::with(['gastos', 'vendedor.usuario', 'vehiculo', 'ruta'])
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

                    $totalContado = (float)$resumenesGrupo->sum('contado');
                    $totalCredito = (float)$resumenesGrupo->sum('credito');
                    $totalCobranza = (float)$resumenesGrupo->sum('cobranza');
                    $totalAdelanto = (float)$resumenesGrupo->sum('adelanto');
                    $totalDepositos = (float)$resumenesGrupo->sum('depositos');
                    $totalGastos = (float)$resumenesGrupo->sum('total_gastos');
                    $totalEntregado = (float)$resumenesGrupo->sum('saldo_entregado');

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
            return [];
        }

        $stocks = \App\Models\StockVendedor::with('producto')
            ->where('salida_id', $salidaId)
            ->get();

        if ($stocks->isNotEmpty()) {
            return $stocks->map(function ($stock) {
                $asignado = (float) ($stock->cantidad_entregada ?? ($stock->cantidad + $stock->vendido));
                $vendido = (float) ($stock->vendido ?? 0);
                $sobrante = (float) ($stock->cantidad ?? 0);

                return [
                    'producto_id' => $stock->producto_id,
                    'producto' => $stock->producto ? $stock->producto->nombre : 'Producto #' . $stock->producto_id,
                    'codigo' => $stock->producto ? $stock->producto->codigo : '',
                    'stock_asignado' => $asignado,
                    'stock_vendido' => $vendido,
                    'sobrante' => $sobrante,
                ];
            })->values()->toArray();
        }

        // Fallback to SalidaItem if StockVendedor has no records for this salida
        $salidaItems = \App\Models\SalidaItem::with('producto')
            ->where('salida_id', $salidaId)
            ->get();

        return $salidaItems->map(function ($item) use ($salidaId) {
            $vendido = (float) \App\Models\VentaItem::where('salida_id', $salidaId)
                ->where('producto_id', $item->producto_id)
                ->whereHas('venta', function ($q) {
                    $q->where('estado', 'CONFIRMADA');
                })->sum('cantidad');
            
            $asignado = (float) $item->cantidad;
            $sobrante = max(0, $asignado - $vendido);

            return [
                'producto_id' => $item->producto_id,
                'producto' => $item->producto ? $item->producto->nombre : 'Producto #' . $item->producto_id,
                'codigo' => $item->producto ? $item->producto->codigo : '',
                'stock_asignado' => $asignado,
                'stock_vendido' => $vendido,
                'sobrante' => $sobrante,
            ];
        })->values()->toArray();
    }
}
