Write-Host "==> Staging all changes"
git add .

Write-Host "==> Resetting index to drop files now covered by .gitignore"
git rm -r --cached . 2>$null

Write-Host "==> Re-staging tracked files (respecting .gitignore)"
git add .

$commitMsg = "wired up resend auth flow and cleaned auth UI wiring"

Write-Host "==> Creating commit"
git commit -m "$commitMsg"

Write-Host "==> Pushing to origin on current branch"
$currentBranch = git rev-parse --abbrev-ref HEAD
git push origin $currentBranch

Write-Host "==> Done"
