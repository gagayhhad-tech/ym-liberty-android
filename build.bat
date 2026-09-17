@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================================
echo   YM Liberty Android - APK Builder
echo ========================================================

if not exist "android_app" (
    echo [ERROR] android_app directory not found!
    pause
    exit /b 1
)

rem ---------------------------------------------------------------------------
rem  Release signing credentials
rem
rem  The keystore password is NOT stored in this script: it must come from the
rem  environment. The old hardcoded password was published in this file's git
rem  history, so it was rotated.
rem
rem  Set it for the current session:
rem      set YMLIBERTY_KSPASS=your-password
rem  or persist it for your user account:
rem      setx YMLIBERTY_KSPASS "your-password"
rem
rem  Optional overrides: YMLIBERTY_KSFILE, YMLIBERTY_KSALIAS
rem ---------------------------------------------------------------------------
if not defined YMLIBERTY_KSFILE set "YMLIBERTY_KSFILE=ymliberty.jks"
if not defined YMLIBERTY_KSALIAS set "YMLIBERTY_KSALIAS=ymliberty"

echo [1/3] Building APK with Apktool...
java -jar apktool.jar b android_app -o YMLiberty_unsigned.apk
if %errorlevel% neq 0 (
    echo [ERROR] Apktool build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Signing APK with uber-apk-signer...

if not exist "%YMLIBERTY_KSFILE%" (
    echo [WARNING] Release keystore not found: %YMLIBERTY_KSFILE%
    echo [WARNING] Falling back to a DEBUG signature.
    echo [WARNING] Debug-signed builds CANNOT update an existing release install.
    java -jar uber-apk-signer.jar -a YMLiberty_unsigned.apk --overwrite
    if %errorlevel% neq 0 (
        echo [ERROR] Signing failed!
        pause
        exit /b %errorlevel%
    )
    goto :finalize
)

if not defined YMLIBERTY_KSPASS (
    echo [ERROR] Environment variable YMLIBERTY_KSPASS is not set.
    echo         It holds the password for %YMLIBERTY_KSFILE%.
    echo         Set it with:  set YMLIBERTY_KSPASS=your-password
    echo         or persist it: setx YMLIBERTY_KSPASS "your-password"
    echo         See KEYSTORE-CREDENTIALS.local.txt for the local value.
    pause
    exit /b 1
)

java -jar uber-apk-signer.jar -a YMLiberty_unsigned.apk --ks "%YMLIBERTY_KSFILE%" --ksAlias "%YMLIBERTY_KSALIAS%" --ksPass "%YMLIBERTY_KSPASS%" --ksKeyPass "%YMLIBERTY_KSPASS%" --overwrite
if %errorlevel% neq 0 (
    echo [ERROR] Signing failed! Check that YMLIBERTY_KSPASS matches %YMLIBERTY_KSFILE%.
    pause
    exit /b %errorlevel%
)

rem Refuse to ship a debug-signed APK by accident.
findstr /C:"Android Debug" YMLiberty_unsigned.apk >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARNING] APK appears to carry a DEBUG signature. Verify before release.
)

:finalize
echo.
echo [3/3] Finalizing YMLiberty.apk...
copy /Y YMLiberty_unsigned.apk YMLiberty.apk >nul
echo.
echo [SUCCESS] APK built and signed successfully: YMLiberty.apk
echo ========================================================
endlocal