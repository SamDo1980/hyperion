$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$prefix = "http://127.0.0.1:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Start-Process ($prefix + 'OPEN_UI_FAST.html')
Write-Host "HYPERION preview is running at $prefix"
Write-Host "Close this window or press Ctrl+C to stop the preview server."
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml';
  '.xlsx'='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $urlPath = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = 'OPEN_UI_FAST.html' }
    $candidate = [IO.Path]::GetFullPath((Join-Path $root $urlPath))
    if (-not $candidate.StartsWith([IO.Path]::GetFullPath($root))) { $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue }
    if (Test-Path $candidate -PathType Container) { $candidate = Join-Path $candidate 'index.html' }
    if (-not (Test-Path $candidate -PathType Leaf)) { $ctx.Response.StatusCode = 404; $ctx.Response.Close(); continue }
    $ext = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($candidate)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $ctx.Response.Close()
  }
} finally { $listener.Stop(); $listener.Close() }
