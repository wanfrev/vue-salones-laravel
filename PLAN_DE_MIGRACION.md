# Plan de Migración: Supabase → Laravel

## Sistema de Gestión de Salones (Multi-tenant)

---

## Estado actual

| Capa | Supabase (origen) | Laravel (destino) |
|---|---|---|
| Frontend | Vue 3 SPA en `client/` | Se mantiene, apunta a Laravel API |
| Backend | Supabase (PostgREST + Auth + Edge Functions) | Laravel 13 + Sanctum |
| DB | PostgreSQL gestionado por Supabase | PostgreSQL gestionado por Laravel |
| Auth | Supabase Auth (JWT) | Sanctum (token-based) |
| Realtime | Supabase Realtime | Laravel ReVerb |
| Storage | Supabase Storage | Laravel Storage (local/S3) |

## Lo que ya está migrado

| Módulo | Controlador/Servicio | Estado |
|---|---|---|
| Auth (login/logout/session/refresh) | `AuthController` + `AuthService` | ✅ Completo |
| Negocios (show/update) | `BusinessController` | ✅ Completo |
| Sucursales CRUD | `BranchController` | ✅ Completo |
| Perfiles (empleados) CRUD | `ProfileController` | ✅ Parcial (sin schedules) |
| Pagos a empleados CRUD | `EmployeePaymentController` | ✅ Completo |
| Balance de empleado | `EmployeeBalanceController` | ✅ Completo |
| Comisiones de empleado | `EmployeeCommissionController` | ✅ Completo |
| Transacciones (read) | `TransactionController` | ✅ Listado |
| Resumen financiero | `FinancialSummaryController` | ✅ Completo |
| Superadmin CRUD | `SuperadminController` | ✅ Completo |
| Middleware PostgREST compat | `UnwrapApiData`, `ParseApiFilters` | ✅ Completo |
| Middleware superadmin | `EnsureSuperadmin` | ✅ Completo |
| Eventos Realtime | `EntityChanged` event | ✅ Parcial (2 controladores) |
| Recursos API | `AuthResource`, `BusinessResource`, `BranchResource` | ✅ Completo |
| Form Requests | `LoginRequest`, `StoreBranchRequest`, `CreateBusinessRequest` | ✅ 3 de ~20 |

---

## Fase 1: Migraciones de Base de Datos

Todas las tablas de dominio existen en Supabase PostgreSQL pero NO tienen migraciones Laravel. Hay que crearlas. Orden de creación (respetando FK):

### 1.1 Tablas base (sin FK a tablas operativas)

#### `create_businesses_table.php`
```php
Schema::create('businesses', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('name');
    $table->string('slug')->unique();
    $table->string('phone')->nullable();
    $table->text('address')->nullable();
    $table->string('timezone')->default('America/Santo_Domingo');
    $table->string('currency')->default('USD');
    $table->boolean('active')->default(true);
    $table->string('niche_type')->default('salon');
    $table->json('theme_config')->default('{"primary":"#2F4156","secondary":"#567CB0"}');
    $table->json('terminology')->default('{"client":"Cliente","employee":"Empleado","service":"Servicio"}');
    $table->decimal('ves_exchange_rate', 12, 4)->default(36.5000);
    $table->json('job_titles')->default('[]');
    $table->json('service_categories')->default('[]');
    $table->boolean('multi_branch_enabled')->default(false);
    $table->json('features')->default('{"pos":true,"inventario":true,"productos":true,"proveedores":true,"multi_branch":false}');
    $table->softDeletes();
    $table->timestamps();
});
```

