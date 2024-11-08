/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server. For Bugs or Feature Requests open an issue on my Github.
 * @version 0.5.7
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/AutoSwitchStatus
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/AutoSwitchStatus/AutoSwitchStatus.plugin.js
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
                github_username: "nicola02nb",
                link: "https://github.com/nicola02nb"
            }
        ],
        version: "0.5.7",
        description: "Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server.",
        github: "https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/AutoSwitchStatus",
        github_raw: "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/AutoSwitchStatus/AutoSwitchStatus.plugin.js"
    },
    changelog: [{
        title: "0.5.7",
            items: [
                "Removed Changelog",
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
                    name: "Status for muted Sound:",
                    note: "the status selected will be switched to when MUTED SOUND. default: Idle",
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
        Webpack
    } = BdApi;
    
    const LanguageStore = Webpack.getModule(Webpack.Filters.byProps("getLocale"));

    /*const UserSettingsProtoStore = BdApi.Webpack.getModule(
        (m) =>
            m &&
            typeof m.getName == "function" &&
            m.getName() == "UserSettingsProtoStore" &&
            m,
        { first: true, searchExports: true }
    );*/

    const UserSettingsProtoUtils = BdApi.Webpack.getModule(
        (m) =>
            m.ProtoClass &&
            m.ProtoClass.typeName.endsWith(".PreloadedUserSettings"),
        { first: true, searchExports: true }
    );

    var DEBUG = false;
    var DEBUG_ActuallyChangeStatus = true;
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
            log_debug("<<PluginSettings>>\n"+JSON.stringify(this.settings, null, 4));
            
            this.languageCode=this.getClientLanguage();
            this.languageTranslation=this.getStatusTranslations(this.languageCode);
            this.status=this.settings.statuses.disconnectedStatus;
            this.updateTime=this.settings.updateTime;
            this.updateStatus(this.status);
            
            //window.addEventListener("click", this.SetUserStatus);
            this.interval = setInterval(this.SetUserStatus, this.updateTime);

            const style = document.createElement('style')
            style.id = "customStyle-auto-switch-status"
            style.innerText = `.bd-toast.toast-online.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='12.5' y='10' width='0' height='0' rx='0' ry='0' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2323a55a' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
            .bd-toast.toast-idle.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='6.25' y='3.75' width='7.5' height='7.5' rx='3.75' ry='3.75' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f0b232' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
            .bd-toast.toast-invisible.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='10' y='7.5' width='5' height='5' rx='2.5' ry='2.5' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2380848e' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
            .bd-toast.toast-dnd.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='8.75' y='8.75' width='7.5' height='2.5' rx='1.25' ry='1.25' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f23f43' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}`
            document.body.appendChild(style)
        }

        onStop() {
            //window.removeEventListener("click", this.SetUserStatus);
            clearInterval(this.interval);
            document.getElementById("customStyle-auto-switch-status").remove()
        }
        
        /**
         * Functions used by the interval that checks for new user status
         *  or for changed update interval 
         */
        setUserStatus(){
            var toSet=this.getUserCurrentStatus();

            log_debug("<<Variables Status>>" +
                        "\nLanguage: " + this.languageCode +
                        "\nChannelId: " + this.channelId +
                        "\nUpdateTime: " + this.updateTime + "ms" +
                        "\nStatus: " + this.status +
                        "\nMicMuted: " + this.isMicrophoneMuted +
                        "\nSoundMuted: " + this.isSoundMuted +
                        "\nConnected: " + this.connected +
                        "\ntoSet: " + toSet);

            // checking for changed status update time setting
            if(this.updateTime != this.settings.updateTime){
                this.updateIntervalTime();
            }

            // checking if the status has changed since last time
            if(this.status != toSet){
                this.status = toSet;
                this.updateStatus(toSet);
            }

        }

        /**
         * Funtion that returns the current user status
         * @returns {('online'|'idle'|'invisible'|'dnd')}
         * @throws when the mute buttons aren't found
         */
        getUserCurrentStatus(){
            // gettimg DOM array containing the Mute Buttons
            //let container = document.querySelector('[class*="container_b2ca13"]');
            let container = document.querySelector('[class^="panels_"]>[class^="container_"]').children[1];
            if (!container) {
                log_debug("Couldn't find the mute buttons container. Maybe selector changed.");
                return this.status;
            }
            let muteButtons = container.querySelectorAll("button");
            if (muteButtons.length < 1) {
                log_debug("Couldn't find the mute buttons.");
                return this.status;
            }
            
            // DOM variables for Mic and Soud
            const muteMicrophone = muteButtons[0];
            const muteSound = muteButtons[1];

            //getting Mic and Sound button statuses
            this.isMicrophoneMuted = muteMicrophone.getAttribute("aria-checked") === 'true';
            this.isSoundMuted = muteSound.getAttribute("aria-checked") === 'true';

            // checking channelId to detect if player is Connected to a voice chat
            this.channelId = getVoiceChannelId();
            this.connected = this.channelId !== null;
            
            var currStatus;
            if(!this.connected){
                currStatus=this.settings.statuses.disconnectedStatus;
            }
            else if(this.isSoundMuted){
                currStatus=this.settings.statuses.mutedSoundStatus;
            }
            else if(this.isMicrophoneMuted){
                currStatus=this.settings.statuses.mutedMicrophoneStatus;
            }
            else{
                currStatus=this.settings.statuses.connectedStatus;
            }

            return currStatus;
        }

        /**
         * Function that recreates the interval with the new updateTime
         */
        updateIntervalTime(){
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

        /**
         * Updates the remote status to the param `toStatus`
         * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
         */
        updateStatus(toStatus) {
            if(this.languageCode!=this.getClientLanguage()){
                this.languageCode=this.getClientLanguage();
                this.languageTranslation=this.getStatusTranslations(this.languageCode);
            }

            if (DEBUG_ActuallyChangeStatus) {
                log_debug("Actually changing status to: " + toStatus);
                UserSettingsProtoUtils.updateAsync(
                    "status",
                    (statusSetting) => {
                        statusSetting.status.value = toStatus; //TODO Fix instruction not working on new account uless status changed once manually
                    },
                    0
                );
            }
            else {
                log_debug("Changing (but not changing) status to: " + toStatus);
            }
            this.showToast(this.languageTranslation[toStatus], {type: toStatus});
        }

        /**
         * shows toast message based on showToast settings
         * @param {string} msg
         */
        showToast(msg, options = {}) {
            if (this.settings.showToasts) {
                BdApi.showToast(msg, options);
            }
        }

        getClientLanguage(){
            const currentLocale = LanguageStore.getLocale();
            return currentLocale.split("-")[0];    
        }

        getStatusTranslations(languageCode) {
            switch (languageCode) {
                case "bg": // Bulgarian
                    return {
                        online: "Онлайн",
                        idle: "Неактивен",
                        invisible: "Невидим",
                        dnd: "Не се притеснявайте"
                    };
                case "da": // Danish
                    return {
                        online: "Online",
                        idle: "Inaktiv",
                        invisible: "Usynlig",
                        dnd: "Optaget"
                    };
                case "de": // German
                    return {
                        online: "Online",
                        idle: "Inaktiv",
                        invisible: "Unsichtbar",
                        dnd: "Bitte nicht stören"
                    };
                case "el": // Greek
                    return {
                        online: "Συνδεδεμένος",
                        idle: "Αδρανής",
                        invisible: "Αόρατος",
                        dnd: "Μην ενοχλείτε"
                    };
                case "es": // Spanish
                    return {
                        online: "En línea",
                        idle: "Inactivo",
                        invisible: "Invisible",
                        dnd: "No molestar"
                    };
                case "fi": // Finnish
                    return {
                        online: "Paikalla",
                        idle: "Poissa",
                        invisible: "Näkymätön",
                        dnd: "Älä häiritse"
                    };
                case "fr": // French
                    return {
                        online: "En ligne",
                        idle: "Inactif",
                        invisible: "Invisible",
                        dnd: "Ne pas déranger"
                    };
                case "hr": // Croatian
                    return {
                        online: "Dostupan",
                        idle: "Neaktivan",
                        invisible: "Nevidljiv",
                        dnd: "Ne uznemiravaj"
                    };
                case "hu": // Hungarian
                    return {
                        online: "Elérhető",
                        idle: "Tétlen",
                        invisible: "Láthatatlan",
                        dnd: "Ne zavarjanak"
                    };
                case "it": // Italian
                    return {
                        online: "Online",
                        idle: "Inattivo",
                        invisible: "Invisibile",
                        dnd: "Non disturbare"
                    };
                case "ja": // Japanese
                    return {
                        online: "オンライン",
                        idle: "アイドル",
                        invisible: "不在",
                        dnd: "取り込み中"
                    };
                case "ko": // Korean
                    return {
                        online: "온라인",
                        idle: "비활성",
                        invisible: "숨김",
                        dnd: "다른 용무 중"
                    };
                case "lt": // Lithuanian
                    return {
                        online: "Prisijungęs",
                        idle: "Neaktyvus",
                        invisible: "Nematomas",
                        dnd: "Ne(trukdyti)"
                    };
                case "nl": // Dutch
                    return {
                        online: "Online",
                        idle: "Inactief",
                        invisible: "Onzichtbaar",
                        dnd: "Niet storen"
                    };
                case "no": // Norwegian
                    return {
                        online: "Tilgjengelig",
                        idle: "Ikke tilgjengelig",
                        invisible: "Usynlig",
                        dnd: "Ikke forstyrr"
                    };
                case "pl": // Polish
                    return {
                        online: "Dostępny",
                        idle: "Nieobecny",
                        invisible: "Niewidoczny",
                        dnd: "Nie przeszkadzać"
                    };
                case "pt-BR": // Portuguese (Brazil)
                    return {
                        online: "Online",
                        idle: "Ausente",
                        invisible: "Invisível",
                        dnd: "Não perturbe"
                    };
                case "ro": // Romanian
                    return {
                        online: "Conectat",
                        idle: "Absent",
                        invisible: "Invizibil",
                        dnd: "Nu deranjați"
                    };
                case "ru": // Russian
                    return {
                        online: "Онлайн",
                        idle: "Неактивен",
                        invisible: "Невидимый",
                        dnd: "Не беспокоить"
                    };
                case "sv": // Swedish
                    return {
                        online: "Tillgänglig",
                        idle: "Inaktiv",
                        invisible: "Osynlig",
                        dnd: "Stör ej"
                    };
                case "th": // Thai
                    return {
                        online: "ออนไลน์",
                        idle: "ไม่อยู่",
                        invisible: "ซ่อน",
                        dnd: "ไม่สะดวก"
                    };
                case "tr": // Turkish
                    return {
                        online: "Çevrimiçi",
                        idle: "Uyku modu",
                        invisible: "Görünmez",
                        dnd: "Rahatsız Etmeyin"
                    };
                case "uk": // Ukrainian
                    return {
                        online: "Онлайн",
                        idle: "Неактивний",
                        invisible: "Невидимий",
                        dnd: "Не турбувати"
                    };
                case "vi": // Vietnamese
                    return {
                        online: "Trực tuyến",
                        idle: "Vắng mặt",
                        invisible: "Ẩn danh",
                        dnd: "Đừng làm phiền"
                    };
                case "zh-CN": // Chinese (China)
                    return {
                        online: "在线",
                        idle: "离开",
                        invisible: "隐身",
                        dnd: "请勿打扰"
                    };
                case "zh-TW": // Chinese (Taiwan)
                    return {
                        online: "線上",
                        idle: "離開",
                        invisible: "隱身",
                        dnd: "請勿打擾"
                    };
                default: // Default (English)
                    return {
                        online: "Online",
                        idle: "Idle",
                        invisible: "Invisible",
                        dnd: "Do Not Disturb"
                    };
            }
        }        
    };
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/