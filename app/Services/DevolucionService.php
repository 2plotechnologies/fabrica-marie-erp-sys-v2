<?php

namespace App\Services;

use App\Models\DevolucionItem;
use App\Models\Devolucion;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class DevolucionService
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function registrar(array $data)
    {
        return DB::transaction(function () use ($data) {

            $devolucion = Devolucion::create([
                'fecha' => $data['fecha'],
                'vendedor_id' => $data['vendedor_id'],
                'tipo' => $data['tipo'],
                'motivo' => $data['motivo'] ?? null,
                'estado' => 'PROCESADA',
                'created_at' => now()
            ]);

            foreach ($data['items'] as $item) {

                DevolucionItem::create([
                    'devolucion_id' => $devolucion->id,
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad']
                ]);

                if ($data['tipo'] === 'BUENA') {

                    $this->stockService->registrarMovimiento(
                        tipo: 'DEVOLUCION',
                        productoId: $item['producto_id'],
                        cantidad: $item['cantidad'],
                        referenciaTipo: 'DEV_ALMACEN',
                        referenciaId: $devolucion->id,
                        motivo: 'Devolución buena'
                    );

                } else {

                    $this->stockService->registrarMovimiento(
                        tipo: 'AJUSTE',
                        productoId: $item['producto_id'],
                        cantidad: $item['cantidad'],
                        referenciaTipo: 'DEV_DANADA',
                        referenciaId: $devolucion->id,
                        motivo: 'Producto dañado'
                    );
                }
            }

            return $devolucion->load('items');
        });
    }
}
