for ($i=0; $i -lt 3; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "https://edutrack-api.onrender.com/health" -UseBasicParsing -TimeoutSec 5
    $status = $r.StatusCode
    Write-Output "Test ${i}: ${status}"
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Output "Test ${i}: ${code}"
  }
  Start-Sleep -Seconds 5
}
