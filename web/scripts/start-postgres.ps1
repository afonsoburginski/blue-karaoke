# Script para iniciar PostgreSQL no Windows

Write-Host "Verificando PostgreSQL..." -ForegroundColor Cyan

# Verificar se o serviço PostgreSQL existe
$postgresService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue

if ($postgresService) {
    Write-Host "Servico PostgreSQL encontrado: $($postgresService.Name)" -ForegroundColor Green
    
    if ($postgresService.Status -eq "Running") {
        Write-Host "PostgreSQL ja esta rodando!" -ForegroundColor Green
    } else {
        Write-Host "Iniciando PostgreSQL..." -ForegroundColor Yellow
        try {
            Start-Service -Name $postgresService.Name
            Write-Host "PostgreSQL iniciado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro ao iniciar PostgreSQL: $_" -ForegroundColor Red
            Write-Host "Tente iniciar manualmente como Administrador" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Write-Host "Servico PostgreSQL nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Yellow
    Write-Host "   1. Instalar PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "   2. Usar Docker: docker run --name postgres-blue-karaoke -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blue_karaoke -p 5432:5432 -d postgres:latest" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Pronto! Agora voce pode executar:" -ForegroundColor Green
Write-Host "   bun run db:setup" -ForegroundColor Cyan
Write-Host "   bun run db:migrate" -ForegroundColor Cyan

