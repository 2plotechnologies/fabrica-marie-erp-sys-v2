<?php

namespace App\Http\Controllers\Api;

use App\Models\Cliente;
use App\Models\Venta;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\Interaccion;
use App\Models\Tarea;

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
            'tipo_cliente' => 'nullable|in:TIENDA,DISTRIBUIDOR,MAYORISTA,CONSUMIDOR',
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
        //Excluir cliente varios (000000).
        $clientes = Cliente::with('ruta','interacciones.usuario','tareas.usuario')
            ->where('activo', true)
            ->where('codigo_cliente', '!=', '000000')
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
}
