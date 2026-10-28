# Envia os videos dos carros (pasta no seu computador) para a biblioteca compartilhada do Hub (Supabase).
# ANTES: rode supabase/midias.sql no SQL Editor do Supabase (uma vez).
# Uso (PowerShell):   powershell -ExecutionPolicy Bypass -File "C:\Users\PedroCastro\Downloads\DryveHub-completa-com-videos\dryvehub-final\supabase\ENVIAR-VIDEOS.ps1"
# Pode rodar de novo: o que ja foi enviado (mesmo nome e tamanho) e pulado. A chave e pedida na hora, usada so nesta janela e apagada ao final.
param(
    [string]$Pasta = "C:\Users\PedroCastro\Downloads\VIDEOS -20261027T174608Z-1-001\CARROS- VIDEOS",
    [string]$Url = "https://ossattsjnveogfdjapuz.supabase.co",
    [switch]$SoTestar
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Test-Path -LiteralPath $Pasta)) { throw "Pasta nao encontrada: $Pasta" }

if ($SoTestar) {
    python tools/enviar_videos_supabase.py --dry-run --pasta "$Pasta"
    return
}

function Texto($s) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
$chave = Read-Host "Chave secreta do Supabase (Secret key / service_role)" -AsSecureString
$env:SUPABASE_URL = $Url.Trim().TrimEnd('/')
$env:SUPABASE_SERVICE_ROLE_KEY = Texto $chave
try {
    python tools/enviar_videos_supabase.py --pasta "$Pasta"
    if ($LASTEXITCODE -ne 0) { throw "Alguns videos falharam. Rode de novo: o que ja subiu e pulado." }
    Write-Host "`nPronto. Abra o Hub, entre na ficha de um carro e veja os videos para baixar." -ForegroundColor Green
}
finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL -ErrorAction SilentlyContinue
}
