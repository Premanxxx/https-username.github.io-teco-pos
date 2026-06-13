#!/usr/bin/env python3
"""
Te.Co POS - QR Code Generator
Generate QR code for easy sharing to Android devices
"""

try:
    import qrcode
    from PIL import Image
    HAS_QR = True
except ImportError:
    HAS_QR = False
    print("Install qrcode module: pip install qrcode[pil]")

def generate_qr(url, output_file="teco-pos-qr.png", logo_emoji="☕"):
    """Generate QR code with coffee logo"""
    if not HAS_QR:
        print("❌ qrcode module not installed")
        return

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Create image
    img = qr.make_image(fill_color="#D32F2F", back_color="white")

    # Save
    img.save(output_file)
    print(f"✅ QR Code saved: {output_file}")
    print(f"🔗 URL: {url}")
    print("
📱 Scan QR ini dengan HP Android untuk install!")

if __name__ == "__main__":
    # Ganti dengan URL GitHub Pages Anda
    YOUR_URL = "https://USERNAME.github.io/teco-pos"

    print("☕ Te.Co Pandawa POS - QR Code Generator")
    print("=" * 40)
    print(f"
URL default: {YOUR_URL}")
    print("
Ganti YOUR_URL dengan URL GitHub Pages Anda!")
    print("Contoh: https://temancoffee.github.io/teco-pos
")

    generate_qr(YOUR_URL)
