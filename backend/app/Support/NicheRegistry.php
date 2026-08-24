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

    /** The full feature vocabulary — every key any niche could possibly toggle. */
    public static function allFeatureKeys(): array
    {
        return array_keys(config('niches.default_features', []));
    }

    /**
     * Feature keys a business in this niche can actually differ on. Locked features are excluded
     * — every business in the niche has the same value by construction, so showing them next to
     * genuinely configurable flags would bury the drift someone's actually looking for.
     */
    public static function configurableFeatures(?string $nicheType): array
    {
        $locked = array_keys(self::definition($nicheType)['feature_locks'] ?? []);
        return array_values(array_diff(self::allFeatureKeys(), $locked));
    }

    public static function hasCapability(?string $nicheType, string $capability): bool
    {
        return in_array($capability, self::capabilities($nicheType), true);
    }

    /**
     * True for a "pure" tienda/retail business, and also for any other niche that's had the
     * retail module explicitly turned on for it (features.retail_module_enabled) — e.g. a spa
     * business that also sells retail products. Deliberately NOT based on features.pos/productos
     * alone: those two default to `true` for every niche (nav-visibility legacy default), so they
     * can't be used as a signal that a business actually wants tienda-style treatment. Additive: a
     * pure-tienda business is unaffected, a business without the module explicitly enabled stays
     * exactly as before.
     */
    public static function hasRetailModule(?string $nicheType, ?array $storedFeatures): bool
    {
        if (in_array($nicheType, ['tienda', 'retail'], true)) {
            return true;
        }

        $resolved = self::resolveFeatures($nicheType, $storedFeatures);
        return (bool) ($resolved['retail_module_enabled'] ?? false)
            && (bool) ($resolved['pos'] ?? false)
            && (bool) ($resolved['productos'] ?? false);
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
