/**
 * @name ShowPing
 * @description Displays your last ping 
 * @version 0.1.0
 * @author nicola02nb
 * @authorLink *https://github.com/nicola02nb
 * @source *https://github.com/nicola02nb/ShowPing
 * @updateUrl *https://raw.githubusercontent.com/nicola02nbShowPing/main/ShowPing.plugin.js
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
                github_username: "AutoSwitchStatus",
                link: "https://github.com/ShowPing"
            }
        ],
        version: "0.1.0",
        description: "Displays your updated last ping",
        github: "https://github.com/nicola02nb/ShowPing",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/ShowPing/main/ShowPing.plugin.js"
    },
    changelog: [{
        title: "0.1.0",
        items: [
            "Created a basic working plugin",
            "Added customizable interval time"
        ]
    }],
    main: "index.js"
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
        const { Logger, DiscordModules } = Library;
        const {
            SelectedChannelStore: { getVoiceChannelId },
        } = DiscordModules;

        const {
            Webpack,
            Webpack: { Filters },
        } = BdApi;

        var DEBUG = false;
        var DEBUG_ActuallyChangeStatus = false
        function log_debug(module, ...message) {
            if (DEBUG) {
                Logger.debug(module, ...message);
            }
        }

        return class PingDisplay extends Plugin {
        constructor() {
            super();
            this.pingElement = null;
            this.updateInterval = null;
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
            // Called when the plugin is loaded
        }

        start() {
            // Called when the plugin is started
            this.hidden=true;
            this.intervalTime=1000;
            this.updatePing();
            this.updateInterval = setInterval(() => this.updatePing(), this.intervalTime); // Update every 5 seconds
        }

        stop() {
            // Called when the plugin is stopped
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval=null;
            }
            this.removePingDisplay();
        }

        getPing(){
            var ping=document.querySelector('.ping__838d2');
            if(ping){
                var attr=ping.getAttributeNode("aria-label");
                if(attr){
                   return attr.value.replace(/\s/g, '');
                }
            }
            return null; 
        }

        addPingDisplay() {
            const statusBar = document.querySelector('.labelWrapper__51637').firstChild;
            if (statusBar) {
                document.querySelector('.inner_ab95dc').firstChild.firstChild.style.width="fit-content";
                this.pingElement=document.createElement('div');
                this.pingElement.id='ping-display';
                this.pingElement.style='font-size: 14px;';
                statusBar.appendChild(this.pingElement);
                this.hidden=false;
            }
        }

        removePingDisplay() {
            if (this.pingElement) {
                this.pingElement.remove();
                this.hidden=true;
                this.pingElement=null;
            }
        }

        updatePing() {
            // checking if user is connected to a channel
            if (getVoiceChannelId()) {
                if(this.hidden || !this.pingElement){
                    this.addPingDisplay();
                }
                var ping=this.getPing();
                if(ping){
                    this.pingElement.textContent=","+this.getPing();
                }
                else{
                    this.pingElement.textContent="";
                }
            }
            else{
                if(!this.hidden){
                    this.removePingDisplay();
                }
            }
        }
    };
    };
    return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/
