<?php

namespace Tests\Feature\Clinical;

use App\Http\Middleware\EnsureNicheCapability;
use App\Services\BusinessContext;
use App\Support\NicheRegistry;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * El módulo clinical.* es de `psicologia` y de nadie más — y no le quita ni le da nada a odontología
 * ni a los demás nichos. Sin HTTP ni DB: la decisión solo lee el registro de nichos.
 */
class ClinicalNicheIsolationTest extends TestCase
{
    private const CLINICAL = ['clinical.intake', 'clinical.session_notes', 'clinical.treatment_plan', 'clinical.consent', 'clinical.assessments', 'clinical.reports', 'clinical.followup', 'clinical.audit', 'clinical.cases', 'clinical.attachments', 'clinical.diagrams', 'clinical.programs'];

    private function runCapability(string $niche, string $capability): int
    {
        app()->instance(BusinessContext::class, new BusinessContext(
            businessId: 'biz-1', profileId: 'p-1', role: 'admin', nicheType: $niche,
        ));

        return (new EnsureNicheCapability())->handle(
            Request::create('/api/clients/x/session-notes', 'GET'),
            fn () => response()->json(['ok' => true]),
            $capability,
        )->getStatusCode();
    }

    public function test_psicologia_is_a_creatable_niche(): void
    {
        $this->assertContains('psicologia', NicheRegistry::creatableIds());
    }

    public function test_psicologia_has_every_clinical_capability_and_no_dental_or_staffing_one(): void
    {
        $this->assertSame(self::CLINICAL, NicheRegistry::capabilities('psicologia'));

        foreach (NicheRegistry::capabilities('psicologia') as $capability) {
            $this->assertStringStartsWith('clinical.', $capability);
        }
    }

    public function test_psicologia_reaches_each_clinical_route_group(): void
    {
        foreach (self::CLINICAL as $capability) {
            $this->assertSame(200, $this->runCapability('psicologia', $capability), $capability);
        }
    }

    public function test_every_other_niche_is_blocked_from_every_clinical_route_group(): void
    {
        $others = array_values(array_diff(NicheRegistry::creatableIds(), ['psicologia']));
        $this->assertNotEmpty($others);

        foreach ($others as $niche) {
            foreach (self::CLINICAL as $capability) {
                $this->assertSame(403, $this->runCapability($niche, $capability), "{$niche} → {$capability}");
            }
        }

        // Y un negocio con nicho de texto libre (legacy) tampoco.
        $this->assertSame(403, $this->runCapability('Negocios', 'clinical.intake'));
    }

    public function test_psicologia_is_blocked_from_dental_and_staffing_modules(): void
    {
        foreach (['dental.odontogram', 'dental.clinical_history', 'dental.consent', 'staffing.timesheets'] as $capability) {
            $this->assertSame(403, $this->runCapability('psicologia', $capability), $capability);
        }
    }

    public function test_odontologia_keeps_its_dental_capabilities_untouched(): void
    {
        $this->assertSame(
            ['dental.odontogram', 'dental.clinical_history', 'dental.endo_annex', 'dental.perio_annex', 'dental.periodontogram', 'dental.consent', 'dental.biofilm', 'dental.budget'],
            NicheRegistry::capabilities('odontologia'),
        );
        $this->assertSame(200, $this->runCapability('odontologia', 'dental.consent'));
    }

    public function test_existing_niches_resolve_the_same_features_as_before(): void
    {
        $defaults = config('niches.default_features');

        foreach (['salon', 'barberia', 'spa', 'mixto', 'dog_spa', 'vet', 'nail_bar', 'centro_estetico', 'odontologia'] as $niche) {
            $this->assertSame($defaults, NicheRegistry::resolveFeatures($niche, null), $niche);
        }
    }

    public function test_psicologia_feature_defaults_keep_pos_and_productos_but_drop_inventory_modules(): void
    {
        $f = NicheRegistry::resolveFeatures('psicologia', null);

        $this->assertTrue($f['pos']);
        $this->assertTrue($f['productos']);
        $this->assertTrue($f['agenda']);
        $this->assertFalse($f['inventario']);
        $this->assertFalse($f['proveedores']);
        $this->assertFalse($f['gift_cards']);
    }

    public function test_a_stored_value_can_re_enable_a_defaulted_off_feature(): void
    {
        $this->assertTrue(NicheRegistry::resolveFeatures('psicologia', ['inventario' => true])['inventario']);
    }
}
