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

        $resumenDiario = $query->get();
        return response()->json($resumenDiario);
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

        $saldoEntregar = $totalVentasContado + $totalCobranzas + $totalAdelantos + $totalViaticos - $totalGastos - $totalDepositos - $totalMonederoVirtual;
        if ($saldoEntregar < 0) {
            $saldoEntregar = 0;
        }

        return response()->json([
            'ventas' => $ventas,
            'gastos' => $gastos,
            'cobranzas' => $cobranzas,
            'adelantos' => $adelantos,
            'credito' => $credito,
            'depositos' => $depositos,
            'monederoVirtual' => $monederoVirtual,
            'viaticos' => $viaticos,
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

        $resumenDiario = ResumenDiario::create(
            [
                'fecha' => $request->fecha,
                'vendedor_id' => $vendedorId,
                'vehiculo_id' => $request->vehiculo_id,
                'ruta_id' => $request->ruta_id,
                'salida_id' => $request->salida_id,
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
    
}
