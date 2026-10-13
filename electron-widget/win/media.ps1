$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result
}
$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$mgr = Await ($mgrType::RequestAsync()) $mgrType

# Prefer a session that is actually playing, otherwise whatever Windows considers current.
function Get-ActiveSession {
  foreach ($s in $mgr.GetSessions()) {
    if ($s.GetPlaybackInfo().PlaybackStatus -eq 'Playing') { return $s }
  }
  return $mgr.GetCurrentSession()
}

$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType]
$streamExt = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IInputStream' } | Select-Object -First 1

function Get-Thumbnail($props) {
  try {
    if (-not $props.Thumbnail) { return '' }
    $stream = Await ($props.Thumbnail.OpenReadAsync()) $streamType
    $ms = New-Object System.IO.MemoryStream
    $streamExt.Invoke($null, @($stream)).CopyTo($ms)
    $b = $ms.ToArray()
    if ($b.Length -eq 0) { return '' }
    $mime = if ($b[0] -eq 0x89) { 'image/png' } else { 'image/jpeg' }
    return "data:$mime;base64,$([Convert]::ToBase64String($b))"
  } catch { return '' }
}

$lastKey = ''
while ($true) {
  try {
    $s = Get-ActiveSession
    if ($s) {
      $props = Await ($s.TryGetMediaPropertiesAsync()) $propsType
      $pb = $s.GetPlaybackInfo()
      $tl = $s.GetTimelineProperties()
      $key = "$($s.SourceAppUserModelId)|$($props.Title)|$($props.Artist)"
      $thumb = ''
      if ($key -ne $lastKey) { $thumb = Get-Thumbnail $props; $lastKey = $key }
      $obj = [ordered]@{
        type = 'nowPlaying'; key = $key; app = $s.SourceAppUserModelId
        title = $props.Title; artist = $props.Artist
        thumbnail = $thumb
        isPlaying = ($pb.PlaybackStatus -eq 'Playing')
        duration = $tl.EndTime.TotalSeconds - $tl.StartTime.TotalSeconds
        currentTime = $tl.Position.TotalSeconds
      }
      [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
      [Console]::Out.Flush()
    }
  } catch { }
  Start-Sleep -Milliseconds 1000
}
