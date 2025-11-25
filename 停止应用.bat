@echo off
chcp 65001 >nul
echo ========================================
echo    停止 EchoLoop 应用
echo ========================================
echo.

echo 正在查找占用端口 3000 的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 找到进程 ID: %%a
    echo 正在停止进程...
    taskkill /PID %%a /F >nul 2>&1
    if errorlevel 1 (
        echo 停止进程失败，可能需要管理员权限
    ) else (
        echo 应用已成功停止！
    )
    goto :found
)

echo 未找到运行中的应用
:found
echo.
pause

