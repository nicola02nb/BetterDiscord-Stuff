/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.2.2
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js
 */
const config = {
    changelog: [
        {
            title: "2.2.0",
            type: "improved",
            items: [
                "Updated for new BetterDiscord plugin system",
            ]
        }
    ],
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

const { Webpack, DOM } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);

module.exports = class ShowPing {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
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
                if (id === "hideKrispButton"){
                    config.settings[0].value = value;
                    this.displayKrispButton(!value);
                }
                this.api.Data.save(id, value);   
            },
        });
    }

    start() {
        this.api.DOM.addStyle(`[class^="rtcConnectionStatusConnected_"]{float: left; display: flex;}`);
        this.addPingDisplay();
        this.handleConnection = this.handleConnectionStateChange.bind(this);
        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleConnection);
    }

    stop() {
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleConnection);
        this.handleConnection = null;
        this.removePingDisplay();
        this.displayKrispButton(true);
    }

    handleConnectionStateChange(event) {
        if (event.context === "default") {
            if (event.state === "RTC_CONNECTED") {
                this.isConnected = true;
                this.addPingDisplay();
            } else {
                this.isConnected = false;
                this.removePingDisplay();
            }
        }
    }

    startPingObserver() {
        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            this.updatePing(mutationsList[0].target.ariaLabel);
        };
        // Create and start the observer
        this.pingObserver = new MutationObserver(callback);
        const targetNode = document.querySelector('[class^="ping_"]');
        if (targetNode) {
            this.pingObserver.observe(targetNode, { attributes: true });
        } else if (this.isConnected) {
            this.pingObserver = null;
            setTimeout(() => this.addPingDisplay(), 500);
        }
    }

    stopPingObserver() {
        if (this.pingObserver) {
            this.api.Logger.warn('Disconnecting ping observer');
            this.pingObserver.disconnect();
            this.pingObserver = null;
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

            this.updatePing(connection.querySelector('[class^="ping_"]')?.getAttribute('aria-label'));
            this.startPingObserver();
        } else if (this.isConnected) {
            setTimeout(() => this.addPingDisplay(), 500)
        }
    }

    removePingDisplay() {
        this.stopPingObserver();
        if (this.pingElement) {
            this.pingElement.remove();
            this.pingElement = null;
        }
        if (this.statusBar) {
            this.statusBar.style.float = '';
            this.statusBar.style.display = '';
            this.statusBar = null;
        }
    }

    updatePing(ping) {
        if (ping === null || ping === undefined) {
            this.pingElement.textContent = `\u00A0N/A`;
        } else if (this.pingElement && this.pingElement.isConnected) {
            this.pingElement.textContent = `\u00A0${ping}`;
        }
    }

    displayKrispButton(show) {
        const krispContainer = document.querySelector('[class*="connection_"]>[class^="inner_"]');
        if (krispContainer?.nextElementSibling?.firstChild) {
            krispContainer.nextElementSibling.firstChild.style.display = show ? "" : "none";
        }
    }
};