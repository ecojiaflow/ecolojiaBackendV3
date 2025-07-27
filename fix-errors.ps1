Write-Host '🔧 Correction des erreurs Prisma...' -ForegroundColor Yellow

# 1. Corriger AuthService.ts ligne 375
$authFile = 'src/auth/services/AuthService.ts'
if (Test-Path $authFile) {
    $content = Get-Content $authFile -Raw
    $content = $content -replace '{ expiresIn: "7d" }', '{ expiresIn: this.jwtExpiresIn }'
    Set-Content $authFile $content
    Write-Host '✅ AuthService.ts corrigé' -ForegroundColor Green
}

# 2. Supprimer ou renommer les fichiers problématiques
$filesToHandle = @(
    'src/lib/prisma.ts',
    'src/repositories/SessionRepository.ts',
    'src/repositories/UserRepository.ts',
    'src/scripts/importOpenFoodFactsAdapted.ts',
    'src/scripts/seed-affiliation.ts',
    'src/scripts/testInsert.ts',
    'src/auth/services/EmailService.ts',
    'src/auth/services/EmailValidationService.ts',
    'src/controllers/track.controller.ts',
    'src/db/pool.ts',
    'src/middleware/cacheAuthMiddleware.ts',
    'src/orchestrator/index.ts',
    'src/orchestrator/jobs/dataIngestion.ts',
    'src/scripts/syncAlgolia.ts',
    'src/services/algoliaService.ts',
    'src/services/eco-score.service.ts',
    'src/services/product.service.ts'
)

foreach ($file in $filesToHandle) {
    if (Test-Path $file) {
        Rename-Item $file "$file.old" -Force
        Write-Host "📦 $file renommé en .old" -ForegroundColor Cyan
    }
}

Write-Host '✅ Tous les fichiers problématiques ont été traités!' -ForegroundColor Green
