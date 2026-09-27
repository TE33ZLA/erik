$ErrorActionPreference='Stop'
$bridgeFramework=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$bridgeRefs=@('System.Runtime.dll','System.Runtime.WindowsRuntime.dll','System.Runtime.InteropServices.WindowsRuntime.dll','System.Windows.Forms.dll','System.Drawing.dll','System.Web.Extensions.dll') | ForEach-Object {Join-Path $bridgeFramework $_}
$bridgeRefs+=@('Windows.Foundation.winmd','Windows.Media.winmd','Windows.Storage.winmd','Windows.Devices.winmd') | ForEach-Object {Join-Path (Join-Path $env:WINDIR 'System32/WinMetadata') $_}
$bridgeArgs=@('/nologo','/codepage:65001','/target:exe','/platform:x64',('/out:'+(Join-Path $PSScriptRoot 'VehicleMediaBridge.exe'))) + @($bridgeRefs | ForEach-Object {'/reference:'+$_}) + @('BridgeProtocol.cs','ProtocolTests.cs','MediaBridge.cs','GuidedVisit.cs' | ForEach-Object {Join-Path $PSScriptRoot $_})
& (Join-Path $bridgeFramework 'csc.exe') @bridgeArgs
if($LASTEXITCODE -ne 0){throw 'Media Bridge compilation failed'}
$bridgeGuiArgs=$bridgeArgs | ForEach-Object {if($_ -eq '/target:exe'){'/target:winexe'}elseif($_.StartsWith('/out:')){'/out:'+(Join-Path $PSScriptRoot 'Media Bridge.exe')}else{$_}}
& (Join-Path $bridgeFramework 'csc.exe') @bridgeGuiArgs
if($LASTEXITCODE -ne 0){throw 'Media Bridge window compilation failed'}
$bridgeManifest=[ordered]@{}
Get-ChildItem -LiteralPath $PSScriptRoot -File | Where-Object {$_.Extension -in '.exe','.cs','.py','.ps1' -or $_.Name -in 'runtime-path.txt','private-target.json'} | Sort-Object Name | ForEach-Object {$bridgeManifest[$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'transport') -File -Filter '*.py' | Sort-Object Name | ForEach-Object {$bridgeManifest['transport/'+$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
$bridgeManifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'kit-manifest.json') -Encoding UTF8
