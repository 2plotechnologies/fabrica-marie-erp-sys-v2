<?php

namespace App\Http\Controllers\Api;

use App\Models\Cliente;
use App\Models\Venta;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\Interaccion;
use App\Models\Tarea;
use App\Models\ClienteUbicacion;

class ClienteController extends Controller
{
    public function index()
    {
        return response()->json(
            Cliente::where('activo', true)->with('ruta')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'codigo_cliente' => 'required|string|unique:clientes',
            'razon_social' => 'required|string',
            'tipo_cliente' => 'nullable|in:TIENDA,DISTRIBUIDOR,MINORISTA,MAYORISTA,CONSUMIDOR',
            'direccion' => 'nullable|string',
            'telefono' => 'nullable|string',
            'ruta_id' => 'nullable|exists:rutas,id',
            'condicion_pago' => 'required|in:CONTADO,CREDITO',
            'limite_credito' => 'numeric',
            'dias_credito' => 'numeric',
            'deuda_actual' => 'numeric',
            'activo' => 'boolean',
            'status' => 'required|string',
        ]);

        $rutaId = $validated['ruta_id'] ?? null;

        $cliente = Cliente::create($validated);

         // Si se envió una ruta, crear registro en pivot
        if ($rutaId) {
            $cliente->rutas()->attach($rutaId, [
                'orden' => 0 // o la lógica que uses
            ]);
        }

        return response()->json($cliente, 201);
    }

    public function show($id)
    {
        return response()->json(
            Cliente::with(['ruta', 'rutas'])->findOrFail($id)
        );
    }

    public function listaCRM()
    {
        // Excluir cualquier cliente varios.
        $clientes = Cliente::with('ruta','interacciones.usuario','tareas.usuario')
            ->where('activo', true)
            ->excluirClientesVarios()
            ->get();

        $fechaActual = date('Y-m-d');

        foreach ($clientes as $cliente) {

            $venta = Venta::where('cliente_id', $cliente->id)
                ->orderBy('fecha','desc')
                ->first();

            //Obtener total de ventas del cliente
            $totalVentas = Venta::where('cliente_id', $cliente->id)->sum('total_neto');
            $cliente->total_ventas = $totalVentas;

            //Frecuencia de ventas
            $frecuenciaVentas = Venta::where('cliente_id', $cliente->id)->count();
            $cliente->frecuencia_ventas = $frecuenciaVentas;

            if($venta){
                $cliente->fecha_ultima_venta = $venta->fecha;
                $cliente->compro_hoy = Carbon::parse($venta->fecha)->isToday();
            }else{
                $cliente->fecha_ultima_venta = null;
                $cliente->compro_hoy = false;
            }

            $cliente->ticket_promocional = 100;
            $cliente->puntos = 1000;
        }

        return response()->json($clientes);
    }

    public function createInteraction(Request $request)
    {
        $validated = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'tipo' => 'required|string',
            'descripcion' => 'required|string',
        ]);

        $interaction = Interaccion::create([
            'cliente_id' => $validated['cliente_id'],
            'tipo' => $validated['tipo'],
            'descripcion' => $validated['descripcion'],
            'usuario_id' => auth()->id(),
            'created_at' => now(),
        ]);
        return response()->json($interaction, 201);
    }

    public function createTask(Request $request)
    {
        $validated = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'titulo' => 'required|string',
            'descripcion' => 'required|string',
            'prioridad' => 'required|string',
            'fecha_limite' => 'required|date',
            'estado' => 'required|string',
        ]);

        $task = Tarea::create([
            'cliente_id' => $validated['cliente_id'],
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'],
            'prioridad' => $validated['prioridad'],
            'fecha_limite' => $validated['fecha_limite'],
            'estado' => $validated['estado'],
            'usuario_id' => auth()->id(),
            'fecha' => now(),
        ]);
        return response()->json($task, 201);
    }

    public function completeTask(Request $request, $id)
    {
        $task = Tarea::findOrFail($id);
        $task->estado = 'COMPLETADA';
        $task->save();
        return response()->json($task);
    }

    public function update(Request $request, $id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update($request->all());

        return response()->json($cliente);
    }

    public function destroy($id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->activo = false;
        $cliente->save();

        return response()->json(['message' => 'Cliente desactivado']);
    }

    public function indexMapa()
    {
        $clientes = Cliente::join('cliente_ubicaciones', 'clientes.id', '=', 'cliente_ubicaciones.cliente_id')
        ->excluirClientesVarios()
        ->where('activo', true)
        ->whereNotNull('latitud')
        ->whereNotNull('longitud')
        ->select('clientes.id', 'clientes.razon_social', 'cliente_ubicaciones.latitud', 'cliente_ubicaciones.longitud')
        ->get();

        return response()->json(
            $clientes->map(function ($c) {
                return [
                    'id' => $c->id,
                    'razon_social' => $c->razon_social,
                    'latitud' => $c->latitud,
                    'longitud' => $c->longitud,
                ];
            })
        );
    }

    public function guardarUbicacion(Request $request)
    {
        $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'latitud' => 'required|numeric',
            'longitud' => 'required|numeric',
        ]);

        // Si ya tiene ubicación → actualizar
        // Si no → crear
        $ubicacion = ClienteUbicacion::updateOrCreate(
            ['cliente_id' => $request->cliente_id],
            [
                'latitud' => $request->latitud,
                'longitud' => $request->longitud,
            ]
        );

        return response()->json([
            'success' => true,
            'ubicacion' => $ubicacion
        ]);
    }

    public function morosos()
    {
        $cuentas = \App\Models\CuentaPorCobrar::with(['cliente.ruta'])
            ->where('saldo', '>', 0)
            ->whereDate('fecha_vencimiento', '<=', Carbon::now()->toDateString())
            ->get();

        $morosos = collect();

        foreach ($cuentas->groupBy('cliente_id') as $cliente_id => $cuentasCliente) {
            $cliente = $cuentasCliente->first()->cliente;
            if (!$cliente) continue;

            $overdueAmount = $cuentasCliente->sum('saldo');
            $overdueCount = $cuentasCliente->count();
            $oldest = $cuentasCliente->min('fecha_vencimiento');
            $overdueDays = Carbon::parse($oldest)->diffInDays(Carbon::now());

            $clienteData = $cliente->toArray();
            $clienteData['overdueAmount'] = $overdueAmount;
            $clienteData['overdueCount'] = $overdueCount;
            $clienteData['overdueDays'] = round($overdueDays);
            
            // Allow frontend to group by route
            $clienteData['ruta_nombre'] = $cliente->ruta ? $cliente->ruta->nombre : 'Sin Ruta';
            
            $morosos->push($clienteData);
        }

        // Devolvemos ordenados por deuda (mayor a menor)
        return response()->json($morosos->sortByDesc('overdueAmount')->values());
    }
}
