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
use Carbon\Carbon;

class ResumenDiarioController extends Controller
{
    public function index()
    {
        $resumenDiario = ResumenDiario::with('vendedor.usuario', 'vehiculo', 'gastos', 'ruta', 'salida')->get();
        return response()->json($resumenDiario);
    }

    public function getSalidas()
    {
        $salidas = Salida::with('vendedor.usuario', 'vehiculo', 'ruta')
        ->whereDate('fecha', Carbon::today())
        ->where('estado', '!=', 'PENDIENTE')
        ->get();
        return response()->json($salidas);
    }

    public function autoResumenDiario($vendedor_id)
    {
        $vendedor = Vendedor::findOrFail($vendedor_id);

        $fecha = Carbon::today();

        $ventas = Venta::where('vendedor_id', $vendedor_id)
            ->where('estado', 'CONFIRMADA')
            ->whereDate('fecha', $fecha)
            ->get();
        
        $ventasContado = Venta::where('vendedor_id', $vendedor_id)
            ->where('estado', 'CONFIRMADA')
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'contado')
            ->get();

        $gastos = Gasto::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('estado','!=', 'RECHAZADO')
            ->get();

        $cobranzas = Abono::where('usuario_id', $vendedor->usuario_id)
            ->whereDate('fecha', $fecha)
            ->get();

        $credito = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'credito')
            ->where('estado', 'CONFIRMADA')
            ->get();

        $adelantos = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('tipo_pago', 'credito')
            ->where('estado', 'CONFIRMADA')
            ->get();

        $depositos = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago_detalle', ['deposito','transferencia'])
            ->where('estado', 'CONFIRMADA')
            ->get();
        
        $monederoVirtual = Venta::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->whereIn('metodo_pago_detalle', ['yape','plin'])
            ->where('estado', 'CONFIRMADA')
            ->get();

        $viaticos = Viatico::where('vendedor_id', $vendedor_id)
            ->whereDate('fecha', $fecha)
            ->where('estado', 'APROBADO')
            ->get();

        $totalVentas = $ventas->sum('total_neto');
        $totalGastos = $gastos->sum('monto');
        $totalCobranzas = $cobranzas->sum('monto');
        $totalVentasContado = $ventasContado->sum('total_neto');
        $totalCredito = $credito->sum('total_neto');
        $totalAdelantos = $adelantos->sum('adelanto');
        $totalDepositos = $depositos->sum('total_neto');
        $totalMonederoVirtual = $monederoVirtual->sum('total_neto');
        $totalViaticos = $viaticos->sum('monto');

        $saldoEntregar = $totalVentasContado + $totalCobranzas + $totalAdelantos + $totalViaticos - $totalGastos - $totalDepositos - $totalMonederoVirtual;

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
            'vehiculo_id' => 'required',
            'ruta_id' => 'required',
            'salida_id' => 'required',
            'conductor' => 'required',
            'zona' => 'required',
            'contado' => 'required',
            'credito' => 'required',
            'cobranza' => 'required',
            'depositos' => 'required',
            'monederoVirtual' => 'nullable',
            'viaticos' => 'required',
            'adelantos' => 'required',
            'total_gastos' => 'required',
            'saldo_a_entregar' => 'required',
            'saldo_entregado' => 'required',
            'diferencia' => 'required',
            'estado' => 'required',
            'firma' => 'required',
        ]);
        //Sumar depositos + monederoVirtual
        if($request->monederoVirtual){
            $request->depositos = $request->depositos + $request->monederoVirtual;
        }
        $resumenDiario = ResumenDiario::create(
            [
                'fecha' => $request->fecha,
                'vendedor_id' => $request->vendedor_id,
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
        $resumenDiario->save();
        return response()->json($resumenDiario);
    }

    //Listar gastos
    public function getGastos()
    {
        $gastos = Gasto::with('vendedor.usuario')->orderBy('id', 'desc')->get();
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
        $gasto = Gasto::create(
            [
                'vendedor_id' => $request->vendedor_id,
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
    
}
