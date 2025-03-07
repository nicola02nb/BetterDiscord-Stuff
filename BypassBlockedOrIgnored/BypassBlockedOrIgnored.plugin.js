/**
 * @name BypassBlockedOrIgnored
 * @description Bypass the blocked or ignored user modal if is present in voice channels
 * @version 1.0.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BypassBlockedOrIgnored
 */
const config = {
    changelog: [
        //{ title: "New Stuff", type: "added", items: [""] },
        //{ title: "Bugs Squashed", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
    ],
    settings: [
        { type: "switch", id: "bypassIgnoredUsersModal", name: "Bypass Ignored Users Modal", note: "Bypass the ignored users modal", value: true },
        { type: "switch", id: "bypassBlockedUsersModal", name: "Bypass Blocked Users Modal", note: "Bypass the blocked users modal", value: true },
        { type: "switch", id: "bypassWhenJoining", name: "Bypass When Joining", note: "Bypass the modal when joining a voice channel", value: true },
        { type: "switch", id: "bypassWhenUserJoins", name: "Bypass When User Joins", note: "Bypass the modal when a user joins your voice channel", value: true },
    ]
};

const { Webpack, Patcher } = BdApi;

const RelationshipStore = Webpack.getStore("RelationshipStore");

const handleVoice = Webpack.getModule(m => m.handleVoiceConnect);
const { getBlockedUsersForVoiceChannel, getIgnoredUsersForVoiceChannel } = Webpack.getModule(m => m.getBlockedUsersForVoiceChannel && m.getIgnoredUsersForVoiceChannel);
const handleBoIJoined = Webpack.getModule(m => m.handleBlockedOrIgnoredUserVoiceChannelJoin);

var console = {};

module.exports = class BypassBlockedOrIgnored {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
    }

    setConfigSetting(id, newValue) {
        for (const setting of config.settings) {
            if (setting.id === id) {
                this.BdApi.Data.save(id, newValue);
                return setting.value = newValue;
            }
            if (setting.settings) {
                for (const settingInt of setting.settings) {
                    if (settingInt.id === id) {
                        this.BdApi.Data.save(id, newValue);
                        settingInt.value = newValue;
                    }
                }
            }
        }
    }

    initSettingsValues() {
        for (const setting of config.settings) {
            if (setting.type === "category") {
                for (const settingInt of setting.settings) {
                    settingInt.value = this.BdApi.Data.load(settingInt.id) ?? settingInt.value;
                    this.settings[settingInt.id] = settingInt.value;
                }
            } else {
                setting.value = this.BdApi.Data.load(setting.id) ?? setting.value;
                this.settings[setting.id] = setting.value;
            }
        }
    }

    getSettingsPanel() {
        return this.BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                console.log(category, id, value, typeof value);
                this.setConfigSetting(id, value);
                this.settings[id] = value;
            }
        });
    }

    start() {
        this.initSettingsValues();

        Patcher.before(this.meta.name, handleVoice, "handleVoiceConnect", (thisObject, args) => {
            if (!this.settings.bypassWhenJoining) return;

            const channlId = args[0].channel.id;
            args[0].bypassBlockedWarningModal = shouldBypass(channlId);
        });

        Patcher.instead(this.meta.name, handleBoIJoined, "handleBlockedOrIgnoredUserVoiceChannelJoin", (thisObject, args, originalFunction) => {
            if (!this.settings.bypassWhenUserJoins) return;

            const userId = args[1];

            if (this.settings.bypassIgnoredUsersModal && RelationshipStore.isIgnored(userId) 
                || this.settings.bypassBlockedUsersModal && RelationshipStore.isBlocked(userId)) {
                return;
            }
            originalFunction(args[0], args[1]);
        });
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
    }

    shouldBypass(channlId) {
        const shouldBypassBlocked = this.settings.bypassBlockedUsersModal;
        const hasBlockedUsers = getBlockedUsersForVoiceChannel(channlId).size;
        const shouldBypassIgnored = this.settings.bypassIgnoredUsersModal;
        const hasIgnoredUsers = getIgnoredUsersForVoiceChannel(channlId).size;

        return shouldBypassBlocked && hasBlockedUsers && shouldBypassIgnored
            || !hasBlockedUsers && shouldBypassIgnored && hasIgnoredUsers
            || shouldBypassBlocked && hasBlockedUsers && !hasIgnoredUsers;
    }
};