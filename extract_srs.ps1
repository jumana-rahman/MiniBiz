Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("SRS.md")
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
if ($entry -ne $null) {
  $stream = $entry.Open()
  $reader = New-Object System.IO.StreamReader($stream)
  $xml = $reader.ReadToEnd()
  $reader.Close()
  $stream.Close()
  $text = $xml -replace '<[^>]+>', ' '
  $text = $text -replace '\s+', ' '
  if ($text.Length -gt 6000) { $text = $text.Substring(0,6000) }
  Write-Output $text
}
$zip.Dispose()
