# Sistema de Notificaciones - Guía de Implementación

## Resumen de Cambios Realizados

Se ha implementado un sistema completo de notificaciones con 5 tipos de recordatorios automáticos:

### 1. **Recordatorio de Stock Bajo** ✅
   - Notifica a administradores cuando productos caen por debajo del punto de reorden
   - Se ejecuta automáticamente en cada ciclo del generador de recordatorios

### 2. **Recordatorio de Cita 24 Horas Antes** ✅
   - Notifica al empleado y administradores 24 horas antes de cada cita
   - Incluye link de WhatsApp para contactar al cliente
   - Se envía automáticamente

### 3. **Recordatorio de Cita 1 Hora Antes** ✅
   - Notifica al empleado y administradores 1 hora antes de cada cita
   - Incluye link de WhatsApp para contactar al cliente
   - Se envía automáticamente

### 4. **Alertas de Citas sin Pagar** ✅
   - Notifica a administradores cuando una cita confirmada no ha sido pagada después de 24 horas
   - Ayuda a identificar pagos pendientes

### 5. **Recordatorio de Citas Pendientes (Configurable)** ✅ NUEVO
   - Notifica a administradores de todas las citas que aún no han sido confirmadas
   - **Hora configurable desde la sección de Notificaciones en Configuración**
   - Se ejecuta automáticamente todos los días a la hora especificada

---

## Archivos Modificados

### Backend (Laravel)

1. **`backend/database/migrations/2026_08_01_000000_add_reminder_fields_to_appointments.php`** (NUEVO)
   - Agrega campos: `reminder_1h_sent_at`, `pending_reminder_sent_at`
   - Permite rastrear qué recordatorios ya han sido enviados

2. **`backend/app/Models/Appointment.php`** (MODIFICADO)
   - Actualiza `$fillable` para incluir los nuevos campos de recordatorios

3. **`backend/app/Console/Commands/GenerateReminders.php`** (MODIFICADO)
   - Agrega lógica para recordatorio de 1 hora
   - Agrega lógica para notificaciones de citas pendientes (configurable por hora)
   - Mejora sistema de WhatsApp con generación de links
   - Actualiza logging para mostrar estadísticas de todos los tipos de recordatorios

4. **`backend/app/Services/WhatsAppService.php`** (MODIFICADO)
   - Nuevo método `generateWhatsAppLink()` que genera links para contactar clientes por WhatsApp
   - Formato: `https://wa.me/{numero}?text={mensaje}`

### Frontend (Vue)

1. **`client/src/views/Configuracion.vue`** (MODIFICADO)
   - Nueva sección "Notificaciones" solo para administradores
   - Toggle para activar/desactivar notificaciones de citas pendientes
   - Input de hora (0-23) para configurar cuándo recibir las notificaciones
   - Feedback visual del estado actual

2. **`client/src/services/notificationService.ts`** (MODIFICADO)
   - Agrega tipo de notificación `pending_appointments`

---

## Instrucciones de Instalación

### Paso 1: Ejecutar la Migración

Desde la raíz del proyecto, ejecutar:

```bash
cd backend
php artisan migrate
```

O si tienes alias:
```bash
make backend  # solo abre el servidor
```

### Paso 2: Verificar la Configuración del Comando

El comando `reminders:generate` debe ejecutarse automáticamente cada cierto tiempo. Verifica que esté configurado en tu scheduler o cron.

Para ejecutar manualmente:
```bash
php artisan reminders:generate
```

### Paso 3: Recargar el Frontend

No es necesario recompilar, pero si tienes servidor de desarrollo:
```bash
cd client
npm run dev
```

---

## Configuración por Negocio

### Desde la Interfaz

1. Ve a **Ajustes del Negocio → Notificaciones**
2. Activa/desactiva "Notificaciones de citas pendientes"
3. Selecciona la hora (0-23) en que deseas recibir las notificaciones
4. Los cambios se guardan automáticamente

### Desde la Base de Datos (si es necesario)

