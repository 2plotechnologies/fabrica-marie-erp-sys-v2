<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="notranslate">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="google" content="notranslate">

    <title>Sistema ERP - Fábrica Marie / Rey del Centro</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
    <link rel="icon" type="image/png" href="https://fabricamarie.com/wp-content/uploads/2022/11/logo-fam.png" />

    <!-- Vite - Carga los assets compilados -->
    @viteReactRefresh
    @vite(['src/main.tsx']) <!-- Cambiado: sin "resources/js/" -->
</head>
<body>
    <div id="root"></div>
</body>
</html>
