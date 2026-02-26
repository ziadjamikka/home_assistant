@echo off
cls
color 0A
echo ========================================
echo   Smart Home AI - Single Model Training
echo ========================================
echo.
echo This will:
echo   [1] Generate 50,000 training samples
echo   [2] Train ONE model for ALL devices
echo   [3] Test the model
echo.
echo ========================================
echo.

echo [1/3] Generating training data...
python data_generator.py
if errorlevel 1 (
    echo ERROR: Data generation failed!
    pause
    exit /b 1
)
echo ✓ Data generated!
timeout /t 2 /nobreak > nul

echo.
echo [2/3] Training SINGLE model...
python train_single_model.py
if errorlevel 1 (
    echo ERROR: Model training failed!
    pause
    exit /b 1
)
echo ✓ Model trained!
timeout /t 2 /nobreak > nul

echo.
echo [3/3] Testing model...
python example_usage.py
if errorlevel 1 (
    echo WARNING: Testing had issues
)

echo.
echo ========================================
echo   ✅ Setup Complete!
echo ========================================
echo.
echo Model saved: models/smart_home_model.pkl
echo.
echo Next step: Run START.bat to start the system
echo.
pause