Las configuraciones se almacenan en la columna `features` (JSON) de la tabla `businesses`:

```json
{
  "pending_notifications_enabled": true,
  "pending_notifications_hour": 9,
  "other_features": "..."
}
```

---

## Flujo de Funcionamiento

### Recordatorios Automáticos

1. **Cada hora** el comando `reminders:generate` se ejecuta
2. **Busca citas** que cumplen con los criterios de cada tipo de recordatorio
3. **Crea notificaciones** en la base de datos para admins y empleados
4. **Envía mensajes WhatsApp** (si está configurado)
5. **Emite eventos** en tiempo real para actualizar el frontend
6. **Envía notificaciones push** a dispositivos suscritos

### Citas Pendientes (Específicamente)

- Se buscan citas con `status = 'pending'`
- Se ejecuta solo cuando la hora actual está dentro del rango de la hora configurada
- Solo se envía **una vez al día** (verifica `pending_reminder_sent_at`)
- Se resetea al día siguiente automáticamente

---

## Verificación

### Logs

Verifica los logs en `storage/logs/laravel.log` para confirmar que se están generando:

```bash
tail -f storage/logs/laravel.log | grep "reminders:generate"
```

### Base de Datos

Verifica que se estén creando notificaciones:

```sql
SELECT * FROM notifications 
WHERE type IN ('reminder', 'pending_appointments', 'low_stock', 'unpaid_alert')
ORDER BY created_at DESC
LIMIT 10;
```

Verifica que se actualicen los campos de recordatorios:

```sql
SELECT id, status, reminder_sent_at, reminder_1h_sent_at, pending_reminder_sent_at
FROM appointments
WHERE reminder_sent_at IS NOT NULL OR reminder_1h_sent_at IS NOT NULL
LIMIT 10;
```

---

## Troubleshooting

### Las notificaciones no se envían

1. ¿Está el comando `reminders:generate` programado? Verifica `app/Console/Kernel.php`
2. ¿Hay citas que cumplan los criterios? Verifica las fechas
3. ¿Hay administradores activos en el negocio? La notificación se envía a admins
4. Ejecuta manualmente: `php artisan reminders:generate`

### Los links de WhatsApp no se generan

1. Verifica que el cliente tenga número de teléfono
2. Verifica que WhatsApp esté habilitado en el negocio
3. Verifica que la instancia de WhatsApp esté configurada

### La notificación de citas pendientes no llega

1. ¿Está activada en Notificaciones?
2. ¿Está configurada la hora correctamente?
3. ¿Hay citas con status `pending`?
4. ¿Está dentro del rango de tiempo (±30 minutos de la hora configurada)?

---

## Variables de Entorno (si es necesario)

No se requieren nuevas variables de entorno. El sistema usa las existentes:
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` - para notificaciones push
- WhatsApp: configurado en panel de administrador

---

## Notas Importantes

1. **Rastreo de Recordatorios**: Los campos `reminder_sent_at`, `reminder_1h_sent_at` y `pending_reminder_sent_at` evitan que se envíen duplicados
2. **WhatsApp Links**: Son links directo a WhatsApp Web/App con el número del cliente
3. **Zona Horaria**: Asegúrate que tu servidor tenga la zona horaria correcta configurada
4. **Performance**: Si tienes muchas citas, considera ejecutar el comando en worker de background

---

## Cambios Futuros Posibles

- [ ] Personalizar templates de mensajes de recordatorios
- [ ] Historial de recordatorios enviados
- [ ] Reintento automático de WhatsApp fallidos
- [ ] SMS como alternativa a WhatsApp
- [ ] Notificaciones por email
- [ ] Recordatorios múltiples (ej: 24h, 12h, 1h)

---

## Soporte

Si encuentras problemas, revisa:
1. Los logs en `storage/logs/laravel.log`
2. La consola del navegador (F12)
3. Verifica que todas las migraciones estén ejecutadas: `php artisan migrate:status`
