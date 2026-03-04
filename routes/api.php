<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RolController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\RumaController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\MovimientoStockController;
use App\Http\Controllers\Api\SalidaController;
use App\Http\Controllers\Api\DevolucionController;
use App\Http\Controllers\Api\RutaController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\VentaController;
use App\Http\Controllers\Api\CajaController;
use App\Http\Controllers\Api\AbonoController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\GpsPointController;
use App\Http\Controllers\Api\MantenimientoController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Aquí registrarás las rutas de tu API. Todas tendrán el prefijo /api
| automáticamente gracias al RouteServiceProvider.
|
*/

// Ruta de prueba para verificar que la API funciona
Route::get('/test', function () {
    return response()->json([
        'message' => 'API funcionando correctamente',
        'status' => 'ok'
    ]);
});

// Ruta de login (sin autenticación)
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Rutas autenticadas con Sanctum
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Sesión
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    /*
    |--------------------------------------------------------------------------
    | INVENTARIO (ALMACÉN / ADMIN)
    |--------------------------------------------------------------------------
    */
    Route::prefix('inventario')
        ->middleware('role:ADMIN,ALMACENERO,VENDEDOR,GERENTE')
        ->group(function () {

        // Productos
        Route::get('/productos', [ProductoController::class, 'index']);
        Route::post('/productos', [ProductoController::class, 'store']);
        Route::get('/productos/{id}', [ProductoController::class, 'show']);
        Route::put('/productos/{id}', [ProductoController::class, 'update']);
        Route::delete('/productos/{id}', [ProductoController::class, 'destroy']);

        // Alertas
        Route::get('/alertas/stock-minimo',
            [ProductoController::class, 'stockMinimo']);

        // Rumas
        Route::get('/rumas', [RumaController::class, 'index']);
        Route::post('/rumas', [RumaController::class, 'store']);
        Route::get('/rumas/{id}', [RumaController::class, 'show']);
        Route::put('/rumas/{id}', [RumaController::class, 'update']);
        Route::delete('/rumas/{id}', [RumaController::class, 'destroy']);

        // Stock
        Route::get('/stock', [StockController::class, 'index']);

        // Movimientos
        Route::get('/movimientos', [MovimientoStockController::class, 'index']);
        Route::post('/movimientos', [MovimientoStockController::class, 'store']);
        Route::delete('/movimientos/{id}', [MovimientoStockController::class, 'destroy']);

        //Salidas
        Route::get('/salidas', [SalidaController::class, 'index']);
        Route::get('/salidas/{id}', [SalidaController::class, 'show']);
        Route::post('/salidas', [SalidaController::class, 'store']);
        Route::put('/salidas/estado/{id}', [SalidaController::class, 'updateEstado']);

        //Devoluciones
        Route::get('/devoluciones', [DevolucionController::class, 'index']);
        Route::get('/devoluciones/{id}', [DevolucionController::class, 'show']);
        Route::post('/devoluciones', [DevolucionController::class, 'store']);
        Route::put('/devoluciones/estado/{id}', [DevolucionController::class, 'updateEstado']);

        // Kardex
        Route::get('/kardex/{productoId}',
            [MovimientoStockController::class, 'kardex']);

        Route::get('/kardex-valorizado/{productoId}',
            [MovimientoStockController::class, 'kardexValorizado']);
    });

    /*
    |--------------------------------------------------------------------------
    | ROLES Y USUARIOS (SOLO ADMIN)
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')
        ->middleware('role:ADMIN')
        ->group(function () {

        // Usuarios
        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);

        // Roles
        Route::get('/roles', [RolController::class, 'index'])
            ->middleware('permiso:ver_roles');

        Route::post('/roles', [RolController::class, 'store'])
            ->middleware('permiso:crear_rol');

        Route::get('/roles/{id}', [RolController::class, 'show'])
            ->middleware('permiso:ver_roles');

        Route::put('/roles/{id}/permisos', [RolController::class, 'updatePermisos'])
            ->middleware('permiso:asignar_permisos');

        Route::put('/roles/{id}/estado', [RolController::class, 'toggleEstado'])
            ->middleware('permiso:editar_rol');
    });

     /*
    |--------------------------------------------------------------------------
    | CLIENTES Y RUTAS
    |--------------------------------------------------------------------------
    */
    Route::prefix('clientes')->group(function () {
        Route::get('/', [ClienteController::class, 'index']);
        Route::post('/', [ClienteController::class, 'store']);
        Route::get('/{id}', [ClienteController::class, 'show']);
        Route::put('/{id}', [ClienteController::class, 'update']);
        Route::delete('/{id}', [ClienteController::class, 'destroy']);
    });

    Route::prefix('rutas')->group(function () {
        Route::get('/', [RutaController::class, 'index']);
        Route::post('/', [RutaController::class, 'store']);
        Route::get('/{id}', [RutaController::class, 'show']);
        Route::put('/{id}', [RutaController::class, 'update']);
        Route::delete('/{id}', [RutaController::class, 'destroy']);
        Route::post('/{rutaId}/clientes',
            [RutaController::class, 'asignarClientes']);
    });

     /*
    |--------------------------------------------------------------------------
    | VENTAS
    |--------------------------------------------------------------------------
    */
    //Lista Vendedores
    Route::get('/vendedores', [UsuarioController::class, 'getVendedores']);
    //Ventas
    Route::get('/ventas', [VentaController::class, 'index']);
    Route::get('/ventas/reporte/completo', [VentaController::class, 'reporte']);
    Route::get('/ventas/reporte/excel', [VentaController::class, 'exportarExcel']);
    Route::post('/ventas', [VentaController::class, 'store'])
        ->middleware(['caja.abierta']);
    Route::put('/ventas/{id}',
        [VentaController::class, 'update']
    )->middleware(['permiso:editar_venta']);
    Route::delete('/ventas/{id}',
        [VentaController::class, 'destroy']
    )->middleware(['permiso:eliminar_venta']);
    Route::post('/ventas/{id}/anular',
        [VentaController::class, 'anular']
    )->middleware(['permiso:anular_venta', 'caja.abierta']);
    Route::get('/ventas/{id}', [VentaController::class, 'show']);

    // Caja
    Route::post('/caja/abrir', [CajaController::class, 'abrir']);
    Route::post('/caja/{id}/cerrar', [CajaController::class, 'cerrar'])
        ->middleware('permiso:cerrar_caja');
    Route::get('/caja/{id}/reporte', [CajaController::class, 'reporte'])
        ->middleware('permiso:ver_reporte_caja');
    Route::get('/caja/reporte/fecha', [CajaController::class, 'reportePorFecha'])
        ->middleware('permiso:ver_reporte_caja');

    // Abonos
    Route::post('/abonos', [AbonoController::class, 'store'])
        ->middleware(['caja.abierta']);
    Route::post('/abonos/{id}/anular',
        [AbonoController::class, 'anular']
    )->middleware(['permiso:anular_abono']);

    // Confirmar
    Route::post('/ventas/{id}/confirmar', [VentaController::class, 'confirmar']);

    // Vehículos
    Route::prefix('vehiculos')->group(function () {
        Route::get('/', [VehiculoController::class, 'index']);
        Route::post('/', [VehiculoController::class, 'store']);
        Route::get('/{id}', [VehiculoController::class, 'show']);
        Route::put('/{id}', [VehiculoController::class, 'update']);
        Route::delete('/{id}', [VehiculoController::class, 'destroy']);
    });

    // Puntos GPS
    Route::prefix('gps-points')->group(function () {
        Route::get('/', [GpsPointController::class, 'index']);
        Route::post('/', [GpsPointController::class, 'store']);
        Route::get('/{id}', [GpsPointController::class, 'show']);
        Route::put('/{id}', [GpsPointController::class, 'update']);
        Route::delete('/{id}', [GpsPointController::class, 'destroy']);
    });

    // Mantenimiento
    Route::prefix('mantenimientos')->group(function () {
        Route::get('/', [MantenimientoController::class, 'index']);
        Route::post('/', [MantenimientoController::class, 'store']);
        Route::get('/{id}', [MantenimientoController::class, 'show']);
        Route::put('/estado/{id}', [MantenimientoController::class, 'updateEstado']);
        Route::delete('/{id}', [MantenimientoController::class, 'destroy']);
    });
});
