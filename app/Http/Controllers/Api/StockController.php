<?php

namespace App\Http\Controllers;

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
