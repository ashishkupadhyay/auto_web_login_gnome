import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

const DEFAULT_LOGIN_URL = 'http://phc.prontonetworks.com/cgi-bin/authlogin';
const DEFAULT_LOGOUT_URL = 'http://phc.prontonetworks.com/cgi-bin/authlogout';
const DEFAULT_ACCOUNT_URL = 'http://136.233.9.110/registration/Main.jsp';

export const PortalController = GObject.registerClass({
    GTypeName: 'VitPortalController',
    Signals: {
        'status-changed': {
            param_types: [GObject.TYPE_BOOLEAN, GObject.TYPE_STRING],
        },
        'login-finished': {
            param_types: [GObject.TYPE_BOOLEAN, GObject.TYPE_STRING],
        },
        'logout-finished': {
            param_types: [GObject.TYPE_BOOLEAN, GObject.TYPE_STRING],
        },
    },
}, class PortalController extends GObject.Object {
    constructor(settings = null) {
        super();
        this._settings = settings;
        this._session = new Soup.Session();
        this._session.timeout = 12; // 12 seconds
        this._busy = false;
        this._lastMessage = '';
        this._cancellable = null;
    }

    get busy() {
        return this._busy;
    }

    get lastMessage() {
        return this._lastMessage;
    }

    _getLoginUrl() {
        return (this._settings && this._settings.get_string('login-url')) || DEFAULT_LOGIN_URL;
    }

    _getLogoutUrl() {
        return (this._settings && this._settings.get_string('logout-url')) || DEFAULT_LOGOUT_URL;
    }

    _getAccountUrl() {
        return (this._settings && this._settings.get_string('account-url')) || DEFAULT_ACCOUNT_URL;
    }

    _setBusy(busy, message = null) {
        this._busy = busy;
        if (message !== null) {
            this._lastMessage = message;
        }
        this.emit('status-changed', this._busy, this._lastMessage);
    }

    clearLastMessage() {
        this._lastMessage = '';
        this.emit('status-changed', this._busy, '');
    }

    login(username, password) {
        if (!username || !password) {
            const err = 'Username and password cannot be empty.';
            this._lastMessage = err;
            this.emit('login-finished', false, err);
            this.emit('status-changed', false, err);
            return;
        }

        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        this._cancellable = new Gio.Cancellable();
        this._setBusy(true, 'Logging in to VIT Portal...');

        const postBody = [
            `userId=${encodeURIComponent(username)}`,
            `password=${encodeURIComponent(password)}`,
            `serviceName=${encodeURIComponent('ProntoAuthentication')}`,
            `Submit22=${encodeURIComponent('Login')}`,
        ].join('&');

        const bytes = new GLib.Bytes(new TextEncoder().encode(postBody));
        const loginUrl = this._getLoginUrl();
        const msg = Soup.Message.new('POST', loginUrl);
        msg.set_request_body_from_bytes('application/x-www-form-urlencoded', bytes);

        this._session.send_and_read_async(
            msg,
            GLib.PRIORITY_DEFAULT,
            this._cancellable,
            (session, res) => {
                if (this._cancellable && this._cancellable.is_cancelled()) {
                    return;
                }
                this._cancellable = null;

                try {
                    const respBytes = session.send_and_read_finish(res);
                    this._setBusy(false);

                    const text = new TextDecoder('utf-8').decode(respBytes.toArray());
                    const lower = text.toLowerCase();

                    const isSuccess = lower.includes('congratulations');
                    const isAlready = lower.includes('already logged in');
                    const isQuotaOver = lower.includes('quota is over');
                    const isBadCredentials = lower.includes('sorry') && lower.includes('try again');

                    let message = '';
                    let success = false;

                    if (isSuccess) {
                        message = 'Logged in successfully.';
                        success = true;
                    } else if (isAlready) {
                        message = 'Already logged in.';
                        success = true;
                    } else if (isQuotaOver) {
                        message = 'Portal quota is over.';
                        success = false;
                    } else if (isBadCredentials) {
                        message = 'Incorrect username or password.';
                        success = false;
                    } else {
                        message = 'Unexpected response from portal.';
                        success = false;
                    }

                    this._lastMessage = message;
                    this.emit('login-finished', success, message);
                    this.emit('status-changed', false, message);
                } catch (err) {
                    this._setBusy(false);
                    const errMsg = 'Network error while logging in.';
                    this._lastMessage = errMsg;
                    this.emit('login-finished', false, errMsg);
                    this.emit('status-changed', false, errMsg);
                }
            }
        );
    }

    logout() {
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        this._cancellable = new Gio.Cancellable();
        this._setBusy(true, 'Logging out from VIT Portal...');

        const logoutUrl = this._getLogoutUrl();
        const msg = Soup.Message.new('GET', logoutUrl);

        this._session.send_and_read_async(
            msg,
            GLib.PRIORITY_DEFAULT,
            this._cancellable,
            (session, res) => {
                if (this._cancellable && this._cancellable.is_cancelled()) {
                    return;
                }
                this._cancellable = null;

                try {
                    const respBytes = session.send_and_read_finish(res);
                    this._setBusy(false);

                    const text = new TextDecoder('utf-8').decode(respBytes.toArray());
                    const lower = text.toLowerCase();

                    const isSuccess = lower.includes('successfully logged out');
                    const isNone = lower.includes('no active session');

                    let message = '';
                    let success = false;

                    if (isSuccess) {
                        message = 'Logged out successfully.';
                        success = true;
                    } else if (isNone) {
                        message = 'No active session.';
                        success = true;
                    } else {
                        message = 'Logout response was not recognized.';
                        success = false;
                    }

                    this._lastMessage = message;
                    this.emit('logout-finished', success, message);
                    this.emit('status-changed', false, message);
                } catch (err) {
                    this._setBusy(false);
                    const errMsg = 'Network error while logging out.';
                    this._lastMessage = errMsg;
                    this.emit('logout-finished', false, errMsg);
                    this.emit('status-changed', false, errMsg);
                }
            }
        );
    }

    openAccountSettings() {
        const url = this._getAccountUrl();
        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (e) {
            console.error(`[VIT Portal] Failed to open URL ${url}: ${e.message}`);
        }
    }

    destroy() {
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }
});
