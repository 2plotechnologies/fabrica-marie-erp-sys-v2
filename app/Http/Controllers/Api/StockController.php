<?php

namespace App\Http\Controllers\Api;

use App\Models\StockActual;

class StockController extends Controller
{
    public function index()
    {
        return response()->json(
            StockActual::with(['producto', 'ruma'])->get()
        );
    }
}
