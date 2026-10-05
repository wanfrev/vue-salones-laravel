<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * El permiso de expediente clínico se impone en el servidor (los controllers dentales solo lo
 * validan en el frontend). Se prueba el trait directamente con un usuario simulado.
 */
class ClinicalRecordAccessTest extends TestCase
{
    private function subject(): object
    {
        return new class {
            use ClinicalRecordAccess;

            public function deny(Request $r): ?JsonResponse { return $this->denyUnlessClinicalAccess($r); }
            public function modify(Request $r, ?string $createdBy): bool { return $this->canModify($r, $createdBy); }
            public function business(Request $r): ?string { return $this->resolveBusinessId($r); }
        };
    }

    private function requestAs(?string $role, ?bool $flag = true, string $userId = 'user-1'): Request
    {
        $request = Request::create('/api/clients/c1/session-notes', 'GET');
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => $role === null ? null : (object) [
                'role' => $role,
                'business_id' => 'biz-1',
                'can_access_dental_clinical' => $flag,
            ],
        ]);

        return $request;
    }

    public function test_admin_roles_always_pass_even_with_the_flag_off(): void
    {
        foreach (['admin', 'encargado', 'superadmin'] as $role) {
            $this->assertNull($this->subject()->deny($this->requestAs($role, false)), $role);
        }
    }

    public function test_empleado_passes_only_with_the_flag_on(): void
    {
        $this->assertNull($this->subject()->deny($this->requestAs('empleado', true)));
        $this->assertSame(403, $this->subject()->deny($this->requestAs('empleado', false))->getStatusCode());
    }

    public function test_cajero_is_always_denied_whatever_the_flag(): void
    {
        $this->assertSame(403, $this->subject()->deny($this->requestAs('cajero', true))->getStatusCode());
        $this->assertSame(403, $this->subject()->deny($this->requestAs('cajero', false))->getStatusCode());
    }

    public function test_no_profile_is_denied(): void
    {
        $this->assertSame(403, $this->subject()->deny($this->requestAs(null))->getStatusCode());
    }

    public function test_only_the_author_or_an_admin_may_modify_a_record(): void
    {
        $author = $this->requestAs('empleado', true, 'user-1');
        $colleague = $this->requestAs('empleado', true, 'user-2');
        $admin = $this->requestAs('admin', true, 'user-3');

        $this->assertTrue($this->subject()->modify($author, 'user-1'));
        $this->assertFalse($this->subject()->modify($colleague, 'user-1'));
        $this->assertTrue($this->subject()->modify($admin, 'user-1'));
        $this->assertFalse($this->subject()->modify($colleague, null));
    }

    public function test_business_is_taken_from_the_profile_and_never_from_the_query_when_the_profile_has_one(): void
    {
        $request = $this->requestAs('admin');
        $request->query->set('business_id', 'other-business');

        $this->assertSame('biz-1', $this->subject()->business($request));
    }
}
