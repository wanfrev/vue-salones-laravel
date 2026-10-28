<?php

namespace App\Console\Commands;

use App\Models\Credit;
use App\Models\Transaction;
use App\Services\PosService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Antes un pago mixto con una parte a crédito (p. ej. $14 con gift card + $100,99 a crédito) no
 * generaba el registro de la pestaña Créditos. Este comando crea los que faltan para las ventas ya
 * hechas. Por defecto solo MUESTRA lo que haría; con --apply escribe. Es seguro repetirlo: una
 * transacción solo puede tener un crédito (`credits.transaction_id` es único) y las que ya lo tienen
 * se omiten.
 */
class BackfillMixedCredits extends Command
{
    protected $signature = 'credits:backfill-mixed {--apply : Crea los créditos (sin esto, solo muestra la lista)} {--business= : Limita a un negocio (uuid)}';
    protected $description = 'Crea los créditos que faltan de pagos mixtos con una parte a crédito.';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $this->warn($apply ? 'APLICANDO: se crearán los créditos que faltan.' : 'SIMULACIÓN: no se escribe nada (usa --apply para crear).');

        $found = 0;
        $total = 0.0;

        Transaction::query()
            ->where('method', 'mixed')
            ->when($this->option('business'), fn ($q, $biz) => $q->where('business_id', $biz))
            ->with('appointment.client')
            ->chunkById(200, function ($transactions) use ($apply, &$found, &$total) {
                foreach ($transactions as $tx) {
                    $breakdown = is_array($tx->payments_breakdown) ? $tx->payments_breakdown : [];
                    $portion = PosService::creditPortion('mixed', (float) $tx->total_amount, $breakdown);
                    if ($portion <= 0 || Credit::where('transaction_id', $tx->id)->exists()) {
                        continue;
                    }

                    $client = $tx->appointment?->client;
                    $name = $client?->full_name ?: $this->nameFromNotes($tx->notes) ?: 'Cliente Desconocido';
                    // `paid_at` llega como texto (no tiene cast de fecha en Transaction).
                    $when = $tx->paid_at ? Carbon::parse($tx->paid_at) : $tx->created_at;

                    $found++;
                    $total += $portion;
                    $this->line(sprintf('  %s · %s · $%s · %s', $when?->format('Y-m-d'), $name, number_format($portion, 2), $tx->id));

                    if (!$apply) {
                        continue;
                    }

                    $credit = new Credit([
                        'id' => Str::uuid()->toString(),
                        'business_id' => $tx->business_id,
                        'branch_id' => $tx->branch_id,
                        'client_id' => $client?->id,
                        'client_name' => $name,
                        'client_phone' => $client?->phone,
                        'transaction_id' => $tx->id,
                        'amount' => $portion,
                        'currency' => 'USD',
                        'status' => 'pending',
                        'created_by' => $tx->created_by,
                    ]);
                    // La pestaña Créditos filtra por created_at: queda en el día de la venta.
                    $credit->created_at = $when;
                    $credit->save();
                }
            });

        $this->info(sprintf('%s %d crédito(s) por $%s.', $apply ? 'Creados:' : 'Faltan:', $found, number_format($total, 2)));

        return self::SUCCESS;
    }

    private function nameFromNotes(?string $notes): ?string
    {
        if (!$notes || !str_starts_with($notes, 'Venta directa — ')) {
            return null;
        }

        $name = trim((string) preg_replace('/\s*\([\d\+\-\s]+\)$/', '', str_replace('Venta directa — ', '', $notes)));

        return $name !== '' && $name !== 'Mostrador' ? $name : null;
    }
}
