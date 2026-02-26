@echo off
echo ========================================
echo Smart Home AI - Quick Training Setup
echo ========================================
echo.

echo Step 1: Installing requirements...
pip install -r requirements.txt
echo.

echo Step 2: Generating training data (50,000 samples)...
python data_generator.py
echo.

echo Step 3: Training AI models...
python train_model.py
echo.

echo ========================================
echo Training Complete!
echo ========================================
echo.
echo Models saved in: models/
echo.
echo Next: Run 'python run_ai.py' to start the AI system
echo.
pause