#### `create_clients_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), full_name, phone, email (nullable), notes (nullable), birthday (date nullable), metadata (json), timestamps
// Unique: (business_id, phone)
```

#### `create_service_categories_table.php`
```php
// Columnas: id (uuid), business_id (FK), parent_id (FK nullable, self-ref), name, description (nullable), active (bool), metadata (json), timestamps
// Unique: (business_id, name)
```

#### `create_services_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), service_category_id (FK nullable), name, description (nullable), duration_minutes (int > 0), price (numeric(12,2) >= 0), local_percentage (numeric(5,2) default 50, 0-100), color (nullable), category (text default 'otros'), icon (nullable), active (bool default true), timestamps
```

#### `create_service_variants_table.php`
```php
// Columnas: id (uuid), business_id (FK), service_id (FK cascade), name, description (nullable), duration_minutes (nullable int), price (nullable numeric), active (bool), metadata (json), timestamps
// Unique: (service_id, name)
```

### 1.2 Tablas de perfil y empleados

#### `create_profiles_table.php`
```php
// Columnas: id (uuid PK, NO auto-increment — viene de users.id), business_id (FK nullable — superadmin tiene null), full_name, role (enum como string: superadmin|admin|empleado), phone (nullable), avatar_url (nullable), active (bool), job_title (nullable), pay_type (string default 'percentage'), pay_percentage (numeric(5,2) default 50, 0-100), base_salary (numeric(12,2) default 0), email (nullable), salary_frequency (nullable), employee_ves_rate (nullable numeric), disable_agenda (bool default false), timestamps
// Check: (role = 'superadmin' OR business_id IS NOT NULL)
```

#### `create_employee_schedules_table.php`
```php
// Columnas: id (uuid), employee_id (FK -> profiles), branch_id (FK nullable), weekday (smallint 0-6), start_time (time), end_time (time), timestamps (created_at only)
// Check: end_time > start_time
```

#### `create_employee_services_table.php`
```php
// Columnas: employee_id (FK -> profiles), service_id (FK -> services)
// PK compuesta: (employee_id, service_id)
```

#### `create_employee_absences_table.php`
```php
// Columnas: id (uuid), business_id (FK), employee_id (FK -> profiles), type (string: break|vacation|sick_leave|personal|blocked), starts_at (timestamptz), ends_at (timestamptz), reason (nullable), created_by (FK -> profiles nullable), timestamps
// Check: ends_at > starts_at
```

### 1.3 Tablas de citas y transacciones

#### `create_appointments_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), client_id (FK restrict), employee_id (FK restrict), service_id (FK restrict), assistant_employee_id (FK nullable), start_time (timestamptz), end_time (timestamptz), status (string default 'pending'), payment_status (string default 'unpaid'), service_notes (nullable), internal_notes (nullable), reminder_sent_at (nullable timestamptz), source (string default 'internal'), created_by (FK -> profiles nullable), group_id (uuid nullable), price_override (numeric nullable), employee_percentage_override (numeric nullable), assistant_percentage (numeric nullable), duration_override (int nullable), timestamps
// Check: end_time > start_time
// Índice exclusion para solapamiento de empleados
```

#### `create_appointment_services_table.php`
```php
// Columnas: id (uuid), appointment_id (FK cascade), service_id (FK restrict), employee_id (FK restrict), assistant_id (FK -> profiles nullable), assistant_percentage (numeric default 0), price_applied (numeric(12,2)), created_at
```

#### `create_transactions_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), appointment_id (FK restrict), total_amount (numeric(12,2) >= 0), local_amount (numeric(12,2) >= 0), employee_amount (numeric(12,2) >= 0), assistant_amount (numeric default 0), local_percentage (numeric(5,2) 0-100), employee_percentage (numeric(5,2) 0-100), assistant_percentage (numeric default 0), method (string default 'cash'), tip_amount (numeric nullable), payments_breakdown (json default '[]'), exchange_rate_used (numeric(12,4) default 1), paid_at (timestamptz), created_by (FK -> profiles nullable), notes (nullable text), timestamps
// Check: local_amount + employee_amount + assistant_amount = total_amount
// Check: local_percentage + employee_percentage + assistant_percentage = 100
```

### 1.4 Tablas de inventario

#### `create_product_categories_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), parent_id (FK nullable self-ref), name, description (nullable), active (bool), metadata (json), timestamps
// Unique: (business_id, name) — ajustar si multi-branch
```

#### `create_products_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), category_id (FK -> product_categories nullable), name, description (nullable), sku (nullable), barcode (nullable), unit (string default 'unit'), unit_cost (numeric(12,4) default 0 >= 0), unit_price (numeric(12,4) default 0 >= 0), reorder_point (numeric(12,4) default 0 >= 0), active (bool), is_sellable (bool default true), metadata (json), timestamps
// Unique: (business_id, name), (business_id, sku)
```

#### `create_product_variants_table.php`
```php
// Columnas: id (uuid), product_id (FK cascade), branch_id (FK nullable), name, sku (nullable), unit_cost (numeric(12,4) default 0), unit_price (numeric(12,4) default 0), metadata (json), active (bool), timestamps
// Unique: (product_id, name)
```

#### `create_inventory_locations_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), name, is_default (bool), active (bool), metadata (json), timestamps
// Unique: (business_id, name)
```

#### `create_inventory_stock_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), location_id (FK cascade), product_id (FK cascade), variant_id (FK nullable cascade), quantity (numeric(12,4) default 0 >= 0), reserved_qty (numeric(12,4) default 0 >= 0), updated_at
// Unique: (branch_id, location_id, product_id, variant_id)
```

#### `create_inventory_movements_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), location_id (FK cascade), product_id (FK cascade), variant_id (FK nullable cascade), movement_type (string), quantity (numeric(12,4) != 0), unit_cost (numeric(12,4) default 0), exchange_rate_used (numeric(12,4) default 1), reference_type (nullable), reference_id (uuid nullable), notes (nullable), created_by (FK -> profiles nullable), created_at
```

### 1.5 Tablas financieras y de proveedores

#### `create_expenses_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), name, category (string default 'general'), amount (numeric(12,2) >= 0), expense_date (date), currency (string default 'USD'), original_amount (numeric(12,2) default 0), exchange_rate_used (numeric(12,4) default 1), notes (nullable), created_by (FK -> profiles nullable), timestamps
```

#### `create_employee_payments_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), employee_id (FK -> profiles cascade), type (string default 'payment'), concept (nullable), amount (numeric(10,2) > 0), currency (string default 'USD'), original_amount (numeric(12,2) default 0), exchange_rate_used (numeric(12,4) default 1), method (string default 'cash'), notes (nullable text), payment_date (date), created_by (FK -> profiles nullable), timestamps
```

#### `create_suppliers_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), first_name, last_name, phone (nullable), company (nullable), total_debt (numeric(12,2) default 0 >= 0), debt_currency (string default 'USD'), debt_original_amount (numeric(12,2) default 0 >= 0), debt_exchange_rate (numeric(12,4) default 1 > 0), notes (nullable), active (bool), timestamps
```

#### `create_supplier_payments_table.php`
```php
// Columnas: id (uuid), business_id (FK), branch_id (FK nullable), supplier_id (FK cascade), amount (numeric(12,2) > 0), payment_method (string default 'cash'), payment_date (date), notes (nullable), created_by (FK -> profiles nullable), timestamps
```

### 1.6 Tablas de notificaciones

#### `create_notifications_table.php`
```php
// Columnas: id (uuid), business_id (FK), profile_id (FK cascade), type (string), title (string), message (text), appointment_id (FK -> appointments nullable), client_name (nullable), client_phone (nullable), service_name (nullable), appointment_time (nullable timestamptz), metadata (json default '{}'), is_read (bool default false), read_at (nullable timestamptz), created_at
```

### 1.7 Tablas auxiliares

#### `create_client_preferred_services_table.php`
```php
// Columnas: client_id (FK cascade), service_id (FK cascade), branch_id (FK nullable), created_at
// PK compuesta: (client_id, service_id)
```

---

## Fase 2: Services Layer

Extraer toda la lógica de negocio de los controladores. Cada servicio es una clase con sus dependencias inyectadas. Patrón:

```php
class XxxService
{
    public function __construct(
        private Xxx $model,
        private BusinessContext $context,  // business_id + branch_id
    ) {}

