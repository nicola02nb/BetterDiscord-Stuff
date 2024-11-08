/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 1.0.0
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    info: {
        name: "ShowPing",
        authors: [
            {
                name: "nicola02nb",
                github_username: "nicola02nb",
                link: "https://github.com/nicola02nb"
            }
        ],
        version: "1.0.0",
        description: "Displays your updated last ping",
        github: "https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js"
    },
    changelog: [{
        title: "1.0.0",
        items: [
            "Implemented with MutationObserver"
        ]
    }],
    main: "index.js",
    defaultConfig: [
        {
            type: "switch",
            name: "Hide Krisp button?",
            note: "If enabled it hides the krisp button from bottom-left status menu(Needs to reload the plugin)",
            id: "hideKrispButton",
            value: true
        }
    ]
};

class Dummy {
    constructor() { this._config = config; }
    start() { }
    stop() { }
}

if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}

module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
    const plugin = (Plugin, Library) => {
        return class PingDisplay extends Plugin {
            constructor() {
                super();
                this.getSettingsPanel = () => {
                    return this.buildSettingsPanel().getElement();
                };
                this.pingElement = null;
                this.panelObserver = null;
                this.pingObserver = null;
            }

            getName() {
                return config.info.name;
            }

            getAuthor() {
                return config.info.authors.map(a => a.name).join(", ");
            }

            getVersion() {
                return config.info.version;
            }

            getDescription() {
                return config.info.description;
            }

            load() {
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
                        if (this.settings.hideKrispButton) {
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
    };
    return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/