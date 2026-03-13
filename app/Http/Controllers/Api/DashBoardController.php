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
}