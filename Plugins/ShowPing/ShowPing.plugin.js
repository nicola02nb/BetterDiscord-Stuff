/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.1.5
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js
 */

const { React, Webpack, Data } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const { FormSwitch } = Webpack.getByKeys('FormSwitch');
const { useState } = React;

module.exports = class ShowPing {
    constructor() {
        this.defaultSettings = {
            hideKrispButton: true,
        };
        this.statusBar = null;
        this.pingElement = null;
        this.pingObserver = null;
    }

    getSettingsPanel() {
        return () => {
            const [hideKrispButton, setHideKrispButton] = useState(this.getSetting('hideKrispButton'));
            const onSwitch = (id, value) => {
                this.setSetting(id, value);
                if (id === 'hideKrispButton') {
                    setHideKrispButton(value);
                    this.displayKrispButton(!value);
                }
            };
            return React.createElement(
                "div",
                {},
                React.createElement(FormSwitch, {
                    note: "If enabled it hides the krisp button from bottom-left status menu.",
                    value: hideKrispButton,
                    onChange: (e) => onSwitch('hideKrispButton', e),
                }, "Hide Krisp Button")
            );
        }
    }

    getSetting(key) {
        return Data.load("ShowPing", key) ?? this.defaultSettings[key];
    }

    setSetting(key, value) {
        return Data.save("ShowPing", key, value);
    }

    start() {
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
                console.warn(event);
                this.isConnected = false;
                this.removePingDisplay();
            }
        }
    }

    startPingObserver() {
        this.stopPingObserver();

        const config = { attributes: true };

        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            this.updatePing(mutationsList[0].target.ariaLabel);
        };
        // Create and start the observer
        this.pingObserver = new MutationObserver(callback);
        const targetNode = document.querySelector('[class^="ping_"]');
        if (targetNode) {
            this.pingObserver.observe(targetNode, config);
        } else if (this.isConnected) {
            this.pingObserver = null;
            setTimeout(() => this.addPingDisplay(), 500);
        }
    }

    stopPingObserver() {
        if (this.pingObserver) {
            this.pingObserver.disconnect();
            this.pingObserver = null;
        }
    }

    addPingDisplay() {
        this.removePingDisplay();
        const connection = document.querySelector('[class^="rtcConnectionStatus_"]');
        this.statusBar = connection?.querySelector('[class^="rtcConnectionStatusConnected_"]');

        if (this.statusBar) {
            // Create ping display element
            this.pingElement = document.createElement('div');
            this.pingElement.style = 'width: min-content; float: left;';
            // Insert ping element after the status text
            this.statusBar.style = 'float: left; display: flex;';
            this.statusBar.appendChild(this.pingElement);

            if (this.getSetting('hideKrispButton')) {
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
        if (ping !== undefined && this.pingElement && this.pingElement.isConnected) {
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