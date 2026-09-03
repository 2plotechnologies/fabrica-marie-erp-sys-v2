<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Salida;
use App\Models\SalidaItem;
use App\Models\StockVendedor;
use App\Models\Vehiculo;
use App\Models\Ruta;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

class SalidaController
{
    public function index()
    {
        $salidas = Salida::with([
            'vendedor.usuario',
            'vehiculo',
            'ruta',
            'rutas',
            'items.producto',
            'items.ruma'
        ])->orderBy('fecha', 'desc')->get();

        return response()->json($salidas);
    }

    public function show($id)
    {
        $salida = Salida::with([
            'vendedor.usuario',
            'vehiculo',
            'ruta',
            'rutas',
            'items.producto',
            'items.ruma'
        ])->findOrFail($id);

        return response()->json($salida);
    }

    public function store(Request $request)
    {
        $request->validate([
            'fecha' => 'required|date',
            'vendedor_id' => 'required|exists:vendedores,id',
            'vehiculo_id' => 'required|exists:vehiculos,id',
            'zona' => 'required|string',
            'ruta_ids' => 'required_without:ruta_id|array|min:1',
            'ruta_ids.*' => 'exists:rutas,id',
            'ruta_id' => 'nullable|exists:rutas,id',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.ruma_id' => 'required|exists:rumas,id',
            'items.*.cantidad' => [
                'required', 
                'numeric', 
                'gt:0',
                function ($attribute, $value, $fail) use ($request) {
                    $index = explode('.', $attribute)[1];
                    $productoId = $request->input("items.{$index}.producto_id");
                    if ($productoId) {
                        $producto = \App\Models\Producto::find($productoId);
                        if ($producto && $producto->tipo_venta === 'UNIDAD' && floor($value) != $value) {
                            $fail("La cantidad para el producto {$producto->nombre} debe ser un número entero.");
                        }
                    }
                }
            ],
            'items.*.es_sobrante' => 'boolean|nullable',
        ]);

        $rutaIds = $request->input('ruta_ids');
        if (empty($rutaIds) && $request->filled('ruta_id')) {
            $rutaIds = [(int)$request->ruta_id];
        }

        // Validar que todas las rutas pertenezcan a la zona seleccionada (por nombre de zona)
        $rutasBD = Ruta::whereIn('id', $rutaIds)->get();
        foreach ($rutasBD as $r) {
            if ($r->zona !== $request->zona) {
                return response()->json([
                    'error' => 'Todas las rutas seleccionadas deben pertenecer a la zona especificada (' . $request->zona . ').'
                ], 400);
            }
        }

        //Verificar que el vendedor no este en una salida con estado EN RUTA.
        $vendedorSalida = Salida::where('vendedor_id', $request->vendedor_id)
            ->where('estado', 'EN_RUTA')
            ->first();

        if ($vendedorSalida) {
            return response()->json([
                'error' => 'El vendedor ya tiene una salida en ruta'
            ], 400);
        }

        //Verificar que el vehiculo no este en una salida con estado EN RUTA.
        $vehiculoSalida = Salida::where('vehiculo_id', $request->vehiculo_id)
            ->where('estado', 'EN_RUTA')
            ->first();

        if ($vehiculoSalida) {
            return response()->json([
                'error' => 'El vehiculo ya tiene una salida en ruta'
            ], 400);
        }

        //Verificar que el vehiculo no esta en mantenimiento.
        $vehiculoMantenimiento = Vehiculo::where('id', $request->vehiculo_id)
            ->where('estado', '!=', 'DISPONIBLE')
            ->first();

        if ($vehiculoMantenimiento) {
            return response()->json([
                'error' => 'El vehiculo no esta disponible.'
            ], 400);
        }

        DB::beginTransaction();

        try {
            //Si el vendedor no esta asignado al vehiculo, asignarlo automaticamente.
            $vehiculo = Vehiculo::findOrFail($request->vehiculo_id);
            //Asignar solo si no existe la relacion
            if (!$vehiculo->vendedores()->where('vendedor_id', $request->vendedor_id)->exists()) {
                $vehiculo->vendedores()->attach($request->vendedor_id);
            }

            $salida = Salida::create([
                'fecha' => $request->fecha,
                'vendedor_id' => $request->vendedor_id,
                'conductor' => $request->conductor,
                'vehiculo_id' => $request->vehiculo_id,
                'zona' => $request->zona,
                'ruta_id' => $rutaIds[0],
                'estado' => 'PENDIENTE'
            ]);

            $salida->rutas()->sync($rutaIds);

            foreach ($request->items as $item) {
                SalidaItem::create([
                    'salida_id' => $salida->id,
                    'producto_id' => $item['producto_id'],
                    'ruma_id' => $item['ruma_id'],
                    'cantidad' => $item['cantidad'],
                ]);

                $stockVendedor = StockVendedor::where('salida_id', $salida->id)
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if ($stockVendedor) {
                    $stockVendedor->cantidad += $item['cantidad'];
                    $stockVendedor->cantidad_entregada += $item['cantidad'];
                    $stockVendedor->save();
                } else {
                    StockVendedor::create([
                        'salida_id' => $salida->id,
                        'producto_id' => $item['producto_id'],
                        'vendedor_id' => $request->vendedor_id,
                        'cantidad' => $item['cantidad'],
                        'cantidad_entregada' => $item['cantidad'],
                    ]);
                }

                if (isset($item['es_sobrante']) && $item['es_sobrante'] == true) {
                    // Descontar del stock anterior para transferirlo a esta nueva salida
                    $ultimaSalida = Salida::where('vehiculo_id', $request->vehiculo_id)
                        ->where('estado', 'COMPLETADO')
                        ->where('id', '!=', $salida->id)
                        ->orderBy('id', 'desc')
                        ->first();

                    if ($ultimaSalida) {
                        $stockAnterior = StockVendedor::where('salida_id', $ultimaSalida->id)
                            ->where('producto_id', $item['producto_id'])
                            ->where('cantidad', '>=', $item['cantidad'])
                            ->first();

                        if ($stockAnterior) {
                            $stockAnterior->cantidad -= $item['cantidad'];
                            $stockAnterior->save();
                        }
                    }
                } else {
                    StockService::registrarMovimiento([
                        'tipo' => 'SALIDA',
                        'producto_id' => $item['producto_id'],
                        'ruma_id' => $item['ruma_id'],
                        'cantidad' => $item['cantidad'],
                        'motivo' => 'Despacho de fabrica. Salida #' . $salida->id,
                        'user_id' => auth()->id() // null por ahora si no hay auth
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Salida creada correctamente',
                'salida' => $salida->load('rutas', 'ruta', 'items.producto', 'items.ruma')
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'error' => 'Error al crear salida',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function updateEstado(Request $request, $id){
        $request->validate([
            'estado' => 'required|in:PENDIENTE,EN_RUTA,COMPLETADO',
            'confirmar_sobrantes' => 'nullable|boolean'
        ]);

        $salida = Salida::findOrFail($id);

        //No permitir despacho si el vendedor o el vehiculo ya estan en ruta.
        if ($request->estado == 'EN_RUTA') {
            $vendedorSalida = Salida::where('vendedor_id', $salida->vendedor_id)
                ->where('estado', 'EN_RUTA')
                ->first();

            $vehiculoSalida = Salida::where('vehiculo_id', $salida->vehiculo_id)
                ->where('estado', 'EN_RUTA')
                ->first();

            if ($vendedorSalida || $vehiculoSalida) {
                return response()->json([
                    'error' => 'No se puede despachar la salida, el vendedor o el vehiculo ya estan en ruta.'
                ], 400);
            }

            //Cambiar estado del vehiculo a EN_RUTA.
            $vehiculo = Vehiculo::findOrFail($salida->vehiculo_id);
            $vehiculo->estado = 'EN_RUTA';
            $vehiculo->save();
        } else if ($request->estado == 'COMPLETADO') {
            // Verificar si aún hay productos sobrantes no vendidos ni devueltos
            $sobrantes = StockVendedor::where('salida_id', $salida->id)
                ->where('cantidad', '>', 0)
                ->with('producto')
                ->get();

            if ($sobrantes->count() > 0 && !$request->boolean('confirmar_sobrantes')) {
                return response()->json([
                    'requiere_confirmacion' => true,
                    'sobrantes' => $sobrantes->map(function ($s) {
                        return [
                            'producto_id' => $s->producto_id,
                            'producto' => $s->producto->nombre ?? ('Producto #' . $s->producto_id),
                            'sku' => $s->producto->sku ?? '',
                            'cantidad' => (float) $s->cantidad
                        ];
                    }),
                    'error' => 'Hay productos sobrantes en la salida que no han sido reportados como vendidos o devueltos.'
                ], 400);
            }

            //Cambiar estado del vehiculo a DISPONIBLE.
            $vehiculo = Vehiculo::findOrFail($salida->vehiculo_id);
            $vehiculo->estado = 'DISPONIBLE';
            $vehiculo->save();
        }
        
        $salida->estado = $request->estado;
        $salida->save();

        return response()->json(['message' => 'Estado Actualizado']);
    }

    public function anular(Request $request, $id){
        $salida = Salida::findOrFail($id);

        if (!in_array($salida->estado, ['PENDIENTE', 'EN_RUTA'])) {
            return response()->json([
                'error' => 'Solo se pueden anular salidas en estado PENDIENTE o EN_RUTA.'
            ], 400);
        }

        if ($salida->tiene_ventas) {
            return response()->json([
                'error' => 'No se puede anular esta salida porque el vendedor ya ha realizado ventas.'
            ], 400);
        }

        DB::beginTransaction();

        try {
            if ($salida->estado == 'EN_RUTA') {
                $vehiculo = Vehiculo::findOrFail($salida->vehiculo_id);
                if ($vehiculo->estado == 'EN_RUTA') {
                    $vehiculo->estado = 'DISPONIBLE';
                    $vehiculo->save();
                }
            }

            $salida->estado = 'ANULADO';
            $salida->save();

            // Revertir inventario
            $movimientos = \App\Models\MovimientoStock::where(function($q) use ($salida) {
                    $q->where('motivo', 'like', '%Salida #' . $salida->id . '%')
                      ->orWhere(function($subQ) use ($salida) {
                          $subQ->where('referencia_tipo', 'SALIDA')
                               ->where('referencia_id', $salida->id);
                      });
                })
                ->where('tipo', 'SALIDA')
                ->get();

            foreach ($movimientos as $mov) {
                StockService::registrarMovimiento([
                    'tipo' => 'DEVOLUCION_BUENA',
                    'producto_id' => $mov->producto_id,
                    'ruma_id' => $mov->ruma_id,
                    'cantidad' => $mov->cantidad,
                    'motivo' => 'Anulacion de despacho. Salida #' . $salida->id,
                    'user_id' => auth()->id()
                ]);
            }

            // Revertir sobrantes descontados del vehiculo
            $ultimaSalida = Salida::where('vehiculo_id', $salida->vehiculo_id)
                ->where('estado', 'COMPLETADO')
                ->where('id', '<', $salida->id)
                ->orderBy('id', 'desc')
                ->first();

            $salidaItems = SalidaItem::where('salida_id', $salida->id)->get();
            foreach ($salidaItems as $item) {
                $esSobrante = !$movimientos->where('producto_id', $item->producto_id)
                                           ->where('ruma_id', $item->ruma_id)
                                           ->where('cantidad', $item->cantidad)
                                           ->first();
                if ($esSobrante && $ultimaSalida) {
                    $stockAnterior = StockVendedor::where('salida_id', $ultimaSalida->id)
                        ->where('producto_id', $item->producto_id)
                        ->first();
                    if ($stockAnterior) {
                        $stockAnterior->cantidad += $item->cantidad;
                        $stockAnterior->save();
                    } else {
                        StockVendedor::create([
                            'salida_id' => $ultimaSalida->id,
                            'vendedor_id' => $salida->vendedor_id,
                            'producto_id' => $item->producto_id,
                            'cantidad' => $item->cantidad,
                            'cantidad_entregada' => $item->cantidad,
                            'stock_reservado' => 0,
                            'vendido' => 0,
                            'devuelto' => 0,
                            'fecha_ultimo_mov' => now()
                        ]);
                    }
                }
            }

            // Eliminar StockVendedor de esta salida
            StockVendedor::where('salida_id', $salida->id)->delete();

            DB::commit();

            return response()->json(['message' => 'Salida anulada correctamente y stock revertido.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Error al anular la salida',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $salida = Salida::findOrFail($id);

        if (!in_array($salida->estado, ['PENDIENTE', 'EN_RUTA'])) {
            return response()->json([
                'error' => 'Solo se pueden modificar salidas en estado PENDIENTE o EN_RUTA.'
            ], 400);
        }

        if ($salida->tiene_ventas) {
            return response()->json([
                'error' => 'No se puede modificar esta salida porque el vendedor ya ha realizado ventas.'
            ], 400);
        }

        $request->validate([
            'fecha' => 'required|date',
            'vendedor_id' => 'required|exists:vendedores,id',
            'vehiculo_id' => 'required|exists:vehiculos,id',
            'zona' => 'required|string',
            'ruta_ids' => 'required_without:ruta_id|array|min:1',
            'ruta_ids.*' => 'exists:rutas,id',
            'ruta_id' => 'nullable|exists:rutas,id',
            'conductor' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.ruma_id' => 'required|exists:rumas,id',
            'items.*.cantidad' => [
                'required', 
                'numeric', 
                'gt:0',
                function ($attribute, $value, $fail) use ($request) {
                    $index = explode('.', $attribute)[1];
                    $productoId = $request->input("items.{$index}.producto_id");
                    if ($productoId) {
                        $producto = \App\Models\Producto::find($productoId);
                        if ($producto && $producto->tipo_venta === 'UNIDAD' && floor($value) != $value) {
                            $fail("La cantidad para el producto {$producto->nombre} debe ser un número entero.");
                        }
                    }
                }
            ],
            'items.*.es_sobrante' => 'boolean|nullable',
        ]);

        $rutaIds = $request->input('ruta_ids');
        if (empty($rutaIds) && $request->filled('ruta_id')) {
            $rutaIds = [(int)$request->ruta_id];
        }

        // Validar que todas las rutas pertenezcan a la zona seleccionada (por nombre de zona)
        $rutasBD = Ruta::whereIn('id', $rutaIds)->get();
        foreach ($rutasBD as $r) {
            if ($r->zona !== $request->zona) {
                return response()->json([
                    'error' => 'Todas las rutas seleccionadas deben pertenecer a la zona especificada (' . $request->zona . ').'
                ], 400);
            }
        }

        // Verificar vendedor disponible en ruta (si cambió o es diferente a esta salida)
        $vendedorSalida = Salida::where('vendedor_id', $request->vendedor_id)
            ->where('estado', 'EN_RUTA')
            ->where('id', '!=', $salida->id)
            ->first();

        if ($vendedorSalida) {
            return response()->json([
                'error' => 'El vendedor seleccionado ya tiene otra salida en ruta.'
            ], 400);
        }

        // Verificar vehiculo disponible en ruta (excluyendo esta salida)
        $vehiculoSalida = Salida::where('vehiculo_id', $request->vehiculo_id)
            ->where('estado', 'EN_RUTA')
            ->where('id', '!=', $salida->id)
            ->first();

        if ($vehiculoSalida) {
            return response()->json([
                'error' => 'El vehículo seleccionado ya tiene otra salida en ruta.'
            ], 400);
        }

        // Verificar que el nuevo vehiculo no está en mantenimiento
        if ($request->vehiculo_id != $salida->vehiculo_id) {
            $vehiculoMantenimiento = Vehiculo::where('id', $request->vehiculo_id)
                ->where('estado', '!=', 'DISPONIBLE')
                ->first();

            if ($vehiculoMantenimiento) {
                return response()->json([
                    'error' => 'El nuevo vehículo seleccionado no está disponible.'
                ], 400);
            }
        }

        DB::beginTransaction();

        try {
            // 1. Manejo de estados de vehículos si está EN_RUTA y cambia de vehículo
            if ($salida->estado === 'EN_RUTA' && $request->vehiculo_id != $salida->vehiculo_id) {
                $oldVehiculo = Vehiculo::find($salida->vehiculo_id);
                if ($oldVehiculo) {
                    $oldVehiculo->estado = 'DISPONIBLE';
                    $oldVehiculo->save();
                }

                $newVehiculo = Vehiculo::findOrFail($request->vehiculo_id);
                $newVehiculo->estado = 'EN_RUTA';
                $newVehiculo->save();
            }

            // 2. Revertir inventario anterior de la salida
            $movimientosAnteriores = \App\Models\MovimientoStock::where(function($q) use ($salida) {
                    $q->where('motivo', 'like', '%Salida #' . $salida->id . '%')
                      ->orWhere(function($subQ) use ($salida) {
                          $subQ->where('referencia_tipo', 'SALIDA')
                               ->where('referencia_id', $salida->id);
                      });
                })
                ->where('tipo', 'SALIDA')
                ->get();

            foreach ($movimientosAnteriores as $mov) {
                StockService::registrarMovimiento([
                    'tipo' => 'DEVOLUCION_BUENA',
                    'producto_id' => $mov->producto_id,
                    'ruma_id' => $mov->ruma_id,
                    'cantidad' => $mov->cantidad,
                    'motivo' => 'Modificacion de despacho (Reversion). Salida #' . $salida->id,
                    'user_id' => auth()->id()
                ]);
            }

            // Revertir sobrantes anteriores si aplica
            $ultimaSalidaAnterior = Salida::where('vehiculo_id', $salida->vehiculo_id)
                ->where('estado', 'COMPLETADO')
                ->where('id', '<', $salida->id)
                ->orderBy('id', 'desc')
                ->first();

            $salidaItemsAnteriores = SalidaItem::where('salida_id', $salida->id)->get();
            foreach ($salidaItemsAnteriores as $oldItem) {
                $eraSobrante = !$movimientosAnteriores->where('producto_id', $oldItem->producto_id)
                    ->where('ruma_id', $oldItem->ruma_id)
                    ->where('cantidad', $oldItem->cantidad)
                    ->first();
                if ($eraSobrante && $ultimaSalidaAnterior) {
                    $stockAnterior = StockVendedor::where('salida_id', $ultimaSalidaAnterior->id)
                        ->where('producto_id', $oldItem->producto_id)
                        ->first();
                    if ($stockAnterior) {
                        $stockAnterior->cantidad += $oldItem->cantidad;
                        $stockAnterior->save();
                    } else {
                        StockVendedor::create([
                            'salida_id' => $ultimaSalidaAnterior->id,
                            'vendedor_id' => $salida->vendedor_id,
                            'producto_id' => $oldItem->producto_id,
                            'cantidad' => $oldItem->cantidad,
                            'cantidad_entregada' => $oldItem->cantidad,
                            'stock_reservado' => 0,
                            'vendido' => 0,
                            'devuelto' => 0,
                            'fecha_ultimo_mov' => now()
                        ]);
                    }
                }
            }

            // Eliminar SalidaItem y StockVendedor anteriores de esta salida
            SalidaItem::where('salida_id', $salida->id)->delete();
            StockVendedor::where('salida_id', $salida->id)->delete();

            // 3. Actualizar cabecera de la salida
            $vehiculo = Vehiculo::findOrFail($request->vehiculo_id);
            if (!$vehiculo->vendedores()->where('vendedor_id', $request->vendedor_id)->exists()) {
                $vehiculo->vendedores()->attach($request->vendedor_id);
            }

            $salida->update([
                'fecha' => $request->fecha,
                'vendedor_id' => $request->vendedor_id,
                'conductor' => $request->conductor,
                'vehiculo_id' => $request->vehiculo_id,
                'zona' => $request->zona,
                'ruta_id' => $rutaIds[0],
            ]);

            $salida->rutas()->sync($rutaIds);

            // 4. Registrar los nuevos ítems
            foreach ($request->items as $item) {
                SalidaItem::create([
                    'salida_id' => $salida->id,
                    'producto_id' => $item['producto_id'],
                    'ruma_id' => $item['ruma_id'],
                    'cantidad' => $item['cantidad'],
                ]);

                $stockVendedor = StockVendedor::where('salida_id', $salida->id)
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if ($stockVendedor) {
                    $stockVendedor->cantidad += $item['cantidad'];
                    $stockVendedor->cantidad_entregada += $item['cantidad'];
                    $stockVendedor->save();
                } else {
                    StockVendedor::create([
                        'salida_id' => $salida->id,
                        'producto_id' => $item['producto_id'],
                        'vendedor_id' => $request->vendedor_id,
                        'cantidad' => $item['cantidad'],
                        'cantidad_entregada' => $item['cantidad'],
                    ]);
                }

                if (isset($item['es_sobrante']) && $item['es_sobrante'] == true) {
                    $ultimaSalida = Salida::where('vehiculo_id', $request->vehiculo_id)
                        ->where('estado', 'COMPLETADO')
                        ->where('id', '!=', $salida->id)
                        ->orderBy('id', 'desc')
                        ->first();

                    if ($ultimaSalida) {
                        $stockAnterior = StockVendedor::where('salida_id', $ultimaSalida->id)
                            ->where('producto_id', $item['producto_id'])
                            ->where('cantidad', '>=', $item['cantidad'])
                            ->first();

                        if ($stockAnterior) {
                            $stockAnterior->cantidad -= $item['cantidad'];
                            $stockAnterior->save();
                        }
                    }
                } else {
                    StockService::registrarMovimiento([
                        'tipo' => 'SALIDA',
                        'producto_id' => $item['producto_id'],
                        'ruma_id' => $item['ruma_id'],
                        'cantidad' => $item['cantidad'],
                        'motivo' => 'Despacho de fabrica. Salida #' . $salida->id,
                        'user_id' => auth()->id()
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Salida actualizada correctamente',
                'salida' => $salida->load('rutas', 'ruta', 'items.producto', 'items.ruma')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'error' => 'Error al actualizar la salida',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function getSobrantes($id)
    {
        $ultimaSalida = Salida::where('vehiculo_id', $id)
            ->where('estado', 'COMPLETADO')
            ->orderBy('id', 'desc')
            ->first();

        if (!$ultimaSalida) {
            return response()->json([]);
        }

        $sobrantes = StockVendedor::where('salida_id', $ultimaSalida->id)
            ->where('cantidad', '>', 0)
            ->with(['producto'])
            ->get();

        $salidaItems = SalidaItem::where('salida_id', $ultimaSalida->id)->get();
        $items = [];

        foreach ($sobrantes as $stock) {
            $salidaItem = $salidaItems->where('producto_id', $stock->producto_id)
                                      ->where('cantidad', '>=', $stock->cantidad)
                                      ->first() ?? $salidaItems->where('producto_id', $stock->producto_id)->first();
            
            $items[] = [
                'producto_id' => $stock->producto_id,
                'ruma_id' => $salidaItem ? $salidaItem->ruma_id : null,
                'cantidad' => $stock->cantidad,
                'es_sobrante' => true,
                'producto' => $stock->producto
            ];
        }

        return response()->json($items);
    }
}
