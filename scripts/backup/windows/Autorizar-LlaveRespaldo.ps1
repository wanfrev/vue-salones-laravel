<#
.SYNOPSIS
  Crea una llave SSH solo para los respaldos y la autoriza en el servidor (se hace UNA vez).

.DESCRIPTION
  Para que la PC descargue el respaldo sola, sin que nadie escriba la contraseña, necesita una llave.
  Esta llave queda limitada en el servidor a UNA sola cosa: generar y entregar el archivo del respaldo
  (la misma orden que usa Respaldo-Rapido.ps1). No abre una terminal, no reenvía puertos y no sirve
  para entrar ni cambiar nada. Si alguien le robara la llave a tu PC, lo máximo que podría hacer es
  descargar ese mismo respaldo.

  Pide la contraseña del servidor UNA vez (para instalar la llave). Es seguro repetirlo: reemplaza la
  línea anterior de esta llave y no toca las demás llaves que ya tenga el servidor.

  Uso:  powershell -ExecutionPolicy Bypass -File .\Autorizar-LlaveRespaldo.ps1
#>
[CmdletBinding()]
param(
  [string]$Server = 'lumasystem.online',
  [string]$User = 'root',
  [string]$KeyFile = (Join-Path $env:USERPROFILE '.ssh\luma_backup'),
  [string]$SshExe = 'ssh.exe'
)

$ErrorActionPreference = 'Stop'

# Lo que se envía al servidor es solo ASCII y sin marca BOM (con BOM, sshd ignoraría la llave sin avisar).
$OutputEncoding = New-Object System.Text.ASCIIEncoding

New-Item -ItemType Directory -Force -Path (Split-Path $KeyFile) | Out-Null
if (Test-Path $KeyFile) {
  Write-Host "Ya existe la llave $KeyFile; se reutiliza."
} else {
  Write-Host 'Creando la llave (sin contraseña, para que la tarea corra sola)...'
  & ssh-keygen.exe -t ed25519 -f $KeyFile -N '""' -C 'luma-backup-pc' | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$KeyFile.pub")) { throw 'No se pudo crear la llave SSH.' }
}

$pub = (Get-Content "$KeyFile.pub" -Raw).Trim()

# Lo ÚNICO que esta llave puede ejecutar en el servidor: armar el .tar.gz del respaldo y entregarlo.
$forced = 'cd /var/www/vue-salones-laravel/backend && tar -czhf - .env storage/app ' +
  '$(ls -t /var/backups/postgres/salones_2*.dump | head -1) ' +
  '$(ls -t /var/backups/postgres/evolution_db_2*.dump | head -1)'
$line = 'restrict,command="{0}" {1}' -f $forced, $pub

# En el servidor: quita la línea anterior de ESTA llave (si la hubo), agrega la nueva y deja los permisos
# que exige sshd. El `sed` descarta, por si llegaran, la marca BOM y el retorno de carro de Windows.
$remote = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && " +
  "{ grep -vF luma-backup-pc ~/.ssh/authorized_keys; sed -e '1s/^\xEF\xBB\xBF//' -e 's/\r$//'; } > ~/.ssh/ak.luma.tmp && " +
  "mv ~/.ssh/ak.luma.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo AUTORIZADA"

Write-Host "Instalando la llave en $User@$Server ... (escribe la contraseña del servidor cuando la pida)"
$result = $line | & $SshExe -o ConnectTimeout=20 "$User@$Server" $remote
if ($LASTEXITCODE -ne 0 -or ($result -notmatch 'AUTORIZADA')) { throw 'No se pudo instalar la llave en el servidor.' }

Write-Host ''
Write-Host 'LISTO: la llave quedó autorizada.' -ForegroundColor Green
Write-Host "  Llave privada: $KeyFile  (no la compartas; solo sirve para descargar el respaldo)"
Write-Host 'Siguiente paso:  powershell -ExecutionPolicy Bypass -File .\Programar-RespaldoDiario.ps1 -RunNow'