    public function list(?string $branchId): Collection;
    public function find(string $id): ?Xxx;
    public function store(array $data): Xxx;
    public function update(string $id, array $data): Xxx;
    public function delete(string $id): void;
}
```

### 2.1 Services a crear (por orden de dependencia)

| Orden | Service | Métodos clave | Notas |
|---|---|---|---|
| 1 | `BusinessService` | `show`, `update`, `getFeatures`, `getExchangeRate`, `updateExchangeRate` | Refactor de `BusinessController` |
| 2 | `BranchService` | `index`, `store`, `update`, `destroy`, `getDefault` | Refactor de `BranchController` |
| 3 | `ProfileService` | `index`, `store`, `update`, `destroy`, `assignsServices` | Refactor de `ProfileController` + manejo de schedules |
| 4 | `ClientService` | `index`, `store`, `update`, `destroy`, `search`, `findOrCreateByPhone`, `getHistory` | Agregar `searchClients` y `findOrCreateByPhone` |
| 5 | `ServiceService` | `index`, `store`, `update`, `destroy`, `listActive`, `renameCategory`, `deleteCategory` | Manejo de categorías en businesses JSON |
| 6 | `EmployeeScheduleService` | `index`, `store`, `update`, `destroy`, `getByEmployee` | |
| 7 | `AppointmentService` | `index`, `store`, `updateStatus`, `updateTime`, `destroy`, `groupMembers`, `getPendingPayments` | **Core del sistema** |
| 8 | `TransactionService` | `index`, `recordPayment`, `recordSale`, `updateTransaction`, `deleteTransaction` | Reemplaza `record_payment()`, `record_sale()`, `update_transaction()`, `delete_transaction()` |
| 9 | `EmployeePaymentService` | `index`, `store`, `update`, `destroy`, `getBalance`, `createConsumption` | Refactor de `EmployeePaymentController` |
| 10 | `EmployeeCommissionService` | `index`, `getBreakdown` | Refactor de `EmployeeCommissionController` |
| 11 | `FinancialSummaryService` | `summary`, `getKPIs`, `getTransactionsUnified` | Reemplaza `financial_summary()` |
| 12 | `ExpenseService` | `index`, `store`, `update`, `destroy` | |
| 13 | `ProductService` | `index`, `store`, `update`, `destroy`, `categories`, `deactivate` | |
| 14 | `InventoryService` | `index`, `movements`, `adjust`, `sellProduct`, `deleteProductSale`, `getDefaultLocation`, `getStockRecord`, `updateStockQuantity`, `insertStockRecord`, `recordMovement` | Lógica de stock + movimientos |
| 15 | `SupplierService` | `index`, `store`, `update`, `destroy`, `getBalance` | |
| 16 | `SupplierPaymentService` | `index`, `store`, `destroy` | |
| 17 | `NotificationService` | `index`, `markRead`, `markAllRead`, `dismiss`, `create` | |
| 18 | `PosService` | `pendingAppointments`, `saleableProducts`, `recordSale`, `recordPayment`, `markAppointmentsAsPaid` | Orquesta AppointmentService + TransactionService + InventoryService |
| 19 | `SuperadminService` | `businesses`, `store`, `update`, `destroy`, `suspend`, `resume`, `admins` | Refactor de `SuperadminController` |

### BusinessContext

Crear un helper para pasar business_id y branch_id a los services:

```php
class BusinessContext
{
    public function __construct(
        public readonly string $businessId,
        public readonly ?string $branchId = null,
        public readonly ?string $profileId = null,
        public readonly string $role = 'admin',
    ) {}
}
```

Se puede inyectar desde un middleware que lo resuelva del token Sanctum + request.

---

## Fase 3: Controladores faltantes + rutas API

### 3.1 Rutas completas

```php
// routes/api.php

/* ────────── AUTH ────────── */
POST   /api/auth/login                          → AuthController@login        (public)
POST   /api/auth/logout                         → AuthController@logout
GET    /api/auth/session                         → AuthController@session
POST   /api/auth/refresh                        → AuthController@refresh

/* ────────── BUSINESS ────────── */
GET    /api/businesses/{id}                      → BusinessController@show
PUT    /api/businesses/{id}                      → BusinessController@update

/* ────────── BRANCHES ────────── */
GET    /api/branches                             → BranchController@index
POST   /api/branches                             → BranchController@store
PUT    /api/branches/{id}                        → BranchController@update
DELETE /api/branches/{id}                        → BranchController@destroy

/* ────────── PROFILES / EMPLOYEES ────────── */
GET    /api/profiles                             → ProfileController@index
POST   /api/profiles                             → ProfileController@store
PUT    /api/profiles/{id}                        → ProfileController@update
DELETE /api/profiles/{id}                        → ProfileController@destroy

/* ────────── EMPLOYEE SCHEDULES ────────── */
GET    /api/employee-schedules                   → EmployeeScheduleController@index
POST   /api/employee-schedules                   → EmployeeScheduleController@store
PUT    /api/employee-schedules/{id}              → EmployeeScheduleController@update
DELETE /api/employee-schedules/{id}              → EmployeeScheduleController@destroy

