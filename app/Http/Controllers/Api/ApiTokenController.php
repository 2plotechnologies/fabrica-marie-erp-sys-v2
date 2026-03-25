<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\ApiToken;
use Illuminate\Support\Facades\Crypt;

class ApiTokenController
{
    public function getMapboxToken()
    {
        $token = ApiToken::where('nombre', 'mapbox')->first();

        if (!$token) {
            return response()->json(null);
        }

        return response()->json([
            'token' => Crypt::decryptString($token->token_encriptado)
        ]);
    }

    public function saveMapboxToken()
    {
        request()->validate([
            'token' => 'required|string'
        ]);

        ApiToken::updateOrCreate(
            ['nombre' => 'mapbox'],
            ['token_encriptado' => Crypt::encryptString(request('token'))]
        );

        return response()->json(['success' => true]);
    }
}
