<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\AttachmentController;
use App\Models\Clinical\AccessLog;
use App\Models\Clinical\Attachment;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClinicalAttachmentsTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';
    private const CLIENT = 'client-1';
    private const SECRET = '%PDF-1.4 RESULTADOS CONFIDENCIALES DE ANA PEREZ';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();
        Storage::fake('local');

        DB::table('clients')->insert([
            ['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez'],
            ['id' => 'client-2', 'business_id' => self::BIZ, 'full_name' => 'Beto'],
            ['id' => 'ajeno', 'business_id' => 'biz-2', 'full_name' => 'Otro'],
        ]);
    }

    private function req(string $role, string $method = 'GET', array $body = [], ?UploadedFile $file = null, string $userId = 'u1'): Request
    {
        $request = Request::create('/api/x', $method, $body, [], $file ? ['file' => $file] : [], ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.0.5']);
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => (object) ['id' => $userId, 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => true],
        ]);

        return $request;
    }

    private function pdf(string $name = 'resultados_ana_perez.pdf'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, self::SECRET);
    }

    private function upload(string $role = 'empleado', array $over = [], ?UploadedFile $file = null)
    {
        return app(AttachmentController::class)->store(
            $this->req($role, 'POST', array_merge(['category' => 'test_result', 'title' => 'MMPI-2 de Ana'], $over), $file ?? $this->pdf()),
            self::CLIENT,
        );
    }

    public function test_the_file_is_stored_encrypted_and_never_in_clear_on_disk_or_in_the_database(): void
    {
        $r = $this->upload();
        $this->assertSame(201, $r->getStatusCode());

        $row = DB::table('clinical_attachments')->first();
        $this->assertStringNotContainsString('MMPI', $row->title);                       // título cifrado
        $this->assertStringNotContainsString('resultados_ana_perez', $row->original_name); // nombre original cifrado
        $this->assertSame(strlen(self::SECRET), (int) $row->size);

        $onDisk = Storage::disk('local')->get($row->path);
        $this->assertStringNotContainsString('CONFIDENCIALES', $onDisk);                 // contenido cifrado
        $this->assertStringNotContainsString('PDF', $onDisk);
        $this->assertStringEndsWith('.enc', $row->path);
        $this->assertStringNotContainsString('ana', strtolower($row->path));             // la ruta no delata nada
    }

    public function test_the_api_never_exposes_the_storage_path(): void
    {
        $body = json_decode($this->upload()->getContent(), true);

        $this->assertArrayNotHasKey('path', $body);
        $this->assertSame('MMPI-2 de Ana', $body['title']);          // descifrado para quien tiene acceso
        $this->assertSame('resultados_ana_perez.pdf', $body['original_name']);
        $this->assertSame('test_result', $body['category']);

        $list = json_decode(app(AttachmentController::class)->index($this->req('empleado'), self::CLIENT)->getContent(), true);
        $this->assertCount(1, $list);
        $this->assertArrayNotHasKey('path', $list[0]);
    }

    public function test_download_returns_the_original_bytes_and_is_audited(): void
    {
        $id = json_decode($this->upload('empleado')->getContent(), true)['id'];

        $response = app(AttachmentController::class)->download($this->req('empleado', 'GET', [], null, 'u9'), self::CLIENT, $id);

        ob_start();
        $response->sendContent();
        $this->assertSame(self::SECRET, ob_get_clean());
        $this->assertStringContainsString('resultados_ana_perez.pdf', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));

        $log = AccessLog::where('action', 'downloaded')->first();
        $this->assertSame('attachment', $log->resource);
        $this->assertSame($id, $log->resource_id);
        $this->assertSame('u9', $log->user_id);
    }

    public function test_every_download_is_logged_even_when_repeated(): void
    {
        $id = json_decode($this->upload()->getContent(), true)['id'];
        for ($i = 0; $i < 3; $i++) {
            app(AttachmentController::class)->download($this->req('empleado'), self::CLIENT, $id);
        }

        $this->assertSame(3, AccessLog::where('action', 'downloaded')->count()); // las descargas NO se deduplican
    }

    public function test_only_the_admin_can_delete_and_the_deletion_removes_the_file_and_is_logged(): void
    {
        $id = json_decode($this->upload()->getContent(), true)['id'];
        $path = Attachment::find($id)->path;
        $c = app(AttachmentController::class);

        $this->assertSame(403, $c->destroy($this->req('empleado', 'DELETE'), self::CLIENT, $id)->getStatusCode());
        $this->assertSame(403, $c->destroy($this->req('encargado', 'DELETE'), self::CLIENT, $id)->getStatusCode());
        $this->assertTrue(Storage::disk('local')->exists($path));

        $this->assertSame(200, $c->destroy($this->req('admin', 'DELETE'), self::CLIENT, $id)->getStatusCode());
        $this->assertFalse(Storage::disk('local')->exists($path));
        $this->assertNull(Attachment::find($id));

        $log = AccessLog::where('action', 'deleted')->first();
        $this->assertSame('test_result', $log->detail);   // la categoría, nunca el título
        $this->assertSame('attachment', $log->resource);
    }

    public function test_access_is_clinical_only_and_scoped_to_the_patient_and_business(): void
    {
        $id = json_decode($this->upload()->getContent(), true)['id'];
        $c = app(AttachmentController::class);

        $this->assertSame(403, $c->index($this->req('cajero'), self::CLIENT)->getStatusCode());
        $this->assertSame(403, $c->download($this->req('cajero'), self::CLIENT, $id)->getStatusCode());
        $this->assertSame(404, $c->download($this->req('admin'), 'client-2', $id)->getStatusCode()); // otro paciente
        $this->assertSame(404, $c->download($this->req('admin'), 'ajeno', $id)->getStatusCode());    // otro negocio
        $this->assertSame(404, $c->destroy($this->req('admin', 'DELETE'), 'client-2', $id)->getStatusCode());
        $this->assertTrue(Attachment::where('id', $id)->exists());
    }

    public function test_upload_validation_rejects_bad_types_sizes_and_categories(): void
    {
        foreach ([
            fn () => $this->upload('empleado', [], UploadedFile::fake()->create('virus.php', 10)),
            fn () => $this->upload('empleado', [], UploadedFile::fake()->create('script.exe', 10)),
            fn () => $this->upload('empleado', [], UploadedFile::fake()->create('grande.pdf', 11000, 'application/pdf')), // > 10 MB
            fn () => $this->upload('empleado', ['category' => 'otra']),
            fn () => $this->upload('empleado', ['title' => '']),
        ] as $attempt) {
            try {
                $attempt();
                $this->fail('Debió fallar la validación');
            } catch (ValidationException) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(0, DB::table('clinical_attachments')->count());
        $this->assertSame([], Storage::disk('local')->allFiles()); // y no queda nada en disco
    }

    public function test_images_and_word_documents_are_accepted(): void
    {
        foreach (['foto.png', 'dibujo.jpg', 'informe.docx'] as $name) {
            $r = $this->upload('empleado', [], UploadedFile::fake()->create($name, 20));
            $this->assertSame(201, $r->getStatusCode(), $name);
        }
        $this->assertSame(3, Attachment::count());
    }

    public function test_a_path_in_the_uploaded_name_cannot_escape_or_poison_the_stored_name(): void
    {
        $r = $this->upload('empleado', [], UploadedFile::fake()->createWithContent('..\\..\\etc\\passwd.pdf', 'x'));

        $this->assertSame('passwd.pdf', json_decode($r->getContent(), true)['original_name']);
        $this->assertStringStartsWith('clinical/' . self::BIZ . '/' . self::CLIENT . '/', Attachment::first()->path);
    }

    public function test_a_corrupted_or_missing_file_is_a_clear_409_not_a_crash(): void
    {
        $id = json_decode($this->upload()->getContent(), true)['id'];
        $path = Attachment::find($id)->path;
        $c = app(AttachmentController::class);

        Storage::disk('local')->put($path, 'basura que no se puede descifrar');
        $this->assertSame(409, $c->download($this->req('admin'), self::CLIENT, $id)->getStatusCode());

        Storage::disk('local')->delete($path);
        $this->assertSame(409, $c->download($this->req('admin'), self::CLIENT, $id)->getStatusCode());
        $this->assertSame(0, AccessLog::where('action', 'downloaded')->count()); // no hubo entrega, no hay descarga que anotar
    }
}
