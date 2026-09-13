<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Bank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankController
{
    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    /**
     * Solo admin/superadmin puede gestionar la lista de bancos -- a diferencia de otras listas
     * de catalogo (categorias, servicios), esto es configuracion financiera del negocio, no algo
     * que un encargado de sucursal deba poder tocar. index() (leer la lista para elegir un banco
     * al cobrar) queda abierto a cualquier rol que pueda llegar a Punto de Venta.
     */
    private function ensureStrictAdmin(Request $request): bool
    {
        $role = $request->user()?->profile?->role;
        return in_array($role, ['admin', 'superadmin'], true);
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            Bank::where('business_id', $businessId)
                ->where('active', true)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        if (!$this->ensureStrictAdmin($request)) return response()->json(['error' => ['message' => 'No autorizado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $bank = Bank::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'business_id' => $businessId,
            'name' => $data['name'],
            'active' => true,
        ]);

        EntityChanged::safe($businessId, 'bank', 'created', $bank->id);
        return response()->json($bank, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        if (!$this->ensureStrictAdmin($request)) return response()->json(['error' => ['message' => 'No autorizado.']], 403);

        $bank = Bank::where('business_id', $businessId)->find($id);
        if (!$bank) return response()->json(['error' => ['message' => 'Banco no encontrado.']], 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'active' => 'sometimes|boolean',
        ]);

        $bank->update($data);
        EntityChanged::safe($businessId, 'bank', 'updated', $bank->id);
        return response()->json($bank);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        if (!$this->ensureStrictAdmin($request)) return response()->json(['error' => ['message' => 'No autorizado.']], 403);

        $bank = Bank::where('business_id', $businessId)->find($id);
        if (!$bank) return response()->json(['error' => ['message' => 'Banco no encontrado.']], 404);

        // Soft: se desactiva en vez de borrar, para no perder el nombre de bancos ya usados en
        // ventas historicas (el payments_breakdown de una transaccion guarda bank_name aparte,
        // pero mejor no dejar un bank_id huerfano apuntando a una fila que ya no existe).
        $bank->update(['active' => false]);
        EntityChanged::safe($businessId, 'bank', 'deleted', $bank->id);
        return response()->json(['success' => true]);
    }
}
