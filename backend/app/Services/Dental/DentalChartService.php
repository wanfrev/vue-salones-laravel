<?php

namespace App\Services\Dental;

use App\Models\Dental\DentalChart;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * One dental chart per client (permanent dentition only — 32 FDI pieces). Stores only the
 * CURRENT state per tooth/face as a JSON snapshot; per-visit history is a Fase 2 concern
 * (plan de tratamiento) and deliberately not modeled here.
 */
class DentalChartService
{
    /** FDI/ISO permanent dentition — quadrants 1-4, 8 pieces each. */
    public const VALID_TEETH = [
        11, 12, 13, 14, 15, 16, 17, 18,
        21, 22, 23, 24, 25, 26, 27, 28,
        31, 32, 33, 34, 35, 36, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48,
    ];

    /** Simplified 5-zone geometry, used uniformly across anterior and posterior teeth. */
    public const VALID_FACES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal'];

    public const VALID_CONDITIONS = [
        'sano', 'caries', 'obturado', 'corona', 'ausente',
        'extraccion_indicada', 'endodoncia', 'sellante', 'implante', 'puente',
    ];

    public function getOrCreateForClient(string $clientId, string $businessId, ?string $branchId): DentalChart
    {
        $chart = DentalChart::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();

        if ($chart) {
            return $chart;
        }

        return DentalChart::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'client_id' => $clientId,
            'teeth' => [],
        ]);
    }

    /**
     * @param array<string, array<string, string>> $teeth Keyed by tooth number (string) -> face -> condition.
     */
    public function updateTeeth(DentalChart $chart, array $teeth): DentalChart
    {
        $this->validateTeeth($teeth);

        return DB::transaction(function () use ($chart, $teeth) {
            $chart->update(['teeth' => $teeth]);
            return $chart->fresh();
        });
    }

    /**
     * @param array<string, array<string, string>> $teeth
     */
    private function validateTeeth(array $teeth): void
    {
        foreach ($teeth as $tooth => $faces) {
            if (!in_array((int) $tooth, self::VALID_TEETH, true)) {
                throw ValidationException::withMessages(['teeth' => "Pieza dental inválida: {$tooth}"]);
            }
            if (!is_array($faces)) {
                throw ValidationException::withMessages(['teeth' => "Formato inválido para la pieza {$tooth}"]);
            }
            foreach ($faces as $face => $condition) {
                if (!in_array($face, self::VALID_FACES, true)) {
                    throw ValidationException::withMessages(['teeth' => "Cara inválida '{$face}' en la pieza {$tooth}"]);
                }
                if (!in_array($condition, self::VALID_CONDITIONS, true)) {
                    throw ValidationException::withMessages(['teeth' => "Estado inválido '{$condition}' en la pieza {$tooth}"]);
                }
            }
        }
    }
}
