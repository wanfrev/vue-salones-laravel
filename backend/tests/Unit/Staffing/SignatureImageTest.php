<?php

namespace Tests\Unit\Staffing;

use App\Services\Staffing\SignatureImage;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SignatureImageTest extends TestCase
{
    private function pngDataUrl(string $extraBytes = ''): string
    {
        return 'data:image/png;base64,' . base64_encode("\x89PNG\r\n\x1a\n" . 'fake-body' . $extraBytes);
    }

    public function test_accepts_a_png_data_url(): void
    {
        $url = $this->pngDataUrl();

        $this->assertSame($url, SignatureImage::validate($url));
        $this->assertStringStartsWith("\x89PNG", SignatureImage::bytes($url));
    }

    #[DataProvider('rejected')]
    public function test_rejects_anything_that_is_not_a_plain_png_data_url(string $value): void
    {
        $this->expectException(InvalidArgumentException::class);
        SignatureImage::validate($value);
    }

    public static function rejected(): array
    {
        return [
            'svg' => ['data:image/svg+xml;base64,' . base64_encode('<svg onload="alert(1)"/>')],
            'html' => ['data:text/html;base64,' . base64_encode('<script>alert(1)</script>')],
            'javascript url' => ['javascript:alert(1)'],
            'plain url' => ['https://evil.example/x.png'],
            'png header but not png bytes' => ['data:image/png;base64,' . base64_encode('<script>alert(1)</script>')],
            'quote injection' => ['data:image/png;base64,AAAA" onerror="alert(1)'],
            'empty' => [''],
            'not base64' => ['data:image/png;base64,@@@@'],
        ];
    }

    public function test_rejects_an_oversized_image(): void
    {
        $this->expectException(InvalidArgumentException::class);
        SignatureImage::validate($this->pngDataUrl(str_repeat('x', SignatureImage::MAX_BYTES)));
    }
}
