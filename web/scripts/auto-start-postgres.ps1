# Script automático que tenta todas as opções para iniciar PostgreSQL

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Auto-Start PostgreSQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Tentativa 1: Verificar serviço PostgreSQL
Write-Host "[1/3] Verificando servico PostgreSQL..." -ForegroundColor Yellow
$postgresService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue

if ($postgresService) {
    if ($postgresService.Status -eq "Running") {
        Write-Host "SUCCESS: PostgreSQL ja esta rodando!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Tentando iniciar servico..." -ForegroundColor Yellow
        try {
            Start-Service -Name $postgresService.Name
            Write-Host "SUCCESS: Servico iniciado!" -ForegroundColor Green
            exit 0
        } catch {
            Write-Host "FALHOU: Nao foi possivel iniciar o servico" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Nenhum servico encontrado" -ForegroundColor Gray
}

# Tentativa 2: Verificar Docker
Write-Host ""
Write-Host "[2/3] Verificando Docker..." -ForegroundColor Yellow

$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker esta disponivel" -ForegroundColor Green
    
    # Verificar se container existe
    $containerExists = docker ps -a --filter "name=postgres-blue-karaoke" --format "{{.Names}}" 2>$null
    
    if ($containerExists -eq "postgres-blue-karaoke") {
        $containerRunning = docker ps --filter "name=postgres-blue-karaoke" --format "{{.Names}}" 2>$null
        if ($containerRunning -eq "postgres-blue-karaoke") {
            Write-Host "SUCCESS: Container Docker ja esta rodando!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Iniciando container existente..." -ForegroundColor Yellow
            docker start postgres-blue-karaoke 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "SUCCESS: Container iniciado!" -ForegroundColor Green
                Start-Sleep -Seconds 3
                exit 0
            }
        }
    } else {
        Write-Host "Criando novo container..." -ForegroundColor Yellow
        docker run --name postgres-blue-karaoke -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blue_karaoke -p 5432:5432 -d postgres:latest 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Container criado e iniciado!" -ForegroundColor Green
            Write-Host "Aguardando inicializacao..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            exit 0
        }
    }
} else {
    Write-Host "Docker nao esta disponivel ou Docker Desktop nao esta rodando" -ForegroundColor Red
}

# Tentativa 3: Informar usuário
Write-Host ""
Write-Host "[3/3] Nenhuma opcao automatica funcionou" -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, escolha uma das opcoes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Iniciar Docker Desktop e executar novamente este script" -ForegroundColor White
Write-Host "2. Instalar PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host "3. Ver guia completo: INICIAR_POSTGRES.md" -ForegroundColor White
Write-Host ""
exit 1

