$exe = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profile = Join-Path $env:LOCALAPPDATA "LISTEN-E2E-Chrome"

$arguments = @(
  "--remote-debugging-port=9222"
  "--user-data-dir=$profile"
)

Start-Process -FilePath $exe -ArgumentList $arguments