<?php

namespace App\Support;

/**
 * PHP-side mirror of client/src/config/niches/*. Backed by config/niches.php.
 * See client/src/config/niches/resolve.ts for the precedence rule this replicates:
 *   default_features -> niche.feature_defaults -> stored (DB) -> niche.feature_locks
 */
class NicheRegistry
{
    private static function definition(?string $nicheType): array
    {
        $niches = config('niches.niches', []);

        return $niches[$nicheType] ?? [
            'status' => 'legacy',
            'capabilities' => [],
            'feature_defaults' => [],
            'feature_locks' => [],
        ];
    }

    /**
     * Never throws — an unregistered/free-text niche_type resolves to zero capabilities
     * and zero defaults, i.e. plain DEFAULT_FEATURES + whatever is already stored.
     */
    public static function resolveFeatures(?string $nicheType, ?array $stored): array
    {
        $niche = self::definition($nicheType);

        return array_merge(
            config('niches.default_features', []),
            $niche['feature_defaults'] ?? [],
            $stored ?? [],
            $niche['feature_locks'] ?? []
        );
    }

    public static function capabilities(?string $nicheType): array
    {
        return self::definition($nicheType)['capabilities'] ?? [];
    }

    public static function hasCapability(?string $nicheType, string $capability): bool
    {
        return in_array($capability, self::capabilities($nicheType), true);
    }

    /** Niche ids offered when creating a new business. Used by CreateBusinessRequest's allow-list. */
    public static function creatableIds(): array
    {
        $niches = config('niches.niches', []);

        return array_keys(array_filter(
            $niches,
            fn (array $n) => ($n['status'] ?? null) === 'creatable'
        ));
    }
}
