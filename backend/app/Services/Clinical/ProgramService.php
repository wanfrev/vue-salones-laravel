<?php

namespace App\Services\Clinical;

use App\Models\Clinical\Program;
use App\Models\Service;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Catálogo de programas (paquetes de sesiones que se cobran juntos). Un programa es una lista de
 * componentes {servicios permitidos, cantidad}: «Estimulación temprana» = 8 sesiones de un servicio;
 * «Mixto» = 12 a elegir entre varios + 1 asesoría. Cada cita de la inscripción elige su servicio entre
 * los permitidos de su componente.
 */
class ProgramService
{
    public const MAX_SESSIONS = 60;
    public const MAX_COMPONENTS = 6;
    public const MAX_SERVICES_PER_COMPONENT = 12;
    public const DEFAULT_VALIDITY_DAYS = 30;

    public function list(string $businessId, bool $onlyActive = false): array
    {
        $programs = Program::where('business_id', $businessId)
            ->when($onlyActive, fn ($q) => $q->where('active', true))
            ->orderByDesc('active')
            ->orderBy('name')
            ->limit(200)
            ->get();

        $services = $this->servicesById($businessId, $programs->flatMap(fn (Program $p) => $this->serviceIds($p->components))->unique()->all());

        return $programs->map(fn (Program $p) => $this->present($p, $services))->all();
    }

    public function find(string $id, string $businessId): ?Program
    {
        return Program::where('id', $id)->where('business_id', $businessId)->first();
    }

    public function show(Program $program): array
    {
        return $this->present($program, $this->servicesById($program->business_id, $this->serviceIds($program->components)));
    }

    /** @param array{name:string, price:numeric, validity_days?:int, components:array, active?:bool} $data */
    public function create(string $businessId, ?string $userId, array $data): Program
    {
        return Program::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'created_by' => $userId,
            'name' => trim($data['name']),
            'price' => round((float) $data['price'], 2),
            'validity_days' => (int) ($data['validity_days'] ?? self::DEFAULT_VALIDITY_DAYS),
            'components' => $this->normalizeComponents($businessId, $data['components']),
            'active' => $data['active'] ?? true,
        ]);
    }

    public function update(Program $program, array $data): Program
    {
        $changes = [];
        if (array_key_exists('name', $data)) $changes['name'] = trim($data['name']);
        if (array_key_exists('price', $data)) $changes['price'] = round((float) $data['price'], 2);
        if (array_key_exists('validity_days', $data)) $changes['validity_days'] = (int) $data['validity_days'];
        if (array_key_exists('active', $data)) $changes['active'] = (bool) $data['active'];
        if (array_key_exists('components', $data)) $changes['components'] = $this->normalizeComponents($program->business_id, $data['components']);

        // Lo ya vendido no cambia: las inscripciones guardan su propio nombre, precio y sesiones.
        $program->update($changes);

        return $program->fresh();
    }

    /**
     * Deja los componentes en forma canónica y comprueba que los servicios sean del negocio.
     *
     * @return array<int, array{service_ids: string[], quantity: int}>
     */
    public function normalizeComponents(string $businessId, array $components): array
    {
        if ($components === [] || count($components) > self::MAX_COMPONENTS) {
            throw new InvalidArgumentException('Un programa necesita entre 1 y ' . self::MAX_COMPONENTS . ' tipos de sesión.');
        }

        $clean = [];
        $total = 0;
        foreach ($components as $c) {
            $ids = array_values(array_unique(array_filter((array) ($c['service_ids'] ?? []), 'is_string')));
            $qty = (int) ($c['quantity'] ?? 0);
            if ($ids === [] || count($ids) > self::MAX_SERVICES_PER_COMPONENT) {
                throw new InvalidArgumentException('Cada tipo de sesión necesita al menos un servicio.');
            }
            if ($qty < 1) {
                throw new InvalidArgumentException('Cada tipo de sesión necesita al menos 1 sesión.');
            }
            $total += $qty;
            $clean[] = ['service_ids' => $ids, 'quantity' => $qty];
        }

        if ($total > self::MAX_SESSIONS) {
            throw new InvalidArgumentException('Un programa no puede pasar de ' . self::MAX_SESSIONS . ' sesiones.');
        }

        $found = Service::where('business_id', $businessId)->whereIn('id', $this->serviceIds($clean))->count();
        if ($found !== count($this->serviceIds($clean))) {
            throw new InvalidArgumentException('Alguno de los servicios no existe en este negocio.');
        }

        return $clean;
    }

    /** @return string[] */
    private function serviceIds(?array $components): array
    {
        return array_values(array_unique(array_merge(...array_map(fn ($c) => $c['service_ids'] ?? [], $components ?? [[]]))));
    }

    /** @return \Illuminate\Support\Collection<string, Service> */
    private function servicesById(string $businessId, array $ids)
    {
        if ($ids === []) {
            return collect();
        }

        return Service::where('business_id', $businessId)->whereIn('id', $ids)->get(['id', 'name', 'duration_minutes', 'price'])->keyBy('id');
    }

    private function present(Program $p, $services): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'price' => $p->price,
            'validity_days' => $p->validity_days,
            'active' => $p->active,
            'sessions_total' => $p->sessionsTotal(),
            'components' => array_map(fn ($c) => [
                'service_ids' => $c['service_ids'],
                'quantity' => $c['quantity'],
                'services' => array_values(array_filter(array_map(function ($id) use ($services) {
                    $s = $services->get($id);

                    return $s ? ['id' => $s->id, 'name' => $s->name, 'duration_minutes' => $s->duration_minutes] : null;
                }, $c['service_ids']))),
            ], $p->components ?? []),
        ];
    }
}
