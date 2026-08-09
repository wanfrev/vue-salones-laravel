<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureNicheCapability;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Exercises the middleware directly against a bound BusinessContext — no HTTP, no DB. What
 * matters here is the decision, and the decision only reads the container binding.
 */
class EnsureNicheCapabilityTest extends TestCase
{
    private function bindContext(string $nicheType, string $role = 'admin'): void
    {
        app()->instance(BusinessContext::class, new BusinessContext(
            businessId: 'biz-1',
            profileId: 'profile-1',
            role: $role,
            nicheType: $nicheType,
        ));
    }

    private function run(string ...$capabilities)
    {
        return (new EnsureNicheCapability())->handle(
            Request::create('/api/staffing-companies', 'GET'),
            fn () => response()->json(['ok' => true]),
            ...$capabilities,
        );
    }

    public function test_staffing_business_reaches_a_staffing_capability(): void
    {
        $this->bindContext('staffing');

        $this->assertSame(200, $this->run('staffing.timesheets')->getStatusCode());
    }

    public function test_non_staffing_business_is_blocked(): void
    {
        $this->bindContext('salon');

        $this->assertSame(403, $this->run('staffing.timesheets')->getStatusCode());
    }

    /**
     * The whole point of this class. `feature:` and `perm:` go report-only when the flag is off,
     * which is production's actual state — this gate must not.
     */
    public function test_it_still_blocks_when_the_report_only_flag_is_off(): void
    {
        config(['niches.enforce' => false]);
        $this->bindContext('salon');

        $this->assertSame(403, $this->run('staffing.timesheets')->getStatusCode());
    }

    /** No resolvable context means we cannot tell which niche this is — deny, don't guess. */
    public function test_missing_context_is_denied(): void
    {
        app()->forgetInstance(BusinessContext::class);

        $this->assertSame(403, $this->run('staffing.timesheets')->getStatusCode());
    }

    public function test_superadmin_passes_regardless_of_niche(): void
    {
        $this->bindContext('salon', role: 'superadmin');

        $this->assertSame(200, $this->run('staffing.timesheets')->getStatusCode());
    }

    public function test_every_listed_capability_must_be_present(): void
    {
        $this->bindContext('staffing');
        $this->assertSame(200, $this->run('staffing.timesheets', 'staffing.billing')->getStatusCode());

        $this->bindContext('dog_spa'); // has clients.pets, not the staffing pair
        $this->assertSame(403, $this->run('clients.pets', 'staffing.billing')->getStatusCode());
    }

    /** An unregistered niche resolves to zero capabilities — it must not fall through open. */
    public function test_unknown_niche_has_no_capabilities(): void
    {
        $this->bindContext('nicho-inventado');

        $this->assertSame(403, $this->run('staffing.timesheets')->getStatusCode());
    }
}
