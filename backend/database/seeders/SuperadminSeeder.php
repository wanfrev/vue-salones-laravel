<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SuperadminSeeder extends Seeder
{
    public function run(): void
    {
        $userId = '00000000-0000-0000-0000-000000000001';

        if (!DB::table('users')->where('email', 'superadmin@luma.app')->exists()) {
            DB::table('users')->insert([
                'id' => $userId,
                'name' => 'Superadmin Luma',
                'email' => 'superadmin@luma.app',
                'password' => bcrypt('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (!DB::table('profiles')->where('id', $userId)->exists()) {
            DB::table('profiles')->insert([
                'id' => $userId,
                'business_id' => null,
                'full_name' => 'Superadmin Luma',
                'role' => 'superadmin',
                'email' => 'superadmin@luma.app',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Superadmin listo: superadmin@luma.app / password');
    }
}
