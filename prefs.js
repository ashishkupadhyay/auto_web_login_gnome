import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export default class VitPortalPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'network-wireless-symbolic',
        });
        window.add(page);

        // --- Account Credentials ---
        const credGroup = new Adw.PreferencesGroup({
            title: _('VIT Account Credentials'),
            description: _('Saved credentials for authenticating with the Pronto Captive Portal.'),
        });
        page.add(credGroup);

        const usernameRow = new Adw.EntryRow({
            title: _('Username / Registration No.'),
            text: settings.get_string('username'),
        });
        usernameRow.connect('changed', (entry) => {
            const val = entry.text.trim();
            settings.set_string('username', val);
            if (val && settings.get_string('password')) {
                settings.set_boolean('onboarding-complete', true);
            }
        });
        credGroup.add(usernameRow);

        const passwordRow = new Adw.PasswordEntryRow({
            title: _('Password'),
            text: settings.get_string('password'),
        });
        passwordRow.connect('changed', (entry) => {
            const val = entry.text;
            settings.set_string('password', val);
            if (val && settings.get_string('username')) {
                settings.set_boolean('onboarding-complete', true);
            }
        });
        credGroup.add(passwordRow);

        // --- Automation & Notifications ---
        const autoGroup = new Adw.PreferencesGroup({
            title: _('Behavior & Automation'),
        });
        page.add(autoGroup);

        const autoLoginRow = new Adw.SwitchRow({
            title: _('Automatic Login'),
            subtitle: _('Automatically log in when connected to VIT 2.4G, 5G, or block Wi-Fi ([A-T]-VIT)'),
            active: settings.get_boolean('auto-login'),
        });
        settings.bind('auto-login', autoLoginRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        autoGroup.add(autoLoginRow);

        const notifRow = new Adw.SwitchRow({
            title: _('Desktop Notifications'),
            subtitle: _('Show notifications on login and logout events'),
            active: settings.get_boolean('show-notifications'),
        });
        settings.bind('show-notifications', notifRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        autoGroup.add(notifRow);

        // --- Advanced Endpoints ---
        const advGroup = new Adw.PreferencesGroup({
            title: _('Portal Endpoints (Advanced)'),
            description: _('Custom URLs for the Pronto network captive portal.'),
        });
        page.add(advGroup);

        const loginUrlRow = new Adw.EntryRow({
            title: _('Login URL'),
            text: settings.get_string('login-url'),
        });
        loginUrlRow.connect('changed', (entry) => {
            settings.set_string('login-url', entry.text.trim());
        });
        advGroup.add(loginUrlRow);

        const logoutUrlRow = new Adw.EntryRow({
            title: _('Logout URL'),
            text: settings.get_string('logout-url'),
        });
        logoutUrlRow.connect('changed', (entry) => {
            settings.set_string('logout-url', entry.text.trim());
        });
        advGroup.add(logoutUrlRow);

        const accountUrlRow = new Adw.EntryRow({
            title: _('Account Portal URL'),
            text: settings.get_string('account-url'),
        });
        accountUrlRow.connect('changed', (entry) => {
            settings.set_string('account-url', entry.text.trim());
        });
        advGroup.add(accountUrlRow);

        // --- Reset Setup ---
        const resetGroup = new Adw.PreferencesGroup({
            title: _('Reset Setup'),
        });
        page.add(resetGroup);

        const resetRow = new Adw.ActionRow({
            title: _('Clear Credentials & Reset Onboarding'),
            subtitle: _('Removes saved username and password, prompting for setup on next open'),
        });
        const resetBtn = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });
        resetBtn.connect('clicked', () => {
            settings.set_string('username', '');
            settings.set_string('password', '');
            settings.set_boolean('onboarding-complete', false);
            usernameRow.set_text('');
            passwordRow.set_text('');
        });
        resetRow.add_suffix(resetBtn);
        resetGroup.add(resetRow);
    }
}
