<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Datos de prueba masivos para UN negocio de odontología ya existente (por defecto el de
 * verito@gmail.com en staging). NO crea usuarios, negocio, sucursal ni odontólogos: usa los que
 * ya existen y solo llena pacientes, odontogramas, historias clínicas, anexos, periodontogramas,
 * biopelícula, presupuestos, consentimientos, citas (pasadas / hoy / futuras), cobros, gastos,
 * proveedores e inventario.
 *
 * Uso (en el servidor de STAGING, desde backend/):
 *   php artisan db:seed --class=DentalDemoDataSeeder
 *
 * Es re-ejecutable: todo lo que crea queda marcado (clients.metadata.seed, SKU "DEMO-D-*",
 * nombres terminados en " [demo]") y se borra y recrea en cada corrida, sin tocar datos reales.
 * Se niega a correr si el negocio no es de nicho `odontologia`.
 */
class DentalDemoDataSeeder extends Seeder
{
    private const TAG = 'dental-demo-seed';
    private const SKU_PREFIX = 'DEMO-D-';
    private const SUFFIX = ' [demo]';
    private const CLIENT_COUNT = 45;

    private const PNG_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    public function run(): void
    {
        mt_srand(20261004);

        $email = env('DEMO_EMAIL', 'verito@gmail.com');
        $user = DB::table('users')->where('email', $email)->first();
        if (! $user) {
            $this->say("No existe el usuario {$email}. No se hizo nada.", 'error');
            return;
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (! $profile || ! $profile->business_id) {
            $this->say("El usuario {$email} no tiene perfil/negocio. No se hizo nada.", 'error');
            return;
        }

        $business = DB::table('businesses')->where('id', $profile->business_id)->first();
        if (! $business || $business->niche_type !== 'odontologia') {
            $this->say('El negocio de ese usuario no es de nicho odontologia. No se hizo nada.', 'error');
            return;
        }

        $dbName = config('database.connections.' . config('database.default') . '.database');
        if ($this->command && ! $this->command->confirm("Llenar datos de prueba en \"{$business->name}\" (BD: {$dbName}, APP_ENV: " . app()->environment() . ")?", false)) {
            $this->say('Cancelado.', 'info');
            return;
        }

        $bizId = $business->id;
        $now = now();
        $uuid = fn () => Str::uuid()->toString();

        $branch = DB::table('branches')->where('business_id', $bizId)->orderByDesc('is_default')->first();
        $branchId = $branch->id ?? null;

        $this->cleanup($bizId);

        DB::transaction(function () use ($bizId, $branchId, $user, $business, $profile, $now, $uuid) {
            $doctors = $this->doctors($bizId, $profile);
            $services = $this->services($bizId, $branchId, $now, $uuid);
            $clients = $this->clients($bizId, $branchId, $now, $uuid);
            $this->clinicalData($bizId, $branchId, $user->id, $clients, $services, $now, $uuid);
            $this->appointments($bizId, $branchId, $user->id, $business, $doctors, $services, $clients, $now, $uuid);
            $this->finance($bizId, $branchId, $user->id, $now, $uuid);
            $this->inventory($bizId, $branchId, $now, $uuid);
        });

        $this->say('', 'info');
        $this->say("Listo. Datos de prueba cargados en \"{$business->name}\" ({$email}).", 'info');
    }

    // ───────────────────────────── limpieza ─────────────────────────────

    private function cleanup(string $bizId): void
    {
        DB::transaction(function () use ($bizId) {
            $clientIds = DB::table('clients')->where('business_id', $bizId)
                ->whereRaw("metadata->>'seed' = ?", [self::TAG])->pluck('id')->all();

            if ($clientIds) {
                $apptIds = DB::table('appointments')->whereIn('client_id', $clientIds)->pluck('id')->all();
                foreach (array_chunk($apptIds, 500) as $chunk) {
                    DB::table('transactions')->whereIn('appointment_id', $chunk)->delete();
                    DB::table('appointments')->whereIn('id', $chunk)->delete();
                }
                // dental_* (carta, historia, anexos, periodontograma, biopelícula, presupuesto,
                // consentimiento) cuelgan de clients con ON DELETE CASCADE.
                DB::table('clients')->whereIn('id', $clientIds)->delete();
            }

            $productIds = DB::table('products')->where('business_id', $bizId)
                ->where('sku', 'like', self::SKU_PREFIX . '%')->pluck('id')->all();
            if ($productIds) {
                DB::table('inventory_stock')->whereIn('product_id', $productIds)->delete();
                DB::table('products')->whereIn('id', $productIds)->delete();
            }

            DB::table('expenses')->where('business_id', $bizId)->where('name', 'like', '%' . self::SUFFIX)->delete();
            DB::table('suppliers')->where('business_id', $bizId)->where('company', 'like', '%' . self::SUFFIX)->delete();
        });
    }

    // ───────────────────────────── equipo / catálogo ─────────────────────────────

    /** Odontólogos reales del negocio; si no hay ninguno, el propio usuario hace de doctor. */
    private function doctors(string $bizId, object $profile): array
    {
        $rows = DB::table('profiles')->where('business_id', $bizId)
            ->whereIn('role', ['empleado', 'encargado'])->where('active', true)
            ->where(fn ($q) => $q->where('disable_agenda', false)->orWhereNull('disable_agenda'))
            ->get();

        $list = [];
        foreach ($rows as $r) {
            $list[] = ['id' => $r->id, 'pay_type' => $r->pay_type ?? 'percentage', 'pct' => (float) ($r->pay_percentage ?? 0)];
        }
        if (! $list) {
            $list[] = ['id' => $profile->id, 'pay_type' => 'percentage', 'pct' => 100.0];
        }
        return $list;
    }

    private function services(string $bizId, ?string $branchId, Carbon $now, callable $uuid): array
    {
        $catalog = [
            ['Consulta de valoración', 'Diagnóstico', 20, 30],
            ['Limpieza dental (profilaxis)', 'Preventiva', 35, 45],
            ['Restauración con resina', 'Operatoria', 45, 60],
            ['Restauración defectuosa', 'Operatoria', 30, 60],
            ['Extracción simple', 'Cirugía', 40, 45],
            ['Extracción de cordal', 'Cirugía', 120, 90],
            ['Endodoncia unirradicular', 'Endodoncia', 150, 90],
            ['Endodoncia multirradicular', 'Endodoncia', 220, 120],
            ['Blanqueamiento dental', 'Estética', 180, 90],
            ['Corona de porcelana', 'Prótesis', 280, 60],
            ['Control de ortodoncia', 'Ortodoncia', 40, 30],
            ['Raspado y alisado radicular', 'Periodoncia', 60, 60],
            ['Sellante de fosas y fisuras', 'Preventiva', 25, 30],
            ['Radiografía periapical', 'Diagnóstico', 8, 15],
            ['Carilla estética', 'Estética', 200, 60],
            ['Prótesis removible', 'Prótesis', 350, 60],
            ['Fluorización', 'Preventiva', 15, 20],
        ];

        $existing = DB::table('services')->where('business_id', $bizId)->where('active', true)->get();
        $byName = [];
        foreach ($existing as $s) {
            $byName[mb_strtolower($s->name)] = $s;
        }

        $pool = [];
        foreach ($catalog as [$name, $cat, $price, $dur]) {
            $key = mb_strtolower($name);
            if (isset($byName[$key])) {
                $s = $byName[$key];
                $pool[] = ['id' => $s->id, 'name' => $s->name, 'price' => (float) $s->price, 'duration' => (int) $s->duration_minutes];
                continue;
            }
            $id = $uuid();
            DB::table('services')->insert([
                'id' => $id, 'business_id' => $bizId, 'branch_id' => $branchId,
                'name' => $name, 'category' => $cat, 'price' => $price, 'duration_minutes' => $dur,
                'local_percentage' => 45, 'active' => true, 'color' => '#869C84',
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $pool[] = ['id' => $id, 'name' => $name, 'price' => (float) $price, 'duration' => $dur];
        }

        // Servicios que el negocio ya tenía y no están en el catálogo de arriba también entran al sorteo.
        $inPool = array_column($pool, 'id');
        foreach ($existing as $s) {
            if (! in_array($s->id, $inPool, true)) {
                $pool[] = ['id' => $s->id, 'name' => $s->name, 'price' => (float) $s->price, 'duration' => (int) $s->duration_minutes];
            }
        }

        return $pool;
    }

    // ───────────────────────────── pacientes ─────────────────────────────

    private function clients(string $bizId, ?string $branchId, Carbon $now, callable $uuid): array
    {
        $male = ['Carlos', 'José', 'Luis', 'Miguel', 'Andrés', 'Daniel', 'Gabriel', 'Alejandro', 'Sebastián', 'Diego', 'Rafael', 'Eduardo', 'Ricardo', 'Fernando', 'Jesús', 'Pedro', 'Manuel', 'Héctor', 'Oscar', 'Víctor'];
        $female = ['María', 'Ana', 'Laura', 'Sofía', 'Valentina', 'Camila', 'Isabella', 'Daniela', 'Gabriela', 'Andrea', 'Carolina', 'Patricia', 'Lucía', 'Mariana', 'Paola', 'Verónica', 'Yelitza', 'Rosa', 'Elena', 'Natalia'];
        $surnames = ['González', 'Rodríguez', 'Pérez', 'Fernández', 'García', 'Martínez', 'Hernández', 'López', 'Ramírez', 'Torres', 'Díaz', 'Rojas', 'Vargas', 'Castillo', 'Mendoza', 'Silva', 'Morales', 'Ortega', 'Navarro', 'Campos', 'Peña', 'Guerrero', 'Medina', 'Ríos', 'Paredes', 'Salazar', 'Contreras', 'Herrera', 'Sánchez', 'Romero'];
        $insurers = [null, null, null, 'Seguros Mercantil', 'Seguros Caracas', 'Mapfre', 'Seguros Pirámide', 'Seguros La Previsora', 'Particular'];
        $prefixes = ['412', '414', '416', '424', '426'];

        $out = [];
        for ($i = 0; $i < self::CLIENT_COUNT; $i++) {
            $isFemale = $i % 2 === 0;
            $first = $isFemale ? $female[array_rand($female)] : $male[array_rand($male)];
            $sn1 = $surnames[array_rand($surnames)];
            $sn2 = $surnames[array_rand($surnames)];
            $fullName = "{$first} {$sn1} {$sn2}";
            $phone = sprintf('+58%s%07d', $prefixes[$i % 5], 2000000 + $i * 13711);
            $age = mt_rand(5, 78);
            $birthday = Carbon::now()->subYears($age)->subDays(mt_rand(0, 364))->format('Y-m-d');
            $slug = Str::slug($first . '.' . $sn1, '.');
            $id = $uuid();

            DB::table('clients')->insert([
                'id' => $id, 'business_id' => $bizId, 'branch_id' => $branchId,
                'full_name' => $fullName, 'phone' => $phone,
                'email' => mt_rand(1, 10) <= 7 ? "{$slug}{$i}@correo.com" : null,
                'notes' => mt_rand(1, 10) <= 2 ? 'Paciente ansioso, prefiere citas en la mañana.' : null,
                'birthday' => $birthday,
                'metadata' => json_encode(['seed' => self::TAG]),
                'last_name' => $sn1, 'second_last_name' => $sn2,
                'document_id' => 'V-' . mt_rand(6000000, 29999999),
                'medical_insurance' => $insurers[array_rand($insurers)],
                'emergency_phone' => sprintf('+58%s%07d', $prefixes[($i + 2) % 5], 5000000 + $i * 7919),
                'created_at' => Carbon::now()->subDays(mt_rand(30, 400)), 'updated_at' => $now,
            ]);

            $out[] = ['id' => $id, 'name' => $fullName, 'age' => $age];
        }
        return $out;
    }

    // ───────────────────────────── clínica ─────────────────────────────

    private function allTeeth(): array
    {
        $t = [];
        foreach ([1, 2, 3, 4] as $q) {
            foreach (range(1, 8) as $n) {
                $t[] = $q * 10 + $n;
            }
        }
        return $t;
    }

    private function clinicalData(string $bizId, ?string $branchId, string $userId, array $clients, array $services, Carbon $now, callable $uuid): void
    {
        $base = ['business_id' => $bizId, 'branch_id' => $branchId, 'created_at' => $now, 'updated_at' => $now];
        $faces = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal'];
        $teethList = $this->allTeeth();

        foreach ($clients as $idx => $c) {
            // ── Odontograma + códigos ICDAS / Black ──
            [$teeth, $codes, $present, $pending] = $this->buildChart($teethList, $faces, $c['age']);
            DB::table('dental_charts')->insert($base + [
                'id' => $uuid(), 'client_id' => $c['id'],
                'teeth' => json_encode($teeth ?: new \stdClass()), 'codes' => json_encode($codes ?: new \stdClass()),
            ]);

            // ── Historia clínica (≈75 %) ──
            if (mt_rand(1, 100) <= 75) {
                DB::table('dental_clinical_histories')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'folio_number' => 1, 'created_by' => $userId,
                    'anamnesis' => json_encode($this->anamnesis()),
                    'examen_fisico' => json_encode($this->examenFisico($c['age'])),
                    'examenes_complementarios' => json_encode(['hallazgos_radiologicos' => [
                        'periapicales_permanentes' => mt_rand(0, 1) ? 'Sin hallazgos patológicos periapicales.' : 'Radiolucidez periapical en pieza ' . $present[array_rand($present)] . '.',
                        'panoramica' => 'Panorámica sin alteraciones óseas evidentes.',
                        'coronales' => '', 'cbct' => '', 'otras_radiografias' => '', 'periapicales_temporales' => '', 'reportes_examenes_complementarios' => '',
                    ]]),
                    'diagnostico' => json_encode($this->diagnostico()),
                    'certificado_veracidad' => true,
                    'observaciones_generales' => mt_rand(1, 10) <= 3 ? 'Paciente colaborador. Control en 6 meses.' : null,
                ]);
            }

            // ── Anexo de endodoncia (≈18 %) ──
            if (mt_rand(1, 100) <= 18) {
                DB::table('dental_endo_annexes')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'tooth_number' => $present[array_rand($present)],
                    'examen' => json_encode($this->endoExamen()),
                    'diagnostico' => json_encode([
                        'codigo_cie10' => 'K04.0', 'diagnostico_pulpar' => 'Pulpitis irreversible sintomática',
                        'diagnostico_periapical' => 'Periodontitis apical sintomática', 'lesion_endo_periodontal' => false,
                        'relaciones_prosto_endo' => false, 'pronostico_general' => 'Favorable', 'pronostico_individual' => 'Favorable',
                    ]),
                    'tratamiento' => json_encode([
                        'tipo' => 'Tratamiento de conductos', 'descripcion' => 'Acceso, instrumentación rotatoria y obturación.',
                        'grapa_no' => '8A', 'conductos' => [
                            ['nombre' => 'Conducto único', 'conductometria_tentativa' => '21', 'conductometria_definitiva' => '20', 'lap' => '25', 'referencia' => 'Borde incisal'],
                        ],
                        'tecnica_instrumentacion' => 'Rotatoria', 'tecnica_obturacion' => 'Condensación lateral',
                        'desobturacion_retenedor' => '', 'longitud' => '20 mm', 'referencia' => 'Borde incisal', 'observaciones' => '',
                    ]),
                ]);
            }

            // ── Anexo periodontal + periodontograma (≈22 %) ──
            if (mt_rand(1, 100) <= 22) {
                DB::table('dental_perio_annexes')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'condiciones_clinicas' => json_encode([
                        'aspecto_liso_brillante' => (bool) mt_rand(0, 1), 'color_rojo' => (bool) mt_rand(0, 1),
                        'consistencia_blanda' => (bool) mt_rand(0, 1), 'fenotipo_gingival' => ['Delgado', 'Grueso'][mt_rand(0, 1)],
                        'frenillos_sobreinsertados' => false, 'fremitus' => false, 'condiciones_mucogingivales' => false,
                    ]),
                    'factores_riesgo' => json_encode([
                        'calculos_dentales' => ['refiere' => true, 'observaciones' => 'Cálculo supragingival generalizado.'],
                        'factores_sistemicos' => ['refiere' => (bool) mt_rand(0, 1), 'observaciones' => ''],
                    ]),
                    'diagnostico' => json_encode([
                        'codigo_cie10' => 'K05.1', 'impresion_diagnostica_individual' => 'Gingivitis inducida por placa',
                        'diagnostico_caso' => 'Gingivitis generalizada', 'pronostico_general' => 'Bueno', 'pronostico_individual' => 'Bueno',
                        'plan_tratamiento' => [
                            'fase_urgencias' => '', 'fase_sistemica' => '', 'fase_higienica' => 'Profilaxis y motivación en higiene oral.',
                            'fase_correctiva' => '', 'fase_mantenimiento' => 'Control cada 4 meses.',
                        ],
                    ]),
                    'observaciones_generales' => null,
                ]);
                DB::table('dental_periodontograms')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'teeth' => json_encode($this->periodontogram($present)),
                    'observaciones_generales' => 'Sangrado al sondaje en zona posterior.',
                ]);
            }

            // ── Biopelícula O'Leary (≈45 %) ──
            if (mt_rand(1, 100) <= 45) {
                $rate = mt_rand(8, 65);
                $bio = [];
                foreach ($present as $t) {
                    $bio[(string) $t] = [
                        'vestibular' => mt_rand(1, 100) <= $rate, 'lingual' => mt_rand(1, 100) <= $rate,
                        'mesial' => mt_rand(1, 100) <= $rate, 'distal' => mt_rand(1, 100) <= $rate,
                    ];
                }
                DB::table('dental_biofilm_records')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'teeth' => json_encode($bio), 'observaciones_generales' => null,
                ]);
            }

            // ── Presupuesto desde lo pendiente del odontograma (≈50 %) ──
            if ($pending && mt_rand(1, 100) <= 50) {
                $items = [];
                $total = 0.0;
                foreach (array_slice($pending, 0, mt_rand(2, 5)) as [$tooth, $cond]) {
                    $svc = $services[array_rand($services)];
                    $included = mt_rand(1, 10) <= 8;
                    $items[] = [
                        'tooth' => $tooth,
                        'description' => ($cond === 'caries' ? 'Tratamiento de caries' : 'Extracción') . " pieza {$tooth}",
                        'service_id' => $svc['id'], 'price' => $svc['price'], 'included' => $included,
                    ];
                    if ($included) {
                        $total += $svc['price'];
                    }
                }
                DB::table('dental_budgets')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'items' => json_encode($items), 'total' => round($total, 2),
                    'observaciones_generales' => 'Presupuesto válido por 30 días.',
                ]);
            }

            // ── Consentimiento firmado (≈25 %) ──
            if (mt_rand(1, 100) <= 25) {
                DB::table('dental_consents')->insert($base + [
                    'id' => $uuid(), 'client_id' => $c['id'], 'created_by' => $userId,
                    'procedure_description' => ['Extracción dental simple', 'Tratamiento de conductos', 'Restauración con resina', 'Blanqueamiento dental'][mt_rand(0, 3)],
                    'risks_text' => 'Se me explicaron los riesgos, alternativas y posibles complicaciones del procedimiento, incluyendo dolor postoperatorio, inflamación y sangrado, y acepto realizarlo.',
                    'signature_data' => self::PNG_SIGNATURE,
                    'signed_at' => Carbon::now()->subDays(mt_rand(1, 120)),
                ]);
            }
        }
    }

    /** @return array{0: array, 1: array, 2: int[], 3: array} teeth, codes, present teeth, pending [tooth, condition][] */
    private function buildChart(array $teethList, array $faces, int $age): array
    {
        $teeth = [];
        $codes = [];
        $present = [];
        $pending = [];
        $wear = $age / 80; // más edad → más tratamientos previos

        foreach ($teethList as $t) {
            $roll = mt_rand(1, 1000) / 10;
            $key = (string) $t;

            if ($roll <= 2 + 8 * $wear) { // ausente
                foreach ($faces as $f) {
                    $teeth[$key][$f] = 'ausente';
                }
                continue;
            }
            $present[] = $t;

            if ($roll <= 14 + 12 * $wear) { // caries en 1-2 caras
                foreach ((array) array_rand(array_flip($faces), mt_rand(1, 2)) as $f) {
                    $teeth[$key][$f] = 'caries';
                    $codes[$key][$f] = ['icdas' => mt_rand(1, 6)];
                }
                $pending[] = [$t, 'caries'];
            } elseif ($roll <= 30 + 12 * $wear) { // obturado
                $f = $faces[array_rand($faces)];
                $teeth[$key][$f] = 'obturado';
                $codes[$key][$f] = ['black' => ['I', 'II', 'III', 'IV', 'V'][mt_rand(0, 4)]];
            } elseif ($roll <= 34 + 6 * $wear) { // endodoncia
                foreach ($faces as $f) {
                    $teeth[$key][$f] = 'endodoncia';
                }
            } elseif ($roll <= 38 + 6 * $wear) { // corona
                foreach ($faces as $f) {
                    $teeth[$key][$f] = 'corona';
                }
            } elseif ($roll <= 40 + 3 * $wear) { // extracción indicada
                foreach ($faces as $f) {
                    $teeth[$key][$f] = 'extraccion_indicada';
                }
                $pending[] = [$t, 'extraccion_indicada'];
            } elseif ($roll <= 43 && $t % 10 >= 6) { // sellante en molares
                $teeth[$key]['oclusal'] = 'sellante';
            } elseif ($roll <= 44 && $age > 40) { // implante
                foreach ($faces as $f) {
                    $teeth[$key][$f] = 'implante';
                }
            }
            // el resto queda "sano" implícito (sin entrada)
        }
        return [$teeth, $codes, $present, $pending];
    }

    private function anamnesis(): array
    {
        $motives = [
            ['Dolor en molar inferior', 'Dolor al masticar y con frío desde hace 3 días.'],
            ['Limpieza dental', 'Control de rutina, sin molestias.'],
            ['Sangrado de encías', 'Sangrado al cepillado desde hace varias semanas.'],
            ['Revisión general', 'Última consulta hace más de un año.'],
            ['Estética dental', 'Desea mejorar color y forma de los dientes anteriores.'],
            ['Fractura de diente', 'Se le fracturó un fragmento al morder.'],
            ['Ortodoncia', 'Consulta de valoración para brackets.'],
        ];
        [$motivo, $historia] = $motives[array_rand($motives)];

        $med = [];
        $notes = [
            'toxico_alergicos' => 'Alergia a la penicilina.',
            'farmacologicos' => 'Toma losartán 50 mg diario.',
            'sistema_cardiovascular' => 'Hipertensión arterial controlada.',
            'sistema_endocrino' => 'Diabetes mellitus tipo 2.',
            'sistema_respiratorio' => 'Asma, usa salbutamol de rescate.',
            'sistema_hematologico' => 'Anticoagulado con warfarina.',
            'sistema_inmunologico' => 'Alergia a látex.',
        ];
        if (mt_rand(1, 100) <= 40) {
            foreach ((array) array_rand($notes, mt_rand(1, 2)) as $k) {
                $med[$k] = ['refiere' => true, 'observaciones' => $notes[$k]];
            }
        }
        $dental = [];
        if (mt_rand(1, 100) <= 30) {
            $dental['ortodoncia'] = ['refiere' => true, 'observaciones' => 'Brackets hace 8 años.'];
        }

        return [
            'motivo_consulta' => $motivo, 'historia_motivo_consulta' => $historia,
            'asistio_consulta_ultimo_anio' => (bool) mt_rand(0, 1), 'motivo_ultima_consulta_urgencia' => false,
            'atendido_en_esta_clinica_previamente' => (bool) mt_rand(0, 1),
            'grupo_sanguineo' => ['O+', 'O-', 'A+', 'A-', 'B+', 'AB+'][mt_rand(0, 5)],
            'antecedentes_medicos' => $med, 'antecedentes_odontologicos' => $dental,
            'tmd' => [
                'dolor_cara_mandibula_ultimo_mes' => false, 'mandibula_bloqueada' => false,
                'ruido_articulacion' => (bool) mt_rand(0, 1), 'mordida_incomoda' => false,
                'traumatismo_reciente' => false, 'dolores_cabeza_6meses' => (bool) mt_rand(0, 1),
                'dolor_orofacial' => '', 'otros' => '', 'observaciones' => '',
            ],
            'observaciones' => '',
        ];
    }

    private function examenFisico(int $age): array
    {
        $extra = array_fill_keys(['apariencia_general', 'simetria_facial', 'perfil', 'tipo_cara', 'linea_sonrisa', 'desviacion_mandibular', 'ojos', 'nariz', 'labios', 'piel_anexos', 'sistema_linfatico', 'atm_musculos_masticatorios', 'pares_craneales'], 'Normal');
        $intra = array_fill_keys(['lengua', 'paladar', 'mucosas', 'orofaringe', 'piso_boca', 'inserciones_musculares_frenillos', 'rebordes_alveolares_edentulos', 'presencia_protesis', 'ortodoncia_previa_actual'], 'Sin alteraciones');
        $intra['presencia_protesis'] = 'No';

        return [
            'signos_vitales' => [
                'pulso' => (string) mt_rand(62, 92), 'tension_arterial' => mt_rand(105, 135) . '/' . mt_rand(65, 88),
                'temperatura' => '36.' . mt_rand(2, 8), 'frecuencia_respiratoria' => (string) mt_rand(14, 20),
                'peso' => (string) mt_rand(48, 95), 'talla' => '1.' . mt_rand(50, 85),
            ],
            'examen_extraoral' => $extra, 'examen_intraoral' => $intra,
            'cop' => ['c' => (string) mt_rand(0, 8), 'o' => (string) mt_rand(0, 10), 'p' => (string) mt_rand(0, 4)],
            'ceo' => ['c' => $age < 12 ? (string) mt_rand(0, 5) : '', 'e' => '', 'o' => $age < 12 ? (string) mt_rand(0, 4) : ''],
        ];
    }

    private function diagnostico(): array
    {
        $dx = [
            ['K02.1', 'Caries de la dentina', 'Bueno'],
            ['K05.1', 'Gingivitis crónica', 'Bueno'],
            ['K04.0', 'Pulpitis', 'Reservado'],
            ['K03.6', 'Depósitos (acreciones) en los dientes', 'Bueno'],
            ['K08.1', 'Pérdida de dientes por accidente, extracción o enfermedad periodontal local', 'Reservado'],
        ];
        [$cie, $text, $prog] = $dx[array_rand($dx)];
        return [
            'codigo_cie10' => $cie, 'diagnostico' => $text, 'pronostico' => $prog,
            'plan_tratamiento' => [
                'fase_urgencias' => '', 'fase_sistemica' => '', 'fase_higienica' => 'Profilaxis e instrucción de higiene oral.',
                'fase_correctiva' => 'Restauraciones y tratamientos según presupuesto.', 'fase_mantenimiento' => 'Control cada 6 meses.',
            ],
        ];
    }

    private function endoExamen(): array
    {
        return [
            'historia_dolor' => [
                'dolor' => true, 'intensidad' => (string) mt_rand(4, 9), 'tipo_dolor' => 'Pulsátil', 'ubicacion' => 'Localizado',
                'duracion_dolor' => 'Prolongado', 'tiempo_evolucion' => mt_rand(2, 14) . ' días', 'descripcion' => 'Dolor espontáneo que se exacerba con el frío.',
            ],
            'examen_clinico' => [
                'caries' => ['refiere' => true, 'observaciones' => 'Caries profunda.'],
                'movilidad' => ['refiere' => false, 'observaciones' => ''],
            ],
            'trauma_dentoalveolar' => ['se_realiza_historia' => false, 'descripcion' => ''],
            'pruebas_periapicales' => ['se_realizan' => true, 'percusion' => true, 'palpacion' => false, 'masticacion' => true, 'diente_control' => '', 'dientes_control_adicionales' => ''],
            'pruebas_sensibilidad' => ['se_realizan' => true, 'calor' => 'Dolor persistente', 'frio_respuesta' => 'Exagerada', 'electrica' => '', 'vitalometro' => '', 'diente_control' => '', 'dientes_control_adicionales' => ''],
            'examen_radiografico' => [
                'coronal_radiolucida' => 'Lesión profunda cercana a cámara pulpar', 'coronal_radiopaca' => '', 'radicular_radiolucida' => '', 'radicular_radiopaca' => '',
                'periapical_radiolucida' => 'Ensanchamiento del ligamento periodontal', 'periapical_radiopaca' => '', 'descripcion_final' => '', 'requiere_examen_complementario' => false,
            ],
            'clasificacion_fisuras' => '',
        ];
    }

    private function periodontogram(array $present): array
    {
        $out = [];
        foreach ($present as $t) {
            $sites = [];
            foreach (['mv', 'v', 'dv', 'dl', 'l', 'ml'] as $s) {
                $sites[$s] = [
                    'profundidad' => (string) mt_rand(1, 6), 'sangrado' => mt_rand(1, 100) <= 25,
                    'recesion' => (string) (mt_rand(1, 100) <= 80 ? 0 : mt_rand(1, 3)),
                ];
            }
            $out[(string) $t] = ['sitios' => $sites, 'movilidad' => (string) (mt_rand(1, 100) <= 90 ? 0 : mt_rand(1, 2)), 'furca' => ''];
        }
        return $out;
    }

    // ───────────────────────────── citas + cobros ─────────────────────────────

    private function appointments(string $bizId, ?string $branchId, string $userId, object $business, array $doctors, array $services, array $clients, Carbon $now, callable $uuid): void
    {
        $diagnoses = ['Caries de esmalte', 'Caries dentinaria', 'Gingivitis', 'Pulpitis reversible', 'Restauración defectuosa', 'Cálculo supragingival', 'Fractura coronal', 'Sin hallazgos'];
        $treatments = ['Restauración con resina compuesta', 'Profilaxis y fluorización', 'Pulpectomía', 'Exodoncia simple', 'Raspado y alisado', 'Control y refuerzo de higiene', 'Sellante de fosas y fisuras'];
        $rate = (float) ($business->ves_exchange_rate ?? 0) > 0 ? (float) $business->ves_exchange_rate : 1.0;
        $methods = ['cash', 'cash', 'card', 'transfer', 'zelle'];

        $apptRows = [];
        $txRows = [];
        $today = Carbon::today();
        $checkedIn = 0;

        for ($d = -45; $d <= 10; $d++) {
            $day = $today->copy()->addDays($d);
            if ($day->isSunday()) {
                continue;
            }
            foreach ($doctors as $doc) {
                $cursor = $day->copy()->setTime(9, 0);
                $limit = $day->copy()->setTime(17, 30);
                while ($cursor < $limit) {
                    if (mt_rand(1, 100) > 48) {
                        $cursor->addMinutes(30);
                        continue;
                    }
                    $svc = $services[array_rand($services)];
                    $dur = max(15, (int) $svc['duration']);
                    $start = $cursor->copy();
                    $end = $start->copy()->addMinutes($dur);
                    $client = $clients[array_rand($clients)];
                    $isToday = $d === 0;
                    $isPast = $d < 0;

                    if ($isPast) {
                        $r = mt_rand(1, 100);
                        $status = $r <= 80 ? 'completed' : ($r <= 92 ? 'cancelled' : 'no_show');
                    } elseif ($isToday) {
                        $status = $end < $now ? 'completed' : (mt_rand(0, 1) ? 'confirmed' : 'pending');
                    } else {
                        $status = mt_rand(1, 100) <= 40 ? 'confirmed' : 'pending';
                    }

                    $paid = $status === 'completed' && mt_rand(1, 100) <= 85;
                    $checkedInAt = null;
                    if ($isToday && in_array($status, ['confirmed', 'pending'], true) && $start <= $now->copy()->addHour() && $checkedIn < 6) {
                        $status = 'confirmed';
                        $checkedInAt = $start->copy()->subMinutes(mt_rand(3, 15));
                        $checkedIn++;
                    }

                    $apptId = $uuid();
                    $apptRows[] = [
                        'id' => $apptId, 'business_id' => $bizId, 'branch_id' => $branchId,
                        'client_id' => $client['id'], 'employee_id' => $doc['id'], 'service_id' => $svc['id'],
                        'start_time' => $start, 'end_time' => $end, 'status' => $status,
                        'payment_status' => $paid ? 'paid' : 'unpaid',
                        'diagnosis' => $status === 'completed' ? $diagnoses[array_rand($diagnoses)] : null,
                        'treatment' => $status === 'completed' ? $treatments[array_rand($treatments)] : null,
                        'checked_in_at' => $checkedInAt, 'created_by' => $userId,
                        'created_at' => $start->copy()->subDays(mt_rand(1, 10)), 'updated_at' => $now,
                    ];

                    if ($paid) {
                        $price = $svc['price'];
                        $pct = $doc['pay_type'] === 'salary' ? 0.0 : $doc['pct'];
                        $empAmount = round($price * $pct / 100, 2);
                        $txRows[] = [
                            'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                            'appointment_id' => $apptId, 'employee_id' => $doc['id'],
                            'total_amount' => $price, 'local_amount' => round($price - $empAmount, 2), 'employee_amount' => $empAmount,
                            'local_percentage' => 100 - $pct, 'employee_percentage' => $pct,
                            'method' => $methods[array_rand($methods)], 'exchange_rate_used' => $rate,
                            'paid_at' => $end, 'created_by' => $userId, 'created_at' => $end,
                        ];
                    }

                    $cursor->addMinutes((int) (ceil($dur / 30) * 30));
                }
            }
        }

        foreach (array_chunk($apptRows, 100) as $chunk) {
            DB::table('appointments')->insert($chunk);
        }
        foreach (array_chunk($txRows, 100) as $chunk) {
            DB::table('transactions')->insert($chunk);
        }
        $this->say(count($apptRows) . ' citas, ' . count($txRows) . " cobros, {$checkedIn} pacientes en sala de espera (hoy).", 'info');
    }

    // ───────────────────────────── finanzas / inventario ─────────────────────────────

    private function finance(string $bizId, ?string $branchId, string $userId, Carbon $now, callable $uuid): void
    {
        $expenses = [
            ['Alquiler consultorio', 'Fijos', 450], ['Compra de insumos dentales', 'Insumos', 320],
            ['Internet y telefonía', 'Fijos', 60], ['Publicidad Instagram', 'Marketing', 120],
            ['Mantenimiento de unidad dental', 'Mantenimiento', 180], ['Servicio de esterilización', 'Insumos', 90],
            ['Laboratorio dental (coronas)', 'Laboratorio', 260], ['Electricidad', 'Fijos', 75],
        ];
        foreach ($expenses as $i => [$name, $cat, $amount]) {
            DB::table('expenses')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'name' => $name . self::SUFFIX, 'category' => $cat, 'amount' => $amount,
                'expense_date' => Carbon::now()->subDays(mt_rand(0, 75)), 'currency' => 'USD',
                'created_by' => $userId, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $suppliers = [
            ['Dental', 'Import', 'Dental Import C.A.' . self::SUFFIX, '+582121110001'],
            ['Laboratorio', 'Sonrisa', 'Laboratorio Sonrisa' . self::SUFFIX, '+582121110002'],
            ['Distribuidora', 'Odonto', 'Odonto Suministros' . self::SUFFIX, '+582121110003'],
        ];
        foreach ($suppliers as [$fn, $ln, $company, $phone]) {
            DB::table('suppliers')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'first_name' => $fn, 'last_name' => $ln,
                'company' => $company, 'phone' => $phone, 'active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    private function inventory(string $bizId, ?string $branchId, Carbon $now, callable $uuid): void
    {
        $location = DB::table('inventory_locations')->where('business_id', $bizId)->orderByDesc('is_default')->first();
        if ($location) {
            $locId = $location->id;
        } else {
            $locId = $uuid();
            DB::table('inventory_locations')->insert([
                'id' => $locId, 'business_id' => $bizId, 'branch_id' => $branchId,
                'name' => 'Almacén principal', 'is_default' => true, 'active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $catNames = ['Resinas y adhesivos', 'Anestesia', 'Desechables', 'Higiene oral', 'Endodoncia'];
        $catIds = [];
        foreach ($catNames as $name) {
            $existing = DB::table('product_categories')->where('business_id', $bizId)->where('name', $name)->first();
            if ($existing) {
                $catIds[] = $existing->id;
                continue;
            }
            $cid = $uuid();
            DB::table('product_categories')->insert([
                'id' => $cid, 'business_id' => $bizId, 'name' => $name, 'active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $catIds[] = $cid;
        }

        // [nombre, categoría, costo, precio, vendible]
        $products = [
            ['Resina compuesta A2 (jeringa 4 g)', 0, 14, 0, false], ['Resina compuesta A3 (jeringa 4 g)', 0, 14, 0, false],
            ['Adhesivo dental (frasco 5 ml)', 0, 28, 0, false], ['Ácido grabador 37% (jeringa)', 0, 6, 0, false],
            ['Anestesia lidocaína 2% (caja x50)', 1, 32, 0, false], ['Anestesia articaína 4% (caja x50)', 1, 45, 0, false],
            ['Agujas dentales cortas (caja x100)', 1, 12, 0, false], ['Guantes de nitrilo (caja x100)', 2, 7, 0, false],
            ['Mascarillas descartables (caja x50)', 2, 4, 0, false], ['Baberos desechables (paquete x100)', 2, 9, 0, false],
            ['Eyectores de saliva (bolsa x100)', 2, 5, 0, false], ['Cepillo dental adulto', 3, 1.5, 4, true],
            ['Cepillo dental infantil', 3, 1.2, 3.5, true], ['Pasta dental con flúor 100 ml', 3, 2, 5, true],
            ['Enjuague bucal 500 ml', 3, 3, 7, true], ['Hilo dental 50 m', 3, 1.5, 4, true],
            ['Cepillos interdentales (pack x5)', 3, 2.5, 6, true], ['Limas K 25 mm (caja x6)', 4, 8, 0, false],
            ['Gutapercha (caja x120)', 4, 10, 0, false], ['Hipoclorito de sodio 5,25% (1 L)', 4, 3, 0, false],
        ];

        foreach ($products as $i => [$name, $cat, $cost, $price, $sellable]) {
            $pid = $uuid();
            DB::table('products')->insert([
                'id' => $pid, 'business_id' => $bizId, 'branch_id' => $branchId,
                'category_id' => $catIds[$cat], 'name' => $name . self::SUFFIX,
                'sku' => self::SKU_PREFIX . str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'unit' => 'unit', 'unit_cost' => $cost, 'unit_price' => $price,
                'reorder_point' => 5, 'active' => true, 'is_sellable' => $sellable,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('inventory_stock')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'location_id' => $locId, 'product_id' => $pid,
                'quantity' => mt_rand(2, 60), 'reserved_qty' => 0, 'updated_at' => $now,
            ]);
        }
    }

    // ───────────────────────────── util ─────────────────────────────

    private function say(string $msg, string $level): void
    {
        if (! $this->command) {
            return;
        }
        $level === 'error' ? $this->command->error($msg) : $this->command->info($msg);
    }
}
