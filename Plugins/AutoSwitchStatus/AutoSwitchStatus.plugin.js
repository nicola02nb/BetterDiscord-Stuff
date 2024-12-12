/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status to 'away' when you are muted inside a server or 'invisible' when disconnected from a server. For Bugs or Feature Requests open an issue on my Github.
 * @version 1.2.0
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
    changelog: [
        {
            title: "1.2.0",
            type: "improved",
            items: [
                "Updated for new BetterDiscord plugin system",
            ]
        }
    ],
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

const { Webpack, DOM } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");

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
        this.initSettingsValues();
        
        this.locales = {
            online: "Online",
            idle: "Idle",
            invisible: "Invisible",
            dnd: "Do Not Disturb"
        }
    }

    initSettingsValues() {
        for (const setting of config.settings[0].settings) {
            setting.value = this.api.Data.load(setting.id) ?? setting.value;
        }
        config.settings[1].value = this.api.Data.load("mutedSoundStatus") ?? config.settings[1].value;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                if (id === "mutedSoundStatus") config.settings[0].settings[0].value = value;
                if (id === "mutedMicrophoneStatus") config.settings[0].settings[1].value = value;
                if (id === "connectedStatus") config.settings[0].settings[2].value = value;
                if (id === "disconnectedStatus") config.settings[0].settings[3].value = value;
                if (id === 'showToast') config.settings[1].value = value;
                this.api.Data.save(id, value);
            },
        });
    }

    getStatusSetting(id) {
        return config.settings[0].settings.find(setting => setting.id === id).value;
    }

    start() {
        this.api.DOM.addStyle(`.bd-toast.toast-online.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='12.5' y='10' width='0' height='0' rx='0' ry='0' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2323a55a' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-idle.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='6.25' y='3.75' width='7.5' height='7.5' rx='3.75' ry='3.75' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f0b232' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-invisible.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='10' y='7.5' width='5' height='5' rx='2.5' ry='2.5' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%2380848e' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}
        .bd-toast.toast-dnd.icon {background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' %3E%3Cmask id=':r1d:'%3E%3Crect x='7.5' y='5' width='10' height='10' rx='5' ry='5' fill='white'%3E%3C/rect%3E%3Crect x='8.75' y='8.75' width='7.5' height='2.5' rx='1.25' ry='1.25' fill='black'%3E%3C/rect%3E%3Cpolygon points='-2.16506,-2.5 2.16506,0 -2.16506,2.5' fill='black' transform='scale(0) translate(13.125 10)' style='transform-origin: 13.125px 10px;'%3E%3C/polygon%3E%3Ccircle fill='black' cx='12.5' cy='10' r='0'%3E%3C/circle%3E%3C/mask%3E%3Crect fill='%23f23f43' width='25' height='15' mask='url(%23:r1d:)'%3E%3C/rect%3E%3C/svg%3E");}`);

        let channelId = SelectedChannelStore.getVoiceChannelId();
        let containerButtons = document.querySelector('[class^="panels_"]>[class^="container_"]').children[1];
        this.isConnected = channelId !== null;
        this.isMicrophoneMuted = containerButtons?.children[0]?.getAttribute("aria-checked") === 'true';
        this.isSoundMuted = containerButtons?.children[1]?.getAttribute("aria-checked") === 'true';

        this.updateUserStatus();

        this.startMuteObserver();
        this.handleConnection = this.handleConnectionStateChange.bind(this);
        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleConnection);
    }

    stop() {
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleConnection);
        this.handleConnection = null;
        this.stopMuteObserver();
        this.api.DOM.removeStyle();
    }

    handleConnectionStateChange(event) {
        if(event.context === "default"){
            if (event.state === "RTC_CONNECTED") {
                this.isConnected = true;
                this.startMuteObserver();
            } else if (event.state === "DISCONNECTED") {
                this.isConnected = false;
                this.stopMuteObserver();
            }
            this.updateUserStatus();
        }
    }

    startMuteObserver() {
        this.stopMuteObserver();

        const config = { attributes: true, childList: true, subtree: true, attributesFilter: ["aria-checked"] };

        // Callback function when mutations are observed
        const callback = (mutationsList, observer) => {
            mutationsList.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'aria-checked') {
                    let muteButtons = mutation.target.parentElement.children;
                    if (muteButtons.length < 2) {
                        return;
                    }
                    // Getting Mic and Sound button statuses
                    this.isMicrophoneMuted = muteButtons[0].getAttribute("aria-checked") === 'true';
                    this.isSoundMuted = muteButtons[1].getAttribute("aria-checked") === 'true';
                    this.updateUserStatus();
                    return;
                }
            });

        };

        const createObserver = () => {
            // Create and start the observer
            this.muteObserver = new MutationObserver(callback);
            const targetNode = document.querySelector('[class^="panels_"]>[class^="container_"]>[class*="buttons_"]');
            if (targetNode) {
                this.muteObserver.observe(targetNode, config);
            } else {
                this.muteObserver = null;
                setTimeout(createObserver, 500);
            }
        }
        createObserver();
    }

    stopMuteObserver() {
        if (this.muteObserver) {
            this.muteObserver.disconnect();
            this.muteObserver = null;
        }
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
            this.setUserStatus(toSet);
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
            currStatus = this.getStatusSetting("disconnectedStatus");
        }
        else if (this.isSoundMuted) {
            currStatus = this.getStatusSetting("mutedSoundStatus");
        }
        else if (this.isMicrophoneMuted) {
            currStatus = this.getStatusSetting("mutedMicrophoneStatus");
        }
        else {
            currStatus = this.getStatusSetting("connectedStatus");
        }

        return currStatus;
    }

    /**
     * Updates the remote status to the param `toStatus`
     * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
     */
    setUserStatus(toStatus) {
        UserSettingsProtoUtils.updateAsync(
            "status",
            (statusSetting) => {
                statusSetting.status.value = toStatus; //TODO Fix instruction not working on new account uless status changed once manually
            },
            0
        );
        this.showToast(this.locales[toStatus], { type: toStatus });
    }

    /**
     * Shows toast message based on showToast settings
     * @param {string} content
     * @param {{}} [options={}]
     */
    showToast(content, options = {}) {
        if (config.settings[1].value) {
            BdApi.UI.showToast(content, options);
        }
    }
};