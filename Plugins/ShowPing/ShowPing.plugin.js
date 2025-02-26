/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.5.3
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

const { Webpack, Patcher } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");

const { labelWrapper, rtcConnectionStatus, rtcConnectionStatusConnected } = Webpack.getByKeys("labelWrapper", "rtcConnectionStatus", "rtcConnectionStatusConnected");
const { voiceButtonsContainer } = Webpack.getByKeys("voiceButtonsContainer");
const ConnectionStatus = Webpack.getAllByStrings("rtcConnectionStatusWrapper")[0].prototype;

var console = {};

module.exports = class ShowPing {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;
        this.initSettingsValues();

        this.statusBar = null;
        this.pingElement = null;
        this.pingObserver = null;
    }

    initSettingsValues() {
        config.settings[0].value = this.BdApi.Data.load("hideKrispButton") ?? config.settings[0].value;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                if (id === "hideKrispButton") {
                    config.settings[0].value = value;
                    this.displayKrispButton(!value);
                }
                this.BdApi.Data.save(id, value);
            },
        });
    }

    start() {
        this.handleConnection = this.handleConnectionStateChange.bind(this);
        this.handlePing = this.handlePingChange.bind(this);
        this.BdApi.DOM.addStyle(`.${rtcConnectionStatusConnected.split(" ")[0]}{display: flex;}
            .${voiceButtonsContainer}{margin-left: 2px !important;}
            .${labelWrapper} > button {width: 100%; display: inline;}
            .pingDisplay{min-width: min-content;}`);
        this.addPingDisplay();
        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleConnection);
        DiscordModules.subscribe("RTC_CONNECTION_PING", this.handlePing);
        Patcher.after(this.meta.name, ConnectionStatus, "renderStatus", (_, [props], ret) => {
            if (!this.pingElement) {
                this.addPingDisplay();
            }
        });
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("RTC_CONNECTION_PING", this.handlePing);
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleConnection);
        this.removePingDisplay();
        this.displayKrispButton(true);
        this.BdApi.DOM.removeStyle();
    }

    handleConnectionStateChange(event) {
        if (event.context === "default") {
            if (event.state === "RTC_CONNECTED") {
                this.addPingDisplay();
            } else {
                this.removePingDisplay();
            }
        }
    }

    handlePingChange(event) {
        if (this.pingElement) {
            this.updatePing();
        }
    }

    addPingDisplay() {
        const connection = document.getElementsByClassName(rtcConnectionStatus)[0];
        this.statusBar = connection?.getElementsByClassName(rtcConnectionStatusConnected)[0];

        if (this.statusBar) {
            // Create ping display element
            this.pingElement = document.createElement('div');
            this.pingElement.className = 'pingDisplay';
            // Insert ping element after the status text
            this.statusBar.appendChild(this.pingElement);

            this.updatePing();
            if (config.settings[0].value) {
                this.displayKrispButton(false);
            }
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

    updatePing() {
        let ping = RTCConnectionStore.getLastPing();
        if (ping === null || ping === undefined || ping === "") {
            this.pingElement.textContent = `\u00A0N/A`;
        } else if (this.pingElement && this.pingElement.isConnected) {
            this.pingElement.textContent = `\u00A0${ping} ms`;
        }
    }

    displayKrispButton(show) {
        if (show) {
            this.BdApi.DOM.removeStyle("hidekrispStyle");
        } else {
            this.BdApi.DOM.addStyle("hidekrispStyle", `.${voiceButtonsContainer} > button[aria-label*="Krisp"] {display: none !important;}`);
        }
    }
};