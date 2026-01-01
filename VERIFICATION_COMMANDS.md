# Verification Commands for SEO Deployment Fixes

## Quick Verification (After Deployment)

### 1. robots.txt
```bash
curl https://arena.dualmindlab.tech/robots.txt
```

**Expected Output:**
```
User-agent: *
Allow: /

Sitemap: https://arena.dualmindlab.tech/sitemap.xml
```

**Check Headers:**
```bash
curl -I https://arena.dualmindlab.tech/robots.txt
```

**Expected Headers:**
```
HTTP/2 200
content-type: text/plain; charset=utf-8
cache-control: public, max-age=86400
```

---

### 2. sitemap.xml
```bash
curl https://arena.dualmindlab.tech/sitemap.xml
```

**Expected Output (first few lines):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arena.dualmindlab.tech/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

**Check Headers:**
```bash
curl -I https://arena.dualmindlab.tech/sitemap.xml
```

**Expected Headers:**
```
HTTP/2 200
content-type: application/xml; charset=utf-8
cache-control: public, max-age=86400
```

---

### 3. Homepage Headers
```bash
curl -I https://arena.dualmindlab.tech/
```

**Expected Headers:**
```
HTTP/2 200
content-type: text/html; charset=utf-8
cache-control: public, max-age=300, must-revalidate
```

**Verify Content (No LMArena):**
```bash
curl https://arena.dualmindlab.tech/ | grep -i "lmarena"
```

**Expected:** No output (LMArena should not exist)

**Verify DualMind Arena exists:**
```bash
curl https://arena.dualmindlab.tech/ | grep -i "dual.*arena"
```

**Expected:** Multiple matches showing "DualMind Arena"

---

### 4. og-image.png
```bash
curl -I https://arena.dualmindlab.tech/og-image.png
```

**Expected Headers (temporary placeholder):**
```
HTTP/2 200
content-type: image/png
cache-control: public, max-age=86400
```

**Verify it's not 404:**
```bash
curl -I https://arena.dualmindlab.tech/og-image.png | head -1
```

**Expected:** `HTTP/2 200` (not `HTTP/2 404`)

---

## Full Verification Script

Save this as `verify-deployment.sh` and run:

```bash
#!/bin/bash

echo "=== Verifying SEO Deployment Fixes ==="
echo ""

echo "1. Checking robots.txt..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://arena.dualmindlab.tech/robots.txt)
if [ "$STATUS" = "200" ]; then
  echo "✅ robots.txt returns 200"
  curl -s https://arena.dualmindlab.tech/robots.txt | grep -q "Sitemap:" && echo "✅ robots.txt includes Sitemap directive" || echo "❌ robots.txt missing Sitemap"
else
  echo "❌ robots.txt returns $STATUS"
fi
echo ""

echo "2. Checking sitemap.xml..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://arena.dualmindlab.tech/sitemap.xml)
if [ "$STATUS" = "200" ]; then
  echo "✅ sitemap.xml returns 200"
  curl -s https://arena.dualmindlab.tech/sitemap.xml | grep -q "<?xml" && echo "✅ sitemap.xml is valid XML" || echo "❌ sitemap.xml invalid"
else
  echo "❌ sitemap.xml returns $STATUS"
fi
echo ""

echo "3. Checking homepage..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://arena.dualmindlab.tech/)
if [ "$STATUS" = "200" ]; then
  echo "✅ Homepage returns 200"
  curl -s https://arena.dualmindlab.tech/ | grep -qi "LMArena" && echo "❌ Homepage still contains LMArena" || echo "✅ Homepage does not contain LMArena"
  curl -s https://arena.dualmindlab.tech/ | grep -qi "DualMind Arena" && echo "✅ Homepage contains DualMind Arena" || echo "❌ Homepage missing DualMind Arena"
else
  echo "❌ Homepage returns $STATUS"
fi
echo ""

echo "4. Checking og-image.png..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://arena.dualmindlab.tech/og-image.png)
if [ "$STATUS" = "200" ]; then
  echo "✅ og-image.png returns 200"
else
  echo "❌ og-image.png returns $STATUS"
fi
echo ""

echo "=== Verification Complete ==="
```

**PowerShell Version (for Windows):**
```powershell
Write-Host "=== Verifying SEO Deployment Fixes ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Checking robots.txt..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "https://arena.dualmindlab.tech/robots.txt" -UseBasicParsing
if ($response.StatusCode -eq 200) {
    Write-Host "✅ robots.txt returns 200" -ForegroundColor Green
    if ($response.Content -match "Sitemap:") {
        Write-Host "✅ robots.txt includes Sitemap directive" -ForegroundColor Green
    } else {
        Write-Host "❌ robots.txt missing Sitemap" -ForegroundColor Red
    }
} else {
    Write-Host "❌ robots.txt returns $($response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

Write-Host "2. Checking sitemap.xml..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "https://arena.dualmindlab.tech/sitemap.xml" -UseBasicParsing
if ($response.StatusCode -eq 200) {
    Write-Host "✅ sitemap.xml returns 200" -ForegroundColor Green
    if ($response.Content -match '<?xml') {
        Write-Host "✅ sitemap.xml is valid XML" -ForegroundColor Green
    } else {
        Write-Host "❌ sitemap.xml invalid" -ForegroundColor Red
    }
} else {
    Write-Host "❌ sitemap.xml returns $($response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

Write-Host "3. Checking homepage..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "https://arena.dualmindlab.tech/" -UseBasicParsing
if ($response.StatusCode -eq 200) {
    Write-Host "✅ Homepage returns 200" -ForegroundColor Green
    if ($response.Content -match "LMArena") {
        Write-Host "❌ Homepage still contains LMArena" -ForegroundColor Red
    } else {
        Write-Host "✅ Homepage does not contain LMArena" -ForegroundColor Green
    }
    if ($response.Content -match "DualMind Arena") {
        Write-Host "✅ Homepage contains DualMind Arena" -ForegroundColor Green
    } else {
        Write-Host "❌ Homepage missing DualMind Arena" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Homepage returns $($response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

Write-Host "4. Checking og-image.png..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://arena.dualmindlab.tech/og-image.png" -UseBasicParsing -Method Head
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ og-image.png returns 200" -ForegroundColor Green
    } else {
        Write-Host "❌ og-image.png returns $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ og-image.png error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
```

---

## Expected Results Summary

| URL | Status Code | Content-Type | Key Content |
|-----|------------|--------------|-------------|
| `/robots.txt` | 200 | `text/plain; charset=utf-8` | Includes `Sitemap:` directive |
| `/sitemap.xml` | 200 | `application/xml; charset=utf-8` | Valid XML with 7 URLs |
| `/` | 200 | `text/html; charset=utf-8` | Contains "DualMind Arena", no "LMArena" |
| `/og-image.png` | 200 | `image/png` | Placeholder image (1x1 transparent PNG) |

---

## Troubleshooting

If any verification fails:

1. **Check deployment status:**
   ```bash
   npx wrangler deployments list
   ```

2. **Purge Cloudflare cache:**
   - Go to Cloudflare Dashboard → Caching → Purge Everything
   - Or use Custom Purge for specific URLs

3. **Check worker logs:**
   ```bash
   npx wrangler tail
   ```

4. **Redeploy if needed:**
   ```bash
   npx wrangler deploy
   ```

