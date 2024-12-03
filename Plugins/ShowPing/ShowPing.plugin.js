/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.1.2
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js
 */

const { Patcher, React, Webpack, Data } = BdApi;
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
        this.startPingObserver();
        DiscordModules.subscribe("RTC_CONNECTION_STATE", (event) => {
            if (event.state === "RTC_CONNECTING") {
                this.isConnected = false;
                this.addPingDisplay();
            } else if (event.state === "RTC_CONNECTED") {
                this.isConnected = true;
                this.startPingObserver();
            } else if (event.state === "DISCONNECTED") {
                this.isConnected = false;
                this.stopPingObserver();
                this.removePingDisplay();
            }
        });
    }

    stop() {
        Patcher.unpatchAll("UserConnection");
        this.stopPingObserver();
        this.removePingDisplay();
        this.displayKrispButton(true);
    }

    startPingObserver() {
        this.stopPingObserver();

        const config = { attributes: true };

        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            this.updatePing(mutationsList[0].target.ariaLabel);
        };

        const createObserver = () => {
            // Create and start the observer
            this.pingObserver = new MutationObserver(callback);
            const targetNode = document.querySelector('[class^="ping_"]');
            if (targetNode) {
                this.pingObserver.observe(targetNode, config);
            } else if (this.isConnected) {
                this.pingObserver = null;
                setTimeout(createObserver, 500);
            }
        }
        createObserver();
    }

    stopPingObserver() {
        if (this.pingObserver) {
            this.pingObserver.disconnect();
            this.pingObserver = null;
        }
    }

    addPingDisplay() {
        this.statusBar = document.querySelector('[class^="rtcConnectionStatus_"]')?.querySelector('[class^="rtcConnectionStatus"]');

        if (this.statusBar) {
            if (this.pingObserver) {
                this.stopPingObserver();
            }
            if (this.pingElement) {
                this.removePingDisplay();
            }

            // Create ping display element
            this.pingElement = document.createElement('div');
            this.pingElement.style.width = 'min-content';
            this.pingElement.style.float = 'left';
            this.pingElement.textContent = '\u00A0N/A';
            // Insert ping element after the status text
            this.statusBar.children[1].style = 'width: min-content; float: left;';
            this.statusBar.appendChild(this.pingElement);

            if (this.getSetting('hideKrispButton')) {
                this.displayKrispButton(false);
            }

            this.updatePing();
        }
    }

    removePingDisplay() {
        if (this.statusBar) {
            this.statusBar.children[1].style = '';
            this.statusBar = null;
        }
        if (this.pingElement) {
            this.pingElement.remove();
            this.pingElement = null;
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