<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$bid = Str::uuid()->toString();
$uid1 = Str::uuid()->toString();
$uid2 = Str::uuid()->toString();
$uid3 = Str::uuid()->toString();

DB::table('businesses')->insert([
    'id' => $bid, 'name' => 'Salon Demo', 'slug' => 'salon-demo',
    'timezone' => 'America/Santo_Domingo', 'currency' => 'USD',
    'ves_exchange_rate' => 36.5, 'niche_type' => 'salon',
    'features' => json_encode(['pos' => true, 'inventario' => true, 'productos' => true, 'proveedores' => true, 'multi_branch' => false]),
    'created_at' => now(), 'updated_at' => now(),
]);
echo "Business: $bid\n";

DB::table('users')->insert([
    'id' => $uid1, 'name' => 'Super Admin', 'email' => 'super@demo.com',
    'password' => Hash::make('123456'), 'created_at' => now(), 'updated_at' => now(),
]);
DB::table('profiles')->insert([
    'id' => $uid1, 'full_name' => 'Super Admin', 'role' => 'superadmin',
    'active' => true, 'created_at' => now(), 'updated_at' => now(),
]);
echo "Superadmin: super@demo.com / 123456\n";

DB::table('users')->insert([
    'id' => $uid2, 'name' => 'Admin Demo', 'email' => 'admin@demo.com',
    'password' => Hash::make('123456'), 'created_at' => now(), 'updated_at' => now(),
]);
DB::table('profiles')->insert([
    'id' => $uid2, 'business_id' => $bid, 'full_name' => 'Admin Demo',
    'role' => 'admin', 'active' => true, 'created_at' => now(), 'updated_at' => now(),
]);
echo "Admin: admin@demo.com / 123456\n";

DB::table('users')->insert([
    'id' => $uid3, 'name' => 'Empleado Demo', 'email' => 'empleado@demo.com',
    'password' => Hash::make('123456'), 'created_at' => now(), 'updated_at' => now(),
]);
DB::table('profiles')->insert([
    'id' => $uid3, 'business_id' => $bid, 'full_name' => 'Empleado Demo',
    'role' => 'empleado', 'pay_type' => 'percentage', 'pay_percentage' => 50,
    'active' => true, 'created_at' => now(), 'updated_at' => now(),
]);
echo "Employee: empleado@demo.com / 123456\n";