/* ────────── SERVICES ────────── */
GET    /api/services                             → ServiceController@index
POST   /api/services                             → ServiceController@store
PUT    /api/services/{id}                        → ServiceController@update
DELETE /api/services/{id}                        → ServiceController@destroy
POST   /api/services/categories/rename           → ServiceController@renameCategory
DELETE /api/services/categories                  → ServiceController@deleteCategory

/* ────────── CLIENTS ────────── */
GET    /api/clients                              → ClientController@index
POST   /api/clients                              → ClientController@store
PUT    /api/clients/{id}                         → ClientController@update
DELETE /api/clients/{id}                         → ClientController@destroy
GET    /api/clients/search                       → ClientController@search
POST   /api/clients/find-or-create-by-phone      → ClientController@findOrCreateByPhone
GET    /api/clients/{id}/history                 → ClientController@history

/* ────────── APPOINTMENTS ────────── */
GET    /api/appointments                         → AppointmentController@index
POST   /api/appointments                         → AppointmentController@store
PUT    /api/appointments/{id}                    → AppointmentController@update
DELETE /api/appointments/{id}                    → AppointmentController@destroy
PATCH  /api/appointments/{id}/status             → AppointmentController@updateStatus
PATCH  /api/appointments/{id}/time               → AppointmentController@updateTime

/* ────────── TRANSACTIONS ────────── */
GET    /api/transactions                         → TransactionController@index
POST   /api/transactions                         → TransactionController@store (recordPayment)
PUT    /api/transactions/{id}                    → TransactionController@update (updateTransaction)
DELETE /api/transactions/{id}                    → TransactionController@destroy (deleteTransaction)

/* ────────── EMPLOYEE PAYMENTS ────────── */
GET    /api/employee-payments                    → EmployeePaymentController@index
POST   /api/employee-payments                    → EmployeePaymentController@store
PUT    /api/employee-payments/{id}               → EmployeePaymentController@update
DELETE /api/employee-payments/{id}               → EmployeePaymentController@destroy
GET    /api/employee-balance/{employeeId}        → EmployeeBalanceController@show
GET    /api/employee-commissions                 → EmployeeCommissionController@index

/* ────────── EXPENSES ────────── */
GET    /api/expenses                             → ExpenseController@index
POST   /api/expenses                             → ExpenseController@store
PUT    /api/expenses/{id}                        → ExpenseController@update
DELETE /api/expenses/{id}                        → ExpenseController@destroy

/* ────────── PRODUCTS ────────── */
GET    /api/products                             → ProductController@index
POST   /api/products                             → ProductController@store
PUT    /api/products/{id}                        → ProductController@update
DELETE /api/products/{id}                        → ProductController@destroy
GET    /api/products/categories                  → ProductCategoryController@index
POST   /api/products/categories                  → ProductCategoryController@store

/* ────────── INVENTORY ────────── */
GET    /api/inventory                            → InventoryController@index
GET    /api/inventory/movements                  → InventoryController@movements
POST   /api/inventory/adjust                     → InventoryController@adjust
POST   /api/inventory/sell                       → InventoryController@sell

/* ────────── SUPPLIERS ────────── */
GET    /api/suppliers                            → SupplierController@index
POST   /api/suppliers                            → SupplierController@store
PUT    /api/suppliers/{id}                       → SupplierController@update
DELETE /api/suppliers/{id}                       → SupplierController@destroy
GET    /api/suppliers/balance/{id}               → SupplierController@balance

/* ────────── SUPPLIER PAYMENTS ────────── */
GET    /api/supplier-payments                    → SupplierPaymentController@index
POST   /api/supplier-payments                    → SupplierPaymentController@store
DELETE /api/supplier-payments/{id}               → SupplierPaymentController@destroy

/* ────────── POS (Punto de Venta) ────────── */
GET    /api/pos/pending                          → PosController@pendingAppointments
GET    /api/pos/products                         → PosController@saleableProducts
POST   /api/pos/sale                             → PosController@recordSale
POST   /api/pos/payment                          → PosController@recordPayment
POST   /api/pos/mark-paid                        → PosController@markAppointmentsAsPaid

/* ────────── NOTIFICATIONS ────────── */
GET    /api/notifications                        → NotificationController@index
PATCH  /api/notifications/{id}/read              → NotificationController@markRead
PATCH  /api/notifications/read-all               → NotificationController@markAllRead
DELETE /api/notifications/{id}                   → NotificationController@dismiss

/* ────────── FINANCIAL ────────── */
POST   /api/rpc/financial-summary                → FinancialSummaryController (invokable)

