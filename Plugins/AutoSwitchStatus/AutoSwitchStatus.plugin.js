/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server. For Bugs or Feature Requests open an issue on my Github.
 * @version 1.5.0
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/AutoSwitchStatus
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/AutoSwitchStatus/AutoSwitchStatus.plugin.js
 */
const dropdownStatusOptions = [
    { label: "Online", value: "online" },
    { label: "Idle", value: "idle" },
    { label: "Invisible", value: "invisible" },
    { label: "Do Not Disturb", value: "dnd" }
]

const config = {
    changelog: [],
    settings: [{
        type: "category",
        id: "statuseSettings",
        name: "Status Settings",
        collapsible: true,
        shown: true,
        settings: [
            {
                type: "dropdown",
                id: "mutedMicrophoneStatus",
                name: "Status for muted Microphone:",
                value: "online",
                options: dropdownStatusOptions
            },
            {
                type: "dropdown",
                id: "mutedSoundStatus",
                name: "Status for muted Sound:",
                value: "idle",
                options: dropdownStatusOptions
            },
            {
                type: "dropdown",
                id: "connectedStatus",
                name: "Status for connected:",
                value: "online",
                options: dropdownStatusOptions
            },
            {
                type: "dropdown",
                id: "disconnectedStatus",
                name: "Status for disconnected:",
                value: "invisible",
                options: dropdownStatusOptions
            },
        ]
    },
    {
        type: "switch",
        id: "showToast",
        name: "Show Toast",
        note: "If enabled, displays a toast message when the status changes",
        value: true
    }]
};

function setConfigSetting(id, newValue) {
    for (const setting of config.settings) {
        if (setting.id === id) {
            Data.save("AutoSwitchStatus", id, newValue);
            return setting.value = newValue;
        }
        if (setting.settings) {
            for (const settingInt of setting.settings) {
                if (settingInt.id === id) {
                    Data.save("AutoSwitchStatus", id, newValue);
                    settingInt.value = newValue;
                }
            }
        }
    }

}

function getConfigSetting(id) {
    for (const setting of config.settings) {
        if (setting.id === id) {
            return setting.value;
        }
        if (setting.settings) {
            for (const settingInt of setting.settings) {
                if (settingInt.id === id) {
                    return settingInt.value;
                }
            }
        }
    }
}

function initSettingsValues() {
    for (const setting of config.settings) {
        if (setting.type === "category") {
            for (const settingInt of setting.settings) {
                settingInt.value = Data.load("AutoSwitchStatus", settingInt.id) ?? settingInt.value;
            }
        } else {
            setting.value = Data.load("AutoSwitchStatus", setting.id) ?? setting.value;
        }
    }
}

const { Webpack, Data } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const getConnectedUser = Webpack.getByKeys("getCurrentUser");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
var console = {};

const UserSettingsProtoUtils = Webpack.getModule(
    (m) =>
        m.ProtoClass &&
        m.ProtoClass.typeName.endsWith(".PreloadedUserSettings"),
    { first: true, searchExports: true }
);

module.exports = class AutoSwitchStatus {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
        console = this.api.Logger;
        initSettingsValues();

        this.locales = {
            online: "Online",
            idle: "Idle",
            invisible: "Invisible",
            dnd: "Do Not Disturb"
        }
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                setConfigSetting(id, value);
            },
        });
    }

    start() {
        this.handleConnection = this.handleConnectionStateChange.bind(this);
        this.handleMute = this.handleMuteStateChange.bind(this);

        this.api.DOM.addStyle(`.bd-toast.toast-online.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='12.5' y='10' width='0' height='0' rx='0' ry='0' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2323a55a' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-idle.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='6.25' y='3.75' width='7.5' height='7.5' rx='3.75' ry='3.75' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f0b232' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-invisible.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='10' y='7.5' width='5' height='5' rx='2.5' ry='2.5' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2380848e' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-dnd.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='8.75' y='8.75' width='7.5' height='2.5' rx='1.25' ry='1.25' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f23f43' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}`);

        let userId = getConnectedUser.getCurrentUser().id;
        let channelId = SelectedChannelStore.getVoiceChannelId();
        const containerButtons = document.querySelector('[class^="avatarWrapper_"] + * ')?.children
        this.isConnected = channelId !== null;
        this.isMicrophoneMuted = containerButtons[0]?.getAttribute("aria-checked") === 'true';;
        this.wasMicrophoneMuted = this.isMicrophoneMuted;    
        this.isSoundMuted = containerButtons[1]?.getAttribute("aria-checked") === 'true';

        this.status = undefined;
        this.updateUserStatus();

        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleConnection);
        DiscordModules.subscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleMute);
        DiscordModules.subscribe("AUDIO_TOGGLE_SELF_MUTE", this.handleMute);
    }

    stop() {
        DiscordModules.unsubscribe("AUDIO_TOGGLE_SELF_MUTE", this.handleMute);
        DiscordModules.unsubscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleMute);
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleConnection);
        this.api.DOM.removeStyle();
    }

    handleConnectionStateChange(event) {
        if (event.context === "default") {
            if (event.state === "RTC_CONNECTED") {
                this.isConnected = true;
            } else if (event.state === "RTC_DISCONNECTED") {
                this.isConnected = false;
            }
            this.updateUserStatus();
        }
    }

    handleMuteStateChange(event) {
        if (event.type === "AUDIO_TOGGLE_SELF_MUTE") {
            this.isMicrophoneMuted = !this.isMicrophoneMuted;
            this.isSoundMuted = !this.isMicrophoneMuted && this.isSoundMuted ? false : this.isSoundMuted;
            this.wasMicrophoneMuted = this.isMicrophoneMuted;
        } else if (event.type === "AUDIO_TOGGLE_SELF_DEAF") {
            this.isSoundMuted = !this.isSoundMuted;
            this.isMicrophoneMuted = this.isSoundMuted || this.wasMicrophoneMuted;
        }
        this.updateUserStatus();
    }

    /**
     * Functions used by the interval that checks for new user status
     *  or for changed update interval 
     */
    updateUserStatus() {
        var toSet = this.getUserCurrentStatus();

        // checking if the status has changed since last time
        if (this.status != toSet) {
            this.status = toSet;

            this.updateStatus(toSet);
        }
    }

    /**
     * Funtion that returns the current user status
     * @returns {('online'|'idle'|'invisible'|'dnd')}
     * @throws when the mute buttons aren't found
     */
    getUserCurrentStatus() {
        var currStatus;
        if (!this.isConnected) {
            currStatus = getConfigSetting("disconnectedStatus");
        }
        else if (this.isSoundMuted) {
            currStatus = getConfigSetting("mutedSoundStatus");
        }
        else if (this.isMicrophoneMuted) {
            currStatus = getConfigSetting("mutedMicrophoneStatus");
        }
        else {
            currStatus = getConfigSetting("connectedStatus");
        }

        return currStatus;
    }

    /**
     * Updates the remote status to the param `toStatus`
     * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
     */
    updateStatus(toStatus) {
        UserSettingsProtoUtils.updateAsync(
            "status",
            (settings) => {
                settings.status.value = toStatus;
            }, 15); // 15 is the seconds after which the status will be updated through the API (Prevents rate limiting)
        this.showToast(this.locales[toStatus], { type: toStatus });
    }

    /**
     * Shows toast message based on showToast settings
     * @param {string} content
     * @param {{}} [options={}]
     */
    showToast(content, options = {}) {
        if (getConfigSetting("showToast")) {
            BdApi.UI.showToast(content, options);
        }
    }
};