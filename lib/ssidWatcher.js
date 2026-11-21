import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

let NM = null;
try {
    NM = (await import('gi://NM')).default;
} catch (e) {
    console.warn(`[VIT Portal] NM introspection not loaded directly: ${e.message}`);
}

/**
 * Checks if the given SSID belongs to VIT campus network.
 * Supported SSIDs:
 * - "VIT 2.4G"
 * - "VIT 5G"
 * - Hostels / Blocks: "[A-T]-VIT" (e.g., "A-VIT", "B-VIT", ..., "T-VIT")
 * 
 * @param {string} ssid
 * @returns {boolean}
 */
export function isVitWifi(ssid) {
    if (!ssid || typeof ssid !== 'string') {
        return false;
    }
    const s = ssid.trim();
    if (s === 'VIT 2.4G' || s === 'VIT 5G') {
        return true;
    }
    const match = s.match(/^([A-Za-z])-VIT$/);
    if (match) {
        const char = match[1].toUpperCase();
        return char >= 'A' && char <= 'T';
    }
    return false;
}

export const SsidWatcher = GObject.registerClass({
    GTypeName: 'VitPortalSsidWatcher',
    Signals: {
        'ssid-changed': {
            param_types: [GObject.TYPE_STRING],
        },
    },
}, class SsidWatcher extends GObject.Object {
    constructor() {
        super();
        this._currentSsid = '';
        this._timerId = null;
        this._nmClient = null;
        this._signalIds = [];
        this._initWatcher();
    }

    async _initWatcher() {
        if (NM) {
            try {
                this._nmClient = await NM.Client.new_async(null);
                const s1 = this._nmClient.connect('notify::primary-connection', () => this.refresh());
                const s2 = this._nmClient.connect('notify::activating-connection', () => this.refresh());
                const s3 = this._nmClient.connect('device-added', () => this.refresh());
                const s4 = this._nmClient.connect('device-removed', () => this.refresh());
                this._signalIds.push({ obj: this._nmClient, id: s1 });
                this._signalIds.push({ obj: this._nmClient, id: s2 });
                this._signalIds.push({ obj: this._nmClient, id: s3 });
                this._signalIds.push({ obj: this._nmClient, id: s4 });
            } catch (err) {
                console.warn(`[VIT Portal] NM.Client init failed: ${err.message}`);
            }
        }

        // Initial check
        this.refresh();

        // Safety poll every 3 seconds
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this.refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    get ssid() {
        return this._currentSsid;
    }

    get isVitWifiConnected() {
        return isVitWifi(this._currentSsid);
    }

    refresh() {
        let newSsid = '';

        if (this._nmClient && NM) {
            try {
                const devices = this._nmClient.get_devices() || [];
                for (const dev of devices) {
                    if (dev.get_device_type() === NM.DeviceType.WIFI && dev.state === NM.DeviceState.ACTIVATED) {
                        const activeAp = dev.get_active_access_point();
                        if (activeAp) {
                            const ssidBytes = activeAp.get_ssid();
                            if (ssidBytes) {
                                newSsid = NM.utils_ssid_to_utf8(ssidBytes.get_data()) || '';
                                if (newSsid) break;
                            }
                        }
                    }
                }
            } catch (e) {
                // fall through to DBus
            }
        }

        if (!newSsid) {
            newSsid = this._readSsidFromDBus();
        }

        if (newSsid !== this._currentSsid) {
            this._currentSsid = newSsid;
            this.emit('ssid-changed', this._currentSsid);
        }
    }

    _readSsidFromDBus() {
        try {
            const reply = Gio.DBus.system.call_sync(
                'org.freedesktop.NetworkManager',
                '/org/freedesktop/NetworkManager',
                'org.freedesktop.NetworkManager',
                'GetDevices',
                null,
                new GLib.VariantType('(ao)'),
                Gio.DBusCallFlags.NONE,
                1000,
                null
            );
            const [devices] = reply.recursiveUnpack();
            for (const devPath of devices) {
                try {
                    const devTypeReply = Gio.DBus.system.call_sync(
                        'org.freedesktop.NetworkManager',
                        devPath,
                        'org.freedesktop.DBus.Properties',
                        'Get',
                        new GLib.Variant('(ss)', ['org.freedesktop.NetworkManager.Device', 'DeviceType']),
                        new GLib.VariantType('(v)'),
                        Gio.DBusCallFlags.NONE,
                        400,
                        null
                    );
                    const [vType] = devTypeReply.recursiveUnpack();
                    if (vType !== 2) continue; // NM_DEVICE_TYPE_WIFI == 2

                    const stateReply = Gio.DBus.system.call_sync(
                        'org.freedesktop.NetworkManager',
                        devPath,
                        'org.freedesktop.DBus.Properties',
                        'Get',
                        new GLib.Variant('(ss)', ['org.freedesktop.NetworkManager.Device', 'State']),
                        new GLib.VariantType('(v)'),
                        Gio.DBusCallFlags.NONE,
                        400,
                        null
                    );
                    const [vState] = stateReply.recursiveUnpack();
                    if (vState !== 100) continue; // NM_DEVICE_STATE_ACTIVATED == 100

                    const apReply = Gio.DBus.system.call_sync(
                        'org.freedesktop.NetworkManager',
                        devPath,
                        'org.freedesktop.DBus.Properties',
                        'Get',
                        new GLib.Variant('(ss)', ['org.freedesktop.NetworkManager.Device.Wireless', 'ActiveAccessPoint']),
                        new GLib.VariantType('(v)'),
                        Gio.DBusCallFlags.NONE,
                        400,
                        null
                    );
                    const [apPath] = apReply.recursiveUnpack();
                    if (!apPath || apPath === '/') continue;

                    const ssidReply = Gio.DBus.system.call_sync(
                        'org.freedesktop.NetworkManager',
                        apPath,
                        'org.freedesktop.DBus.Properties',
                        'Get',
                        new GLib.Variant('(ss)', ['org.freedesktop.NetworkManager.AccessPoint', 'Ssid']),
                        new GLib.VariantType('(v)'),
                        Gio.DBusCallFlags.NONE,
                        400,
                        null
                    );
                    const [rawBytes] = ssidReply.recursiveUnpack();
                    if (rawBytes && rawBytes.length > 0) {
                        return new TextDecoder('utf-8').decode(new Uint8Array(rawBytes));
                    }
                } catch (inner) {
                    // check next device
                }
            }
        } catch (e) {
            // DBus not reachable or timed out
        }
        return '';
    }

    destroy() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }

        for (const item of this._signalIds) {
            try {
                item.obj.disconnect(item.id);
            } catch (e) {}
        }
        this._signalIds = [];
        this._nmClient = null;
    }
});
