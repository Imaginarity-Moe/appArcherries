@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM appArcherries - Deploy to IONOS via WinSCP
REM ------------------------------------------------------------
REM Vor dem ersten Lauf: .env.deploy.example zu .env.deploy kopieren
REM und FTP_HOST / FTP_USER / FTP_PASS / REMOTE_ROOT eintragen.
REM ============================================================

if not exist ".env.deploy" (
    echo [ERR] .env.deploy fehlt.
    echo Bitte ".env.deploy.example" zu ".env.deploy" kopieren und Werte eintragen.
    exit /b 1
)
call ".env.deploy"

if not defined FTP_HOST   ( echo [ERR] FTP_HOST nicht gesetzt   & exit /b 1 )
if not defined FTP_USER   ( echo [ERR] FTP_USER nicht gesetzt   & exit /b 1 )
if not defined FTP_PASS   ( echo [ERR] FTP_PASS nicht gesetzt   & exit /b 1 )
if not defined REMOTE_ROOT ( echo [ERR] REMOTE_ROOT nicht gesetzt & exit /b 1 )

set "WINSCP=C:\Program Files (x86)\WinSCP\WinSCP.com"
if not exist "%WINSCP%" set "WINSCP=C:\Program Files\WinSCP\WinSCP.com"
if not exist "%WINSCP%" (
    echo [ERR] WinSCP nicht gefunden. Bitte WinSCP installieren oder Pfad in deploy.bat anpassen.
    exit /b 1
)

echo.
echo === [1/3] Frontend bauen ===
call npm run build
if errorlevel 1 goto :err

echo.
echo === [2/3] PHP-Dependencies installieren ===
pushd api
where composer >nul 2>nul
if errorlevel 1 (
    echo [WARN] composer nicht im PATH. Versuche php composer.phar...
    if exist composer.phar (
        call php composer.phar install --no-dev --optimize-autoloader
    ) else (
        echo [ERR] composer fehlt und composer.phar nicht im api/-Ordner.
        popd
        goto :err
    )
) else (
    call composer install --no-dev --optimize-autoloader
)
if errorlevel 1 ( popd & goto :err )
popd

echo.
echo === [3/3] Sync per WinSCP ===
"%WINSCP%" /script=deploy.winscp ^
    /parameter ^
    //FTP_HOST="%FTP_HOST%" ^
    //FTP_USER="%FTP_USER%" ^
    //FTP_PASS="%FTP_PASS%" ^
    //REMOTE_ROOT="%REMOTE_ROOT%"
if errorlevel 1 goto :err

echo.
echo Deploy OK.
echo.
echo HINWEIS bei DB-Aenderungen: nach dem Deploy noch die Migration triggern:
echo   curl -X POST https://archerries.mossig.de/api/migrate.php -H "X-Migrate-Secret: ^<MIGRATE_SECRET^>"
echo.
exit /b 0

:err
echo.
echo *** Deploy fehlgeschlagen. ***
exit /b 1
