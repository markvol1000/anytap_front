# deploy_amplify.ps1
# Automatically setup AWS Amplify app, custom rules, build project, and deploy via S3

$appName = "anytap-front-1"
$branchName = "main"
$region = "ap-northeast-2"
$bucketName = "anytap-front-deploy-bucket-274319534453"
$awsCli = "C:\PROGRA~1\Amazon\AWSCLIV2\aws.exe"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting AWS Amplify Setup & Deploy" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check or Create Amplify App
Write-Host "1. Checking if Amplify App '$appName' exists..."
$appId = (& $awsCli amplify list-apps --query "apps[?name=='$appName'].appId" --output text --region $region)

if ([string]::IsNullOrEmpty($appId) -or $appId -eq "None") {
    Write-Host "   Amplify App '$appName' not found. Creating a new one..." -ForegroundColor Yellow
    $appId = (& $awsCli amplify create-app --name $appName --platform WEB --query "app.appId" --output text --region $region)
    Write-Host "   Amplify App created! ID: $appId" -ForegroundColor Green
} else {
    Write-Host "   Amplify App '$appName' already exists. ID: $appId" -ForegroundColor Green
}

# 2. Check or Create Branch
Write-Host "2. Checking if '$branchName' branch exists..."
$branchExists = (& $awsCli amplify list-branches --app-id $appId --query "branches[?branchName=='$branchName'].branchName" --output text --region $region)

if ([string]::IsNullOrEmpty($branchExists) -or $branchExists -eq "None") {
    Write-Host "   Branch '$branchName' not found. Creating branch..." -ForegroundColor Yellow
    & $awsCli amplify create-branch --app-id $appId --branch-name $branchName --region $region | Out-Null
    Write-Host "   Branch '$branchName' created!" -ForegroundColor Green
} else {
    Write-Host "   Branch '$branchName' already exists." -ForegroundColor Green
}

# 3. Update Redirect & Proxy Rules (Vercel mappings)
Write-Host "3. Setting up Custom Rewrite/Redirect Rules (ALB API Proxy & SPA Routing)..."
$customRules = '[{"source":"/api/v1/<*>","target":"https://api.anytap.io/api/v1/<*>","status":"200"},{"source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|json|webmanifest|mp4|mov)$)([^.]+$)/>","target":"/index.html","status":"200"}]'
& $awsCli amplify update-app --app-id $appId --custom-rules $customRules --region $region | Out-Null
Write-Host "   Rules updated successfully!" -ForegroundColor Green

# 4. Build Frontend Project Locally
Write-Host "4. Building React project locally..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Local build failed! Aborting deployment."
    exit 1
}
Write-Host "   Local build completed successfully!" -ForegroundColor Green

# 5. Zip Build Directory
Write-Host "5. Archiving 'dist' directory into build.zip..."
if (Test-Path build.zip) { Remove-Item build.zip -Force }
Compress-Archive -Path dist\* -DestinationPath build.zip -Force
Write-Host "   Archive created!" -ForegroundColor Green

# 6. Upload Zip to S3
Write-Host "6. Uploading build.zip to S3..." -ForegroundColor Yellow
& $awsCli s3 cp build.zip s3://$bucketName/build.zip --region $region
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload to S3!"
    exit 1
}
Write-Host "   Upload complete!" -ForegroundColor Green

# 7. Generate S3 Presigned URL for deployment
Write-Host "7. Generating secure S3 presigned URL for deployment..."
$presignedUrl = (& $awsCli s3 presign s3://$bucketName/build.zip --expires-in 600 --region $region)
Write-Host "   Presigned URL generated!"

# 8. Start Deployment
Write-Host "8. Deploying to AWS Amplify branch '$branchName'..." -ForegroundColor Yellow
$jobId = (& $awsCli amplify start-deployment --app-id $appId --branch-name $branchName --source-url "$presignedUrl" --query "jobSummary.jobId" --output text --region $region)

if ([string]::IsNullOrEmpty($jobId) -or $jobId -eq "None") {
    Write-Error "Failed to trigger Amplify deployment!"
    exit 1
}
Write-Host "   Deployment triggered! Job ID: $jobId" -ForegroundColor Green

# 9. Wait & Monitor Deployment
Write-Host "9. Monitoring deployment status..."
$maxAttempts = 15
$attempt = 1
$deployed = $false

while ($attempt -le $maxAttempts) {
    $jobStatus = (& $awsCli amplify get-job --app-id $appId --branch-name $branchName --job-id $jobId --query "job.summary.status" --output text --region $region)
    Write-Host ("   Attempt {0} / {1}: Status is '{2}'" -f $attempt, $maxAttempts, $jobStatus)
    
    if ($jobStatus -eq "SUCCEEDED") {
        $deployed = $true
        break
    } elseif ($jobStatus -eq "FAILED") {
        Write-Error "Amplify deployment job failed!"
        exit 1
    }
    
    $attempt++
    Start-Sleep -Seconds 10
}

if (-not $deployed) {
    Write-Warning "Deployment monitoring timed out, but job might still be running."
}

# 10. Fetch default Domain URL
$defaultDomain = (& $awsCli amplify get-app --app-id $appId --query "app.defaultDomain" --output text --region $region)
$appUrl = "https://$branchName.$defaultDomain"

Write-Host "=============================================" -ForegroundColor Green
Write-Host " AWS Amplify Deployment Complete!" -ForegroundColor Green
Write-Host " App URL: $appUrl" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Clean up
if (Test-Path build.zip) { Remove-Item build.zip -Force }
