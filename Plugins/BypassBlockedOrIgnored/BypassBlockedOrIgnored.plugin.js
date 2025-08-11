/**
 * @name BypassBlockedOrIgnored
 * @description Bypass the blocked or ignored user modal if is present in voice channels
 * @version 1.0.5
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BypassBlockedOrIgnored
 */
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added changelog"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "switch", id: "bypassIgnoredUsersModal", name: "Bypass Ignored Users Modal", note: "Bypass the ignored users modal", value: true },
        { type: "switch", id: "bypassBlockedUsersModal", name: "Bypass Blocked Users Modal", note: "Bypass the blocked users modal", value: true },
        { type: "switch", id: "bypassWhenJoining", name: "Bypass When Joining", note: "Bypass the modal when joining a voice channel", value: true },
        { type: "switch", id: "bypassWhenUserJoins", name: "Bypass When User Joins", note: "Bypass the modal when a user joins your voice channel", value: true },
    ]
};

const { Webpack, Patcher, UI, Data } = BdApi;

const RelationshipStore = Webpack.getStore("RelationshipStore");

const handleVoice = Webpack.getModule(m => m.handleVoiceConnect);
const { getBlockedUsersForVoiceChannel, getIgnoredUsersForVoiceChannel } = Webpack.getModule(m => m.getBlockedUsersForVoiceChannel && m.getIgnoredUsersForVoiceChannel);
const handleBoIJoined = Webpack.getModule(m => m.handleBlockedOrIgnoredUserVoiceChannelJoin);

module.exports = class BypassBlockedOrIgnored {
    constructor(meta) {
        this.meta = meta;

        this.settings = new Proxy({}, {
            get: (_target, key) => {
                return Data.load(this.meta.name, key) ?? config.settings.find(setting => setting.id === key || setting.settings?.find(s => s.id === key))?.value;
            },
            set: (_target, key, value) => {
                Data.save(this.meta.name, key, value);
                config.settings.find(setting => setting.id === key || setting.settings?.find(s => s.id === key)).value = value;
                return true;
            }
        });
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (_category, id, value) => {
                this.settings[id] = value;
            }
        });
    }

    showChangelog() {
        if (this.settings.version !== this.meta.version && config.changelog.length > 0) {
            UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            this.settings.version = this.meta.version;
        }
    }

    start() {
        this.showChangelog();

        Patcher.before(this.meta.name, handleVoice, "handleVoiceConnect", (thisObject, args) => {
            if (!this.settings.bypassWhenJoining) return;

            const channlId = args[0].channel.id;
            args[0].bypassBlockedWarningModal = this.shouldBypass(channlId);
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