# deploy_amplify_direct.ps1
# Direct upload manual deployment to AWS Amplify using create-deployment URL

$appId = "d1sw2k1utruvni"
$branchName = "prod"
$region = "ap-northeast-2"
$awsCli = "C:\PROGRA~1\Amazon\AWSCLIV2\aws.exe"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting Direct Amplify Deploy (No S3 Bucket)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Zip Build Directory Cleanly
Write-Host "1. Re-archiving 'dist' directory cleanly (folder included)..." -ForegroundColor Yellow
if (Test-Path build.zip) { Remove-Item build.zip -Force }
Compress-Archive -Path dist -DestinationPath build.zip -Force
Write-Host "   Archive build.zip created!" -ForegroundColor Green

# 2. Create Deployment Upload URL
Write-Host "2. Creating Amplify deployment upload URL..."
$deployInfo = (& $awsCli amplify create-deployment --app-id $appId --branch-name $branchName --region $region --output json | ConvertFrom-Json)
$uploadUrl = $deployInfo.zipUploadUrl
$jobId = $deployInfo.jobId

Write-Host "   Job ID: $jobId"
Write-Host "   Upload URL successfully retrieved!" -ForegroundColor Green

# 3. Upload Zip directly via PUT HTTP request using system curl
Write-Host "3. Uploading build.zip directly to Amplify deployment server using curl..." -ForegroundColor Yellow
$uploadResult = (& "C:\Windows\System32\curl.exe" -s -w "%{http_code}" -o temp-upload-response.txt -T build.zip -H "Content-Type: application/zip" "$uploadUrl")
if (Test-Path temp-upload-response.txt) { Remove-Item temp-upload-response.txt -Force }

if ($uploadResult -ne "200" -and $uploadResult -ne "201") {
    Write-Error "Upload failed with status code $uploadResult!"
    exit 1
}
Write-Host "   Upload complete! (HTTP $uploadResult)" -ForegroundColor Green

# 4. Start Deployment
Write-Host "4. Triggering Amplify start-deployment..." -ForegroundColor Yellow
$jobSummary = (& $awsCli amplify start-deployment --app-id $appId --branch-name $branchName --job-id $jobId --region $region --output json | ConvertFrom-Json)
Write-Host "   Deployment job triggered!" -ForegroundColor Green

# 5. Monitor Deployment Status
Write-Host "5. Monitoring deployment status..."
$maxAttempts = 15
$attempt = 1
$deployed = $false

while ($attempt -le $maxAttempts) {
    $jobStatus = (& $awsCli amplify get-job --app-id $appId --branch-name $branchName --job-id $jobId --query "job.summary.status" --output text --region $region)
    Write-Host ("   Attempt {0} / {1}: Status is '{2}'" -f $attempt, $maxAttempts, $jobStatus)
    
    if ($jobStatus -eq "SUCCEEDED" -or $jobStatus -eq "SUCCEED") {
        $deployed = $true
        break
    } elseif ($jobStatus -eq "FAILED") {
        Write-Error "Amplify deployment job failed!"
        exit 1
    }
    
    $attempt++
    Start-Sleep -Seconds 10
}

if ($deployed) {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " AWS Amplify Direct Deployment Succeeded!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
} else {
    Write-Warning "Deployment monitoring timed out."
}

# Clean up
if (Test-Path build.zip) { Remove-Item build.zip -Force }
