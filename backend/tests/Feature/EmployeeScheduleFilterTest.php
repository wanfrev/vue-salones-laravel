<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\EmployeeScheduleController;
use App\Services\EmployeeScheduleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * GET /employee-schedules debe respetar `employee_id`. Antes devolvía los horarios de todo el
 * negocio y la app ubicaba a una empleada (perfil sin sucursal) en la sucursal de OTRA persona.
 */
class EmployeeScheduleFilterTest extends TestCase
{
    private const BIZ = 'biz-1';
    private const AURORA = '01a1654c-fcdd-7127-a7c8-6a8a8f3afb3e';
    private const DURGELIS = '019f5969-72dc-70f8-8521-7d9e73066578';
    private const PREMIER = '2c5bd169-592b-4fa2-89ea-7594eae51fe6';
    private const TERRAZA = '9ecce2e0-f1cc-494d-b432-30ef40dd994a';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropAllTables();
        Schema::create('profiles', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('full_name')->nullable();
            $t->string('role')->nullable();
        });
        Schema::create('employee_schedules', function ($t) {
            $t->string('id')->primary();
            $t->string('employee_id');
            $t->string('branch_id')->nullable();
            $t->integer('weekday');
            $t->string('start_time');
            $t->string('end_time');
            $t->string('break_start')->nullable();
            $t->string('break_end')->nullable();
        });

        DB::table('profiles')->insert([
            ['id' => self::AURORA, 'business_id' => self::BIZ, 'full_name' => 'Aurora Torrealba', 'role' => 'empleado'],
            ['id' => self::DURGELIS, 'business_id' => self::BIZ, 'full_name' => 'Durgelis Negron', 'role' => 'empleado'],
            ['id' => '00000000-0000-4000-8000-000000000001', 'business_id' => 'otro-negocio', 'full_name' => 'Ajena', 'role' => 'empleado'],
        ]);
        DB::table('employee_schedules')->insert([
            // Durgelis (id menor) va primero en el orden por employee_id: era la fila que tomaba la app.
            ['id' => 's1', 'employee_id' => self::DURGELIS, 'branch_id' => self::PREMIER, 'weekday' => 1, 'start_time' => '09:00', 'end_time' => '18:00'],
            ['id' => 's2', 'employee_id' => self::AURORA, 'branch_id' => self::TERRAZA, 'weekday' => 1, 'start_time' => '09:00', 'end_time' => '18:00'],
            ['id' => 's3', 'employee_id' => self::AURORA, 'branch_id' => self::TERRAZA, 'weekday' => 2, 'start_time' => '09:00', 'end_time' => '18:00'],
            ['id' => 's4', 'employee_id' => '00000000-0000-4000-8000-000000000001', 'branch_id' => null, 'weekday' => 1, 'start_time' => '09:00', 'end_time' => '18:00'],
        ]);
    }

    private function index(array $query): array
    {
        $controller = new EmployeeScheduleController(new EmployeeScheduleService());

        return $controller->index(Request::create('/api/employee-schedules', 'GET', ['business_id' => 'eq.' . self::BIZ] + $query))->getData(true);
    }

    public function test_employee_id_filter_returns_only_that_persons_schedules(): void
    {
        $rows = $this->index(['employee_id' => 'eq.' . self::AURORA]);

        $this->assertCount(2, $rows);
        $this->assertSame([self::AURORA], array_values(array_unique(array_column($rows, 'employee_id'))));
        $this->assertSame([self::TERRAZA], array_values(array_unique(array_column($rows, 'branch_id'))));
    }

    public function test_employee_id_without_the_eq_prefix_also_works(): void
    {
        $this->assertCount(2, $this->index(['employee_id' => self::AURORA]));
    }

    public function test_without_filter_it_still_returns_every_schedule_of_the_business(): void
    {
        $rows = $this->index([]);

        $this->assertCount(3, $rows, 'los 3 de este negocio; el de otro negocio no');
    }

    public function test_an_invalid_filter_never_turns_into_everything(): void
    {
        $this->assertSame([], $this->index(['employee_id' => 'eq.no-es-un-uuid']));
        $this->assertSame([], $this->index(['employee_id' => '']));
    }

    public function test_it_never_leaks_schedules_of_another_business(): void
    {
        $this->assertSame([], $this->index(['employee_id' => 'eq.00000000-0000-4000-8000-000000000001']));
    }
}