/* ────────── SUPERADMIN ────────── */
GET    /api/admin/businesses                     → SuperadminController@businesses
POST   /api/admin/businesses                     → SuperadminController@store
PUT    /api/admin/businesses/{id}                → SuperadminController@update
DELETE /api/admin/businesses/{id}                → SuperadminController@destroy
POST   /api/admin/businesses/{id}/suspend        → SuperadminController@suspend
POST   /api/admin/businesses/{id}/resume         → SuperadminController@resume
GET    /api/admin/businesses/{id}/admins         → SuperadminController@admins
```

### 3.2 Form Requests a crear

```php
StoreClientRequest
UpdateClientRequest
StoreServiceRequest
UpdateServiceRequest
StoreProfileRequest
UpdateProfileRequest
StoreAppointmentRequest
UpdateAppointmentRequest
StoreExpenseRequest
UpdateExpenseRequest
StoreProductRequest
UpdateProductRequest
StoreInventoryAdjustRequest
StoreInventorySellRequest
StoreSupplierRequest
UpdateSupplierRequest
StoreSupplierPaymentRequest
RecordPaymentRequest
RecordSaleRequest
FindOrCreateClientRequest
RenameCategoryRequest
DeleteCategoryRequest
```

---

## Fase 4: Funciones críticas de Supabase → PHP

Estas son las funciones PostgreSQL que deben reescribirse como métodos de servicios PHP. Son el corazón del sistema.

### 4.1 `record_sale()` → `TransactionService::recordSale()`

```php
class TransactionService
{
    public function recordSale(
        string $appointmentId,
        float $amount,
        string $method = 'cash',
        array $products = [],
        ?string $notes = null,
        ?float $exchangeRate = null,
        array $paymentsBreakdown = [],
    ): string {
        // 1. Llamar recordPayment() interno (graba la transacción base)
        $txId = $this->recordPayment(
            appointmentId: $appointmentId,
            amount: $amount,
            method: $method,
            notes: $notes,
            exchangeRate: $exchangeRate,
            paymentsBreakdown: $paymentsBreakdown,
        );

        // 2. Si hay productos, procesar inventario
        if (!empty($products)) {
            $appointment = $this->appointment->findOrFail($appointmentId);
            $defaultLocation = $this->inventoryService->getDefaultLocation(
                $appointment->business_id,
                $appointment->branch_id,
            );

            foreach ($products as $product) {
                // Validar stock suficiente
                $stock = $this->inventoryService->getStockRecord(
                    businessId: $appointment->business_id,
                    productId: $product['product_id'],
                    locationId: $product['location_id'] ?? $defaultLocation,
                    variantId: $product['variant_id'] ?? null,
                    branchId: $appointment->branch_id,
                );

                if (!$stock || $stock->quantity < $product['quantity']) {
                    throw new \RuntimeException('Stock insuficiente');
                }

                // Decrementar stock
                $this->inventoryService->updateStockQuantity(
                    stockId: $stock->id,
                    newQuantity: $stock->quantity - $product['quantity'],
                );

                // Registrar movimiento
                $this->inventoryService->recordMovement(
                    businessId: $appointment->business_id,
                    locationId: $product['location_id'] ?? $defaultLocation,
                    productId: $product['product_id'],
                    variantId: $product['variant_id'] ?? null,
                    movementType: 'sale',
                    quantity: -$product['quantity'],
                    unitCost: $product['unit_cost'] ?? 0,
                    referenceType: 'appointment',
                    referenceId: $appointmentId,
                    notes: 'Venta punto de venta',
                    createdBy: auth()->id(),
                    branchId: $appointment->branch_id,
                );
            }
        }

        return $txId;
    }
}
```

### 4.2 `record_payment()` → con lógica de comisión

```php
public function recordPayment(
    string $appointmentId,
    float $amount,
    string $method = 'cash',
    ?string $notes = null,
    ?float $exchangeRate = null,
    array $paymentsBreakdown = [],
): string {
    $appointment = $this->appointment->findOrFail($appointmentId);
    $service = $appointment->service;
    $employeeProfile = $appointment->employeeProfile;

    // Precio efectivo (price_override > service.price)
    $effectivePrice = $appointment->price_override ?? $service->price;

    // Prioridad de comisión:
    // 1. employee_percentage_override de la cita
    // 2. pay_percentage del perfil del empleado
    // 3. 100 - local_percentage del servicio
    $assistantPct = $appointment->assistant_percentage ?? 0;
    $employeePct = $appointment->employee_percentage_override
        ?? $employeeProfile?->pay_percentage
        ?? (100 - $service->local_percentage);
    $localPct = 100 - $employeePct - $assistantPct;

    $assistantAmount = round($amount * $assistantPct / 100, 2);
    $employeeAmount  = round($amount * $employeePct / 100, 2);
    $localAmount     = round($amount - $employeeAmount - $assistantAmount, 2);

    $rate = $exchangeRate ?? $appointment->business->ves_exchange_rate;

    // Crear transacción
    $tx = $this->model->create([
        'business_id'          => $appointment->business_id,
        'appointment_id'       => $appointmentId,
        'total_amount'         => $amount,
        'local_amount'         => $localAmount,
        'employee_amount'      => $employeeAmount,
        'assistant_amount'     => $assistantAmount,
        'local_percentage'     => $localPct,
        'employee_percentage'  => $employeePct,
        'assistant_percentage' => $assistantPct,
        'method'               => $method,
        'exchange_rate_used'   => $rate,
        'payments_breakdown'   => $paymentsBreakdown,
        'created_by'           => auth()->id(),
        'notes'                => $notes,
        'branch_id'            => $appointment->branch_id,
    ]);

    // Calcular total pagado y actualizar payment_status
    $paidSoFar = $this->model
        ->where('appointment_id', $appointmentId)
        ->sum('total_amount');

    $paymentStatus = match (true) {
        $paidSoFar >= $effectivePrice => 'paid',
        $paidSoFar > 0                => 'partial',
        default                       => 'unpaid',
    };

    $appointment->update(['payment_status' => $paymentStatus]);

    return $tx->id;
}
```

### 4.3 `update_transaction()` → `TransactionService::updateTransaction()`

Actualiza monto/método/notas/tasa de cambio de una transacción. Recalcula local_amount, employee_amount, assistant_amount según los porcentajes guardados. Actualiza payment_status de la cita.

### 4.4 `delete_transaction()` → `TransactionService::deleteTransaction()`

Elimina transacción. Revierte stock si hay inventory_movements asociados. Actualiza payment_status de la cita.

### 4.5 `financial_summary()` → `FinancialSummaryService`

Unifica en una sola respuesta:
- Transacciones agrupadas por período (day/week/month)
- Gastos del período
- Pagos a empleados del período
- Ingresos por productos (inventory_movements tipo 'sale')
- Cálculo de ganancia neta
- Soporte para filtro por employee_id y branch_id

### 4.6 `delete_product_sale()` → `InventoryService::deleteProductSale()`

Revertir stock + eliminar movement record.

### 4.7 `get_low_stock_products()` → `InventoryService::getLowStockProducts()`

Query: productos donde `stock <= reorder_point`.

### 4.8 Edge Function `generate-reminders` → Console Command

```php
// app/Console/Commands/GenerateReminders.php
class GenerateReminders extends Command
{
    protected $signature = 'reminders:generate';
    protected $description = 'Generate appointment reminders for tomorrow';

