<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:50',
            'unit_cost' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_point' => 'nullable|numeric|min:0',
            'active' => 'boolean',
            'is_sellable' => 'boolean',
            'category_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ];
    }
}
