#!/data/data/com.termux/files/usr/bin/bash
# Te.Co Pandawa POS - Termux Installer
# Install Termux dari F-Droid, bukan Play Store

echo "☕ Te.Co Pandawa POS - Termux Setup"
echo "===================================="

# Update packages
pkg update -y

# Install Python
pkg install python -y

# Create project directory
mkdir -p ~/teco-pos
cd ~/teco-pos

# Copy files (user harus copy pos_app_pwa.html ke sini manual)
echo ""
echo "📋 Langkah selanjutnya:"
echo "1. Copy file pos_app_pwa.html ke folder: ~/teco-pos/"
echo "2. Jalankan: cd ~/teco-pos && python server.py"
echo "3. Buka browser ke http://localhost:8080"
echo ""
echo "Untuk auto-start, tambahkan ke ~/.bashrc:"
echo "  cd ~/teco-pos && python server.py &"