    public function handle(): void
    {
        // Citas ~24h que no han recibido recordatorio
        // Crear notificaciones para cada empleado
        // Alertar citas impagas de 3+ días
    }
}
```

En `routes/console.php`:
```php
Schedule::command('reminders:generate')->dailyAt('08:00');
```

---

## Fase 5: Realtime con Laravel ReVerb

### 5.1 Disparar eventos desde todos los controladores

```php
event(new EntityChanged(
    businessId: $businessId,
    table: 'appointments',
    action: 'created',
    recordId: $appointment->id,
));
```

Agregar a TODOS los controladores de escritura. Ya existe en `ProfileController` y `EmployeePaymentController`.

### 5.2 Canal ReVerb

El evento `EntityChanged` ya está configurado para broadcast en canal `business.{businessId}`. El frontend se suscribe con Laravel Echo.

### 5.3 Vue frontend: reemplazar Supabase Realtime

En `client/src/composables/useRealtimeSync.ts`:
- Eliminar suscripción a Supabase Realtime
- Reemplazar con Laravel Echo:

```ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    },
})

echo.private(`business.${businessId}`)
    .listen('EntityChanged', (e: { table: string; action: string; recordId: string }) => {
        // Invalidar caché de TanStack Query según la tabla
        invalidateCacheForTable(e.table)
    })
```

---

## Fase 6: Frontend — Reconfiguración

### 6.1 Nuevo cliente API

Crear `client/src/lib/api.ts`:

```ts
import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token')
            window.location.href = '/'
        }
        return Promise.reject(error)
    },
)

export default api
```

### 6.2 Reemplazar servicios de Supabase (uno por uno)

Cada archivo en `services/` se reescribe para usar `api` en vez de `supabase`. Mantener la MISMA interfaz de funciones exportadas para que los composables no cambien.

Ejemplo (`clientesService.ts`):

```ts
// ANTES (Supabase)
export const listClientes = async (businessId: string, branchId?: string | null): Promise<Cliente[]> => {
    let query = supabase.from('clients').select('*').eq('business_id', businessId)
    if (branchId) query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(mapClientToCliente)
}

