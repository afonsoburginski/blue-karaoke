# Script para iniciar PostgreSQL via Docker

Write-Host "Iniciando PostgreSQL via Docker..." -ForegroundColor Cyan

# Verificar se o container já existe
$containerExists = docker ps -a --filter "name=postgres-blue-karaoke" --format "{{.Names}}" 2>$null

if ($containerExists -eq "postgres-blue-karaoke") {
    Write-Host "Container encontrado. Verificando status..." -ForegroundColor Yellow
    
    $containerRunning = docker ps --filter "name=postgres-blue-karaoke" --format "{{.Names}}" 2>$null
    
    if ($containerRunning -eq "postgres-blue-karaoke") {
        Write-Host "PostgreSQL ja esta rodando no Docker!" -ForegroundColor Green
    } else {
        Write-Host "Iniciando container..." -ForegroundColor Yellow
        docker start postgres-blue-karaoke
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Container iniciado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Erro ao iniciar container" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Criando novo container PostgreSQL..." -ForegroundColor Yellow
    docker run --name postgres-blue-karaoke `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=blue_karaoke `
        -p 5432:5432 `
        -d postgres:latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container criado e iniciado com sucesso!" -ForegroundColor Green
        Write-Host "Aguardando PostgreSQL inicializar..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Erro ao criar container. Verifique se o Docker Desktop esta rodando." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "PostgreSQL esta pronto!" -ForegroundColor Green
Write-Host "Agora execute:" -ForegroundColor Cyan
Write-Host "   bun run db:setup" -ForegroundColor White
Write-Host "   bun run db:migrate" -ForegroundColor White

