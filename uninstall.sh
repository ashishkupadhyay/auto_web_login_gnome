#!/usr/bin/env bash
set -e

UUID="vit-portal-login@vit.ac.in"
TARGET_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "=========================================================="
echo "  VIT Portal Login Extension Uninstaller for GNOME Shell  "
echo "=========================================================="

# 1. Disable extension
echo "[1/3] Disabling extension..."
if command -v gnome-extensions &> /dev/null; then
    gnome-extensions disable "$UUID" || true
    echo "      Extension disabled."
fi

# 2. Remove files
echo "[2/3] Removing extension files from $TARGET_DIR..."
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
    echo "      Extension files successfully deleted."
else
    echo "      Directory $TARGET_DIR does not exist."
fi

# 3. Prompt to clear GSettings
echo "[3/3] Configuration cleanup..."
if [ -t 0 ]; then
    read -p "Do you also want to remove saved portal credentials from GSettings? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v gsettings &> /dev/null; then
            gsettings reset-recursively org.gnome.shell.extensions.vitportallogin || true
            echo "      Saved credentials reset."
        fi
    fi
else
    echo "      (Non-interactive shell: skipping GSettings reset)"
fi

echo ""
echo "=========================================================="
echo " Uninstallation Complete!"
echo "=========================================================="
echo "Next steps:"
echo "1. On GNOME Wayland (default on most modern distros):"
echo "   Log out and log back in to reload GNOME Shell."
echo "2. On GNOME X11:"
echo "   Press Alt + F2, type 'r', and press Enter."
echo "=========================================================="