// DESPUÉS (Laravel API)
export const listClientes = async (businessId: string, branchId?: string | null): Promise<Cliente[]> => {
    const params: Record<string, string> = { business_id: businessId }
    if (branchId) params.branch_id = branchId
    const { data } = await api.get('/api/clients', { params })
    return (data?.data ?? []).map(mapClientToCliente)
}
```

### 6.3 Orden de reemplazo de servicios

| Orden | Servicio | Dependencias |
|---|---|---|
| 1 | `lib/api.ts` | Ninguna (nuevo archivo) |
| 2 | `store/auth.ts` | Auth endpoints |
| 3 | `store/business.ts` | Business + Branch endpoints |
| 4 | `services/clientesService.ts` | Client endpoints |
| 5 | `services/serviciosService.ts` | Service endpoints |
| 6 | `services/equipoService.ts` | Profile endpoints |
| 7 | `services/branchesService.ts` | Branch endpoints |
| 8 | `services/productosService.ts` | Product endpoints |
| 9 | `services/inventarioService.ts` | Inventory endpoints |
| 10 | `services/agendaService.ts` | Appointment endpoints |
| 11 | `services/posService.ts` | POS endpoints |
| 12 | `services/expensesService.ts` | Expense endpoints |
| 13 | `services/suppliersService.ts` | Supplier endpoints |
| 14 | `services/employeePaymentsService.ts` | Employee payment endpoints |
| 15 | `services/employeeDashboardService.ts` | Commission + balance endpoints |
| 16 | `services/notificationService.ts` | Notification endpoints |
| 17 | `services/superadminService.ts` | Superadmin endpoints |
| 18 | `services/adminService.ts` | Eliminar (usa manage-user edge function) |

### 6.4 Eliminar dependencias de Supabase

```bash
cd client
npm uninstall @supabase/supabase-js @supabase/realtime-js
npm install axios laravel-echo pusher-js
```

### 6.5 Archivos que se eliminan o quedan obsoletos

| Archivo | Acción |
|---|---|
| `client/src/lib/supabase.ts` | Eliminar |
| `client/src/lib/typedSupabase.ts` | Eliminar |
| `client/src/composables/useRealtimeSync.ts` | Reescribir con Echo |
| `client/src/composables/useAuth.ts` | Actualizar (usa api, no supabase.auth) |
| `supabase/` (directorio raíz) | Eliminar cuando ya no se necesite |
| `client/src/types/database.ts` | Eliminar (tipos generados de Supabase) |

---

## Fase 7: Testing

### 7.1 Tests de backend (Laravel/PHPUnit)

| Prioridad | Test | Archivo |
|---|---|---|
| 1 | Auth flow: login, logout, session, refresh | `AuthTest` |
| 2 | Aislamiento multi-tenant: usuario no ve datos de otro business | `MultiTenantTest` |
| 3 | CRUD Clientes: crear, leer, actualizar, eliminar, buscar | `ClientTest` |
| 4 | CRUD Servicios: incluyendo rename/delete categorías | `ServiceTest` |
| 5 | CRUD Empleados: perfiles, schedules, roles | `ProfileTest` |
| 6 | CRUD Sucursales | `BranchTest` |
| 7 | Citas: crear, actualizar estado, re-agendar, eliminar | `AppointmentTest` |
| 8 | Pagos: recordPayment con override de comisión | `TransactionTest` |
| 9 | POS: recordSale con productos + inventario | `PosTest` |
| 10 | Inventario: ajustar stock, vender, movimientos | `InventoryTest` |
| 11 | Resumen financiero: KPIs por período | `FinancialSummaryTest` |
| 12 | Superadmin: CRUD negocios, suspender, reanudar | `SuperadminTest` |
| 13 | Middleware: EnsureSuperadmin, ParseApiFilters | `MiddlewareTest` |
| 14 | Comisión de empleado: prioridad de override | `CommissionTest` |

### 7.2 Tests de frontend (Vitest — ya existen 104 tests)

Los tests existentes en `client/src/` prueban:
- Zod schemas (`validation.test.ts`)
- Mappers (`agendaMapper.test.ts`, `agendaMapper.assistant.test.ts`)
- Formateadores (`formatters.test.ts`)
- Manejo de errores (`errors.test.ts`)
- Currency notes (`currencyNotes.test.ts`)
- Cálculos de comisiones (`employeeEarnings.test.ts`)

**NO requieren cambios** porque prueban funciones puras sin dependencia de Supabase. Solo hay que asegurarse de que `npm run test` siga pasando después de los cambios.

---

## Fase 8: Seguridad y Middleware

### 8.1 Multi-tenant

Reemplazar Row-Level Security de PostgreSQL con middleware/filtros explícitos en Laravel:

```php
// Middleware opcional: SetBusinessContext
public function handle(Request $request, Closure $next)
{
    $businessId = $request->route('business_id')
        ?? $request->input('business_id')
        ?? $request->header('X-Business-ID')
        ?? $request->user()?->profile?->business_id;

    if ($businessId && !$request->user()?->profile?->isSuperadmin()) {
        // Verificar que el usuario pertenece a este business
        throw_unless(
            $request->user()->profile->business_id === $businessId ||
            $request->user()->profile->role === 'superadmin',
            AuthorizationException::class,
        );
    }

    app()->instance(BusinessContext::class, new BusinessContext(
        businessId: $businessId,
        branchId: $request->input('branch_id'),
    ));

    return $next($request);
}
```

### 8.2 Reglas de autorización por rol

```php
// app/Policies/AppointmentPolicy.php
public function view(User $user, Appointment $appointment): bool
{
    return $user->profile->isSuperadmin()
        || $user->profile->business_id === $appointment->business_id;
}

public function create(User $user): bool
{
    return $user->profile->isStaff();  // admin o empleado
}

public function update(User $user, Appointment $appointment): bool
{
    return $user->profile->isAdminOf($appointment->business_id)
        || ($user->profile->isEmployee() && $user->profile->id === $appointment->employee_id);
}
```

### 8.3 Roles (enum AppRole ya existe)

```php
enum AppRole: string
{
    case Superadmin = 'superadmin';
    case Admin = 'admin';
    case Empleado = 'empleado';

    public function isSuperadmin(): bool { return $this === self::Superadmin; }
    public function isAdmin(): bool { return $this === self::Admin; }
    public function isEmployee(): bool { return $this === self::Empleado; }
    public function isStaff(): bool { return $this !== self::Superadmin; }
}
```

---

## Orden de ejecución recomendado

| Paso | Fase | Duración estimada | Depende de |
|---|---|---|---|
| 1 | 1.1 Migraciones: businesses, clients, service_categories, services | 2h | Nada |
| 2 | 1.2 Migraciones: profiles, employee_schedules, employee_services, employee_absences | 2h | Paso 1 |
| 3 | 1.3 Migraciones: appointments, appointment_services, transactions | 2h | Pasos 1-2 |
| 4 | 1.4 Migraciones: product_categories, products, product_variants, inventory_locations, inventory_stock, inventory_movements | 2h | Paso 1 |
| 5 | 1.5 Migraciones: expenses, employee_payments, suppliers, supplier_payments | 1h | Pasos 1-2 |
| 6 | 1.6-1.7 Migraciones: notifications, client_preferred_services | 30min | Pasos 1-3 |
| 7 | 2.1-2.2 Services: BusinessService, BranchService, ProfileService, ClientService, ServiceService | 4h | Migraciones listas |
| 8 | 2.3 Services: AppointmentService, TransactionService (core) | 6h | Paso 7 |
| 9 | 3.1 Controladores: ServiceController, ClientController (CRUD básico) | 3h | Paso 7 |
| 10 | 3.2 Controladores: AppointmentController, TransactionController (citas + pagos) | 4h | Pasos 7-9 |
| 11 | 4.1-4.2 Funciones: recordPayment, recordSale (en TransactionService) | 4h | Paso 8 |
| 12 | 3.3 Controladores: PosController (depende de recordSale) | 3h | Paso 11 |
| 13 | 3.4 Form Requests para todos los controladores | 3h | Pasos 9-12 |
| 14 | 2.4 Services: restantes (ExpenseService, ProductService, InventoryService, SupplierService, etc.) | 6h | Paso 7 |
| 15 | 3.5 Controladores: ProductController, InventoryController, ExpenseController, SupplierController, SupplierPaymentController, NotificationController | 6h | Paso 14 |
| 16 | 4.3-4.6 Funciones: updateTransaction, deleteTransaction, financial_summary, delete_product_sale | 4h | Paso 11 |
| 17 | 4.7-4.8 Comando: GenerateReminders | 2h | Paso 15 |
| 18 | 5 Realtime: ReVerb entodo los controladores | 2h | Controladores listos |
| 19 | 6.1-6.2 Frontend: api.ts + reemplazar store/auth.ts y store/business.ts | 3h | API lista |
| 20 | 6.3 Frontend: reemplazar services/ uno por uno | 8h | API completa |
| 21 | 6.4-6.5 Frontend: limpiar dependencias Supabase | 1h | Paso 20 |
| 22 | 7 Tests: escribir tests Laravel + verificar tests frontend | 8h | Todo lo anterior |
| 23 | QA + correcciones | 8h | Todo lo anterior |

**Total estimado: ~80 horas de trabajo efectivo** (~2 semanas full-time, ~4 semanas part-time)

---

## Puntos críticos a recordar

### 1. `employee_percentage_override` (el bug más costoso)
Siempre usar `??` (null coalescing), nunca `||`:
```php
$pct = $appointment->employee_percentage_override
    ?? $employeeProfile?->pay_percentage
    ?? (100 - $service->local_percentage);
