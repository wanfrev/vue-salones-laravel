<?php

namespace App\Services\Clinical;

use InvalidArgumentException;

/**
 * Puntuación de cuestionarios estandarizados. Espejo de client/src/components/clinical/assessments.ts
 * (que solo la usa para la vista previa en pantalla) — el backend es la fuente de verdad: lo que se
 * guarda siempre se recalcula aquí a partir de las respuestas, nunca se confía en el total del cliente.
 */
class AssessmentScoring
{
    /** instrumento => [n.º de ítems, cortes de severidad (puntaje mínimo => etiqueta), índice del ítem de riesgo] */
    private const INSTRUMENTS = [
        'phq9' => [
            'items' => 9,
            'severity' => [0 => 'minimal', 5 => 'mild', 10 => 'moderate', 15 => 'moderately_severe', 20 => 'severe'],
            'risk_item' => 8, // ítem 9: pensamientos de muerte o de lastimarse
        ],
        'gad7' => [
            'items' => 7,
            'severity' => [0 => 'minimal', 5 => 'mild', 10 => 'moderate', 15 => 'severe'],
            'risk_item' => null,
        ],
    ];

    public static function instruments(): array
    {
        return array_keys(self::INSTRUMENTS);
    }

    public static function itemCount(string $instrument): int
    {
        return self::definition($instrument)['items'];
    }

    /**
     * @param  array<int, int>  $answers  una respuesta 0-3 por ítem
     * @return array{total_score: int, severity: string, risk_flag: bool}
     */
    public static function score(string $instrument, array $answers): array
    {
        $def = self::definition($instrument);
        $answers = array_values($answers);

        if (count($answers) !== $def['items']) {
            throw new InvalidArgumentException("El cuestionario {$instrument} requiere {$def['items']} respuestas.");
        }
        foreach ($answers as $value) {
            if (!is_int($value) || $value < 0 || $value > 3) {
                throw new InvalidArgumentException('Cada respuesta debe ser un entero entre 0 y 3.');
            }
        }

        $total = array_sum($answers);

        $severity = 'minimal';
        foreach ($def['severity'] as $min => $label) {
            if ($total >= $min) {
                $severity = $label;
            }
        }

        $riskFlag = $def['risk_item'] !== null && $answers[$def['risk_item']] > 0;

        return ['total_score' => $total, 'severity' => $severity, 'risk_flag' => $riskFlag];
    }

    private static function definition(string $instrument): array
    {
        if (!isset(self::INSTRUMENTS[$instrument])) {
            throw new InvalidArgumentException("Cuestionario desconocido: {$instrument}.");
        }

        return self::INSTRUMENTS[$instrument];
    }
}
