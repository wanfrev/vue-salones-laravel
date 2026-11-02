# Respaldos de Luma

Tres copias en lugares distintos, para sobrevivir a la pérdida del servidor.

| Copia | Dónde | Cuándo | Cifrada |
|---|---|---|---|
| 1 | Servidor, `/var/backups/postgres` (dumps sueltos, 14 días) | 03:00 diario | no, pero solo root la lee |
| 2 | Servidor, `/var/backups/luma-offsite` (paquete completo, 14 días) | 03:20 diario | sí (age) |
| 3 | **Tu PC**, `C:\Respaldos-Luma` (últimos 30 paquetes) | al encender la PC / 09:00 | sí (age) |

Una cuarta copia en la nube es recomendable (ver el final).

## Qué contiene el paquete `luma-AAAAMMDD_HHMMSS.tar.age`

- `db/salones.dump` y `db/evolution_db.dump`: producción y WhatsApp (staging no entra).
- `db/globals.sql`: roles de Postgres.
- `.env` del backend. **Contiene el `APP_KEY`: sin él, las notas y los adjuntos clínicos
  cifrados no se pueden recuperar aunque tengas la base completa.**
- `storage/app`: archivos subidos (adjuntos).
- `etc/nginx`, la configuración de endurecimiento de PHP y el crontab de root.

El cifrado usa **age** con la clave *pública* en el servidor. La clave *privada* solo existe en
tu PC (y en tus copias de seguridad de esa clave): si el servidor es comprometido, no puede leer
los paquetes anteriores.

---

## Instalación (una sola vez)

### A. En tu PC: la clave de cifrado

```powershell
winget install FiloSottile.age
# cierra y abre PowerShell para que reconozca el comando
age-keygen -o "$env:USERPROFILE\luma-backup-key.txt"
```

Imprime `Public key: age1...`: cópiala. **Guarda `luma-backup-key.txt` en al menos dos lugares
(USB y gestor de contraseñas). Si pierdes esa clave, los respaldos no sirven.** No la pongas en
OneDrive ni en el servidor. Activa BitLocker en el disco (`manage-bde -status C:` como
administrador): la PC guardará datos clínicos y financieros.

### B. En el servidor: endurecer y preparar

Hazlo después de desplegar este commit (los scripts quedan en
`/var/www/vue-salones-laravel/scripts/backup/server/`):

```bash
cd /var/www/vue-salones-laravel

# 1. Endurecer lo existente: los dumps eran legibles por cualquier usuario (incluido www-data)
chmod 700 /var/backups/postgres
chmod 600 /var/backups/postgres/*

# 2. Reemplazar el script diario por la versión endurecida (revisa la diferencia primero)
diff /usr/local/bin/backup-postgres.sh scripts/backup/server/backup-postgres.sh
install -m 750 scripts/backup/server/backup-postgres.sh /usr/local/bin/backup-postgres.sh

# 3. age y tu clave pública (la que imprimió age-keygen)
apt install -y age
mkdir -p /etc/luma-backup
echo "age1PEGA_AQUI_TU_CLAVE_PUBLICA" > /etc/luma-backup/recipients.txt

# 4. Usuario de solo lectura para que tu PC descargue
adduser --disabled-password --gecos "" lumabackup
mkdir -p /var/backups/luma-offsite
chown root:lumabackup /var/backups/luma-offsite
chmod 750 /var/backups/luma-offsite

# 5. Instalar los scripts nuevos
install -m 750 scripts/backup/server/luma-offsite-bundle.sh /usr/local/bin/
install -m 750 scripts/backup/server/restore-test.sh /usr/local/bin/

# 6. Primera corrida a mano (el 'MAX_DUMP_AGE_MIN' permite usar un dump de más de 4 horas)
MAX_DUMP_AGE_MIN=100000 /usr/local/bin/luma-offsite-bundle.sh
cat /var/backups/luma-offsite/STATUS        # debe empezar con OK
ls -lh /var/backups/luma-offsite

# 7. Programarlo a las 03:20 (el diario de las 03:00 se queda como está)
(crontab -l; echo "20 3 * * * /usr/local/bin/luma-offsite-bundle.sh") | crontab -
```

### C. La llave SSH con la que tu PC descarga

