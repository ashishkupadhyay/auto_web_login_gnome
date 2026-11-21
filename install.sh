#!/usr/bin/env bash
set -e

UUID="vit-portal-login@vit.ac.in"
TARGET_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "   VIT Portal Login Extension Installer for GNOME Shell   "
echo "=========================================================="
echo "Extension UUID : $UUID"
echo "Source Path    : $SCRIPT_DIR"
echo "Target Path    : $TARGET_DIR"
echo ""

# 1. Create target directory
echo "[1/4] Preparing extension directory..."
mkdir -p "$TARGET_DIR"

# 2. Copy files
echo "[2/4] Copying extension files..."
cp -r "$SCRIPT_DIR/metadata.json" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/extension.js" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/prefs.js" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/stylesheet.css" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/lib" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/icons" "$TARGET_DIR/"
cp -r "$SCRIPT_DIR/schemas" "$TARGET_DIR/"

# 3. Compile schemas
echo "[3/4] Compiling GSettings schemas..."
if command -v glib-compile-schemas &> /dev/null; then
    glib-compile-schemas "$TARGET_DIR/schemas"
    echo "      GSettings schemas successfully compiled."
else
    echo "      WARNING: glib-compile-schemas not found."
    echo "      Please install the GLib utilities package for your distro:"
    echo "        Fedora / RHEL : sudo dnf install glib2"
    echo "        Ubuntu / Debian: sudo apt install libglib2.0-bin"
    echo "        Arch Linux    : sudo pacman -S glib2"
    echo "        openSUSE      : sudo zypper install glib2-tools"
fi

# 4. Enable extension
echo "[4/4] Enabling GNOME Shell extension..."
if command -v gnome-extensions &> /dev/null; then
    gnome-extensions enable "$UUID" || true
    echo "      Extension enabled."
else
    echo "      gnome-extensions CLI not found. You can enable it via the Extensions app."
fi

echo ""
echo "=========================================================="
echo " Installation Complete!"
echo "=========================================================="
echo "Next steps:"
echo "1. On GNOME Wayland (default on most modern distros):"
echo "   Log out and log back in to reload GNOME Shell."
echo "2. On GNOME X11:"
echo "   Press Alt + F2, type 'r', and press Enter."
echo "3. Click the Wi-Fi icon in the top panel to enter your"
echo "   username and password on first launch."
echo "=========================================================="
