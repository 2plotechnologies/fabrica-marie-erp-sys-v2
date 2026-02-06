<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RolController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/usuarios', [UsuarioController::class, 'store']);
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
