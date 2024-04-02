/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server.

For Bugs or Feature Requests open an issue on my Github
 * @version 0.1.1
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @website https://github.com/nicola02nb/AutoSwitchStatus
 * @source https://raw.githubusercontent.com/nicola02nb/AutoSwitchStatus/main/AutoSwitchStatus.js
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
        name: "AutoSwitchStatus",
        authors: [
            {
                name: "nicola02nb",
                github_username: "AutoSwitchStatus",
                link: "https://github.com/AutoSwitchStatus"
            }
        ],
        version: "0.1.1",
        description: "Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server.",
        github: "https://github.com/nicola02nb/BetterDiscordPlugin-AutoSwitchStatus",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/BetterDiscordPlugin-AutoSwitchStatus/main/release/AutoIdleOnAFK.plugin.js"
    },
    changelog: [
        {
            type: "Created",
            title: "Created base plugin",
            items: [
                "Created an early working version of the plugin."
            ]
        }
    ],
    main: "index.js",
    DEBUG: false,
    DEBUG_ActuallyChangeStatus: false,
    defaultConfig: [
        {
            type: "dropdown",
            name: "Startup status:",
            note: "The status setted when discord starts up. default: Online",
            id: "startupStatus",
            value: "online",
            options: [
                {
                    label: "Online",
                    value: "online"
                },
                {
                    label: "Idle",
                    value: "idle"
                },
                {
                    label: "Invisible",
                    value: "invisible"
                },
                {
                    label: "Do Not Disturb",
                    value: "dnd"
                }
            ]
        },
        {
            type: "dropdown",
            name: "Status for muted:",
            note: "the status selected will be switched to when MUTED. default: Idle",
            id: "mutedStatus",
            value: "idle",
            options: [
                {
                    label: "Online",
                    value: "online"
                },
                {
                    label: "Idle",
                    value: "idle"
                },
                {
                    label: "Invisible",
                    value: "invisible"
                },
                {
                    label: "Do Not Disturb",
                    value: "dnd"
                }
            ]
        },
        {
            type: "dropdown",
            name: "Status for disconnected:",
            note: "the status selected will be switched to when DISCONNECTED from a server. default: Invisible",
            id: "disconnectedStatus",
            value: "invisible",
            options: [
                {
                    label: "Online",
                    value: "online"
                },
                {
                    label: "Idle",
                    value: "idle"
                },
                {
                    label: "Invisible",
                    value: "invisible"
                },
                {
                    label: "Do Not Disturb",
                    value: "dnd"
                }
            ]
        },
        {
            type: "switch",
            name: "Show toast messages?",
            note: "toggles the visibility of \"Changing status\" toast message",
            id: "showToasts",
            defaultValue: true,
            value: true
        }
    ]
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
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

    // Logger.info("VC: " + getVoiceChannelId());

    const {
        Webpack,
        Webpack: { Filters },
    } = BdApi;

    const UserSettingsProtoStore = BdApi.Webpack.getModule(
        (m) =>
            m &&
            typeof m.getName == "function" &&
            m.getName() == "UserSettingsProtoStore" &&
            m,
        { first: true, searchExports: true }
    );

    const UserSettingsProtoUtils = BdApi.Webpack.getModule(
        (m) =>
            m.ProtoClass &&
            m.ProtoClass.typeName.endsWith(".PreloadedUserSettings"),
        { first: true, searchExports: true }
    );

    var DEBUG = false;
    function log_debug(module, ...message) {
        if (DEBUG !== true) {
            return;
        } else {
            Logger.debug(module, ...message);
        }
    }

    return class AutoSwitchStatus extends Plugin {

        constructor() {
            super();

            this.getSettingsPanel = () => {
                return this.buildSettingsPanel().getElement();
            };

            this.SetUserStatus = this.setUserStatus.bind(this);
        }

        onStart() {
            if (this._config.DEBUG === true) {
                DEBUG = true;
                log_debug(this);
                log_debug("Current status: " + this.currentStatus());
                log_debug("In Voice Channel: " + this.inVoiceChannel());
                log_debug(
                    "onlineStatusAndNotInVC: " + this.onlineStatusAndNotInVC()
                );
            }
            this.status=this.settings.startupStatus
            this.updateStatus(this.status);
            
            window.addEventListener("click", this.SetUserStatus);
        }

        onStop() {
            window.removeEventListener("click", this.SetUserStatus);
        }
        setUserStatus(){
            let muteButtons = document.querySelectorAll('[aria-label="Silenzia"]');
            if (muteButtons.length < 1) {
                throw "Failed to load. Couldn't find the mute button.";
            }
            const muteButton = muteButtons[0];

            // return true/false based on mute button state
            const areWeMuted = muteButton.getAttribute("aria-checked") === 'true';

            var muted=areWeMuted, connected = getVoiceChannelId() !== null;
            log_debug("test: "+connected);
            var toSet;
            if(!connected){
                toSet=this.settings.disconnectedStatus;
            }
            else if(muted){
                toSet=this.settings.mutedStatus;
            }
            else{
                toSet="online";
            }  
            if(this.status!=toSet){
                this.updateStatus(toSet);
                this.status=toSet;
            } 
        }

        /**
         * Updates the remote status to the param `toStatus`
         * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
         */
        updateStatus(toStatus) {
            console.log(toStatus);
            if (
                this._config.DEBUG === true &&
                this._config.DEBUG_ActuallyChangeStatus === false
            ) {
                log_debug("Changing (but not changing) status to: " + toStatus);
                return;
            }
            log_debug("Actually changing status to: " + toStatus);
            UserSettingsProtoUtils.updateAsync(
                "status",
                (statusSetting) => {
                    log_debug(statusSetting);
                    statusSetting.status.value = toStatus;
                    this.showToast(toStatus);
                },
                0
            );
        }

        /**
         * shows toast message based on showToast settings
         * @param {string} msg
         */
        showToast(msg) {
            if (this.settings.showToasts) {
                BdApi.showToast(msg);
            }
        }
    };
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/