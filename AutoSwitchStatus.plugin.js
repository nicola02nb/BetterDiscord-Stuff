/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server. For Bugs or Feature Requests open an issue on my Github.
 * @version 0.4.0
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/AutoSwitchStatus
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/AutoSwitchStatus/main/AutoSwitchStatus.plugin.js
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
        version: "0.4.0",
        description: "Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server.",
        github: "https://github.com/nicola02nb/AutoSwitchStatus",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/AutoSwitchStatus/main/AutoSwitchStatus.plugin.js"
    },
    changelog: [{
            title: "0.4.0",
            items: [
                "Fixed startupStatus instantly overridden by disconnectedStatus on plugin startup",
                "Fixed statusUpdateTime setting not applying until plugin reboot",
                "Added check on a minimum statusUpdateTime to prevent API-spam",
                "Added more debug lines",
                "Added Comments"
            ]
        },{
            title: "0.3.0",
            items: [
                "Fixed plugin not working with some discord languages",
                "Added customizable statuses for Microphone or Sound muted"
            ]
        },{
            title: "0.2.0",
            items: [
                "Changed update system from mouse click to updare every 5000ms (delay time customizable through plugin settings",
                "Added toast when changed status (can be disabled through plugin settings",
                "Optimized by not switching when status hasn't changed"
            ]
        },
        {
            title: "0.1.0",
            items: [
                "Created a basic working plugin",
                "Updates the status on each mouse click on the window",
                "Customizable states through plugin settings"
            ]
        }
    ],
    main: "index.js",
    defaultConfig: [
        {
            type: "category",
            id: "statuses",
            name: "Setting for various statuses",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "dropdown",
                    name: "Startup status:",
                    note: "The status setted when discord starts up. default: Online",
                    id: "startupStatus",
                    value: "online",
                    options: [
                        {label: "Online", value: "online"},
                        {label: "Idle", value: "idle"},
                        {label: "Invisible", value: "invisible"},
                        {label: "Do Not Disturb", value: "dnd"}
                    ]
                },
                {
                    type: "dropdown",
                    name: "Status for muted Sound:",
                    note: "the status selected will be switched to when MUTED. default: Idle",
                    id: "mutedSoundStatus",
                    value: "idle",
                    options: [
                        {label: "Online", value: "online"},
                        {label: "Idle", value: "idle"},
                        {label: "Invisible", value: "invisible"},
                        {label: "Do Not Disturb", value: "dnd"}
                    ]
                },
                {
                    type: "dropdown",
                    name: "Status for muted Microphone:",
                    note: "the status selected will be switched to when MUTED MICROPHONE. default: Online",
                    id: "mutedMicrophoneStatus",
                    value: "online",
                    options: [
                        {label: "Online", value: "online"},
                        {label: "Idle", value: "idle"},
                        {label: "Invisible", value: "invisible"},
                        {label: "Do Not Disturb", value: "dnd"}
                    ]
                },
                {
                    type: "dropdown",
                    name: "Status for connected:",
                    note: "the status selected will be switched to when CONNECTED to a server. default: Online",
                    id: "connectedStatus",
                    value: "online",
                    options: [
                        {label: "Online", value: "online"},
                        {label: "Idle", value: "idle"},
                        {label: "Invisible", value: "invisible"},
                        {label: "Do Not Disturb", value: "dnd"}
                    ]
                },
                {
                    type: "dropdown",
                    name: "Status for disconnected:",
                    note: "the status selected will be switched to when DISCONNECTED from a server. default: Invisible",
                    id: "disconnectedStatus",
                    value: "invisible",
                    options: [
                        {label: "Online", value: "online"},
                        {label: "Idle", value: "idle"},
                        {label: "Invisible", value: "invisible"},
                        {label: "Do Not Disturb", value: "dnd"}
                    ]
                }
            ]
        },
        {
            type: "textbox",
            name: "Update status time (ms)",
            note: "Interval time between each check if your current status needs to be updated",
            id: "updateTime",
            placeholder: "Default: 1000 (ms)",
            defaultValue: 1000,
            value: 1000
        },
        {
            type: "switch",
            name: "Show toast messages?",
            note: "toggles the visibility of \"Changing status\" toast message",
            id: "showToasts",
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
    var DEBUG_ActuallyChangeStatus = false
    function log_debug(module, ...message) {
        if (DEBUG) {
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
            log_debug("VoiceChannelId: " + getVoiceChannelId());
            log_debug("<<PluginSettings>>\n"+JSON.stringify(this.settings, null, 4));

            this.status = null;
            this.updateTime = this.settings.updateTime;
            this.updateStatus(this.settings.statuses.startupStatus);
            
            //window.addEventListener("click", this.SetUserStatus);
            this.interval = setInterval(this.SetUserStatus, this.updateTime);
        }

        onStop() {
            //window.removeEventListener("click", this.SetUserStatus);
            clearInterval(this.interval);
        }
        
        setUserStatus(){
            // checking for changed status update time setting
            if(this.updateTime != this.settings.updateTime){
                log_debug("Changing interval time to "+this.updateTime+"ms");
                // checking if the update time is too low
                if(this.settings.updateTime < 1000){
                    log_debug("Update Interval Time("+this.settings.updateTime+"ms) too low.... resetting to 1000ms");
                    this.settings.updateTime = 1000;
                }
                this.updateTime = this.settings.updateTime;
                clearInterval(this.interval);
                this.interval = setInterval(this.SetUserStatus, this.updateTime);
            }
            if(this.status === null){
                this.status = this.settings.statuses.disconnectedStatus;
            }
            
            // gettimg DOM array containing the Mute Buttons
            let muteButtons = document.querySelector(".container_debb33").querySelectorAll("button");
            if (muteButtons.length < 1) {
                throw "Failed to load. Couldn't find the mute button.";
            }
            
            // DOM variables for Mic and Soud
            const muteMicrophone = muteButtons[0];
            const muteSound = muteButtons[1];

            //getting Mic and Sound button statuses
            const isMicrophoneMuted = muteMicrophone.getAttribute("aria-checked") === 'true';
            const isSoundMuted = muteSound.getAttribute("aria-checked") === 'true';

            // checking channelId to detect if player is Connected to a voice chat
            var channelId = getVoiceChannelId()
            var connected = channelId !== null;
            
            var toSet;
            if(!connected){
                toSet=this.settings.statuses.disconnectedStatus;
            }
            else if(isSoundMuted){
                toSet=this.settings.statuses.mutedSoundStatus;
            }
            else if(isMicrophoneMuted){
                toSet=this.settings.statuses.mutedMicrophoneStatus;
            }
            else{
                toSet=this.settings.statuses.connectedStatus;
            }

            log_debug("<<Variables Status>>" +
                        "\nChannelId: " + channelId +
                        "\nUpdateTime: " + this.updateTime + "ms" +
                        "\nStatus: " + this.status +
                        "\nMicMuted: " + isMicrophoneMuted +
                        "\nSoundMuted: " + isSoundMuted +
                        "\nConnected: " + connected +
                        "\ntoSet: " + toSet);
            
            if(this.status != toSet){
                this.updateStatus(toSet);
                this.status = toSet;
            }

        }

        /**
         * Updates the remote status to the param `toStatus`
         * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
         */
        updateStatus(toStatus) {
            console.log(toStatus);
            if (DEBUG_ActuallyChangeStatus) {
                log_debug("Changing (but not changing) status to: " + toStatus);
                return;
            }
            log_debug("Actually changing status to: " + toStatus);
            UserSettingsProtoUtils.updateAsync(
                "status",
                (statusSetting) => {
                    //log_debug(statusSetting);
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