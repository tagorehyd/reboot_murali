# ============================================================
# FraudShield — Complete One-Click Stack Launcher (PowerShell)
# ============================================================

$ErrorActionPreference = "Continue"

# 1. Environment PATH Setup
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:PATH = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin;C:\tools\apache-maven-3.9.16\bin;C:\Program Files\nodejs;$env:PATH"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                FRAUDSHIELD ONE-CLICK LAUNCHER              " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Helper function to check if a port is open/listening
function Test-PortListening ($port) {
    try {
        $con = New-Object System.Net.Sockets.TcpClient("localhost", $port)
        $con.Close()
        return $true
    } catch {
        return $false
    }
}

# 2. Check / Start MongoDB Service
Write-Host "[1/4] Checking MongoDB Service..." -ForegroundColor Yellow
$mongoListening = Test-PortListening 27017
if (-not $mongoListening) {
    Write-Host "  Starting MongoDB Windows Service..." -ForegroundColor Gray
    Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
Write-Host "  ✅ MongoDB is running on port 27017" -ForegroundColor Green

# 3. Start Python ML Microservice (Isolation Forest, Port 5001)
Write-Host "`n[2/4] Checking Isolation Forest ML Microservice (Port 5001)..." -ForegroundColor Yellow
if (Test-PortListening 5001) {
    Write-Host "  ✅ ML Microservice is already active on http://localhost:5001" -ForegroundColor Green
} else {
    Write-Host "  Starting ML Microservice..." -ForegroundColor Gray
    Start-Process -FilePath "python" -ArgumentList "ml-service/app.py" -WorkingDirectory "$PSScriptRoot" -NoNewWindow
    Start-Sleep -Seconds 3
    Write-Host "  ✅ ML Microservice started on http://localhost:5001" -ForegroundColor Green
}

# 4. Start Java Spring Boot Backend (Port 8080)
Write-Host "`n[3/4] Checking Java Spring Boot Backend (Port 8080)..." -ForegroundColor Yellow
if (Test-PortListening 8080) {
    Write-Host "  ✅ Backend is already active on http://localhost:8080" -ForegroundColor Green
} else {
    if (-not (Test-Path "$PSScriptRoot\Backend\target\fraudshield-backend-1.0.0.jar")) {
        Write-Host "  Building Backend JAR with Maven..." -ForegroundColor Gray
        mvn clean package -DskipTests -f "$PSScriptRoot\Backend\pom.xml"
    }
    Write-Host "  Starting Backend..." -ForegroundColor Gray
    Start-Process -FilePath "java" -ArgumentList "-jar", "$PSScriptRoot\Backend\target\fraudshield-backend-1.0.0.jar" -WorkingDirectory "$PSScriptRoot" -NoNewWindow
    Start-Sleep -Seconds 4
    Write-Host "  ✅ Backend started on http://localhost:8080" -ForegroundColor Green
}

# 5. Check / Start Local Ollama AI Server (Port 11434, Gemma 2)
Write-Host "`n[4/5] Checking Local Ollama AI Server (Port 11434)..." -ForegroundColor Yellow
if (Test-PortListening 11434) {
    Write-Host "  ✅ Local Ollama AI Server active on http://localhost:11434 (Gemma 2 Ready)" -ForegroundColor Green
} else {
    $ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue
    if ($ollamaCmd) {
        Write-Host "  Starting Local Ollama AI Server..." -ForegroundColor Gray
        Start-Process -FilePath "ollama" -ArgumentList "serve" -NoNewWindow
        Start-Sleep -Seconds 2
        Write-Host "  ✅ Ollama AI Server started on http://localhost:11434" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️ Ollama not installed locally — Chatbot using NVIDIA NIM Cloud API & DEMO_KNOWLEDGE_BASE fallback" -ForegroundColor Gray
    }
}

# 6. Start Vite React Frontend Dev Server (Port 5173)
Write-Host "`n[5/5] Checking Vite React Frontend Dev Server (Port 5173)..." -ForegroundColor Yellow
if (Test-PortListening 5173) {
    Write-Host "  ✅ Frontend is already active on http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "  Starting Frontend..." -ForegroundColor Gray
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\FrontEnd" -NoNewWindow
    Start-Sleep -Seconds 3
    Write-Host "  ✅ Frontend started on http://localhost:5173" -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "🎉 FraudShield Platform is fully booted up!" -ForegroundColor Green
Write-Host "  • Frontend Web Application: http://localhost:5173" -ForegroundColor White
Write-Host "  • Spring Boot Backend API:  http://localhost:8080" -ForegroundColor White
Write-Host "  • Isolation Forest ML:      http://localhost:5001" -ForegroundColor White
Write-Host "  • AI Assistant Chatbot:     NVIDIA NIM / Ollama Gemma 2 / Knowledge Base RAG" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

