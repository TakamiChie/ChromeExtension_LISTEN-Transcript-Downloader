$exe = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$prof = Join-Path $env:LOCALAPPDATA "LISTEN-E2E-Chrome"

$arguments = @(
  "--remote-debugging-port=9222"
  "--user-data-dir=$prof"
)

Start-Process -FilePath $exe -ArgumentList $arguments