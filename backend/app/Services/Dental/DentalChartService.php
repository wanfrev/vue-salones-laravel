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
    public const VALID_TEETH_PERMANENT = [
        11, 12, 13, 14, 15, 16, 17, 18,
        21, 22, 23, 24, 25, 26, 27, 28,
        31, 32, 33, 34, 35, 36, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48,
    ];

    /** FDI/ISO primary (deciduous) dentition — quadrants 5-8, 5 pieces each (no premolars/3rd molar). */
    public const VALID_TEETH_PRIMARY = [
        51, 52, 53, 54, 55,
        61, 62, 63, 64, 65,
        71, 72, 73, 74, 75,
        81, 82, 83, 84, 85,
    ];

    /**
     * Both sets are always accepted together — a mixed-dentition patient (typically 6-12 years
     * old) can have permanent and primary teeth charted at once, and the ranges never overlap,
     * so there's no ambiguity in a single flat `teeth`/`codes` map. Which set is shown/edited at
     * a given moment ("selector de dentición") is purely a frontend display concern.
     */
    public const VALID_TEETH = [...self::VALID_TEETH_PERMANENT, ...self::VALID_TEETH_PRIMARY];

    /** Simplified 5-zone geometry, used uniformly across anterior and posterior teeth. */
    public const VALID_FACES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal'];

    public const VALID_CONDITIONS = [
        'sano', 'caries', 'obturado', 'corona', 'ausente',
        'extraccion_indicada', 'endodoncia', 'sellante', 'implante', 'puente',
    ];

    /** ICDAS caries-severity scale, 0 (sound) to 6 (extensive cavitation into dentin). */
    public const VALID_ICDAS = [0, 1, 2, 3, 4, 5, 6];

    /** G.V. Black cavity/restoration classification by location. */
    public const VALID_BLACK = ['I', 'II', 'III', 'IV', 'V', 'VI'];

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
            'codes' => [],
        ]);
    }

    /**
     * @param array<string, array<string, string>> $teeth Keyed by tooth number (string) -> face -> condition.
     * @param array<string, array<string, array<string, mixed>>>|null $codes Same keying -> {icdas?, black?}.
     */
    public function updateTeeth(DentalChart $chart, array $teeth, ?array $codes = null): DentalChart
    {
        $this->validateTeeth($teeth);
        if ($codes !== null) {
            $this->validateCodes($codes);
        }

        return DB::transaction(function () use ($chart, $teeth, $codes) {
            $chart->update($codes !== null ? ['teeth' => $teeth, 'codes' => $codes] : ['teeth' => $teeth]);
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

    /**
     * @param array<string, array<string, array<string, mixed>>> $codes
     */
    private function validateCodes(array $codes): void
    {
        foreach ($codes as $tooth => $faces) {
            if (!in_array((int) $tooth, self::VALID_TEETH, true)) {
                throw ValidationException::withMessages(['codes' => "Pieza dental inválida: {$tooth}"]);
            }
            if (!is_array($faces)) {
                throw ValidationException::withMessages(['codes' => "Formato inválido para la pieza {$tooth}"]);
            }
            foreach ($faces as $face => $code) {
                if (!in_array($face, self::VALID_FACES, true)) {
                    throw ValidationException::withMessages(['codes' => "Cara inválida '{$face}' en la pieza {$tooth}"]);
                }
                if (!is_array($code)) {
                    throw ValidationException::withMessages(['codes' => "Formato inválido para el código de la cara '{$face}' en la pieza {$tooth}"]);
                }
                if (array_key_exists('icdas', $code) && $code['icdas'] !== null && !in_array($code['icdas'], self::VALID_ICDAS, true)) {
                    throw ValidationException::withMessages(['codes' => "Código ICDAS inválido en la pieza {$tooth}"]);
                }
                if (array_key_exists('black', $code) && $code['black'] !== null && !in_array($code['black'], self::VALID_BLACK, true)) {
                    throw ValidationException::withMessages(['codes' => "Clasificación de Black inválida en la pieza {$tooth}"]);
                }
            }
        }
    }
}
