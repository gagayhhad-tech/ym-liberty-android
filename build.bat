@echo off
chcp 65001 >nul
echo ========================================================
echo   YM Liberty Android - APK Builder
echo ========================================================

if not exist "android_app" (
    echo [ERROR] android_app directory not found!
    pause
    exit /b 1
)

echo [1/3] Building APK with Apktool...
java -jar apktool.jar b android_app -o YMLiberty_unsigned.apk
if %errorlevel% neq 0 (
    echo [ERROR] Apktool build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Signing APK with uber-apk-signer...
if exist "ymliberty.jks" (
    java -jar uber-apk-signer.jar -a YMLiberty_unsigned.apk --ks ymliberty.jks --ksAlias ymliberty --ksPass ymliberty123 --ksKeyPass ymliberty123 --overwrite
) else (
    java -jar uber-apk-signer.jar -a YMLiberty_unsigned.apk --overwrite
)

if %errorlevel% neq 0 (
    echo [ERROR] Signing failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Finalizing YMLiberty.apk...
copy /Y YMLiberty_unsigned.apk YMLiberty.apk >nul
echo.
echo [SUCCESS] APK built and signed successfully: YMLiberty.apk
echo ========================================================
