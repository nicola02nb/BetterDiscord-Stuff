/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 2.0.0
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js
 */

const { React, Webpack, Data} = BdApi;
const { FormSwitch } = Webpack.getByKeys('FormSwitch');
const { useState } = React;

class ShowPing{
    constructor() {
        this.defaultSettings = {
            hideKrispButton: true,
        };
        this.pingElement = null;
        this.panelObserver = null;
        this.pingObserver = null;
    }

    getSettingsPanel(){
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
        this.setupPanelObserver();
    }

    stop() {
        this.stopPingObserver();
        this.stopPanelObserver();
        if (this.pingElement) {
            this.pingElement.remove();
            this.pingElement = null;
        }
        // Show Krisp button back if it was hidden
        this.displayKrispButton(true);
    }

    setupPanelObserver() {
        // Observer configuration to watch for changes in the app's content
        const config = { childList: true, subtree: true};
        
        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if our ping element is missing and if we're in a voice channel
                    const voiceStatus = document.querySelector('[class^="rtcConnectionStatus_"]');
                    if (voiceStatus && (!this.pingElement || !this.pingElement.isConnected)) {
                        this.addPingDisplay();
                    }
                }
            }
        };

        // Create and start the observer
        this.panelObserver = new MutationObserver(callback);
        const targetNode = document.querySelector('[class^="panels_"]');
        if (targetNode) {
            this.panelObserver.observe(targetNode, config);
        }
    }

    stopPanelObserver(){
        if (this.panelObserver) {
            this.panelObserver.disconnect();
            this.panelObserver = null;
        }
    }

    setupPingObserver(){
        this.stopPingObserver();

        const config = { attributes: true};

        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            this.updatePing();
        };
        // Create and start the observer
        this.pingObserver = new MutationObserver(callback);
        const targetNode = document.querySelector('[class^="ping_"]');
        if (targetNode) {
            this.pingObserver.observe(targetNode, config);
        }
    }

    stopPingObserver(){
        if (this.pingObserver) {
            this.pingObserver.disconnect();
            this.pingObserver = null;
        }
    }

    async addPingDisplay() {            
        const tryAddingDisplay = () => {
            const statusBar = document.querySelector('[class^="rtcConnectionStatus_"]')?.children[1]?.firstChild;
        
            if (statusBar) {
                this.stopPingObserver();
                // Remove existing ping element if it exists
                if (this.pingElement) {
                    this.pingElement.remove();
                }

                // Create ping display element
                this.pingElement = document.createElement('div');
                this.pingElement.style.width = 'min-content';
                this.pingElement.style.float = 'left';
                
                // Insert ping element after the status text
                statusBar.firstChild.firstChild.appendChild(this.pingElement);
                statusBar.firstChild.firstChild.children[1].style = 'width: min-content; float: left;';
                
                // Hide Krisp button if setting is enabled
                if (this.getSetting('hideKrispButton')) {
                    this.displayKrispButton(false);
                }

                // Update ping immediately
                this.updatePing();
                this.setupPingObserver();
            } else{
                setTimeout(tryAddingDisplay, 1000);
            }
        };
        
        tryAddingDisplay();
    }

    getPing() {
        const ping = document.querySelector('[class^="ping_"]');
        if (ping) {
            const attr = ping.getAttribute("aria-label");
            return attr ? attr.replace(/\s/g, '') : null;
        }
        return null;
    }

    updatePing() {
        if (this.pingElement && this.pingElement.isConnected) {
            const currentPing = this.getPing();
            if (currentPing) {
                this.pingElement.textContent = `\u00A0${currentPing}`;
            } else {
                this.pingElement.textContent = '\u00A0N/A';
            }
        }
    }
    
    displayKrispButton(show) {
        const krispContainer = document.querySelector('[class*="connection_"]>[class^="inner_"]');
        if (krispContainer?.nextElementSibling?.firstChild) {
            krispContainer.nextElementSibling.firstChild.style.display = show ? "" : "none";
        }
    }
};

module.exports = ShowPing;