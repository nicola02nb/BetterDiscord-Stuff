/**
 * @name ShowPing
 * @description Displays your live ping. For Bugs or Feature Requests open an issue on my Github.
 * @version 0.1.3
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
        version: "0.1.3",
        description: "Displays your updated last ping",
        github: "https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/ShowPing/ShowPing.plugin.js"
    },
    changelog: [{
        title: "0.1.3",
        items: [
            "Discord update fix"
        ]
    },
    {
        title: "0.1.2",
        items: [
            "Fixed CSS layout",
            "Refactored some stuff"
        ]
    },{
        title: "0.1.1",
        items: [
            "Fixed not working when switching channel"
        ]
    },
    {
        title: "0.1.0",
        items: [
            "Created a basic working plugin",
            "Added customizable interval time"
        ]
    }],
    main: "index.js",
    defaultConfig: [
        {
            type: "switch",
            name: "Hide Krisp button?",
            note: "If enabled it hides the krisp button from bottom-left status menu(Needs to reload the plugin)",
            id: "hideKrisp",
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
        const { DiscordModules } = Library;
        const {
            SelectedChannelStore: { getVoiceChannelId },
        } = DiscordModules;

        const {
            Webpack,
            Webpack: { Filters },
        } = BdApi;

        return class PingDisplay extends Plugin {
        constructor() {
            super();
            this.getSettingsPanel = () => {
                return this.buildSettingsPanel().getElement();
            };
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
            this.intervalTime=5000;
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

        addPingDisplay() {
            this.statusBar = document.querySelector('.labelWrapper_c0cb95').firstChild;
            if (this.statusBar) {
                this.displayKrispButton(!this.settings.hideKrisp);
                this.statusBar.style.width="100%";

                this.pingElement=document.createElement('div');
                this.pingElement.id='ping-display';
                this.pingElement.style='font-size: 14px;';
            
                this.statusBar.firstChild.style.cssText="text-overflow: ellipsis; overflow: hidden;";

                this.statusBar.appendChild(this.pingElement);
            }
        }

        removePingDisplay() {
            if (this.pingElement) {
                this.displayKrispButton(true);
                this.statusBar.style.width="";

                this.statusBar.firstChild.style.cssText="";
                this.statusBar=null;

                this.pingElement.remove();
                this.pingElement=null;
            }
        }

        getPing(){
            var ping=document.querySelectorAll('[class^="ping_"]')[0];
            if(ping){
                var attr=ping.getAttributeNode("aria-label");
                if(attr){
                   return attr.value.replace(/\s/g, '');
                }
            }
            return null; 
        }

        displayKrispButton(show){
            var krispContainer=document.querySelector(".inner_adcaac")
            if(krispContainer){
                if(show){
                    krispContainer.nextElementSibling.firstChild.style.display="";
                }
                else{
                    krispContainer.nextElementSibling.firstChild.style.display="none";
                }
            }
        }

        updatePing() {
            // checking if user is connected to a channel
            var currChannel=getVoiceChannelId();
            if(this.lastChannel!=currChannel){
                this.removePingDisplay();
                //this.lastChannel=currChannel;
            }
            if (currChannel) {
                if(!this.pingElement){
                    this.addPingDisplay();
                }
                var ping=this.getPing();
                if(ping){
                    this.pingElement.textContent="\u00A0"+this.getPing();
                }
                else{
                    this.pingElement.textContent="";
                }
            }
            else{
                if(!this.pingElement){
                    this.removePingDisplay();
                }
            }
        }
    };
    };
    return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/