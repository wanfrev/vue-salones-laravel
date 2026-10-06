<?php

namespace Tests\Feature\Clinical;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Los demás tests llaman a los controllers directamente, así que no detectan una ruta mal
 * apuntada (p. ej. un `use` faltante en routes/api.php). Este resuelve cada ruta clínica a su
 * controller real y comprueba que declara el middleware de capability correcto.
 */
class ClinicalRoutesTest extends TestCase
{
    /** [método, uri, capability esperada] */
    private const ROUTES = [
        ['GET', 'api/clients/{clientId}/clinical-intake', 'clinical.intake'],
        ['PUT', 'api/clients/{clientId}/clinical-intake', 'clinical.intake'],
        ['GET', 'api/clients/{clientId}/session-notes', 'clinical.session_notes'],
        ['GET', 'api/clients/{clientId}/session-notes/appointments', 'clinical.session_notes'],
        ['POST', 'api/clients/{clientId}/session-notes', 'clinical.session_notes'],
        ['PUT', 'api/clients/{clientId}/session-notes/{id}', 'clinical.session_notes'],
        ['GET', 'api/clients/{clientId}/treatment-plans', 'clinical.treatment_plan'],
        ['POST', 'api/clients/{clientId}/treatment-plans', 'clinical.treatment_plan'],
        ['PUT', 'api/clients/{clientId}/treatment-plans/{id}', 'clinical.treatment_plan'],
        ['GET', 'api/clients/{clientId}/informed-consents', 'clinical.consent'],
        ['POST', 'api/clients/{clientId}/informed-consents', 'clinical.consent'],
        ['GET', 'api/clients/{clientId}/assessments', 'clinical.assessments'],
        ['POST', 'api/clients/{clientId}/assessments', 'clinical.assessments'],
        ['GET', 'api/clients/{clientId}/clinical-reports/attendance', 'clinical.reports'],
        ['POST', 'api/clients/{clientId}/clinical-reports/audit', 'clinical.reports'],
        ['GET', 'api/clinical/follow-up', 'clinical.followup'],
        ['GET', 'api/clinical/audit', 'clinical.audit'],
        // Casos (pareja / familia / grupo)
        ['GET', 'api/clinical-cases', 'clinical.cases'],
        ['POST', 'api/clinical-cases', 'clinical.cases'],
        ['GET', 'api/clinical-cases/{caseId}', 'clinical.cases'],
        ['PUT', 'api/clinical-cases/{caseId}', 'clinical.cases'],
        ['POST', 'api/clinical-cases/{caseId}/members', 'clinical.cases'],
        ['DELETE', 'api/clinical-cases/{caseId}/members/{clientId}', 'clinical.cases'],
        ['PUT', 'api/clinical-cases/{caseId}/appointments/{appointmentId}', 'clinical.cases'],
        ['DELETE', 'api/clinical-cases/{caseId}/appointments/{appointmentId}', 'clinical.cases'],
        ['GET', 'api/clinical-cases/{caseId}/appointments', 'clinical.cases'],
        ['GET', 'api/clinical-cases/{caseId}/session-notes', 'clinical.cases'],
        ['POST', 'api/clinical-cases/{caseId}/session-notes', 'clinical.cases'],
        ['PUT', 'api/clinical-cases/{caseId}/session-notes/{id}', 'clinical.cases'],
        ['GET', 'api/clinical-cases/{caseId}/treatment-plans', 'clinical.cases'],
        ['POST', 'api/clinical-cases/{caseId}/treatment-plans', 'clinical.cases'],
        ['PUT', 'api/clinical-cases/{caseId}/treatment-plans/{id}', 'clinical.cases'],
        ['GET', 'api/clients/{clientId}/clinical-cases', 'clinical.cases'],
        ['GET', 'api/clients/{clientId}/joint-session-notes', 'clinical.cases'],
        ['GET', 'api/clients/{clientId}/joint-treatment-plans', 'clinical.cases'],
        ['GET', 'api/clinical/appointments/{appointmentId}/case', 'clinical.cases'],
        // Adjuntos
        ['GET', 'api/clients/{clientId}/attachments', 'clinical.attachments'],
        ['POST', 'api/clients/{clientId}/attachments', 'clinical.attachments'],
        ['GET', 'api/clients/{clientId}/attachments/{id}/download', 'clinical.attachments'],
        ['DELETE', 'api/clients/{clientId}/attachments/{id}', 'clinical.attachments'],
        // Genograma y línea de vida
        ['GET', 'api/clients/{clientId}/diagrams/{type}', 'clinical.diagrams'],
        ['PUT', 'api/clients/{clientId}/diagrams/{type}', 'clinical.diagrams'],
        ['GET', 'api/clinical-cases/{caseId}/diagrams/{type}', 'clinical.diagrams'],
        ['PUT', 'api/clinical-cases/{caseId}/diagrams/{type}', 'clinical.diagrams'],
    ];

    public function test_every_clinical_route_resolves_to_a_real_controller_method_behind_its_capability(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes());

        foreach (self::ROUTES as [$method, $uri, $capability]) {
            $route = $routes->first(fn ($r) => $r->uri() === $uri && in_array($method, $r->methods(), true));
            $this->assertNotNull($route, "Falta la ruta {$method} {$uri}");

            // Si el `use` del controller falta, esto lanza ReflectionException en vez de pasar en silencio.
            $action = $route->getAction('uses');
            [$class, $fn] = explode('@', $action);
            $this->assertTrue(class_exists($class), "Controller inexistente: {$class}");
            $this->assertTrue(method_exists($class, $fn), "Método inexistente: {$class}@{$fn}");

            $this->assertContains("capability:{$capability}", $route->gatherMiddleware(), "{$method} {$uri} sin capability:{$capability}");
        }
    }

    public function test_the_session_notes_appointments_route_is_not_swallowed_by_the_note_id_route(): void
    {
        $matched = Route::getRoutes()->match(\Illuminate\Http\Request::create('/api/clients/abc/session-notes/appointments', 'GET'));

        $this->assertStringEndsWith('@appointments', $matched->getAction('uses'));
    }

    public function test_clinical_routes_are_not_reachable_without_authentication(): void
    {
        foreach (self::ROUTES as [$method, $uri]) {
            $url = '/' . str_replace(['{clientId}', '{caseId}', '{appointmentId}', '{type}', '{id}'], ['abc', 'abc', 'abc', 'genogram', 'xyz'], $uri);
            $this->json($method, $url)->assertStatus(401);
        }
    }
}
