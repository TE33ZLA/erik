param([string]$Out=(Join-Path $PSScriptRoot 'results/laptop-usb-audit-current.json'))
$ErrorActionPreference='Stop'
$audit=[ordered]@{
  at_utc=[DateTime]::UtcNow.ToString('o')
  machine=Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model
  controllers=@(Get-PnpDevice -PresentOnly | Where-Object {$_.Class -in 'USB','USBDevice'} | Select-Object Class,FriendlyName,Status)
  drivers=@(Get-CimInstance Win32_SystemDriver | Where-Object {$_.Name -match '^(genericusbfn|Ufx|Urs|Ucm|Usb4)'} | Select-Object Name,State,StartMode)
  car_contact_requested=$false
  configuration_changed=$false
  execution=@{script_sha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();kit_manifest_sha256=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'kit-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant()}
}
$audit | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Out -Encoding UTF8
Write-Output "Read-only USB audit saved: $Out"
