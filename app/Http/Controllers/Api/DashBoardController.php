<?php

namespace App\Http\Controllers\Api;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashBoardController extends Controller
{
    protected DashboardService $dashboardService;

    /**
     * Constructor
     */
    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Retorna todos los KPIs del dashboard
     */
    //AGS = ADMIN, GERENTE, SUPERVISOR
    public function indexAGS(): JsonResponse
    {
        $data = $this->dashboardService->getDashboardKPIs();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    //Vendedor
    public function indexVendedor(): JsonResponse
    {
        $data = $this->dashboardService->getDashboardKPIsVendedor();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    //Almacenero
    public function indexAlmacenero(): JsonResponse
    {
        $data = $this->dashboardService->getDashboardKPIsAlmacenero();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    //Cajero
    public function indexCajero(): JsonResponse
    {
        $data = $this->dashboardService->getDashboardKPIsCajero();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    //Mantenimiento
    public function indexMantenimiento(): JsonResponse
    {
        $data = $this->dashboardService->getDashboardKPIsMantenimiento();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }
}