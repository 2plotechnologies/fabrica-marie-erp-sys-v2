<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardService
{
    /**
     * Retorna todos los KPIs del dashboard
     */
    public function getDashboardKPIs()
    {
        return Cache::remember('dashboard_kpis', 60, function () {

            return [
                'ventas'   => $this->getVentasStats(),
                'cobros'   => $this->getCobrosStats(),
                'stock'    => $this->getStockStats(),
                'clientes' => $this->getClientesStats(),
                'rutas'    => $this->getRutasStats(),
                'ultimas_ventas' => $this->getUltimasVentas(),
                'stock_bajo' => $this->getStockBajo(),
                'clientes_totales' => $this->getClientesTotales(),
                'clientes_morosos' => $this->getClientesMorosos(),
            ];
        });
    }

    /**
     * ==========================
     * VENTAS
     * ==========================
     */
    private function getVentasStats()
    {
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $ventasHoy = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->sum('total_neto');

        $ventasSemana = DB::table('ventas')
            ->where('fecha', '>=', $startOfWeek)
            ->sum('total_neto');

        $ventasMes = DB::table('ventas')
            ->where('fecha', '>=', $startOfMonth)
            ->sum('total_neto');

        $transaccionesHoy = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->count();

        return [
            'hoy'       => (float) $ventasHoy,
            'semana'    => (float) $ventasSemana,
            'mes'       => (float) $ventasMes,
            'total_hoy' => (int) $transaccionesHoy,
        ];
    }

    /**
     * ==========================
     * COBROS
     * ==========================
     */
    private function getCobrosStats()
    {
        $today = Carbon::today();

        $cobrosHoy = DB::table('cuentas_por_cobrar')
            ->whereDate('fecha_vencimiento', $today)
            ->where('estado', 'PENDIENTE')
            ->sum('saldo');

        $pendientes = DB::table('cuentas_por_cobrar')
            ->where('estado', 'PENDIENTE')
            ->sum('saldo');

        $vencido = DB::table('cuentas_por_cobrar')
            ->where('fecha_vencimiento', '<', $today)
            ->where('estado', 'PENDIENTE')
            ->sum('saldo');

        return [
            'hoy'        => (float) $cobrosHoy,
            'pendientes' => (float) $pendientes,
            'vencido'    => (float) $vencido,
        ];
    }

    /**
     * ==========================
     * STOCK
     * ==========================
     */
    private function getStockStats()
    {
        $productosBajoStock = DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->whereColumn('stock_actual.cantidad', '<', 'productos.stock_minimo')
            ->distinct()
            ->count('productos.id');

        $totalProductos = DB::table('productos')->count();

        $valorTotal = DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->select(DB::raw('SUM(stock_actual.cantidad * productos.precio_base) as total'))
            ->value('total');

        return [
            'cuenta_stock_bajo' => (int) $productosBajoStock,
            'total_productos'   => (int) $totalProductos,
            'valor_total'       => (float) $valorTotal,
        ];
    }

    /**
     * ==========================
     * CLIENTES
     * ==========================
     */
    private function getClientesStats()
    {
        $today = Carbon::today();

        $totalClientes = DB::table('clientes')->count();

        $clientesMorosos = DB::table('clientes')
            ->join('cuentas_por_cobrar', 'clientes.id', '=', 'cuentas_por_cobrar.cliente_id')
            ->where('cuentas_por_cobrar.fecha_vencimiento', '<', $today)
            ->where('cuentas_por_cobrar.estado', 'pendiente')
            ->distinct()
            ->count('clientes.id');

        $clientesActivos = $totalClientes - $clientesMorosos;

        return [
            'total'   => (int) $totalClientes,
            'activos' => (int) $clientesActivos,
            'morosos' => (int) $clientesMorosos,
        ];
    }

    /**
     * ==========================
     * RUTAS
     * ==========================
     */
    private function getRutasStats()
    {
        $today = Carbon::today();

        $clientesVisitados = DB::table('ventas')
            ->whereDate('fecha', $today)
            ->distinct()
            ->count('cliente_id');

        $rutasVisitadas = DB::table('ventas')
            ->join('clientes', 'ventas.cliente_id', '=', 'clientes.id')
            ->whereDate('ventas.fecha', $today)
            ->distinct()
            ->count('clientes.ruta_id');

        $clientesTotalesRutas = DB::table('clientes')->count();

        $eficiencia = 0;

        if ($clientesTotalesRutas > 0) {
            $eficiencia = ($clientesVisitados / $clientesTotalesRutas) * 100;
        }

        return [
            'visitadas_hoy'      => (int) $rutasVisitadas,
            'clientes_visitados' => (int) $clientesVisitados,
            'eficiencia'         => round($eficiencia, 1),
        ];
    }

    //Obtener ultimas 2 ventas con venta_items y data de cada producto en un subarray
    public function getUltimasVentas()
    {
        $ventas = DB::table('ventas')
            ->join('clientes', 'ventas.cliente_id', '=', 'clientes.id')
            ->select('ventas.*', 'clientes.razon_social as cliente')
            ->orderBy('ventas.fecha', 'desc')
            ->limit(2)
            ->get();

        foreach ($ventas as $venta) {
            $venta->items = DB::table('venta_items')
                ->join('productos', 'venta_items.producto_id', '=', 'productos.id')
                ->select('venta_items.*', 'productos.nombre as producto')
                ->where('venta_items.venta_id', $venta->id)
                ->get();
        }

        return $ventas;
    }

    //Obtener stock bajo 
    //Listar productos con stock bajo
    public function getStockBajo()
    {
        return DB::table('stock_actual')
            ->join('productos', 'stock_actual.producto_id', '=', 'productos.id')
            ->whereColumn('stock_actual.cantidad', '<', 'productos.stock_minimo')
            ->distinct()
            ->get();
    }

    //Obtener clientes totales
    public function getClientesTotales()
    {
        return DB::table('clientes')->get();
    }

    //Clientes morosos, estado PENDIENTE O PARCIAL, listar clientes.
    public function getClientesMorosos()
    {
        return DB::table('clientes')
            ->join('cuentas_por_cobrar', 'clientes.id', '=', 'cuentas_por_cobrar.cliente_id')
            ->where('cuentas_por_cobrar.fecha_vencimiento', '<', Carbon::today())
            ->whereIn('cuentas_por_cobrar.estado', ['PENDIENTE', 'PARCIAL'])
            ->select('clientes.*', 'cuentas_por_cobrar.saldo as deuda_actual')
            ->distinct()
            ->get();
    }
}