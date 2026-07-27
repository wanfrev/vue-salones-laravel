<?php

namespace App\Console\Commands;

use App\Events\EntityChanged;
use App\Models\Pet;
use App\Models\Profile;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class PetBirthdayCheck extends Command
{
    protected $signature = 'pet-birthday:check';
    protected $description = 'Check pets with birthdays today and notify admins and encargados.';

    public function __construct(
        private NotificationService $notificationService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $today = now()->toDateString();

        $this->info("[pet-birthday:check] Checking pet birthdays for {$today}...");

        $birthdayPets = Pet::with('client')
            ->whereNotNull('birthday')
            ->whereRaw("TO_CHAR(birthday, 'MM-DD') = TO_CHAR(DATE ? , 'MM-DD')", [$today])
            ->get()
            ->groupBy('business_id');

        if ($birthdayPets->isEmpty()) {
            $this->info('[pet-birthday:check] No pet birthdays today.');
            return self::SUCCESS;
        }

        $totalGenerated = 0;
        $affectedBusinesses = [];

        foreach ($birthdayPets as $bizId => $pets) {
            $admins = Profile::where('business_id', $bizId)
                ->where('active', true)
                ->whereIn('role', ['admin', 'superadmin', 'encargado'])
                ->get();

            foreach ($pets as $pet) {
                $client = $pet->client;
                $petName = $pet->name;
                $ownerName = $client?->full_name ?? 'Desconocido';
                $age = $pet->birthday ? now()->diffInYears($pet->birthday) : null;

                $message = "{$petName} (tutor: {$ownerName})";
                if ($age !== null && $age > 0) {
                    $message .= " cumple {$age} año" . ($age > 1 ? 's' : '');
                }
                $message .= ' hoy.';

                foreach ($admins as $admin) {
                    $this->notificationService->create([
                        'business_id' => $bizId,
                        'profile_id' => $admin->id,
                        'type' => 'pet_birthday',
                        'title' => 'Cumpleaños de mascota',
                        'message' => $message,
                        'client_name' => $ownerName,
                        'client_phone' => $client?->phone ?? null,
                        'metadata' => [
                            'pet_id' => $pet->id,
                            'pet_name' => $petName,
                            'birthday' => $pet->birthday,
                            'age' => $age,
                        ],
                    ]);
                    $totalGenerated++;
                }
            }

            $affectedBusinesses[$bizId] = true;
        }

        $this->info("[pet-birthday:check] {$totalGenerated} birthday notifications generated.");

        foreach (array_keys($affectedBusinesses) as $bizId) {
            EntityChanged::safe($bizId, 'notification', 'created');
        }

        return self::SUCCESS;
    }
}
