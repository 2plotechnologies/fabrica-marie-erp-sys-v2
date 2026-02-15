<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Ruta para el Frontend React
|--------------------------------------------------------------------------
| Esta ruta captura TODAS las solicitudes que no sean archivos reales
| y sirve el index.html de React, permitiendo que React Router maneje
| la navegación en el cliente.
|
| NOTA: Las rutas de API están en api.php y tienen el prefijo /api
|--------------------------------------------------------------------------
*/

// Ruta de bienvenida (opcional - puedes eliminarla si quieres)
/*Route::get('/', function () {
    return view('welcome');
});

*/

// IMPORTANTE: Esta ruta debe ir AL FINAL de web.php
// Captura cualquier ruta que no sea /api/* y que no sea un archivo existente
// Todas las rutas no API van a React
Route::get('/{any}', function () {
    return view('welcome'); // Carga el template app.blade.php
})->where('any', '.*');
