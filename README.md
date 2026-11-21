# VIT Portal Login - GNOME Shell Extension

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%20%7C%2046%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050%20%7C%2051-blue.svg)](https://gjs.guide)
[![Platform](https://img.shields.io/badge/Platform-Any%20Linux%20with%20GNOME%2045%E2%80%9351-informational.svg)](https://www.gnome.org)
[![License: GPL-2.0+](https://img.shields.io/badge/License-GPL--2.0%2B-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

A lightweight, native GNOME Shell extension providing automatic and manual login/logout for the **VIT Vellore Pronto Captive Portal** when connected to campus Wi-Fi networks.

Built for modern GNOME Shell (including **GNOME 51** and GNOME 45+) using native ES Modules, Libsoup 3, NetworkManager, and Libadwaita.

---

## Supported Platforms

This extension is **supported on any Linux distribution running GNOME Shell 45 through 51**.

Compatible distributions include:
- **Fedora**
- **Ubuntu** (23.10, 24.04 LTS Noble Numbat, 24.10 Oracular Oriole, and newer)
- **Arch Linux / Manjaro / EndeavourOS** (with GNOME)
- **Debian** (Debian 13 Trixie / Testing / Sid with GNOME 45+)
- **openSUSE** (Tumbleweed / Slowroll / Leap with GNOME)
- **Pop!_OS / Vanilla OS / NixOS** (with GNOME 45+)

> [!NOTE]
> The requirements are:
> 1. **GNOME Shell 45–51** (standard modern ESM extension architecture)
> 2. **NetworkManager** for campus Wi-Fi SSID detection

---

## Features

- **First-Run Onboarding Prompt**: Automatically prompts the user for their registration number and password on first launch and saves them directly into GNOME's secure configuration storage (`GSettings`).
- **Campus Network Auto-Detection**: Monitors active Wi-Fi and recognizes:
  - `VIT 2.4G` & `VIT 5G`
  - Hostel block Wi-Fi: `[A-T]-VIT` (e.g. `A-VIT`, `M-VIT`, `Q-VIT`, etc.)
- **Automatic Background Login**: Automatically sends login requests upon connecting to any recognized campus SSID with a 2.2-second stabilization delay for DHCP assignment.
- **Top Bar Indicator**:
  - Live campus connection status pill (`Campus Wi-Fi` vs `Off-Campus`).
  - One-click **Login** and **Logout** buttons.
  - Shortcut to open the VIT registration portal account management page.
  - In-menu switch to toggle Auto-Login on or off.
  - **Edit Credentials** button to update username or password anytime.
- **Libadwaita Preferences Window**: Native GTK4 / Libadwaita settings dialog (`gnome-extensions prefs vit-portal-login@vit.ac.in`).
- **Desktop Notifications**: Alerts on login success, session expiration, quota limits, or invalid credentials.

---

## Repository Structure

```
auto_web_login_gnome/
├── metadata.json                        # Extension manifest (UUID: vit-portal-login@vit.ac.in)
├── extension.js                         # Top bar indicator & interactive onboarding UI
├── prefs.js                             # Libadwaita / GTK4 Settings window
├── stylesheet.css                       # Modern GNOME Shell styling
├── install.sh                           # 1-click installer script for Linux
├── Makefile                             # make install, make pack, make schemas
├── schemas/
│   └── org.gnome.shell.extensions.vitportallogin.gschema.xml  # GSettings schema
├── icons/
│   ├── vit-portal-symbolic.svg          # Top-bar symbolic icon
│   ├── person-settings-symbolic.svg
│   └── wifi-reset-symbolic.svg
└── lib/
    ├── portalController.js              # Captive portal HTTP engine (Libsoup 3)
    └── ssidWatcher.js                   # NetworkManager & DBus Wi-Fi SSID watcher
```

---

## Dependencies by Distribution

Standard desktop installations include these libraries out of the box. If using a minimal installation, ensure the following packages are present:

### Fedora / RHEL
```bash
sudo dnf install libsoup3 NetworkManager-libnm libadwaita glib2
```

### Ubuntu / Debian
```bash
sudo apt install gir1.2-soup-3.0 gir1.2-nm-1.0 gir1.2-adw-1 libglib2.0-bin
```

### Arch Linux / Manjaro
```bash
sudo pacman -S libsoup3 networkmanager libadwaita glib2
```

### openSUSE
```bash
sudo zypper install libsoup-3_0-0 typelib-1_0-Soup-3_0 typelib-1_0-NM-1_0 libadwaita-1-0 glib2-tools
```

---

## Installation

### Method 1: Automated Installer (Recommended)

1. Clone or download this repository onto your machine:
   ```bash
   git clone https://github.com/your-username/auto_web_login_gnome.git
   cd auto_web_login_gnome
   ```

2. Run the installation script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Reload GNOME Shell**:
   - **On Wayland** (default on modern distributions): Log out and log back in.
   - **On X11**: Press `Alt + F2`, type `r`, and press `Enter`.

---

### Method 2: Manual Terminal Installation

```bash
# 1. Create target directory
mkdir -p ~/.local/share/gnome-shell/extensions/vit-portal-login@vit.ac.in

# 2. Copy extension files
cp -r metadata.json extension.js prefs.js stylesheet.css schemas icons lib ~/.local/share/gnome-shell/extensions/vit-portal-login@vit.ac.in/

# 3. Compile GSettings schemas
glib-compile-schemas ~/.local/share/gnome-shell/extensions/vit-portal-login@vit.ac.in/schemas

# 4. Log out and back in to reload GNOME Shell

# 5. Enable extension
gnome-extensions enable vit-portal-login@vit.ac.in
```

---

### Method 3: Using Makefile

```bash
make install
```

To create a distributable `.zip` archive for GNOME Extensions:
```bash
make pack
```

---

## First-Time Setup & Usage

1. Click the Wi-Fi icon in the GNOME top bar.
2. A setup card will appear: **"VIT Wi-Fi Portal Setup"**.
3. Enter your **Username / Registration Number** (e.g. `21BCE1001`) and **Password**.
4. Click **Save Credentials & Continue**.
5. Once saved:
   - When connected to any VIT Wi-Fi network, the extension will log in automatically.
   - You can also click **Login** or **Logout** manually from the menu.
   - To update your credentials later, click **Edit Credentials...** or open the extension settings.

---

## Debugging & Logs

To view real-time log output from GNOME Shell:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep -i "vit"
```

---

## License

This project is licensed under the [GNU General Public License v2.0 or later (GPL-2.0+)](LICENSE).
