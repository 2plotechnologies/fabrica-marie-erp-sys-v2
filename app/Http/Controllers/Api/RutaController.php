<?php

namespace App\Http\Controllers\Api;

use App\Models\Ruta;
use Illuminate\Http\Request;

class RutaController extends Controller
{
    public function index()
    {
        $rutas = Ruta::where('activo', true)
            ->with('clientes')
            ->withCount('clientes')
            ->get();

        return response()->json($rutas);
    }

    /**
     * Listado paginado con búsqueda por nombre. Usado por el módulo RoutesList.
     * GET /rutas/paginado?search=&page=&per_page=.
     */
    public function listPaginado(Request $request)
    {
        $perPage = (int) $request->input('per_page', 6);
        $search  = $request->input('search', '');

        $query = Ruta::where('activo', true)
            ->withCount('clientes');

        if ($search !== '') {
            $query->where('nombre', 'like', '%' . $search . '%');
        }

        $rutas = $query->paginate($perPage);

        return response()->json($rutas);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para crear rutas.'], 403);
        }

        $ruta = Ruta::create($request->all());
        return response()->json($ruta, 201);
    }

    public function show($id)
    {
        return response()->json(
            Ruta::with('clientes')->findOrFail($id)
        );
    }

    public function detalle($id)
    {
        $ruta = Ruta::with('clientes')
            ->withCount('clientes')
            ->findOrFail($id);

        return response()->json($ruta);
    }

    public function clientes($id)
    {
        $ruta = Ruta::with('clientes')->findOrFail($id);

        return response()->json($ruta->clientes);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para editar rutas.'], 403);
        }

        $ruta = Ruta::findOrFail($id);
        $ruta->update($request->all());

        return response()->json($ruta->fresh()->load('clientes'));
    }

    public function reasignarVendedor(Request $request, $id)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para reasignar vendedores.'], 403);
        }

        $ruta = Ruta::findOrFail($id);

        // Nota: si se requiere almacenar historial de reasignaciones, hace falta agregar
        // una tabla dedicada en base de datos mediante migración.
        $ruta->vendedor_id = $request->input('vendedor_id');
        $ruta->save();

        return response()->json($ruta->fresh());
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para desactivar rutas.'], 403);
        }

        $ruta = Ruta::findOrFail($id);
        $ruta->activo = false;
        $ruta->save();

        return response()->json(['message' => 'Ruta desactivada']);
    }

    // Asignar clientes con orden
    public function asignarClientes(Request $request, $rutaId)
    {
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        if ($isVendedor) {
            return response()->json(['message' => 'No autorizado para asignar clientes a rutas.'], 403);
        }

        $ruta = Ruta::findOrFail($rutaId);

        $syncData = [];
        foreach ($request->clientes as $item) {
            $syncData[$item['cliente_id']] = ['orden' => $item['orden']];
        }

        $ruta->clientes()->sync($syncData);

        return response()->json(['message' => 'Clientes asignados a la ruta']);
    }
}
