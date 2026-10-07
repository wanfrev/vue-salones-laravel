<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\DiagramController;
use App\Models\Clinical\AccessLog;
use App\Models\Clinical\Diagram;
use App\Services\Clinical\CaseService;
use App\Services\Clinical\DiagramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClinicalDiagramsTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';
    private string $ana = '10000000-0000-4000-8000-000000000001';
    private string $beto = '10000000-0000-4000-8000-000000000002';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();
        DB::table('clients')->insert([
            ['id' => $this->ana, 'business_id' => self::BIZ, 'full_name' => 'Ana'],
            ['id' => $this->beto, 'business_id' => self::BIZ, 'full_name' => 'Beto'],
        ]);
    }

    private function req(string $role = 'empleado', string $method = 'GET', array $body = []): Request
    {
        $request = Request::create('/api/x', $method, [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => 'u1',
            'profile' => (object) ['id' => 'u1', 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => true],
        ]);

        return $request;
    }

    private function genogram(): array
    {
        return ['data' => [
            'nodes' => [
                ['id' => 'a', 'x' => 10.26, 'y' => 20, 'kind' => 'male', 'name' => 'Padre', 'age' => '60', 'deceased' => true, 'index' => false, 'notes' => ''],
                ['id' => 'b', 'x' => 200, 'y' => 20, 'kind' => 'female', 'name' => 'Madre', 'age' => '58'],
                ['id' => 'c', 'x' => 100, 'y' => 180, 'kind' => 'other', 'name' => 'Paciente', 'index' => true],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'a', 'target' => 'b', 'kind' => 'married'],
                ['id' => 'e2', 'source' => 'a', 'target' => 'c', 'kind' => 'parent'],
            ],
        ]];
    }

    // ── Servicio: lo que entra al registro cifrado ──────────────────────────────

    public function test_normalization_keeps_only_known_keys_and_clamps_values(): void
    {
        $svc = new DiagramService();
        $out = $svc->normalize('genogram', ['nodes' => [
            ['id' => 'a', 'x' => 1.234, 'y' => 2, 'kind' => 'robot', 'name' => str_repeat('N', 300), 'inyectado' => 'no', 'deceased' => 1],
        ], 'edges' => [], 'extra' => 'no']);

        $this->assertSame(['nodes', 'edges'], array_keys($out));
        $node = $out['nodes'][0];
        $this->assertSame(['id', 'x', 'y', 'kind', 'name', 'age', 'deceased', 'index', 'notes'], array_keys($node));
        $this->assertSame('other', $node['kind']);          // tipo desconocido → neutro
        $this->assertSame(100, strlen($node['name']));      // acotado
        $this->assertSame(1.2, $node['x']);
        $this->assertTrue($node['deceased']);
    }

    public function test_edges_to_missing_people_or_to_themselves_are_dropped(): void
    {
        $out = (new DiagramService())->normalize('genogram', [
            'nodes' => [['id' => 'a', 'x' => 0, 'y' => 0, 'kind' => 'male'], ['id' => 'b', 'x' => 0, 'y' => 0, 'kind' => 'female']],
            'edges' => [
                ['id' => '1', 'source' => 'a', 'target' => 'b', 'kind' => 'married'],
                ['id' => '2', 'source' => 'a', 'target' => 'fantasma', 'kind' => 'parent'],
                ['id' => '3', 'source' => 'a', 'target' => 'a', 'kind' => 'conflict'],
                ['id' => '4', 'source' => 'a', 'target' => 'b', 'kind' => 'desconocido'],
            ],
        ]);

        $this->assertSame(['1', '4'], array_column($out['edges'], 'id'));
        $this->assertSame('partner', $out['edges'][1]['kind']); // vínculo desconocido → neutro
    }

    public function test_life_line_events_are_sorted_by_year_with_valence_clamped(): void
    {
        $out = (new DiagramService())->normalize('life_line', ['events' => [
            ['id' => 'b', 'year' => 2010, 'age' => '', 'title' => 'Mudanza', 'valence' => 9],
            ['id' => 'a', 'year' => 1990, 'age' => 0, 'title' => 'Nacimiento', 'valence' => -9, 'note' => 'n'],
        ]]);

        $this->assertSame(['a', 'b'], array_column($out['events'], 'id'));
        $this->assertSame([-2, 2], array_column($out['events'], 'valence'));
        $this->assertNull($out['events'][1]['age']);
        $this->assertSame(0, $out['events'][0]['age']);
    }

    // ── Controller ──────────────────────────────────────────────────────────────

    public function test_no_diagram_yet_is_204_and_saving_creates_once_then_updates_in_place(): void
    {
        $c = app(DiagramController::class);

        $none = $c->showForClient($this->req(), $this->ana, 'genogram');
        $this->assertSame(204, $none->getStatusCode());
        $this->assertSame('', $none->getContent());

        $this->assertSame(201, $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram')->getStatusCode());
        $this->assertSame(200, $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram')->getStatusCode());
        $this->assertSame(1, Diagram::count());

        $shown = $c->showForClient($this->req(), $this->ana, 'genogram');
        $body = json_decode($shown->getContent(), true);
        $this->assertCount(3, $body['data']['nodes']);
        $this->assertSame('Padre', $body['data']['nodes'][0]['name']);
    }

    public function test_the_content_is_encrypted_at_rest(): void
    {
        app(DiagramController::class)->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram');

        $raw = DB::table('clinical_diagrams')->value('data');
        $this->assertStringNotContainsString('Padre', $raw);
        $this->assertStringNotContainsString('Madre', $raw);
    }

    public function test_each_patient_and_each_type_has_its_own_diagram(): void
    {
        $c = app(DiagramController::class);
        $life = ['data' => ['events' => [['id' => 'e', 'year' => 2000, 'title' => 'Evento', 'valence' => 1]]]];

        $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram');
        $c->saveForClient($this->req('empleado', 'PUT', $life), $this->ana, 'life_line');
        $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->beto, 'genogram');

        $this->assertSame(3, Diagram::count());
        $this->assertSame(204, $c->showForClient($this->req(), $this->beto, 'life_line')->getStatusCode());
    }

    public function test_a_case_has_its_own_genogram_separate_from_its_members(): void
    {
        $case = (new CaseService())->create(self::BIZ, null, ['type' => 'family', 'name' => 'Familia', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto]]], 'u1');
        $c = app(DiagramController::class);

        $this->assertSame(201, $c->saveForCase($this->req('empleado', 'PUT', $this->genogram()), $case->id, 'genogram')->getStatusCode());

        $this->assertSame(200, $c->showForCase($this->req(), $case->id, 'genogram')->getStatusCode());
        $this->assertSame(204, $c->showForClient($this->req(), $this->ana, 'genogram')->getStatusCode()); // no es el de Ana
        $this->assertNull(Diagram::first()->client_id);
        $this->assertSame($case->id, Diagram::first()->case_id);
    }

    public function test_validation_rejects_malformed_diagrams_and_unknown_types(): void
    {
        $c = app(DiagramController::class);
        $bad = fn (callable $mutate) => function () use ($c, $mutate) {
            $payload = $this->genogram();
            $mutate($payload);
            $c->saveForClient($this->req('empleado', 'PUT', $payload), $this->ana, 'genogram');
        };

        foreach ([
            $bad(function (&$p) { $p['data']['nodes'][0]['kind'] = 'robot'; }),
            $bad(function (&$p) { $p['data']['nodes'][0]['x'] = 'abc'; }),
            $bad(function (&$p) { $p['data']['nodes'][1]['id'] = 'a'; }),                       // ids repetidos
            $bad(function (&$p) { $p['data']['edges'][0]['kind'] = 'amistad-rara'; }),
            $bad(function (&$p) { $p['data']['nodes'] = array_fill(0, 151, ['id' => 'x', 'x' => 0, 'y' => 0, 'kind' => 'male']); }),
            $bad(function (&$p) { unset($p['data']['edges']); }),
        ] as $attempt) {
            try {
                $attempt();
                $this->fail('Debió fallar la validación');
            } catch (ValidationException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertSame(0, Diagram::count());

        $this->assertSame(404, $c->showForClient($this->req(), $this->ana, 'mapa')->getStatusCode());
        $this->assertSame(404, $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'mapa')->getStatusCode());
    }

    public function test_life_line_validation(): void
    {
        $c = app(DiagramController::class);
        $event = ['id' => 'e', 'year' => 2000, 'title' => 'x', 'valence' => 1];

        foreach ([['year' => 1800], ['valence' => 5], ['title' => ''], ['age' => 200]] as $override) {
            try {
                $c->saveForClient($this->req('empleado', 'PUT', ['data' => ['events' => [array_merge($event, $override)]]]), $this->ana, 'life_line');
                $this->fail('Debió fallar');
            } catch (ValidationException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertSame(201, $c->saveForClient($this->req('empleado', 'PUT', ['data' => ['events' => []]]), $this->ana, 'life_line')->getStatusCode()); // vacío es válido
    }

    public function test_access_control_and_audit(): void
    {
        $c = app(DiagramController::class);

        $this->assertSame(403, $c->saveForClient($this->req('cajero', 'PUT', $this->genogram()), $this->ana, 'genogram')->getStatusCode());
        $this->assertSame(404, $c->saveForClient($this->req('admin', 'PUT', $this->genogram()), (string) \Illuminate\Support\Str::uuid(), 'genogram')->getStatusCode());

        $c->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram');
        $c->showForClient($this->req(), $this->ana, 'genogram');

        $this->assertSame(1, AccessLog::where('resource', 'diagram')->where('action', 'created')->where('detail', 'genogram')->count());
        $this->assertSame(1, AccessLog::where('resource', 'diagram')->where('action', 'viewed')->count());
    }

    public function test_a_response_type_check(): void
    {
        $this->assertInstanceOf(JsonResponse::class, app(DiagramController::class)->saveForClient($this->req('empleado', 'PUT', $this->genogram()), $this->ana, 'genogram'));
    }
}
