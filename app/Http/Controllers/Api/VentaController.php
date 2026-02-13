<?php

namespace App\Http\Controllers\Api;

use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\VentaItem;
use App\Services\VentaService;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Exception;

class VentaController extends Controller
{
    public function index()
    {
        return $this->buildReporteQuery(request())
            ->get();
    }

    public function reporte(Request $request)
    {
        $ventas = $this->buildReporteQuery($request)->get();

        $resumen = [
            'cantidad_ventas' => $ventas->count(),
            'total_vendido' => (float) $ventas->sum('total_neto'),
            'total_contado' => (float) $ventas->where('tipo_pago', 'CONTADO')->sum('total_neto'),
            'total_credito' => (float) $ventas->where('tipo_pago', '!=', 'CONTADO')->sum('total_neto'),
        ];

        return response()->json([
            'filtros' => $request->only([
                'fecha_desde',
                'fecha_hasta',
                'cliente_id',
                'vendedor_id',
                'producto_id',
                'tipo_pago',
            ]),
            'resumen' => $resumen,
            'ventas' => $ventas,
        ]);
    }

    public function exportarExcel(Request $request): StreamedResponse
    {
        $ventas = $this->buildReporteQuery($request)->get();

        $totalVendido = (float) $ventas->sum('total_neto');
        $totalContado = (float) $ventas->where('tipo_pago', 'CONTADO')->sum('total_neto');
        $totalCredito = (float) $ventas->where('tipo_pago', '!=', 'CONTADO')->sum('total_neto');

        $fileName = 'reporte_ventas_'.now()->format('Ymd_His').'.xls';

        return response()->streamDownload(function () use ($ventas, $totalVendido, $totalContado, $totalCredito) {
            echo "\xEF\xBB\xBF";
            echo $this->buildExcelXml($ventas->toArray(), $totalVendido, $totalContado, $totalCredito);
        }, $fileName, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }

    private function buildReporteQuery(Request $request)
    {
        return Venta::query()
            ->with([
                'cliente:id,razon_social',
                'vendedor:id,usuario_id',
                'vendedor.usuario:id,nombre',
                'items.producto:id,nombre',
            ])
            ->when($request->filled('fecha_desde'), function ($query) use ($request) {
                $query->whereDate('fecha', '>=', $request->input('fecha_desde'));
            })
            ->when($request->filled('fecha_hasta'), function ($query) use ($request) {
                $query->whereDate('fecha', '<=', $request->input('fecha_hasta'));
            })
            ->when($request->filled('cliente_id'), function ($query) use ($request) {
                $query->where('cliente_id', $request->input('cliente_id'));
            })
            ->when($request->filled('vendedor_id'), function ($query) use ($request) {
                $query->where('vendedor_id', $request->input('vendedor_id'));
            })
            ->when($request->filled('tipo_pago'), function ($query) use ($request) {
                $tipoPago = strtoupper($request->input('tipo_pago'));

                if ($tipoPago === 'CREDITO') {
                    $query->where('tipo_pago', '!=', 'CONTADO');
                } else {
                    $query->where('tipo_pago', $tipoPago);
                }
            })
            ->when($request->filled('producto_id'), function ($query) use ($request) {
                $query->whereHas('items', function ($itemQuery) use ($request) {
                    $itemQuery->where('producto_id', $request->input('producto_id'));
                });
            })
            ->orderByDesc('fecha')
            ->orderByDesc('id');
    }

    private function buildExcelXml(array $ventas, float $totalVendido, float $totalContado, float $totalCredito): string
    {
        $rows = '';

        foreach ($ventas as $venta) {
            $productos = collect($venta['items'] ?? [])
                ->map(function ($item) {
                    return $item['producto']['nombre'] ?? 'N/A';
                })
                ->implode(', ');

            $rows .= '<Row>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['codigo'] ?? '').'</Data></Cell>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['fecha'] ?? '').'</Data></Cell>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['cliente']['razon_social'] ?? 'N/A').'</Data></Cell>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['vendedor']['usuario']['nombre'] ?? 'N/A').'</Data></Cell>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($productos).'</Data></Cell>'
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['tipo_pago'] ?? '').'</Data></Cell>'
                .'<Cell><Data ss:Type="Number">'.number_format((float) ($venta['total_neto'] ?? 0), 2, '.', '').'</Data></Cell>'
                .'</Row>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<?mso-application progid="Excel.Sheet"?>'
            .'<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
            .' xmlns:o="urn:schemas-microsoft-com:office:office"'
            .' xmlns:x="urn:schemas-microsoft-com:office:excel"'
            .' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"'
            .' xmlns:html="http://www.w3.org/TR/REC-html40">'
            .'<Worksheet ss:Name="Reporte Ventas">'
            .'<Table>'
            .'<Row>'
            .'<Cell><Data ss:Type="String">Código</Data></Cell>'
            .'<Cell><Data ss:Type="String">Fecha</Data></Cell>'
            .'<Cell><Data ss:Type="String">Cliente</Data></Cell>'
            .'<Cell><Data ss:Type="String">Vendedor</Data></Cell>'
            .'<Cell><Data ss:Type="String">Productos</Data></Cell>'
            .'<Cell><Data ss:Type="String">Tipo de pago</Data></Cell>'
            .'<Cell><Data ss:Type="String">Total neto</Data></Cell>'
            .'</Row>'
            .$rows
            .'<Row>'
            .'<Cell><Data ss:Type="String">Totales</Data></Cell>'
            .'<Cell/><Cell/><Cell/><Cell/>'
            .'<Cell><Data ss:Type="String">Total vendido</Data></Cell>'
            .'<Cell><Data ss:Type="Number">'.number_format($totalVendido, 2, '.', '').'</Data></Cell>'
            .'</Row>'
            .'<Row>'
            .'<Cell/><Cell/><Cell/><Cell/><Cell/>'
            .'<Cell><Data ss:Type="String">Contado</Data></Cell>'
            .'<Cell><Data ss:Type="Number">'.number_format($totalContado, 2, '.', '').'</Data></Cell>'
            .'</Row>'
            .'<Row>'
            .'<Cell/><Cell/><Cell/><Cell/><Cell/>'
            .'<Cell><Data ss:Type="String">Crédito</Data></Cell>'
            .'<Cell><Data ss:Type="Number">'.number_format($totalCredito, 2, '.', '').'</Data></Cell>'
            .'</Row>'
            .'</Table>'
            .'</Worksheet>'
            .'</Workbook>';
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {

            $venta = Venta::create($request->only([
                'codigo','vendedor_id','cliente_id',
                'fecha','total_neto','tipo_pago','estado'
            ]));

            foreach ($request->items as $item) {
                $venta->items()->create($item);
            }

            if ($venta->tipo_pago !== 'CONTADO') {
                $venta->cuenta()->create([
                    'cliente_id' => $venta->cliente_id,
                    'monto_total' => $venta->total_neto,
                    'saldo' => $venta->total_neto,
                    'estado' => 'PENDIENTE'
                ]);
            }

            return $venta->load('items');
        });
    }

    public function show($id)
    {
        $venta = Venta::with([
            'cliente',
            'vendedor.usuario',
            'items.producto',
            'movimientosStock',
            'movimientosCaja',
            'cuenta.abonos'
        ])->findOrFail($id);

        return response()->json([
            'venta' => $venta
        ]);
    }

    public function confirmar($id, StockService $stockService)
    {
        return DB::transaction(function () use ($id, $stockService) {

            $venta = Venta::with('items')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden confirmar ventas en borrador');
            }

            $permitirNegativo = auth()->user()->can('stock.negativo');

            foreach ($venta->items as $item) {

                $stock = StockActual::where('producto_id', $item->producto_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $disponible = $stock->cantidad - $stock->stock_reservado;

                /*
                ============================================
                🔒 VALIDACIÓN DE STOCK
                ============================================
                */

                if ($stock->stock_reservado < $item->cantidad) {

                    // No estaba correctamente reservado
                    if (!$permitirNegativo && $item->cantidad > $disponible) {
                        throw new Exception(
                            "Stock insuficiente para el producto {$item->producto_id}"
                        );
                    }
                }

                /*
                ============================================
                🔁 CONVERTIR RESERVA EN DESCUENTO REAL
                ============================================
                */

                $stock->cantidad -= $item->cantidad;

                if ($stock->stock_reservado >= $item->cantidad) {
                    $stock->stock_reservado -= $item->cantidad;
                }

                $stock->fecha_ultimo_mov = now();
                $stock->save();

                /*
                ============================================
                🧾 REGISTRAR MOVIMIENTO
                ============================================
                */

                MovimientoStock::create([
                    'tipo' => 'SALIDA',
                    'producto_id' => $item->producto_id,
                    'ruma_id' => $stock->ruma_id ?? null,
                    'cantidad' => $item->cantidad,
                    'referencia_tipo' => 'VENTA',
                    'referencia_id' => $venta->id,
                    'motivo' => 'Confirmación de venta',
                    'stock_post_mov' => $stock->cantidad,
                    'user_id' => auth()->id(),
                    'created_at' => now()
                ]);
            }

            $venta->estado = 'CONFIRMADA';
            $venta->save();

            return [
                'message' => 'Venta confirmada correctamente',
                'venta_id' => $venta->id
            ];
        });
    }

    public function reservarStock(Venta $venta)
    {
        foreach ($venta->items as $item) {

            $stock = StockActual::where('producto_id', $item->producto_id)
                ->lockForUpdate()
                ->first();

            $disponible = $stock->cantidad - $stock->stock_reservado;

            if ($item->cantidad > $disponible) {
                throw new Exception('Stock insuficiente para reservar');
            }

            $stock->stock_reservado += $item->cantidad;
            $stock->save();
        }
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden editar ventas en borrador');
            }

            // 🔁 Actualizar datos principales
            $venta->cliente_id = $request->cliente_id;
            $venta->tipo_pago = $request->tipo_pago;
            $venta->fecha = $request->fecha;
            $venta->save();

            // 🗑 Eliminar items anteriores
            $venta->items()->delete();

            $total = 0;

            foreach ($request->items as $item) {

                $subtotal = $item['cantidad'] * $item['precio_unitario'];

                $venta->items()->create([
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'subtotal' => $subtotal
                ]);

                $total += $subtotal;
            }

            // 🔄 Recalcular total
            $venta->total_neto = $total;
            $venta->save();

            return [
                'message' => 'Venta actualizada correctamente',
                'venta_id' => $venta->id,
                'total_neto' => $venta->total_neto
            ];
        });
    }

    public function destroy($id, VentaService $ventaService)
    {
        return DB::transaction(function () use ($id) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden eliminar ventas en borrador');
            }

            $ventaService->liberarReserva($venta);

            // Eliminar items
            $venta->items()->delete();

            // Eliminar venta
            $venta->delete();

            return [
                'message' => 'Venta eliminada correctamente'
            ];
        });
    }

    public function anular($id, VentaService $service)
    {
        return $service->anular($id, auth()->id());
    }
}
