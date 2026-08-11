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
use App\Http\Controllers\Api\RegularizacionController;
use App\Http\Controllers\Api\ViaticoController;
use App\Http\Controllers\Api\SalidaCajaController;
use App\Http\Controllers\Api\AbonoController;
use App\Http\Controllers\Api\CuentaPorCobrarController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\GpsPointController;
use App\Http\Controllers\Api\MantenimientoController;
use App\Http\Controllers\Api\DashBoardController;
use App\Http\Controllers\Api\ResumenDiarioController;
use App\Http\Controllers\Api\ReporteDetalleVentaController;
use App\Http\Controllers\Api\EntregaDineroController;
use App\Http\Controllers\Api\ProyeccionVentaController;
use App\Http\Controllers\Api\ApiTokenController;
use App\Http\Controllers\Api\RutaMapaController;
use App\Http\Controllers\Api\ZonaController;


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
Route::middleware(['auth:sanctum', 'user.active'])->group(function () {

    // Sesión
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    /*
    |--------------------------------------------------------------------------
    | INVENTARIO (ALMACÉN / ADMIN)
    |--------------------------------------------------------------------------
    */
    Route::prefix('inventario')
        ->middleware('role:ADMIN,ALMACENERO,VENDEDOR,GERENTE,CAJERO')
        ->group(function () {

        // Productos
        Route::get('/productos', [ProductoController::class, 'index']);
        Route::get('/productos/fabrica', [ProductoController::class, 'indexFabrica']);
        Route::get('/productos/vendedores/{vendedor_id}', [ProductoController::class, 'indexVendedores']);
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

        // Stock.
        Route::get('/stock', [StockController::class, 'index']);
        Route::get('/stock-vendedores', [StockController::class, 'stockVendedores']);
        Route::post('/stock/transferir', [StockController::class, 'transferirStock']);

        // Movimientos.
        Route::get('/movimientos', [MovimientoStockController::class, 'index']);
        Route::post('/movimientos', [MovimientoStockController::class, 'store']);
        Route::delete('/movimientos/{id}', [MovimientoStockController::class, 'destroy']);

        //Salidas.
        Route::get('/salidas', [SalidaController::class, 'index']);
        Route::get('/salidas/vehiculo/{id}/sobrantes', [SalidaController::class, 'getSobrantes']);
        Route::get('/salidas/{id}', [SalidaController::class, 'show']);
        Route::post('/salidas', [SalidaController::class, 'store']);
        Route::put('/salidas/estado/{id}', [SalidaController::class, 'updateEstado']);
        Route::put('/salidas/anular/{id}', [SalidaController::class, 'anular']);
        Route::put('/salidas/{id}', [SalidaController::class, 'update']);

        //Devoluciones.
        Route::get('/devoluciones', [DevolucionController::class, 'index']);
        Route::get('/devoluciones/{id}', [DevolucionController::class, 'show']);
        Route::post('/devoluciones', [DevolucionController::class, 'store']);
        Route::put('/devoluciones/estado/{id}', [DevolucionController::class, 'updateEstado']);

        // Kardex.
        Route::get('/kardex/{productoId}',
            [MovimientoStockController::class, 'kardex']);

        Route::get('/kardex-valorizado/{productoId}',
            [MovimientoStockController::class, 'kardexValorizado']);
    });

    /*
    |--------------------------------------------------------------------------
    | ROLES Y USUARIOS
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')
        ->middleware('role:ADMIN,RRHH')
        ->group(function () {

        // Usuarios
        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
        Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);
        Route::get('/usuarios/{id}', [UsuarioController::class, 'show']);

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
    Route::prefix('clientes')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,VENDEDOR,CAJERO,FIDELIZACION')
        ->group(function () {
        Route::get('/', [ClienteController::class, 'index']);
        Route::get('/morosos', [ClienteController::class, 'morosos']);
        Route::get('/crm', [ClienteController::class, 'listaCRM']);
        //Interacciones
        Route::post('/interacciones', [ClienteController::class, 'createInteraction']);
        //Tareas
        Route::post('/tareas', [ClienteController::class, 'createTask']);
        Route::post('/', [ClienteController::class, 'store']);
        Route::get('/{id}', [ClienteController::class, 'show']);
        Route::put('/{id}', [ClienteController::class, 'update']);
        Route::delete('/{id}', [ClienteController::class, 'destroy']);
        Route::put('/tareas/{id}/completar', [ClienteController::class, 'completeTask']);
    });

    Route::prefix('rutas')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,ALMACENERO,VENDEDOR,CAJERO,FIDELIZACION,MANTENIMIENTO')
        ->group(function () {
        Route::get('/', [RutaController::class, 'index']);
        Route::get('/paginado', [RutaController::class, 'listPaginado']); // paginación + búsqueda
        Route::post('/', [RutaController::class, 'store']);
        Route::get('/{id}', [RutaController::class, 'show']);
        Route::get('/{id}/detalle', [RutaController::class, 'detalle']);
        Route::get('/{id}/clientes', [RutaController::class, 'clientes']);
        Route::put('/{id}', [RutaController::class, 'update']);
        Route::put('/{id}/reasignar-vendedor', [RutaController::class, 'reasignarVendedor']);
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
    Route::prefix('ventas')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,ALMACENERO,VENDEDOR,CAJERO')
        ->group(function () {
        Route::get('/', [VentaController::class, 'index']);
        Route::get('/reporte/completo', [VentaController::class, 'reporte']);
        Route::get('/reporte/excel', [VentaController::class, 'exportarExcel']);
        Route::post('/', [VentaController::class, 'store'])
            ->middleware(['caja.abierta']);
        Route::put('/{id}',
            [VentaController::class, 'update']
        )->middleware(['permiso:editar_venta']);
        Route::delete('/{id}',
            [VentaController::class, 'destroy']
        )->middleware(['permiso:eliminar_venta']);
        Route::post('/{id}/anular',
            [VentaController::class, 'anular']
        )->middleware(['permiso:eliminar_venta', 'caja.abierta']);
        Route::get('/{id}', [VentaController::class, 'show']);
        // Confirmar
        Route::post('/{id}/confirmar', [VentaController::class, 'confirmar']);
        //Reporte Detalle
        Route::get('/reportes/detalle-ventas', [ReporteDetalleVentaController::class, 'detalleVentas']);
    });

    // Caja
    Route::prefix('caja')
        ->middleware('role:ADMIN,GERENTE,CAJERO')
        ->group(function () {
            //Obtener caja
            Route::get('/', [CajaController::class, 'getCaja']);
            //Obtener movimientos
            Route::get('/movimientos/total', [CajaController::class, 'obtenerMovimientos']);
            //Lista Egresos
            Route::get('/egresos', [CajaController::class, 'obtenerEgresos']);
            //Aprobar o rechazar egreso
            Route::post('/egresos/{id}/estado', [CajaController::class, 'updateEstadoEgreso'])
                ->middleware(['permiso:caja_registrar_egreso']);
            //Crear movimiento
            Route::post('/movimientos', [CajaController::class, 'crearMovimiento']);
            //Obtener cajas sin cerrar de dias anteriores
            Route::get('/sin-cerrar', [CajaController::class, 'cajasSinCerrar']);
            //Cerrar cajas de dias anteriores
            Route::post('/cerrar-antiguas', [CajaController::class, 'cerrarAntiguas'])
                ->middleware('permiso:cerrar_caja');
            //Abrir caja
            Route::post('/abrir', [CajaController::class, 'abrir']);
            //Cerrar caja
            Route::post('/{id}/cerrar', [CajaController::class, 'cerrar'])
                ->middleware('permiso:cerrar_caja');
            //Reportes
            Route::get('/{id}/reporte', [CajaController::class, 'reporte'])
                ->middleware('permiso:ver_reporte_caja');
            Route::get('/reporte/fecha', [CajaController::class, 'reportePorFecha'])
                ->middleware('permiso:ver_reporte_caja');
            Route::get('/cerradas', [CajaController::class, 'obtenerCajasCerradas'])
            ->middleware('permiso:ver_reporte_caja');
            //Salidas de caja
            Route::get('/salidas', [SalidaCajaController::class, 'index']);
            Route::post('/salidas', [SalidaCajaController::class, 'store']);
            Route::post('/salidas/{id}/liquidar', [SalidaCajaController::class, 'liquidar'])
                ->middleware(['permiso:caja_registrar_egreso']);
            Route::post('/salidas/{id}/entregar', [SalidaCajaController::class, 'entregar'])
                ->middleware(['permiso:caja_registrar_egreso']);
    });

    //Regularizaciones
    Route::prefix('regularizaciones')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,CAJERO')
        ->group(function () {
            Route::get('/', [RegularizacionController::class, 'index']);
            Route::post('/cierre_sin_cuadrar', [RegularizacionController::class, 'getCierreSinCuadrarPorFecha']);
            Route::post('/', [RegularizacionController::class, 'store']);
            Route::put('/{id}/estado', [RegularizacionController::class, 'updateEstado'])
                ->middleware(['permiso:caja_registrar_egreso']);
        });

    // Caja Chica
    Route::prefix('caja_chica')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,VENDEDOR,CAJERO')
        ->group(function () {
            Route::get('/viaticos', [ViaticoController::class, 'index']);
            Route::post('/viaticos', [ViaticoController::class, 'store']);
            Route::get('/viaticos/{id}', [ViaticoController::class, 'show']);
            Route::put('/viaticos/{id}', [ViaticoController::class, 'update']);
            Route::put('/viaticos/{id}/estado', [ViaticoController::class, 'updateEstado'])
                ->middleware(['caja.abierta','permiso:caja_registrar_egreso']);
            Route::post('/viaticos/{id}/liquidar', [ViaticoController::class, 'liquidar'])
                ->middleware(['caja.abierta','permiso:caja_registrar_egreso']);
            Route::delete('/viaticos/{id}', [ViaticoController::class, 'destroy']);
        });

    // Abonos
    Route::prefix('cuentas_por_cobrar')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,VENDEDOR,CAJERO')
        ->group(function () {
            Route::get('/', [CuentaPorCobrarController::class, 'index']);
            Route::post('/{id}/abonos', [AbonoController::class, 'store'])
                ->middleware(['caja.abierta']);
            Route::get('/{id}/abonos', [AbonoController::class, 'index']);
            Route::post('/abonos/{id}/anular', [AbonoController::class, 'anular']);
            Route::post('/{id}/anular', [AbonoController::class, 'anular']);
            Route::put('/{id}/fecha_vencimiento', [CuentaPorCobrarController::class, 'updateFechaVencimiento']);
        });

    // Vehículos
    Route::prefix('vehiculos')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,ALMACENERO,VENDEDOR,MANTENIMIENTO')
        ->group(function () {
        Route::get('/', [VehiculoController::class, 'index']);
        Route::post('/', [VehiculoController::class, 'store']);
        Route::get('/{id}', [VehiculoController::class, 'show']);
        Route::put('/{id}', [VehiculoController::class, 'update']);
        Route::delete('/{id}', [VehiculoController::class, 'destroy']);
        Route::post('/{id}/vendedor', [VehiculoController::class, 'assignVendedor']);
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
    Route::prefix('mantenimientos')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,MANTENIMIENTO')
        ->group(function () {
        Route::get('/', [MantenimientoController::class, 'index']);
        Route::post('/', [MantenimientoController::class, 'store']);
        Route::get('/{id}', [MantenimientoController::class, 'show']);
        Route::put('/estado/{id}', [MantenimientoController::class, 'updateEstado']);
        Route::delete('/{id}', [MantenimientoController::class, 'destroy']);
    });

    // Dashboard
    Route::prefix('dashboard')
        ->group(function () {
            Route::get('/ags', [DashBoardController::class, 'indexAGS'])
                ->middleware('role:ADMIN,GERENTE,SUPERVISOR');
            Route::get('/vendedor', [DashBoardController::class, 'indexVendedor'])
                ->middleware('role:ADMIN,VENDEDOR');
            Route::get('/almacenero', [DashBoardController::class, 'indexAlmacenero'])
                ->middleware('role:ADMIN,ALMACENERO');
            Route::get('/cajero', [DashBoardController::class, 'indexCajero'])
                ->middleware('role:ADMIN,CAJERO');
            Route::get('/mantenimiento', [DashBoardController::class, 'indexMantenimiento'])
                ->middleware('role:ADMIN,MANTENIMIENTO');
        });

    // Resumen Diario
    Route::prefix('resumen-diario')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,VENDEDOR')
        ->group(function () {
            Route::get('/', [ResumenDiarioController::class, 'index']);
            Route::get('/salidas', [ResumenDiarioController::class, 'getSalidas']);
            Route::get('/gastos/all', [ResumenDiarioController::class, 'getGastos']);
            Route::post('/gastos', [ResumenDiarioController::class, 'storeGasto']);
            Route::delete('/gastos/{id}', [ResumenDiarioController::class, 'destroyGasto']);
            Route::get('/resumen-general', [ResumenDiarioController::class, 'getResumenGeneral']);
            Route::get('/acumulado-salidas', [ResumenDiarioController::class, 'getResumenAcumuladoSalidas']);
            Route::get('/{vendedor_id}', [ResumenDiarioController::class, 'autoResumenDiario']);
            Route::post('/', [ResumenDiarioController::class, 'store']);
            Route::put('/{id}/estado', [ResumenDiarioController::class, 'updateEstado'])
                ->middleware('permiso:ven_aprobar_resumen');
            Route::put('/gasto/{id}/estado', [ResumenDiarioController::class, 'aprobarGasto'])
                ->middleware('permiso:ven_aprobar_gasto');
        });

    // Proyeccion de Ventas
    Route::prefix('proyeccion-ventas')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,CAJERO')
        ->group(function () {
            Route::get('/', [ProyeccionVentaController::class, 'index']);
            Route::post('/', [ProyeccionVentaController::class, 'store']);
            Route::get('/resumen-mes-actual', [ProyeccionVentaController::class, 'resumenMesActual']);
        });

    // Token Mapbox
    Route::get('/mapbox-token', [ApiTokenController::class, 'getMapboxToken']);
    Route::post('/mapbox-token', [ApiTokenController::class, 'saveMapboxToken']);

    // Clientes
    Route::get('/clientes-mapa', [ClienteController::class, 'indexMapa']);
    Route::post('/clientes-mapa/ubicacion', [ClienteController::class, 'guardarUbicacion']);

    // Rutas
    Route::get('/rutas-mapa', [RutaMapaController::class, 'index']);
    Route::post('/rutas-mapa', [RutaMapaController::class, 'store']);

    // Zonas
    Route::get('/zonas', [ZonaController::class, 'index']);
    Route::post('/zonas', [ZonaController::class, 'store']);

    // Entregas de Dinero
    Route::prefix('entregas-dinero')
        ->middleware('role:ADMIN,GERENTE,SUPERVISOR,CAJERO,VENDEDOR')
        ->group(function () {
            Route::get('/', [EntregaDineroController::class, 'index']);
            Route::get('/resumen-vendedor', [EntregaDineroController::class, 'resumenVendedor']);
            Route::get('/reporte', [EntregaDineroController::class, 'reporte']);
            Route::post('/', [EntregaDineroController::class, 'store']);
            Route::get('/{id}', [EntregaDineroController::class, 'show']);
            Route::put('/{id}/estado', [EntregaDineroController::class, 'updateEstado'])
                ->middleware('permiso:caja_verificar_entrega');
        });
});