```
`0` es un valor VÁLIDO para `employee_percentage_override` (significa que el empleado no gana comisión en esa cita).

### 2. Multi-tenant: TODA query lleva `business_id`
```php
// MAL
Appointment::where('status', 'pending')->get();

// BIEN
Appointment::where('business_id', $businessId)
    ->where('status', 'pending')
    ->get();
```

### 3. Multi-branch: productos y categorías compartidos
Las tablas con `branch_id` nullable pueden tener registros compartidos (`branch_id IS NULL`) y específicos por sucursal. Las queries deben incluir ambos:
```php
$products = Product::where('business_id', $businessId)
    ->where(function ($q) use ($branchId) {
        $q->whereNull('branch_id')
          ->orWhere('branch_id', $branchId);
    })
    ->get();
```

### 4. Moneda dual: amounts SIEMPRE en USD
- `transactions.total_amount`, `expenses.amount`, `employee_payments.amount`, `suppliers.total_debt`: siempre en USD
- Si el pago fue en VES: guardar en `original_amount` + `currency = 'VES'` + `exchange_rate_used`
- Al mostrar: convertir USD a VES con `exchange_rate_used` (si currency='VES') o con `business.ves_exchange_rate`

### 5. Paginación PostgREST-style
El middleware `ParseApiFilters` traduce `?column=eq.value` a `where('column', 'value')`. El frontend usa estos parámetros extensivamente. Mantener compatibilidad.

### 6. `security definer` → middleware
Las funciones PostgreSQL con `security definer` se reemplazan con:
- Middleware de autorización en Laravel
- Filtros explícitos `where('business_id', ...)` en cada query
- Policies de Laravel para control de acceso por rol

### 7. Idempotencia en migraciones
```php
// Siempre verificar antes de crear
if (!Schema::hasTable('appointments')) {
    Schema::create('appointments', function (Blueprint $table) { ... });
}

// Para columnas
if (!Schema::hasColumn('appointments', 'branch_id')) {
    Schema::table('appointments', function (Blueprint $table) {
        $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
    });
}
```

### 8. Cache invalidation en el frontend
NUNCA usar `await` secuencial para invalidar queries. Siempre `Promise.allSettled([...])` para evitar congelar la UI.

### 9. La vista Finanzas une 4 fuentes de datos
El composable `useFinancialSummary` unifica: transacciones, pagos a empleados, gastos y ventas de productos. El endpoint `financial-summary` debe devolver todo unificado.

### 10. Las citas pueden tener múltiples servicios (appointment_services)
La tabla `appointment_services` es el pivot. El frontend envía `extraServices` en el form de cita. El backend debe:
- Crear/actualizar registros en `appointment_services`
- Distribuir el pago entre todos los servicios
- Calcular comisiones por cada servicio individual

### 11. `NULL != uuid` en comparaciones
En SQL usaban `is not distinct from`. En PHP/Laravel:
```php
// Para comparar donde variant_id puede ser NULL
$query->where(function ($q) use ($variantId) {
    if ($variantId === null) {
        $q->whereNull('variant_id');
    } else {
        $q->where('variant_id', $variantId);
    }
});
```

---

## Checklist de verificación por módulo

Antes de dar por terminado un módulo:

```
[ ] Migraciones escritas y ejecutables
[ ] Modelo Eloquent con relaciones y casts
[ ] Service con métodos CRUD + lógica de negocio
[ ] Controller con validación (Form Request)
[ ] Rutas API registradas
[ ] Evento EntityChanged dispatch en writes
[ ] Autorización (Policy o middleware)
[ ] Filtro business_id en TODAS las queries
[ ] Soporte multi-branch (branch_id nullable)
[ ] Frontend: servicio TS reescrito con api.ts
[ ] Frontend: composable actualizado (si cambió interfaz)
[ ] Tests: al menos happy path + error path
```

---

## Referencias

- Código fuente original (Supabase): `client/` + `supabase/`
- Schema DDL completo: `supabase/schema_ddl.sql`
- Migraciones completas: `supabase/scripts/01_all_migrations.sql`
- Modelo de datos: `DB_MODEL_FULL.md`
- Backend Laravel: `backend/`
