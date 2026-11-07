<?php

namespace App\Services;

use App\Models\Bank;
use App\Models\GiftCard;
use App\Models\GiftCardPayment;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Cómo se pagó una gift card al venderla. Es dinero RECIBIDO (entra al Cuadre del Día, al desglose por banco y a la caja de
 * quien lo cobró) pero NO ingreso de Finanzas: el ingreso se reconoce cuando la gift card se usa en el POS, como siempre.
 *
 * El método de cada línea decide su moneda (igual que en el POS): efectivo Bs, transferencia, pago móvil y punto de venta
 * son en bolívares; el resto en dólares. En bolívares se escribe el monto en Bs y se convierte con la tasa.
 */
class GiftCardPaymentService
{
    /** Métodos con los que se puede pagar una gift card (no crédito, cortesía, otra gift card ni Cashea). */
    public const METHODS = ['cash', 'cash_ves', 'card', 'transfer', 'zelle', 'binance', 'pago_movil', 'punto_venta', 'other'];

    /** Métodos cuyo monto se escribe en bolívares. */
    public const VES_METHODS = ['cash_ves', 'transfer', 'pago_movil', 'punto_venta'];

    /** Métodos que pueden llevar banco (Finanzas > Bancos). */
    public const BANK_METHODS = ['pago_movil', 'transfer', 'punto_venta'];

    /** Diferencia tolerada (en dólares) entre lo pagado y el monto de la gift card por redondeos de la tasa. */
    private const TOLERANCE = 0.02;

    /**
     * Valida las líneas de pago y las pasa al formato del desglose del POS.
     *
     * @param  array<int, array{method?: mixed, input_amount?: mixed, bank_id?: mixed}>  $lines
     * @return array{splits: list<array<string, mixed>>, total: float, rate: float|null}
     * @throws InvalidArgumentException con un mensaje listo para mostrar
     */
    public function normalize(string $businessId, array $lines, ?float $rate): array
    {
        if ($lines === []) {
            throw new InvalidArgumentException('Indica cómo se pagó la gift card.');
        }

        $needsRate = collect($lines)->contains(fn ($l) => in_array($l['method'] ?? '', self::VES_METHODS, true));
        if ($needsRate && (!$rate || $rate <= 0)) {
            throw new InvalidArgumentException('Falta la tasa de cambio para pagos en bolívares.');
        }

        $splits = [];
        $total = 0.0;
        foreach ($lines as $line) {
            $method = (string) ($line['method'] ?? '');
            if (!in_array($method, self::METHODS, true)) {
                throw new InvalidArgumentException('Método de pago no válido para una gift card.');
            }

            $isVes = in_array($method, self::VES_METHODS, true);
            $input = round((float) ($line['input_amount'] ?? 0), 2);
            if ($input <= 0) {
                throw new InvalidArgumentException('Cada forma de pago necesita un monto mayor a 0.');
            }
            $usd = $isVes ? round($input / $rate, 2) : $input;

            $bank = [];
            if (!empty($line['bank_id']) && in_array($method, self::BANK_METHODS, true)) {
                // El nombre del banco se resuelve aquí desde la tabla: no se confía en el que mande el cliente.
                $found = Bank::where('business_id', $businessId)->find($line['bank_id']);
                if (!$found) {
                    throw new InvalidArgumentException('El banco elegido no existe.');
                }
                $bank = ['bank_id' => $found->id, 'bank_name' => $found->name];
            }

            $splits[] = [
                'method' => $method,
                'currency' => $isVes ? 'VES' : 'USD',
                'inputAmount' => $input,
                'amount' => $usd,
                ...$bank,
            ];
            $total += $usd;
        }

        return ['splits' => $splits, 'total' => round($total, 2), 'rate' => $needsRate ? $rate : null];
    }

    /** Al vender la gift card, lo pagado tiene que ser su monto. @throws InvalidArgumentException */
    public function assertCovers(float $paidTotal, float $giftCardAmount): void
    {
        if (abs($paidTotal - $giftCardAmount) > self::TOLERANCE) {
            throw new InvalidArgumentException(sprintf(
                'Lo pagado ($%s) no coincide con el monto de la gift card ($%s).',
                number_format($paidTotal, 2),
                number_format($giftCardAmount, 2),
            ));
        }
    }

    /**
     * Guarda (o reemplaza) el cobro de una gift card.
     *
     * @param  array{splits: list<array<string, mixed>>, total: float, rate: float|null}  $normalized
     */
    public function save(GiftCard $giftCard, array $normalized, CarbonInterface $paidAt, ?string $createdBy): GiftCardPayment
    {
        $payment = GiftCardPayment::where('gift_card_id', $giftCard->id)->first() ?? new GiftCardPayment([
            'id' => Str::uuid()->toString(),
            'gift_card_id' => $giftCard->id,
        ]);

        $payment->fill([
            'business_id' => $giftCard->business_id,
            'branch_id' => $giftCard->branch_id,
            'amount' => $normalized['total'],
            'payments_breakdown' => $normalized['splits'],
            'exchange_rate' => $normalized['rate'],
            'paid_at' => $paidAt,
            'created_by' => $createdBy,
        ])->save();

        return $payment;
    }

    public function remove(GiftCard $giftCard): void
    {
        GiftCardPayment::where('gift_card_id', $giftCard->id)->delete();
    }

    /**
     * Los cobros de gift cards recibidos en un rango, para sumarlos al Cuadre del Día.
     *
     * @param  CarbonInterface|string  $from
     * @param  CarbonInterface|string  $to
     * @return Collection<int, GiftCardPayment>
     */
    public function receipts(string $businessId, $from, $to, ?string $branchId = null): Collection
    {
        $query = GiftCardPayment::where('business_id', $businessId)->whereBetween('paid_at', [$from, $to]);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }
}
