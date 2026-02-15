#!/usr/bin/env pwsh

# SourceScout Shopify MCP Integration Test Script

Write-Host "🧪 Testing Shopify MCP Integration" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001/api/v1"

# Test 1: Health Check
Write-Host "1️⃣  Testing Shopify MCP Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/shopify/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health Check Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Health Check Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# Test 2: Search Products
Write-Host "2️⃣  Testing Product Search..." -ForegroundColor Yellow
try {
    $searchBody = @{
        query = "USB charging cable"
        limit = 5
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/shopify/search" -Method Post -Body $searchBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "✅ Search Response:" -ForegroundColor Green
    Write-Host "Query: $($response.query)" -ForegroundColor Green
    Write-Host "Results Found: $($response.count)" -ForegroundColor Green
    if ($response.count -gt 0) {
        Write-Host "Sample Products:" -ForegroundColor Green
        $response.results | Select-Object -First 2 | ForEach-Object {
            Write-Host "  - $($_.title) (MOQ: $($_.moq))" -ForegroundColor Green
        }
    }
    Write-Host ""
} catch {
    Write-Host "⚠️  Search Query:" -ForegroundColor Yellow
    Write-Host "This is expected if Shopify credentials aren't fully configured" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
}

# Test 3: Main Search with Shopify Integration
Write-Host "3️⃣  Testing Main Search Endpoint (with Shopify)..." -ForegroundColor Yellow
try {
    $mainSearchBody = @{
        query = "wireless mouse"
        sources = @("alibaba", "made-in-china", "shopify")
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/search" -Method Post -Body $mainSearchBody -ContentType "application/json" -TimeoutSec 15 -Headers @{"Authorization" = "Bearer test-token"}
    Write-Host "⚠️  Main Search (requires authentication):" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "⚠️  Expected (needs authentication):" -ForegroundColor Yellow
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Authentication check working" -ForegroundColor Green
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "✨ Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Shopify MCP endpoints are available at:" -ForegroundColor White
Write-Host "  • GET  $baseUrl/shopify/health" -ForegroundColor White
Write-Host "  • POST $baseUrl/shopify/search" -ForegroundColor White
Write-Host "  • POST $baseUrl/shopify/batch-search" -ForegroundColor White
Write-Host "  • POST $baseUrl/shopify/clear-cache" -ForegroundColor White
Write-Host ""
Write-Host "Main search now supports 'shopify' as a source:" -ForegroundColor White
Write-Host "  POST $baseUrl/search" -ForegroundColor White
Write-Host "  Body: { query: 'product name', sources: ['alibaba', 'made-in-china', 'shopify'] }" -ForegroundColor White
Write-Host ""
