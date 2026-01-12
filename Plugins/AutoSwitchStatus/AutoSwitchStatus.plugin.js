/**
 * @name AutoSwitchStatus
 * @description Automatically switches your discord status when you are muted, connected to a server or when disconnected from a server.
 * @version 1.9.3
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/AutoSwitchStatus
 */
const dropdownStatusOptions = [
    { label: "Online", value: "online" },
    { label: "Idle", value: "idle" },
    { label: "Invisible", value: "invisible" },
    { label: "Do Not Disturb", value: "dnd" }
];

const SECONDS_TO_PREVENT_RATE_LIMITING = 15;

const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        {
            type: "category",
            id: "statusSettings",
            name: "Status Settings",
            collapsible: true,
            shown: true,
            settings: [
                { type: "dropdown", id: "mutedMicrophoneStatus", name: "Status for muted Microphone:", value: "online", options: dropdownStatusOptions },
                { type: "dropdown", id: "mutedSoundStatus", name: "Status for muted Sound:", value: "idle", options: dropdownStatusOptions },
                { type: "dropdown", id: "connectedStatus", name: "Status for connected:", value: "online", options: dropdownStatusOptions },
                { type: "dropdown", id: "disconnectedStatus", name: "Status for disconnected:", value: "invisible", options: dropdownStatusOptions }
            ]
        },
        { type: "switch", id: "showToast", name: "Show Toast", note: "If enabled, displays a toast message when the status changes", value: true }
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, Data, UI, Patcher } = BdApi;
const { Filters } = Webpack;
const [DiscordModules, RTCConnectionStore, MediaEngineStore, UserSettingsProtoStore, UserSettingsProtoUtils] = Webpack.getBulk(
    { filter: (m => m.dispatch && m.subscribe) },
    { filter: Filters.byStoreName("RTCConnectionStore") },
    { filter: Filters.byStoreName("MediaEngineStore") },
    { filter: Filters.byStoreName("UserSettingsProtoStore") },
    { filter: m => m.ProtoClass && m.ProtoClass.typeName.endsWith(".PreloadedUserSettings"), first: true, searchExports: true }
);

module.exports = class AutoSwitchStatus {
    constructor(meta) {
        this.meta = meta;

        this.settings = new Proxy({}, {
            get: (_target, key) => {
                return Data.load(this.meta.name, key) ?? getSetting(key)?.value;
            },
            set: (_target, key, value) => {
                Data.save(this.meta.name, key, value);
                getSetting(key).value = value;
                return true;
            }
        });

        this.handleUpdateUserStatus = this.updateUserStatus.bind(this);

        this.justSettedStatus = '';
        this.justSettedDND = false;

        this.locales = {
            online: "Online",
            idle: "Idle",
            invisible: "Invisible",
            dnd: "Do Not Disturb"
        }
        this.statusToToastType = {
            online: "success",
            idle: "warning",
            invisible: "info",
            dnd: "error"
        };
    }

    initSettings(settings = config.settings) {
        settings.forEach(setting => {
            if (setting.settings) {
                this.initSettings(setting.settings);
            } else if (setting.id) {
                this.settings[setting.id] = Data.load(this.meta.name, setting.id) ?? setting.value;
            }
        });
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.settings[id] = value;
            },
        });
    }

    showChangelog() {
        const savedVersion = Data.load(this.meta.name, "version");
        if (savedVersion !== this.meta.version) {
            if (config.changelog.length > 0) {
                UI.showChangelogModal({
                    title: this.meta.name,
                    subtitle: this.meta.version,
                    changes: config.changelog
                });
            }
            Data.save(this.meta.name, "version", this.meta.version);
        }
    }

    start() {
        this.showChangelog();
        this.initSettings();

        this.updateUserStatus();

        DiscordModules.subscribe("USER_SETTINGS_PROTO_UPDATE_EDIT_INFO", this.handleUpdateUserStatus);
        DiscordModules.subscribe("RTC_CONNECTION_STATE", this.handleUpdateUserStatus);
        DiscordModules.subscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleUpdateUserStatus);
        DiscordModules.subscribe("AUDIO_TOGGLE_SELF_MUTE", this.handleUpdateUserStatus);

        Patcher.instead(this.meta.name, UserSettingsProtoUtils, "updateAsync", async (thisObject, args, originalFunction) => {
            if (this.justSettedDND && args[0] === "userContent" && args[2] === 0) {
                args[2] = SECONDS_TO_PREVENT_RATE_LIMITING;
                this.justSettedDND = false;
            }

            return await originalFunction(...args);
        });
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("AUDIO_TOGGLE_SELF_MUTE", this.handleUpdateUserStatus);
        DiscordModules.unsubscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleUpdateUserStatus);
        DiscordModules.unsubscribe("RTC_CONNECTION_STATE", this.handleUpdateUserStatus);
        DiscordModules.unsubscribe("USER_SETTINGS_PROTO_UPDATE_EDIT_INFO", this.handleUpdateUserStatus);
    }

    updateUserStatus(event) {
        if (event?.type === "USER_SETTINGS_PROTO_UPDATE_EDIT_INFO" && event.settings.changes.protoToSave) {
            this.justSettedStatus = event.settings.changes.protoToSave?.status?.status?.value ?? this.justSettedStatus;
            return;
        }
        const toSet = this.getUserCurrentStatus();

        if (toSet !== this.justSettedStatus) {
            this.setStatus(toSet);
        }
    }

    getUserCurrentStatus() {
        if (!RTCConnectionStore.isConnected()) {
            return this.settings.disconnectedStatus;
        }
        else if (MediaEngineStore.isSelfDeaf()) {
            return this.settings.mutedSoundStatus;
        }
        else if (MediaEngineStore.isSelfMute()) {
            return this.settings.mutedMicrophoneStatus;
        }
        else {
            return this.settings.connectedStatus;
        }
    }

    setStatus(status) {
        this.justSettedStatus = status;
        this.justSettedDND = (status === "dnd");
        UserSettingsProtoUtils.updateAsync("status",
            (settings) => { settings.status.value = status; },
            SECONDS_TO_PREVENT_RATE_LIMITING  // the seconds after which the status will be updated through the API (Prevents rate limiting)
        );
        if (this.settings.showToast) {
            UI.showToast(this.locales[status], { type: this.statusToToastType[status], icon: false });
        }
    }
};