@echo off
title Xera Client Builder
echo.
echo ========================================
echo        Xera Client 1.7.2 Builder
echo ========================================
echo.

echo Building Xera Client...
echo.

call gradlew.bat build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    Build successful!
    echo    JAR located at: build\libs\
    echo ========================================
    echo.
    explorer build\libs
) else (
    echo.
    echo ========================================
    echo    Build failed! Check errors above.
    echo ========================================
)

pause
