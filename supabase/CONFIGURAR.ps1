# Configura o Supabase do Dryve Hub: cria seu usuario administrador e envia a tabela de precos privada da Localiza.
# Rode DEPOIS de executar supabase/schema.sql no SQL Editor do Supabase.
# Uso (PowerShell, na pasta do projeto):   powershell -ExecutionPolicy Bypass -File supabase\CONFIGURAR.ps1
# As chaves sao digitadas na hora (ocultas), usadas so nesta janela e apagadas ao final. Nada e gravado em arquivo.
param([string]$Email = "pedro.castro@finxcapital.com.br")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Texto($s) { $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }

$url   = (Read-Host "Project URL do Supabase (ex.: https://abcd1234.supabase.co)").Trim().TrimEnd('/')
$chave = Read-Host "Chave service_role (SECRETA; Project Settings > API)" -AsSecureString
$senha = Read-Host "Senha inicial para $Email (minimo 10 caracteres)" -AsSecureString

$env:SUPABASE_URL = $url
$env:SUPABASE_SERVICE_ROLE_KEY = Texto $chave
$env:DRYVE_SENHA_ADMIN = Texto $senha
try {
    python tools/criar_usuario_supabase.py --email $Email --admin
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o usuario." }
    if (Test-Path "data/tabela-localiza.js") {
        python tools/enviar_tabela_supabase.py
        if ($LASTEXITCODE -ne 0) { throw "Falha ao enviar a tabela de precos." }
    } else {
        Write-Warning "data/tabela-localiza.js nao encontrado: a tabela de precos NAO foi enviada."
    }
    Write-Host "`nPronto. Entre no Hub com $Email e troque a senha pelo botao 'Trocar senha'." -ForegroundColor Green
}
finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:DRYVE_SENHA_ADMIN, Env:SUPABASE_URL -ErrorAction SilentlyContinue
}
