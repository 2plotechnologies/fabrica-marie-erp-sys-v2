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
                'origen_stock' => $data['origen_stock'] ?? 'REGULAR',
                'motivo' => $data['motivo'] ?? null,
                'observaciones'=> $data['observaciones'] ?? null,
                'estado' => 'PENDIENTE',
                'created_at' => now()
            ]);

            foreach ($data['items'] as $item) {

                DevolucionItem::create([
                    'devolucion_id' => $devolucion->id,
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'motivo' => $item['motivo'] ?? null,
                ]);
            }

            return $devolucion->load('items');
        });
    }
}
