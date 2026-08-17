<?php

namespace App\Http\Controllers\Api;

use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\VentaItem;
use App\Models\StockActual;
use App\Models\StockVendedor;
use App\Models\MovimientoStock;
use App\Models\Salida;
use App\Models\SalidaItem;
use App\Models\Cliente;
use App\Services\VentaService;
use App\Services\CajaService;
use App\Services\StockService;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Exception;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

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
        $user = auth()->user();
        $isVendedor = $user && $user->roles()->where('nombre', 'VENDEDOR')->exists();
        $vendedor = $isVendedor ? \App\Models\Vendedor::where('usuario_id', $user->id)->first() : null;

        return Venta::query()
            ->with([
                'cliente:id,razon_social',
                'vendedor:id,usuario_id',
                'vendedor.usuario:id,nombre',
                'items.producto:id,nombre',
            ])
            ->when($vendedor, function ($query) use ($vendedor) {
                $query->where('vendedor_id', $vendedor->id);
            })
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
                .'<Cell><Data ss:Type="String">'.$this->escapeXml($venta['nota_pedido'] ?? '').'</Data></Cell>'
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
            .'<Cell><Data ss:Type="String">Nota Pedido</Data></Cell>'
            .'<Cell><Data ss:Type="String">Total neto</Data></Cell>'
            .'</Row>'
            .$rows
            .'<Row>'
            .'<Cell><Data ss:Type="String">Totales</Data></Cell>'
            .'<Cell/><Cell/><Cell/><Cell/><Cell/>'
            .'<Cell><Data ss:Type="String">Total vendido</Data></Cell>'
            .'<Cell><Data ss:Type="Number">'.number_format($totalVendido, 2, '.', '').'</Data></Cell>'
            .'</Row>'
            .'<Row>'
            .'<Cell/><Cell/><Cell/><Cell/><Cell/><Cell/>'
            .'<Cell><Data ss:Type="String">Contado</Data></Cell>'
            .'<Cell><Data ss:Type="Number">'.number_format($totalContado, 2, '.', '').'</Data></Cell>'
            .'</Row>'
            .'<Row>'
            .'<Cell/><Cell/><Cell/><Cell/><Cell/><Cell/>'
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
        $validated = $request->validate([
            'cliente_id' => ['required', 'exists:clientes,id'],
            'vendedor_id' => ['required', 'exists:vendedores,id'],
            'fecha' => ['nullable', 'date', 'before_or_equal:today'],
            'tipo_pago' => ['required', Rule::in(['CONTADO','CREDITO'])],
            'metodo_pago_detalle' => ['nullable', 'string', 'max:100'],
            'adelanto' => ['nullable', 'numeric', 'min:0'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'total_neto' => ['required', 'numeric', 'min:0'],
            'nota_pedido' => ['required_if:tipo_pago,CREDITO', 'nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'exists:productos,id'],
            'items.*.salida_id' => ['nullable', 'exists:salidas,id'],
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
            'items.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'items.*.subtotal' => ['required', 'numeric', 'min:0'],
            'items.*.es_bonificacion' => ['boolean'],
            'items.*.es_degustacion' => ['boolean'],
            'pagos' => ['nullable', 'array'],
            'pagos.*.metodo_pago' => ['required_with:pagos', 'string'],
            'pagos.*.monto' => ['required_with:pagos', 'numeric', 'min:0'],
            'pagos.*.banco' => ['nullable', 'string'],
            'pagos.*.numero_operacion' => ['nullable', 'string'],
        ]);

        // Si la venta es de un almacenero, no permitir ventas en ruta (con salida_id)
        $user = auth()->user();
        if ($user && $user->roles()->where('nombre', 'ALMACENERO')->exists()) {
            foreach ($validated['items'] as $item) {
                if (!empty($item['salida_id'])) {
                    throw new Exception('El almacenero solo tiene permitido realizar ventas de fábrica.');
                }
            }
        }

        //Si la venta es al credito, NO permitir vende a cliente con documento 000000 (Cliente Varios)
        if($validated['tipo_pago'] === 'CREDITO'){
            $cliente = Cliente::findOrFail($validated['cliente_id']);
            if($cliente->codigo_cliente === '000000' || $cliente->codigo_cliente === '0000000'){
                throw new Exception('No se puede vender al credito a cliente varios. Por favor, seleccione un cliente registrado.');
            }
            if ($validated['total_neto'] <= 0) {
                throw new Exception('No se puede crear una venta al crédito con total cero.');
            }
        }

        return DB::transaction(function () use ($validated, $request) {

            $metodoPagoDetalle = $validated['metodo_pago_detalle'] ?? null;

            // Determinar metodo_pago_detalle si vienen múltiples pagos
            if (!empty($validated['pagos']) && count($validated['pagos']) > 0) {
                $metodosUnicos = array_unique(array_map(function($p) {
                    return strtoupper($p['metodo_pago']);
                }, $validated['pagos']));

                $metodoPagoDetalle = implode(', ', $metodosUnicos);
            }

            $fechaVenta = !empty($validated['fecha'])
                ? (strlen($validated['fecha']) === 10
                    ? Carbon::parse($validated['fecha'])->setTimeFrom(Carbon::now())
                    : Carbon::parse($validated['fecha']))
                : Carbon::now();

            $venta = Venta::create([
                'cliente_id' => $validated['cliente_id'],
                'vendedor_id' => $validated['vendedor_id'],
                'fecha' => $fechaVenta,
                'tipo_pago' => $validated['tipo_pago'],
                'metodo_pago_detalle' => $metodoPagoDetalle,
                'adelanto' => $validated['tipo_pago'] === 'CREDITO'
                                ? ($validated['adelanto'] ?? 0)
                                : 0,
                'descuento' => $validated['descuento'] ?? 0,
                'total_neto' => $validated['total_neto'],
                'estado' => 'BORRADOR', // 🔥 Estado inicial automático
                'nota_pedido' => $validated['tipo_pago'] === 'CREDITO' ? ($validated['nota_pedido'] ?? null) : null,
            ]);

            // Generar código después de obtener ID
            $venta->codigo = 'VTA-' . str_pad($venta->id, 6, '0', STR_PAD_LEFT);
            $venta->save();

            // Crear items
            foreach ($validated['items'] as $item) {
                $venta->items()->create([
                    'producto_id' => $item['producto_id'],
                    'salida_id' => $item['salida_id'] ?? null,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'subtotal' => $item['subtotal'],
                    'es_bonificacion' => $item['es_bonificacion'] ?? false,
                    'es_degustacion' => $item['es_degustacion'] ?? false,
                ]);
            }

            // Crear desgloses de pago en venta_pagos
            if (!empty($validated['pagos']) && count($validated['pagos']) > 0) {
                foreach ($validated['pagos'] as $pagoItem) {
                    if ($pagoItem['monto'] > 0) {
                        $venta->pagos()->create([
                            'metodo_pago' => strtoupper($pagoItem['metodo_pago']),
                            'monto' => $pagoItem['monto'],
                            'banco' => $pagoItem['banco'] ?? null,
                            'numero_operacion' => $pagoItem['numero_operacion'] ?? null,
                        ]);
                    }
                }
            } else if (!empty($metodoPagoDetalle)) {
                // Si solo vino un metodo_pago_detalle simple
                $montoPago = $venta->tipo_pago === 'CONTADO' ? $venta->total_neto : $venta->adelanto;
                if ($montoPago > 0) {
                    $venta->pagos()->create([
                        'metodo_pago' => strtoupper($metodoPagoDetalle),
                        'monto' => $montoPago,
                    ]);
                }
            }

            // Crear cuenta si es crédito
            if ($venta->tipo_pago === 'CREDITO') {

                // Generar fecha de vencimiento usando el valor "Dias credito" del cliente (Solo si es diferente de cero)
                $cliente = Cliente::findOrFail($venta->cliente_id);
                $diasCredito = $cliente->dias_credito;

                if ($diasCredito > 0) {
                    $fechaVencimiento = Carbon::now()->addDays($diasCredito);
                } else {
                    $fechaVencimiento = Carbon::now()->addDays(10);
                }

                $venta->cuenta()->create([
                    'cliente_id' => $venta->cliente_id,
                    'fecha_vencimiento' => $fechaVencimiento,
                    'monto_total' => $venta->total_neto,
                    'saldo' => $venta->total_neto - $venta->adelanto,
                    'estado' => 'PENDIENTE'
                ]);

                //Actualizar deuda actual del cliente
                $cliente->update([
                    'deuda_actual' => $cliente->deuda_actual + $venta->total_neto - $venta->adelanto
                ]);
            }

            //Reservar Stock.
            $this->reservarStock($venta);

            return $venta->load('items', 'pagos');
        });
    }

    public function show($id)
    {
        $venta = Venta::with([
            'cliente',
            'vendedor.usuario',
            'items.producto',
            'pagos',
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

                if (empty($item->salida_id)) {
                    // Venta directa desde fábrica: descontar directamente de almacén central
                    $stockService->descontarStock(
                        (int)$item->producto_id,
                        (float)$item->cantidad,
                        (int)$venta->id,
                        (int)(auth()->id() ?? $venta->vendedor_id)
                    );
                    continue;
                }

                $stock = StockVendedor::where('producto_id', $item->producto_id)
                    ->where('vendedor_id', $venta->vendedor_id)
                    ->where('salida_id', $item->salida_id)
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

                $stock->vendido += $item->cantidad;
                $stock->fecha_ultimo_mov = now();
                $stock->save();

                $salida = Salida::where('id', $item->salida_id)->first();
                if ($salida) {
                    $salidaItem = $salida->items()->where('producto_id', $item->producto_id)->first();
                    if ($salidaItem) {
                        $salidaItem->cantidad -= $item->cantidad;
                        $salidaItem->save();
                    }
                    $salida->save();
                }
            }

            if($venta->tipo_pago === 'CONTADO'){
                if ($venta->total_neto > 0) {
                    $movimientoCaja = CajaService::registrarMovimiento([
                        'tipo' => 'INGRESO',
                        'estado' => 'APROBADO',
                        'monto' => $venta->total_neto,
                        'categoria' => 'VENTA',
                        'descripcion' => 'Venta confirmada, Venta #'.$venta->id,
                        'referencia_tipo' => 'VENTA',
                        'referencia_id' => $venta->id
                    ]);
                }
            }else{
                if ($venta->adelanto > 0) {
                    $movimientoCaja = CajaService::registrarMovimiento([
                        'tipo' => 'INGRESO',
                        'estado' => 'APROBADO',
                        'monto' => $venta->adelanto,
                        'categoria' => 'VENTA',
                        'descripcion' => 'Venta al crédito confirmada, Venta #'.$venta->id,
                        'referencia_tipo' => 'VENTA',
                        'referencia_id' => $venta->id
                    ]);
                }
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

            if (empty($item->salida_id)) {
                $disponible = StockActual::where('producto_id', $item->producto_id)->sum('cantidad');
                if ($item->cantidad > $disponible) {
                    throw new Exception("Stock insuficiente en fábrica para reservar el producto ID: {$item->producto_id}");
                }
                continue;
            }

            $stock = StockVendedor::where('producto_id', $item->producto_id)
                ->where('vendedor_id', $venta->vendedor_id)
                ->where('salida_id', $item->salida_id)
                ->lockForUpdate()
                ->first();

            if ($stock) {
                $disponible = $stock->cantidad - $stock->stock_reservado;

                if ($item->cantidad > $disponible) {
                    throw new Exception('Stock insuficiente para reservar');
                }

                $stock->stock_reservado += $item->cantidad;
                $stock->save();
            }
        }
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $venta = Venta::with('items')->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden editar ventas en borrador');
            }

            $user = auth()->user();
            if ($user && $user->roles()->where('nombre', 'ALMACENERO')->exists()) {
                foreach ($request->items as $item) {
                    if (!empty($item['salida_id'])) {
                        throw new Exception('El almacenero solo tiene permitido realizar ventas de fábrica.');
                    }
                }
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
        return DB::transaction(function () use ($id, $ventaService) {

            $venta = Venta::with(['items', 'cuenta'])->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'BORRADOR') {
                throw new Exception('Solo se pueden eliminar ventas en borrador');
            }

            $ventaService->liberarReserva($venta);

            if ($venta->cuenta) {
                $tieneAbonos = $venta->cuenta
                    ->abonos()
                    ->where('estado', 'ACTIVO')
                    ->exists();

                if ($tieneAbonos) {
                    throw new Exception('No se puede eliminar la venta porque tiene una cuenta por cobrar con abonos registrados.');
                }

                // Restar de la deuda actual del cliente
                $cliente = Cliente::find($venta->cliente_id);
                if ($cliente) {
                    $montoRestar = $venta->total_neto - $venta->adelanto;
                    $cliente->update([
                        'deuda_actual' => $cliente->deuda_actual - $montoRestar
                    ]);
                }

                // Eliminar abonos (si existieran inactivos) y la cuenta
                $venta->cuenta->abonos()->delete();
                $venta->cuenta->delete();
            }

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

    public function canjeDefectuoso(Request $request, $id, StockService $stockService)
    {
        $itemsDefectuosos = $request->input('items_defectuosos', $request->input('items', []));
        $itemsReposicion = $request->input('items_reposicion', $request->input('items', []));

        if (empty($itemsDefectuosos) || empty($itemsReposicion)) {
            return response()->json(['message' => 'Debes especificar al menos un producto a canjear.'], 422);
        }

        return DB::transaction(function () use ($request, $id, $stockService, $itemsDefectuosos, $itemsReposicion) {
            $venta = Venta::with(['items.producto'])->lockForUpdate()->findOrFail($id);

            if ($venta->estado !== 'CONFIRMADA') {
                throw new Exception('Solo se pueden realizar canjes por productos defectuosos en ventas confirmadas.');
            }

            // 1. Validar que las cantidades a canjear no superen la cantidad original de cada item de la venta
            foreach ($itemsDefectuosos as $defItem) {
                $cant = (float)($defItem['cantidad'] ?? 0);
                if ($cant <= 0) continue;

                $ventaItemId = $defItem['venta_item_id'] ?? null;
                if ($ventaItemId) {
                    $vItem = $venta->items->firstWhere('id', $ventaItemId);
                } else {
                    $vItem = $venta->items->firstWhere('producto_id', $defItem['producto_id']);
                }

                if (!$vItem) {
                    throw new Exception("El producto ID {$defItem['producto_id']} no pertenece a esta venta.");
                }

                if ($cant > (float)$vItem->cantidad) {
                    throw new Exception("La cantidad a canjear ({$cant}) excede la cantidad entregada ({$vItem->cantidad}) para '{$vItem->producto->nombre}'.");
                }
            }

            // Determine if factory sale or route sale
            $isFactorySale = true;
            foreach ($venta->items as $item) {
                if (!empty($item->salida_id)) {
                    $isFactorySale = false;
                    break;
                }
            }

            $userId = auth()->id() ?? $venta->vendedor_id;

            if ($isFactorySale) {
                // Pre-check factory stock for replacement items
                foreach ($itemsReposicion as $repItem) {
                    $cant = (float)($repItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $prodId = (int)$repItem['producto_id'];
                    $disponible = StockActual::where('producto_id', $prodId)->sum('cantidad');
                    if ($disponible < $cant) {
                        $prod = \App\Models\Producto::find($prodId);
                        $nombreProd = $prod ? $prod->nombre : "ID: {$prodId}";
                        throw new Exception("Stock insuficiente en fábrica para reponer '{$nombreProd}'. Disponible: {$disponible}.");
                    }
                }

                // Apply replacements (deduct from central stock)
                foreach ($itemsReposicion as $repItem) {
                    $cant = (float)($repItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $stockService->descontarStock(
                        (int)$repItem['producto_id'],
                        $cant,
                        (int)$venta->id,
                        (int)$userId
                    );
                }

                // Register defective items movement
                foreach ($itemsDefectuosos as $defItem) {
                    $cant = (float)($defItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $prodId = (int)$defItem['producto_id'];
                    $rumaId = MovimientoStock::obtenerUltimaRumaSalida($prodId);
                    if (!$rumaId) {
                        $stockFirst = StockActual::where('producto_id', $prodId)->first();
                        $rumaId = $stockFirst ? $stockFirst->ruma_id : 1;
                    }

                    $stockService->registrarMovimiento([
                        'tipo' => 'DEVOLUCION_MALA',
                        'producto_id' => $prodId,
                        'ruma_id' => $rumaId,
                        'cantidad' => $cant,
                        'referencia_tipo' => 'VENTA_CANJE',
                        'referencia_id' => $venta->id,
                        'user_id' => $userId,
                        'motivo' => $defItem['motivo'] ?? ($request->observaciones ?? 'Canje por producto defectuoso - Venta Fábrica #' . $venta->codigo)
                    ]);
                }
            } else {
                // Route Sale (Vendedor en Ruta):
                // Pre-check seller route stock for replacement items
                foreach ($itemsReposicion as $repItem) {
                    $cant = (float)($repItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $prodId = (int)$repItem['producto_id'];

                    $stocksVendedor = StockVendedor::where('producto_id', $prodId)
                        ->where('vendedor_id', $venta->vendedor_id)
                        ->where('cantidad', '>', 0)
                        ->whereHas('salida', function ($query) {
                            $query->where('estado', 'EN_RUTA');
                        })
                        ->get();

                    $totalDisponible = $stocksVendedor->sum('cantidad');
                    if ($totalDisponible < $cant) {
                        $prod = \App\Models\Producto::find($prodId);
                        $nombreProd = $prod ? $prod->nombre : "ID: {$prodId}";
                        throw new Exception("El vendedor no cuenta con stock suficiente en su vehículo para reponer '{$nombreProd}'. Disponible: {$totalDisponible}.");
                    }
                }

                // Deduct replacement items from StockVendedor.cantidad
                foreach ($itemsReposicion as $repItem) {
                    $cant = (float)($repItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $prodId = (int)$repItem['producto_id'];

                    $stocksVendedor = StockVendedor::where('producto_id', $prodId)
                        ->where('vendedor_id', $venta->vendedor_id)
                        ->where('cantidad', '>', 0)
                        ->whereHas('salida', function ($query) {
                            $query->where('estado', 'EN_RUTA');
                        })
                        ->orderBy('id', 'desc')
                        ->get();

                    $faltante = $cant;
                    foreach ($stocksVendedor as $stock) {
                        if ($faltante <= 0) break;
                        $descontar = min($stock->cantidad, $faltante);
                        $stock->cantidad -= $descontar;
                        $stock->fecha_ultimo_mov = now();
                        $stock->save();

                        if ($stock->salida_id) {
                            $salidaItem = SalidaItem::where('salida_id', $stock->salida_id)
                                ->where('producto_id', $prodId)
                                ->first();
                            if ($salidaItem) {
                                $salidaItem->cantidad -= $descontar;
                                $salidaItem->save();
                            }
                        }

                        $faltante -= $descontar;
                    }
                }

                // Increment StockVendedor.defectuosos for returned bad items
                foreach ($itemsDefectuosos as $defItem) {
                    $cant = (float)($defItem['cantidad'] ?? 0);
                    if ($cant <= 0) continue;
                    $prodId = (int)$defItem['producto_id'];

                    $stockVendedor = StockVendedor::where('producto_id', $prodId)
                        ->where('vendedor_id', $venta->vendedor_id)
                        ->whereHas('salida', function ($query) {
                            $query->where('estado', 'EN_RUTA');
                        })
                        ->orderBy('id', 'desc')
                        ->first();

                    if (!$stockVendedor) {
                        $stockVendedor = StockVendedor::where('producto_id', $prodId)
                            ->where('vendedor_id', $venta->vendedor_id)
                            ->orderBy('id', 'desc')
                            ->first();
                    }

                    if (!$stockVendedor) {
                        $prod = \App\Models\Producto::find($prodId);
                        $nombreProd = $prod ? $prod->nombre : "ID: {$prodId}";
                        throw new Exception("No se encontró registro de stock asignado para '{$nombreProd}'.");
                    }

                    $stockVendedor->defectuosos = ($stockVendedor->defectuosos ?? 0) + $cant;
                    $stockVendedor->fecha_ultimo_mov = now();
                    $stockVendedor->save();
                }
            }

            return response()->json([
                'message' => 'Canje por productos defectuosos registrado correctamente',
                'venta_id' => $venta->id
            ]);
        });
    }
}