En tu PC:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\luma_backup" -N '""' -C "luma-backup-pc"
Get-Content "$env:USERPROFILE\.ssh\luma_backup.pub"
```

En el servidor, pegando esa línea pública:

```bash
install -d -m 700 -o lumabackup -g lumabackup /home/lumabackup/.ssh
echo 'restrict ssh-ed25519 AAAA...LLAVE_PUBLICA... luma-backup-pc' > /home/lumabackup/.ssh/authorized_keys
chown lumabackup:lumabackup /home/lumabackup/.ssh/authorized_keys
chmod 600 /home/lumabackup/.ssh/authorized_keys
```

Prueba desde tu PC (debe mostrar `OK ...`):

```powershell
ssh -i "$env:USERPROFILE\.ssh\luma_backup" lumabackup@lumasystem.online "cat /var/backups/luma-offsite/STATUS"
```

`restrict` desactiva reenvío de puertos y terminal. El usuario no tiene `sudo` y solo lee esa
carpeta, cuyos archivos además van cifrados. La llave de tu PC no lleva contraseña: protégela con
BitLocker.

### D. En tu PC: la tarea programada

Copia los scripts fuera de OneDrive para que la tarea no dependa de la sincronización:

```powershell
New-Item -ItemType Directory -Force C:\Luma-Backup, C:\Respaldos-Luma | Out-Null
Copy-Item .\scripts\backup\windows\*.ps1 C:\Luma-Backup\
powershell -ExecutionPolicy Bypass -File C:\Luma-Backup\Register-LumaBackupTask.ps1
Start-ScheduledTask -TaskName 'Luma - descargar respaldo'
Get-Content C:\Respaldos-Luma\pull.log -Tail 5
```

La tarea corre todos los días a las 09:00 **y** cada vez que inicias sesión. Si la PC estaba
apagada a esa hora, corre en cuanto se enciende.

---

## Cómo saber que funciona

- **En tu PC:** `C:\Respaldos-Luma\pull.log`. El script muestra una ventana de aviso si el
  servidor reporta fallo o si el último paquete tiene más de 30 horas.
- **En el servidor:** `cat /var/backups/luma-offsite/STATUS` (siempre `OK` con fecha de hoy) y
  `tail /var/backups/postgres/backup.log`.
- Si el servidor se cae del todo, la alarma es indirecta: tu PC avisa cuando pasan 30 horas sin
  respaldo nuevo.

## Prueba mensual (anótala en tu calendario)

Un respaldo que nunca se restauró no es una garantía. Hay dos pruebas, y las dos son necesarias.

**1. ¿Se puede restaurar la base?** En el servidor (no toca producción):

```bash
/usr/local/bin/restore-test.sh      # debe terminar con RESULTADO: OK
```

**2. ¿Funciona tu clave privada?** El servidor no puede comprobarlo, solo tu PC:

```powershell
$f = (Get-ChildItem C:\Respaldos-Luma\luma-*.tar.age | Sort-Object Name -Descending)[0].FullName
age -d -i "$env:USERPROFILE\luma-backup-key.txt" -o "$env:TEMP\luma.tar" $f
tar -tf "$env:TEMP\luma.tar" | Select-Object -First 15
Remove-Item "$env:TEMP\luma.tar"
```

Debe listar `db/salones.dump`, `.env`, `storage/app/...`, `etc/nginx/...`.

---

## Restaurar tras una catástrofe

1. **Servidor nuevo** con Ubuntu 24.04: nginx, PHP 8.4 (fpm, cli, pgsql, mbstring, xml, curl, gd,
   intl, zip, bcmath, redis), PostgreSQL, PgBouncer, Redis, Node y certbot.
2. **Descifrar en tu PC** y subirlo al servidor nuevo:

   ```powershell
   age -d -i "$env:USERPROFILE\luma-backup-key.txt" -o luma.tar C:\Respaldos-Luma\luma-XXXX.tar.age
   scp luma.tar root@SERVIDOR_NUEVO:/root/
   ```

3. **En el servidor nuevo:**

   ```bash
   cd /root && mkdir luma-restore && tar -xf luma.tar -C luma-restore && cd luma-restore
   sudo -u postgres psql -f db/globals.sql        # roles (ignora "already exists")
   sudo -u postgres createdb salones
   sudo -u postgres pg_restore -d salones --no-owner < db/salones.dump
   sudo -u postgres createdb evolution_db
   sudo -u postgres pg_restore -d evolution_db --no-owner < db/evolution_db.dump
   ```

4. **Código:** clona el repositorio en `/var/www/vue-salones-laravel`, copia `.env` y `storage/app`
   del paquete dentro de `backend/` (el `APP_KEY` tiene que ser **el mismo**), y compila:
   `composer install --no-dev`, `npm ci && npm run build` en `client/`, `php artisan config:cache`.
5. **Web:** copia `etc/nginx` del paquete, reemite certificados con `certbot`, restaura el
   crontab de `misc/root-crontab.txt`.
6. **Verifica:** inicia sesión y abre una nota clínica o un adjunto antiguo. Si se leen, el
   `APP_KEY` es el correcto.

Nunca restaures sobre una base en uso sin hacer antes un `pg_dump` de lo que hay.

---

## Lo que este esquema no cubre

- **Hasta 24 horas de datos:** lo ocurrido entre el último respaldo (03:00) y un desastre. Para
  reducirlo hace falta archivado continuo (WAL / pgBackRest), que es otro nivel de complejidad.
- **Staging:** se respalda en la carpeta del servidor, pero no entra en el paquete ni va a tu PC.
- **Redis (colas):** no se respalda; se reconstruye solo.
- **Una cuarta copia en la nube:** si tu PC y el servidor se pierden a la vez (robo, incendio), no
  queda nada. El paquete ya viene cifrado, así que puedes subirlo tal cual con `rclone` a un
  almacenamiento tipo Backblaze B2 o S3 (para ~1.5 GB cuesta centavos al mes):
  `rclone copy C:\Respaldos-Luma remoto:luma-respaldos --max-age 2d`. Sin configurar todavía.
