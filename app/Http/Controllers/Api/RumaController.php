<?php

namespace App\Http\Controllers;

use App\Models\Ruma;
use Illuminate\Http\Request;

class RumaController extends Controller
{
    public function index()
    {
        return response()->json(Ruma::all());
    }

    public function store(Request $request)
    {
        return response()->json(
            Ruma::create($request->all()),
            201
        );
    }
}
