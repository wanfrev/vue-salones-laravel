<?php

namespace Tests\Unit\Staffing;

use App\Models\Profile;
use Tests\TestCase;

/**
 * Bank/card numbers must never leave the server whole. Profile casts them `encrypted` and hides
 * them from serialization — this exercises that contract on an unsaved model, so no database
 * round-trip is needed to prove the masking works.
 */
class ProfileBankMaskingTest extends TestCase
{
    public function test_bank_account_number_is_hidden_from_serialization(): void
    {
        $profile = new Profile(['bank_account_number' => '123456789012']);

        $this->assertArrayNotHasKey('bank_account_number', $profile->toArray());
    }

    public function test_payroll_card_number_is_hidden_from_serialization(): void
    {
        $profile = new Profile(['payroll_card_number' => '4111111111111111']);

        $this->assertArrayNotHasKey('payroll_card_number', $profile->toArray());
    }

    public function test_bank_routing_number_is_hidden_from_serialization(): void
    {
        $profile = new Profile(['bank_routing_number' => '021000021']);

        $this->assertArrayNotHasKey('bank_routing_number', $profile->toArray());
    }

    public function test_only_the_last_four_digits_are_exposed(): void
    {
        $profile = new Profile(['bank_account_number' => '123456789012']);

        $array = $profile->toArray();

        $this->assertSame('9012', $array['bank_account_last4']);
    }

    public function test_payroll_card_last4_matches_the_stored_number(): void
    {
        $profile = new Profile(['payroll_card_number' => '4111111111111111']);

        $this->assertSame('1111', $profile->toArray()['payroll_card_last4']);
    }

    public function test_no_number_on_file_reports_no_last4_rather_than_an_empty_string(): void
    {
        $profile = new Profile();

        $array = $profile->toArray();

        $this->assertNull($array['bank_account_last4']);
        $this->assertNull($array['payroll_card_last4']);
    }

    /** The full value round-trips correctly through the encrypted cast in memory. */
    public function test_the_encrypted_cast_round_trips_the_real_value(): void
    {
        $profile = new Profile(['bank_account_number' => '123456789012']);

        $this->assertSame('123456789012', $profile->bank_account_number);
    }
}
