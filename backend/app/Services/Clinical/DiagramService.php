<?php

namespace App\Services\Clinical;

use App\Models\Clinical\Diagram;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Genograma y línea de vida: uno vivo por (paciente | caso, tipo), cifrado en reposo. `normalize`
 * deja solo las claves conocidas de cada tipo y acota tamaños — lo que no está en la lista no entra
 * al registro cifrado, venga lo que venga del navegador.
 */
class DiagramService
{
    public const GENOGRAM_KINDS = ['male', 'female', 'other'];
    public const EDGE_KINDS = ['married', 'partner', 'separated', 'divorced', 'parent', 'close', 'conflict', 'distant', 'cutoff'];
    public const MAX_NODES = 150;
    public const MAX_EDGES = 400;
    public const MAX_EVENTS = 200;

    /** @param array{client_id?: ?string, case_id?: ?string} $scope exactamente uno */
    public function find(array $scope, string $type, string $businessId): ?Diagram
    {
        return $this->scoped(Diagram::where('business_id', $businessId)->where('type', $type), $scope)->first();
    }

    public function upsert(array $scope, string $type, array $data, string $businessId, ?string $branchId, ?string $userId): Diagram
    {
        $clean = $this->normalize($type, $data);

        return DB::transaction(function () use ($scope, $type, $clean, $businessId, $branchId, $userId) {
            $diagram = $this->scoped(Diagram::where('business_id', $businessId)->where('type', $type), $scope)->lockForUpdate()->first();

            if ($diagram) {
                $diagram->update(['data' => $clean, 'updated_by' => $userId]);

                return $diagram->fresh();
            }

            return Diagram::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $scope['client_id'] ?? null,
                'case_id' => $scope['case_id'] ?? null,
                'created_by' => $userId,
                'updated_by' => $userId,
                'type' => $type,
                'data' => $clean,
            ]);
        });
    }

    public function normalize(string $type, array $data): array
    {
        return match ($type) {
            'genogram' => $this->normalizeGenogram($data),
            'life_line' => $this->normalizeLifeLine($data),
            default => throw new InvalidArgumentException("Tipo de diagrama desconocido: {$type}."),
        };
    }

    private function scoped($query, array $scope)
    {
        return isset($scope['case_id'])
            ? $query->where('case_id', $scope['case_id'])->whereNull('client_id')
            : $query->where('client_id', $scope['client_id'])->whereNull('case_id');
    }

    private function normalizeGenogram(array $data): array
    {
        $nodes = collect($data['nodes'] ?? [])->take(self::MAX_NODES)->map(fn ($n) => [
            'id' => (string) $n['id'],
            'x' => round((float) $n['x'], 1),
            'y' => round((float) $n['y'], 1),
            'kind' => in_array($n['kind'] ?? null, self::GENOGRAM_KINDS, true) ? $n['kind'] : 'other',
            'name' => Str::limit((string) ($n['name'] ?? ''), 100, ''),
            'age' => Str::limit((string) ($n['age'] ?? ''), 20, ''),
            'deceased' => (bool) ($n['deceased'] ?? false),
            'index' => (bool) ($n['index'] ?? false),
            'notes' => Str::limit((string) ($n['notes'] ?? ''), 500, ''),
        ])->values();

        $ids = $nodes->pluck('id')->flip();

        // Un vínculo que apunta a una persona inexistente se descarta (borrar un nodo no deja huérfanos).
        $edges = collect($data['edges'] ?? [])
            ->filter(fn ($e) => isset($ids[$e['source'] ?? null], $ids[$e['target'] ?? null]) && ($e['source'] ?? null) !== ($e['target'] ?? null))
            ->take(self::MAX_EDGES)
            ->map(fn ($e) => [
                'id' => (string) $e['id'],
                'source' => (string) $e['source'],
                'target' => (string) $e['target'],
                'kind' => in_array($e['kind'] ?? null, self::EDGE_KINDS, true) ? $e['kind'] : 'partner',
            ])->values();

        return ['nodes' => $nodes->all(), 'edges' => $edges->all()];
    }

    private function normalizeLifeLine(array $data): array
    {
        $events = collect($data['events'] ?? [])->take(self::MAX_EVENTS)->map(fn ($e) => [
            'id' => (string) $e['id'],
            'year' => (int) $e['year'],
            'age' => isset($e['age']) && $e['age'] !== '' ? (int) $e['age'] : null,
            'title' => Str::limit((string) ($e['title'] ?? ''), 150, ''),
            'valence' => max(-2, min(2, (int) ($e['valence'] ?? 0))),
            'note' => Str::limit((string) ($e['note'] ?? ''), 1000, ''),
        ])->sortBy('year')->values();

        return ['events' => $events->all()];
    }
}
