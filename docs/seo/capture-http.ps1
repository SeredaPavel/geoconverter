param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('GeoConverter-SEO-Baseline/1.0')
$targets = [ordered]@{
    home = 'https://geoconverter.ru/'
    http = 'http://geoconverter.ru/'
    www = 'https://www.geoconverter.ru/'
    robots = 'https://geoconverter.ru/robots.txt'
    sitemap = 'https://geoconverter.ru/sitemap.xml'
    missing = 'https://geoconverter.ru/seo-audit-nonexistent-20261030'
    crs = 'https://geoconverter.ru/api/crs'
}

try {
    $results = foreach ($entry in $targets.GetEnumerator()) {
        $response = $null
        try {
            $response = $client.GetAsync($entry.Value).GetAwaiter().GetResult()
            $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $extension = if ($entry.Key -eq 'crs') { 'json' } else { 'html' }
            $filename = "$($entry.Key).$extension"
            [IO.File]::WriteAllText((Join-Path $OutputDirectory $filename), $body)
            [pscustomobject]@{
                name = $entry.Key
                url = $entry.Value
                captured_at_utc = [DateTime]::UtcNow.ToString('o')
                status = [int]$response.StatusCode
                location = [string]$response.Headers.Location
                content_type = [string]$response.Content.Headers.ContentType
                x_robots_tag = if ($response.Headers.Contains('X-Robots-Tag')) { $response.Headers.GetValues('X-Robots-Tag') -join ', ' } else { '' }
                title = @([regex]::Matches($body, '<title[^>]*>(.*?)</title>') | ForEach-Object { $_.Groups[1].Value })
                h1 = @([regex]::Matches($body, '<h1[^>]*>(.*?)</h1>') | ForEach-Object { $_.Groups[1].Value })
                seo_tags = @([regex]::Matches($body, '<(?:meta|link)\b[^>]*(?:description|canonical|robots|og:)[^>]*>') | ForEach-Object Value)
                body_file = $filename
            }
        }
        catch {
            [pscustomobject]@{ name = $entry.Key; url = $entry.Value; error = $_.Exception.Message }
        }
        finally {
            if ($null -ne $response) { $response.Dispose() }
        }
    }
    $results | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'http.json')
    $results | Select-Object name, status, location, error | Format-Table -AutoSize
    if (@($results | Where-Object { $_.PSObject.Properties.Name -contains 'error' }).Count -gt 0) {
        throw 'Some HTTP requests failed. See http.json.'
    }
}
finally {
    $client.Dispose()
    $handler.Dispose()
}
