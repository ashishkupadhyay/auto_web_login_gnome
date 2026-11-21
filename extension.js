import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { SsidWatcher, isVitWifi } from './lib/ssidWatcher.js';
import { PortalController } from './lib/portalController.js';

const VitPortalIndicator = GObject.registerClass({
    GTypeName: 'VitPortalIndicator',
}, class VitPortalIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, _('VIT Portal Login'));

        this._ext = extension;
        this._settings = extension.getSettings();
        this._extPath = extension.path;
        this._forceSetupView = false;
        this._autoLoginTimerId = null;

        // Backend helpers
        this._portal = new PortalController(this._settings);
        this._ssidWatcher = new SsidWatcher();

        // Top bar icon
        this._icon = this._createTopBarIcon();
        this.add_child(this._icon);

        // Listen for portal status changes
        this._statusSignalId = this._portal.connect('status-changed', () => {
            this.rebuildMenu();
        });

        this._loginSignalId = this._portal.connect('login-finished', (p, success, message) => {
            if (this._settings.get_boolean('show-notifications')) {
                this._notify(_('VIT Wi-Fi Portal'), message);
            }
            this.rebuildMenu();
        });

        this._logoutSignalId = this._portal.connect('logout-finished', (p, success, message) => {
            if (this._settings.get_boolean('show-notifications')) {
                this._notify(_('VIT Wi-Fi Portal'), message);
            }
            this.rebuildMenu();
        });

        // Listen for Wi-Fi SSID changes
        this._ssidSignalId = this._ssidWatcher.connect('ssid-changed', (w, ssid) => {
            this._handleSsidChanged(ssid);
        });

        // Rebuild menu whenever it is opened
        this.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) {
                this.rebuildMenu();
            }
        });

        // Check if auto-login should fire immediately upon startup
        this._handleSsidChanged(this._ssidWatcher.ssid);

        // Initial menu construction
        this.rebuildMenu();
    }

    _createTopBarIcon() {
        const iconPath = `${this._extPath}/icons/vit-portal-symbolic.svg`;
        const iconFile = Gio.File.new_for_path(iconPath);
        if (iconFile.query_exists(null)) {
            return new St.Icon({
                gicon: Gio.FileIcon.new(iconFile),
                style_class: 'system-status-icon',
            });
        }
        return new St.Icon({
            icon_name: 'network-wireless-symbolic',
            style_class: 'system-status-icon',
        });
    }

    _notify(title, message) {
        try {
            if (typeof Main.notify === 'function') {
                Main.notify(title, message);
            }
        } catch (e) {
            console.warn(`[VIT Portal] Notification failed: ${e.message}`);
        }
    }

    _handleSsidChanged(ssid) {
        if (this._autoLoginTimerId) {
            GLib.source_remove(this._autoLoginTimerId);
            this._autoLoginTimerId = null;
        }

        const isCampus = isVitWifi(ssid);
        const autoLogin = this._settings.get_boolean('auto-login');
        const onboarded = this._settings.get_boolean('onboarding-complete');

        if (isCampus && autoLogin && onboarded) {
            const u = this._settings.get_string('username');
            const p = this._settings.get_string('password');

            if (u && p && !this._portal.busy) {
                // 2.2-second debounce for DHCP and IP assignment
                this._autoLoginTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2200, () => {
                    this._autoLoginTimerId = null;
                    if (this._ssidWatcher.isVitWifiConnected && !this._portal.busy) {
                        this._portal.login(u, p);
                    }
                    return GLib.SOURCE_REMOVE;
                });
            }
        }

        this.rebuildMenu();
    }

    rebuildMenu() {
        this.menu.removeAll();

        const onboardingComplete = this._settings.get_boolean('onboarding-complete');
        const username = this._settings.get_string('username');
        const password = this._settings.get_string('password');
        const needsSetup = !onboardingComplete || !username || !password || this._forceSetupView;

        if (needsSetup) {
            this._buildOnboardingView(username, password);
        } else {
            this._buildMainView(username, password);
        }
    }

    _buildOnboardingView(initialUser, initialPass) {
        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'vit-menu-box',
        });

        // Header Title
        const titleLabel = new St.Label({
            text: _('VIT Wi-Fi Portal Setup'),
            style_class: 'vit-header-title',
        });
        box.add_child(titleLabel);

        const subLabel = new St.Label({
            text: _('Enter your credentials to save and enable automatic login on campus.'),
            style_class: 'vit-header-subtitle',
        });
        box.add_child(subLabel);

        // Username
        const userLabel = new St.Label({
            text: _('Username / Registration No.'),
            style_class: 'vit-form-label',
        });
        box.add_child(userLabel);

        const userEntry = new St.Entry({
            hint_text: _('e.g. 21BCE1001'),
            text: initialUser || '',
            style_class: 'vit-entry',
            can_focus: true,
        });
        box.add_child(userEntry);

        // Password
        const passLabel = new St.Label({
            text: _('Password'),
            style_class: 'vit-form-label',
        });
        box.add_child(passLabel);

        const passEntry = new St.Entry({
            hint_text: _('Portal Password'),
            text: initialPass || '',
            style_class: 'vit-entry',
            can_focus: true,
        });
        passEntry.clutter_text.set_password_char('•'.charCodeAt(0));
        box.add_child(passEntry);

        // Feedback / Error Label
        const errorLabel = new St.Label({
            text: '',
            style_class: 'vit-error-msg',
            visible: false,
        });
        box.add_child(errorLabel);

        // Save & Continue Button
        const saveBtn = new St.Button({
            label: _('Save Credentials & Continue'),
            style_class: 'vit-btn vit-btn-primary',
            can_focus: true,
            reactive: true,
            x_align: Clutter.ActorAlign.FILL,
            margin_top: 10,
        });

        saveBtn.connect('clicked', () => {
            const u = userEntry.get_text().trim();
            const p = passEntry.get_text();

            if (!u || !p) {
                errorLabel.set_text(_('Please enter both username and password.'));
                errorLabel.show();
                return;
            }

            this._settings.set_string('username', u);
            this._settings.set_string('password', p);
            this._settings.set_boolean('onboarding-complete', true);
            this._forceSetupView = false;

            this._notify(_('Credentials Saved'), _('Your portal credentials have been saved.'));
            this.rebuildMenu();

            if (this._ssidWatcher.isVitWifiConnected) {
                this._portal.login(u, p);
            }
        });
        box.add_child(saveBtn);

        const containerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        containerItem.add_child(box);
        this.menu.addMenuItem(containerItem);
    }

    _buildMainView(username, password) {
        const ssid = this._ssidWatcher.ssid;
        const isCampus = isVitWifi(ssid);

        // --- Status Header Item ---
        const headerBox = new St.BoxLayout({
            vertical: true,
            style_class: 'vit-menu-box',
        });

        // Top Row: SSID & Badge
        const rowSsid = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.FILL,
        });

        const ssidText = new St.Label({
            text: ssid ? ssid : _('Not Connected'),
            style_class: 'vit-header-title',
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        rowSsid.add_child(ssidText);

        const badge = new St.Label({
            text: isCampus ? _('Campus Wi-Fi') : _('Off-Campus'),
            style_class: isCampus ? 'vit-badge vit-badge-campus' : 'vit-badge vit-badge-other',
            y_align: Clutter.ActorAlign.CENTER,
        });
        rowSsid.add_child(badge);
        headerBox.add_child(rowSsid);

        // Status Message
        const statusText = this._portal.lastMessage || (isCampus ? _('Connected to VIT Wi-Fi.') : _('Connect to campus Wi-Fi to authenticate.'));
        const statusLabel = new St.Label({
            text: statusText,
            style_class: 'vit-status-msg',
        });
        headerBox.add_child(statusLabel);

        const headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        headerItem.add_child(headerBox);
        this.menu.addMenuItem(headerItem);

        // --- Action Buttons ---
        const btnBox = new St.BoxLayout({
            vertical: false,
            style_class: 'vit-menu-box',
            x_align: Clutter.ActorAlign.FILL,
        });

        // Login Button
        const loginBtn = new St.Button({
            label: this._portal.busy ? _('Working...') : _('Login'),
            style_class: 'vit-btn vit-btn-login',
            can_focus: true,
            reactive: !this._portal.busy,
            x_expand: true,
        });
        loginBtn.connect('clicked', () => {
            this._portal.login(username, password);
        });
        btnBox.add_child(loginBtn);

        // Logout Button
        const logoutBtn = new St.Button({
            label: _('Logout'),
            style_class: 'vit-btn vit-btn-logout',
            can_focus: true,
            reactive: !this._portal.busy,
            x_expand: true,
            margin_left: 8,
        });
        logoutBtn.connect('clicked', () => {
            this._portal.logout();
        });
        btnBox.add_child(logoutBtn);

        const btnMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        btnMenuItem.add_child(btnBox);
        this.menu.addMenuItem(btnMenuItem);

        // --- Separator ---
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- Account Registration Portal Link ---
        const accountItem = new PopupMenu.PopupImageMenuItem(
            _('Open Account Registration'),
            'web-browser-symbolic'
        );
        accountItem.connect('activate', () => {
            this._portal.openAccountSettings();
        });
        this.menu.addMenuItem(accountItem);

        // --- Auto-Login Toggle Switch ---
        const autoLoginItem = new PopupMenu.PopupSwitchMenuItem(
            _('Automatic Login'),
            this._settings.get_boolean('auto-login')
        );
        autoLoginItem.connect('toggled', (item, state) => {
            this._settings.set_boolean('auto-login', state);
        });
        this.menu.addMenuItem(autoLoginItem);

        // --- Edit Credentials / Reset Setup ---
        const editItem = new PopupMenu.PopupImageMenuItem(
            _('Edit Credentials...'),
            'dialog-password-symbolic'
        );
        editItem.connect('activate', () => {
            this._forceSetupView = true;
            this.rebuildMenu();
        });
        this.menu.addMenuItem(editItem);

        // --- Preferences Item ---
        const prefsItem = new PopupMenu.PopupImageMenuItem(
            _('Settings'),
            'emblem-system-symbolic'
        );
        prefsItem.connect('activate', () => {
            this._ext.openPreferences();
        });
        this.menu.addMenuItem(prefsItem);
    }

    destroy() {
        if (this._autoLoginTimerId) {
            GLib.source_remove(this._autoLoginTimerId);
            this._autoLoginTimerId = null;
        }

        if (this._portal) {
            if (this._statusSignalId) this._portal.disconnect(this._statusSignalId);
            if (this._loginSignalId) this._portal.disconnect(this._loginSignalId);
            if (this._logoutSignalId) this._portal.disconnect(this._logoutSignalId);
            this._portal.destroy();
            this._portal = null;
        }

        if (this._ssidWatcher) {
            if (this._ssidSignalId) this._ssidWatcher.disconnect(this._ssidSignalId);
            this._ssidWatcher.destroy();
            this._ssidWatcher = null;
        }

        super.destroy();
    }
});

export default class VitPortalExtension extends Extension {
    enable() {
        this._indicator = new VitPortalIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
