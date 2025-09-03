/**
 * @name BypassBlockedOrIgnored
 * @description Bypass the blocked or ignored user modal if is present in voice channels
* @version 1.0.10
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BypassBlockedOrIgnored
 */
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: ["Added changelog"] },
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
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, Patcher, UI, Data } = BdApi;
const { Filters } = Webpack;

const [ RelationshipStore, handleVoice, { getBlockedUsersForVoiceChannel, getIgnoredUsersForVoiceChannel }, handleBoIJoined ] = Webpack.getBulk(
    { filter: Filters.byStoreName("RelationshipStore") },
    { filter: m => m.handleVoiceConnect },
    { filter: m => m.getBlockedUsersForVoiceChannel && m.getIgnoredUsersForVoiceChannel },
    { filter: m => m.handleBlockedOrIgnoredUserVoiceChannelJoin }
);

module.exports = class BypassBlockedOrIgnored {
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
            onChange: (_category, id, value) => {
                this.settings[id] = value;
            }
        });
    }

    showChangelog() {
        const savedVersion = Data.load(this.meta.name, "version");
		if (savedVersion !== this.meta.version) {
			if(config.changelog.length > 0){
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
        this.initSettings();
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