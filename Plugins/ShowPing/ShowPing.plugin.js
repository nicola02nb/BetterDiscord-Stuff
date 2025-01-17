/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.4.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
*/
const config = {
    changelog: [],
    settings: [
        {
            type: "switch",
            id: "hideKrispButton",
            name: "Hide krisp button",
            note: "If enabled, hides krisp button near disconnect channel button",
            value: true
        },
    ]
};

const { Webpack } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");
var console = {};

module.exports = class ShowPing {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
        console = this.api.Logger;
        this.initSettingsValues();

        this.statusBar = null;
        this.pingElement = null;
        this.pingObserver = null;
    }

    initSettingsValues() {
        config.settings[0].value = this.api.Data.load("hideKrispButton") ?? config.settings[0].value;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                if (id === "hideKrispButton") {
                    config.settings[0].value = value;
                    this.displayKrispButton(!value);
                }
                this.api.Data.save(id, value);
            },
        });
    }

    start() {
        this.handleConnection = this.handleConnectionStateChange.bind(this);
        this.handlePing = this.handlePingChange.bind(this);
        this.api.DOM.addStyle(`[class^="rtcConnectionStatusConnected_"]{float: left; display: flex;}`);
        this.addPingDisplay();
        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleConnection);
        DiscordModules.subscribe("RTC_CONNECTION_PING", this.handlePing);
    }

    stop() {
        DiscordModules.unsubscribe("RTC_CONNECTION_PING", this.handlePing);
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleConnection);
        this.removePingDisplay();
        this.displayKrispButton(true);
        this.api.DOM.removeStyle();
    }

    handleConnectionStateChange(event) {
        console.log(event);
        if (event.context === "default") {
            if (event.state === "RTC_CONNECTED") {
                this.isConnected = true;
                this.addPingDisplay();
            } else {
                console.log(event);
                this.isConnected = false;
                this.removePingDisplay();
            }
        }
    }

    handlePingChange(event) {
        if (this.pingElement) {
            this.updatePing(RTCConnectionStore.getLastPing());
        }
    }

    addPingDisplay() {
        const connection = document.querySelector('[class^="rtcConnectionStatus_"]');
        this.statusBar = connection?.querySelector('[class^="rtcConnectionStatusConnected_"]');

        if (this.statusBar) {
            // Create ping display element
            this.pingElement = document.createElement('div');
            this.pingElement.style = 'width: min-content; float: left;';
            // Insert ping element after the status text
            this.statusBar.appendChild(this.pingElement);

            if (config.settings[0].value) {
                this.displayKrispButton(false);
            }

            this.updatePing(connection.querySelector('[class^="ping_"]')?.getAttribute('aria-label')?.slice(0, -3));

        } else if (this.isConnected) {
            setTimeout(() => this.addPingDisplay(), 500)
        }
    }

    removePingDisplay() {
        if (this.pingElement) {
            this.pingElement.remove();
            this.pingElement = null;
        }
        if (this.statusBar) {
            this.statusBar = null;
        }
    }

    updatePing(ping) {
        if (ping === null || ping === undefined) {
            this.pingElement.textContent = `\u00A0N/A`;
        } else if (this.pingElement && this.pingElement.isConnected) {
            this.pingElement.textContent = `\u00A0${ping} ms`;
        }
    }

    displayKrispButton(show) {
        const krispContainer = document.querySelector('[class*="connection_"]>[class^="inner_"]');
        if (krispContainer?.nextElementSibling?.firstChild) {
            krispContainer.nextElementSibling.firstChild.style.display = show ? "" : "none";
        }
    }
};