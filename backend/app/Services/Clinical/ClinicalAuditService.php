<?php

namespace App\Services\Clinical;

use App\Models\Clinical\AccessLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ClinicalAuditService
{
    public const ACTIONS = ['viewed', 'created', 'updated', 'report_printed', 'downloaded', 'deleted'];
    public const RESOURCES = ['intake', 'session_note', 'treatment_plan', 'consent', 'assessment', 'report', 'case', 'attachment', 'diagram'];
    public const REPORT_KINDS = ['attendance', 'psych_report', 'referral'];

    /** Misma persona + mismo paciente + mismo recurso dentro de esta ventana cuenta como UNA lectura. */
    public const VIEW_DEDUP_MINUTES = 10;

    public const PAGE_SIZE = 50;
    public const MAX_RANGE_DAYS = 180;
    public const DEFAULT_RANGE_DAYS = 30;

    /**
     * Registra un acceso. Las lecturas se deduplican (abrir la ficha dispara varias consultas
     * seguidas y refrescos de ventana; sin esto la bitácora sería ruido). Escrituras e impresiones
     * se registran siempre. Devuelve null si la lectura se omitió por duplicada.
     */
    public function record(
        string $businessId,
        string $clientId,
        ?string $userId,
        string $action,
        string $resource,
        ?string $resourceId = null,
        ?string $detail = null,
        ?string $ip = null,
        ?string $caseId = null,
    ): ?AccessLog {
        if (!in_array($action, self::ACTIONS, true) || !in_array($resource, self::RESOURCES, true)) {
            throw new InvalidArgumentException("Acción o recurso de auditoría inválido: {$action}/{$resource}");
        }

        if ($action === 'viewed' && $this->recentlyViewed($businessId, $clientId, $userId, $resource, $resourceId, $caseId)) {
            return null;
        }

        return AccessLog::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'client_id' => $clientId,
            'case_id' => $caseId,
            'user_id' => $userId,
            'action' => $action,
            'resource' => $resource,
            'resource_id' => $resourceId,
            'detail' => $detail,
            'ip' => $ip,
            'created_at' => now(),
        ]);
    }

    private function recentlyViewed(string $businessId, string $clientId, ?string $userId, string $resource, ?string $resourceId, ?string $caseId = null): bool
    {
        return AccessLog::where('business_id', $businessId)
            ->where('client_id', $clientId)
            ->where('action', 'viewed')
            ->where('resource', $resource)
            ->when($caseId, fn ($q) => $q->where('case_id', $caseId), fn ($q) => $q->whereNull('case_id'))
            ->when($userId, fn ($q) => $q->where('user_id', $userId), fn ($q) => $q->whereNull('user_id'))
            ->when($resourceId, fn ($q) => $q->where('resource_id', $resourceId), fn ($q) => $q->whereNull('resource_id'))
            ->where('created_at', '>=', now()->subMinutes(self::VIEW_DEDUP_MINUTES))
            ->exists();
    }

    /**
     * Listado paginado de la bitácora, siempre acotado por rango de fechas (por defecto 30 días,
     * máximo 180). Un JOIN a clients/profiles para los nombres — un solo viaje.
     *
     * @param  array{from?: ?string, to?: ?string, user_id?: ?string, client_id?: ?string, action?: ?string, page?: ?int}  $filters
     * @return array{rows: array<int, array<string, mixed>>, has_more: bool, page: int, from: string, to: string}
     */
    public function list(string $businessId, array $filters, ?CarbonImmutable $today = null): array
    {
        $today ??= CarbonImmutable::today();
        $to = isset($filters['to']) ? CarbonImmutable::parse($filters['to'])->endOfDay() : $today->endOfDay();
        $from = isset($filters['from'])
            ? CarbonImmutable::parse($filters['from'])->startOfDay()
            : $to->subDays(self::DEFAULT_RANGE_DAYS)->startOfDay();

        if ($from->gt($to)) {
            throw new InvalidArgumentException('La fecha inicial no puede ser posterior a la final.');
        }
        // Días calendario completos entre ambos extremos (sin la fracción de horas de startOfDay/endOfDay).
        if ((int) $from->startOfDay()->diffInDays($to->startOfDay()) > self::MAX_RANGE_DAYS) {
            throw new InvalidArgumentException('El rango máximo de consulta es de ' . self::MAX_RANGE_DAYS . ' días.');
        }

        $page = max(1, (int) ($filters['page'] ?? 1));

        $rows = DB::table('clinical_access_logs as l')
            ->leftJoin('clients as c', 'c.id', '=', 'l.client_id')
            ->leftJoin('profiles as p', 'p.id', '=', 'l.user_id')
            ->leftJoin('clinical_cases as cc', 'cc.id', '=', 'l.case_id')
            ->where('l.business_id', $businessId)
            ->where('l.created_at', '>=', $from->toDateTimeString())
            ->where('l.created_at', '<=', $to->toDateTimeString())
            ->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('l.user_id', $v))
            ->when($filters['client_id'] ?? null, fn ($q, $v) => $q->where('l.client_id', $v))
            ->when($filters['action'] ?? null, fn ($q, $v) => $q->where('l.action', $v))
            ->orderByDesc('l.created_at')
            ->orderByDesc('l.id')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1) // uno de más: así se sabe si hay otra página sin un COUNT
            ->get([
                'l.id', 'l.created_at', 'l.action', 'l.resource', 'l.resource_id', 'l.detail', 'l.ip',
                'l.client_id', 'c.full_name as client_name', 'l.case_id', 'cc.name as case_name', 'l.user_id', 'p.full_name as user_name',
            ]);

        $hasMore = $rows->count() > self::PAGE_SIZE;

        return [
            'rows' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => (array) $r)->values()->all(),
            'has_more' => $hasMore,
            'page' => $page,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }
}
