/**
 * @name CompleteDiscordQuest
 * @description A plugin that completes you multiple discord quests in background simultaneously.
 * @version 1.5.6
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/CompleteDiscordQuest
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/refs/heads/main/Plugins/CompleteDiscordQuest/CompleteDiscordQuest.plugin.js
 */

// Porting of https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb for betterdiscord

const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added quest filtering by reward type customizable in settings."] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "switch", id: "acceptQuestsAutomatically", name: "Accept Quests Automatically", note: "Whether to accept available quests automatically.", value: true },
        {
            type: "category", id: "uiElements", name: "UI Elements", collapsible: true, shown: false, settings: [
                { type: "switch", id: "showQuestsButtonTitleBar", name: "Show Quests Title Bar", note: "Whether to show the quests button in the title bar.", value: true },
                { type: "switch", id: "showQuestsButtonSettingsBar", name: "Show Quests Settings Bar", note: "Whether to show the quests button in the settings bar.", value: true },
                { type: "switch", id: "showQuestsButtonBadges", name: "Show Quests Badges", note: "Whether to show badges on the quests button.", value: true },
            ]
        },
        {
            type: "category", id: "questTypeFilters", name: "Quest Type Filters", collapsible: true, shown: false, settings: [
                { type: "switch", id: "farmVideos", name: "Videos", note: "Whether to farm video quests automatically.", value: true },
                { type: "switch", id: "farmPlayOnDesktop", name: "Play On Desktop", note: "Whether to farm desktop games quests automatically.", value: true },
                { type: "switch", id: "farmStreamOnDesktop", name: "Streaming", note: "Whether to farm streaming quests automatically.", value: true },
                { type: "switch", id: "farmPlayActivity", name: "Activities", note: "Whether to farm activities quests automatically.", value: true },
            ]
        },
        {
            type: "category", id: "questRewardsFilters", name: "Quest Rewards Filters", collapsible: true, shown: false, settings: [
                { type: "switch", id: "farmRewardCodes", name: "Reward Codes", note: "Whether to farm reward codes automatically.", value: true },
                { type: "switch", id: "farmInGame", name: "In Game (Quests)", note: "Whether to farm in-game quests automatically.", value: true },
                { type: "switch", id: "farmCollectibles", name: "Collectibles (Decorations)", note: "Whether to farm discord user appearance decorations automatically.", value: true },
                { type: "switch", id: "farmVirtualCurrency", name: "Virtual Currency (Orbs)", note: "Whether to farm orbs automatically.", value: true },
                { type: "switch", id: "farmFractionalPremium", name: "Fractional Premium", note: "Whether to farm fractional premium automatically.", value: true },
            ]
        },
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const fs = require("fs");
const path = require("path");
const { Webpack, Data, UI, Patcher, DOM, React, ReactUtils, Components, Utils, Plugins, Net, Logger } = BdApi;
const { Filters } = Webpack;
const [DiscordModules, ApplicationStreamingStore, RunningGameStore, QuestsStore,
    ChannelStore, GuildChannelStore, RestApi, QuestApplyAction, QuestLocationMap,
    QuestIcon, { navigateToQuestHome }, CountBadge,
    windowArea, SettingsBarModule, trailingModule,
    SettingsBarButton] = Webpack.getBulk(
        { filter: Filters.byKeys("subscribe", "dispatch"), searchExports: true },
        { filter: Filters.byStoreName("ApplicationStreamingStore") },
        { filter: Filters.byStoreName("RunningGameStore") },
        { filter: Filters.byKeys("getQuest") },
        { filter: Filters.byStoreName("ChannelStore") },
        { filter: Filters.byStoreName("GuildChannelStore") },
        { filter: m => typeof m === 'object' && m.del && m.put, searchExports: true },
        { filter: Filters.byStrings("type:\"QUESTS_ENROLL_BEGIN\""), searchExports: true },
        { filter: Filters.byKeys("QUEST_HOME_DESKTOP", "11"), searchExports: true },
        { filter: Filters.bySource("\"M7.5 21.7a8.95") },
        { filter: Filters.byKeys("navigateToQuestHome") },
        { filter: Filters.byStrings("renderBadgeCount", "disableColor"), searchExports: true },
        { filter: Filters.bySource("windowKey:", "showDivider:") },
        { filter: Filters.byStrings("handleToggleSelfMute"), searchExports: true },
        { filter: Filters.byKeys('bar', 'trailing') },
        { filter: Filters.byStrings("keyboardShortcut", "positionKey"), searchExports: true },
    );

const TopBarButton = [...Webpack.getWithKey(Filters.byStrings("badgePosition:"), { searchExports: true })];
const QuestButtonWithKey = [...Webpack.getWithKey(Filters.byStrings("focusProps:", "interactiveClassName:"))];
const trailing = trailingModule.trailing;
const { Tooltip, Flex } = Components;

function reRender(selector, patchId) {
    const target = document.querySelector(selector)?.parentElement;
    if (!target) return;
    const instance = ReactUtils.getOwnerInstance(target);
    const unpatch = Patcher.instead(patchId, instance, "render", () => unpatch());
    instance.forceUpdate(() => instance.forceUpdate());
}

module.exports = class BasePlugin {
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

        this.handleUpdateQuests = this.updateQuests.bind(this);

        this.completingQuests = new Map();
        this.fakeGames = new Map();
        this.fakeApplications = new Map();
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
                switch (id) {
                    case "showQuestsButtonTopBar":
                        if (value) {
                            this.patchTitleBar();
                        } else {
                            this.unpatchTitleBar();
                        }
                        break;
                }
            }
        });
    }

    parseMeta(fileContent) {
        //zlibrary code
        const splitRegex = /[^\S\r\n]*?\r?(?:\r\n|\n)[^\S\r\n]*?\*[^\S\r\n]?/;
        const escapedAtRegex = /^\\@/;
        const block = fileContent.split("/**", 2)[1].split("*/", 1)[0];
        const out = {};
        let field = "";
        let accum = "";
        for (const line of block.split(splitRegex)) {
            if (line.length === 0) continue;
            if (line.charAt(0) === "@" && line.charAt(1) !== " ") {
                out[field] = accum;
                const l = line.indexOf(" ");
                field = line.substring(1, l);
                accum = line.substring(l + 1);
            }
            else {
                accum += " " + line.replace("\\n", "\n").replace(escapedAtRegex, "@");
            }
        }
        out[field] = accum.trim();
        delete out[""];
        out.format = "jsdoc";
        return out;
    }

    async checkForUpdate() {
        try {
            let res = await fetch(this.meta.updateUrl);

            if (!res.ok && res.status != 200) {
                Logger.warn("CompleteDiscordQuest", res);
                res = await Net.fetch(this.meta.updateUrl);
                if (!res.ok && res.status != 200) {
                    Logger.error("CompleteDiscordQuest", res);
                    throw new Error("Failed to check for updates!");
                }
            }

            let fileContent = await res.text();
            let remoteMeta = this.parseMeta(fileContent);
            let remoteVersion = remoteMeta.version.trim().split('.');
            let currentVersion = this.meta.version.trim().split('.');

            if (parseInt(remoteVersion[0]) > parseInt(currentVersion[0])) {
                this.newUpdateNotify(remoteMeta, fileContent);
                return true;
            } else if (remoteVersion[0] == currentVersion[0] && parseInt(remoteVersion[1]) > parseInt(currentVersion[1])) {
                this.newUpdateNotify(remoteMeta, fileContent);
                return true;
            } else if (remoteVersion[0] == currentVersion[0] && remoteVersion[1] == currentVersion[1] && parseInt(remoteVersion[2]) > parseInt(currentVersion[2])) {
                this.newUpdateNotify(remoteMeta, fileContent);
                return true;
            }
        }
        catch (err) {
            UI.showToast("[YABDP4Nitro] Failed to check for updates", { type: "error" });
            Logger.error(this.meta.name, err);
        }

    }

    newUpdateNotify(remoteMeta, remoteFile) {
        Logger.info(this.meta.name, `Update ${remoteMeta.version} is available!`);
        UI.showNotification({
            title: "CompleteDiscordQuest Update Available!",
            content: `Update ${remoteMeta.version} is now available!`,
            actions: [{
                label: "Update",
                onClick: async (e) => {
                    try {
                        await new Promise(r => fs.writeFile(path.join(Plugins.folder, `${this.meta.name}.plugin.js`), remoteFile, r));
                    } catch (err) {
                        UI.showToast("An error occurred when trying to download the update!", { type: "error", forceShow: true });
                        Logger.error(this.meta.name, err);
                    }
                }
            }]
        })
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
        this.initSettings();
        this.showChangelog();
        this.checkForUpdate();

        DOM.addStyle(this.meta.name, `.quest-button-enrollable > span[class*="iconBadge"] { background-color: var(--status-danger);}
            .quest-button-enrolled > span[class*="iconBadge"] { background-color: var(--status-warning); }
            .quest-button-claimable > span[class*="iconBadge"] { background-color: var(--status-positive); }
            .quest-button svg:has(> [mask^="url(#svg-mask-panel-button)"]) { display: none; }`);

        Patcher.instead(this.meta.name, RunningGameStore, "getRunningGames", (_, _args, originalFunction) => {
            if (this.fakeGames.size > 0) {
                return Array.from(this.fakeGames.values());
            }
            return originalFunction();
        });
        Patcher.instead(this.meta.name, RunningGameStore, "getGameForPID", (_, [pid], originalFunction) => {
            if (this.fakeGames.size > 0) {
                return Array.from(this.fakeGames.values()).find(game => game.pid === pid);
            }
            return originalFunction(pid);
        });
        Patcher.instead(this.meta.name, ApplicationStreamingStore, "getStreamerActiveStreamMetadata", (_, _args, originalFunction) => {
            if (this.fakeApplications.size > 0) {
                return Array.from(this.fakeApplications.values()).at(0);
            }
            return originalFunction();
        });

        this.patchTitleBar();

        const settingsBarMap = new WeakMap();
        Patcher.after(this.meta.name, SettingsBarModule?.prototype, "render", (_, _args, returnValue) => {
            return returnValue;
            if (this.settings.showQuestsButtonSettingsBar && Array.isArray(returnValue?.props?.children) && typeof returnValue.props.children[0]?.props?.children === "function") {
                const f1 = returnValue.props.children[0]?.props?.children;
                returnValue.props.children[0].props.children = (e) => {
                    const c1 = f1(e);
                    if (Array.isArray(c1?.props?.children) && typeof c1.props.children[2]?.type === "function") {
                        const originalType = c1.props.children[2].type;
                        if (!settingsBarMap.has(originalType)) {
                            const wrapper = (props) => {
                                const c2 = originalType(props);
                                if (Array.isArray(c2?.props?.children)) {
                                    c2.props.children.unshift(React.createElement(this.QuestButton, { type: "settings-bar" }));
                                }
                                return c2;
                            };
                            settingsBarMap.set(originalType, wrapper);
                        }
                        c1.props.children[2].type = settingsBarMap.get(originalType);
                    }
                    return c1;
                }
            } else {
                return returnValue;
            }
        });

        Patcher.after(this.meta.name, QuestButtonWithKey[0], QuestButtonWithKey[1], (_, args, returnValue) => {
            if (this.settings.showQuestsButtonBadges) {
                const component = Utils.findInTree(returnValue?.props?.children, m => Array.isArray(m?.props?.children) && m.props?.to?.pathname === "/quest-home");
                if (component && Array.isArray(component.props.children)) {
                    component.props.children.push(React.createElement(this.QuestsCount));
                }
            }
            return returnValue;
        });

        QuestsStore.addChangeListener(this.handleUpdateQuests);
    }

    stop() {
        QuestsStore.removeChangeListener(this.handleUpdateQuests);
        this.stopCompletingAll();
        Patcher.unpatchAll(this.meta.name);
        this.unpatchTitleBar();
        DOM.removeStyle(this.meta.name);
    }

    isQuestEligibleForFarming(quest) {
        const questConfig = quest.config.taskConfig || quest.config.taskConfigV2;
        if (!Object.keys(questConfig.tasks).some(taskName => {
            return (taskName === "WATCH_VIDEO" && this.settings.farmVideos
                || taskName === "PLAY_ON_DESKTOP" && this.settings.farmPlayOnDesktop
                || taskName === "STREAM_ON_DESKTOP" && this.settings.farmStreamOnDesktop
                || taskName === "PLAY_ACTIVITY" && this.settings.farmPlayActivity);
        })) return false;

        const rewards = quest.config?.rewardsConfig?.rewards || [];
        if (!Array.isArray(rewards) || rewards.length === 0) return false;
        return rewards.some(reward => {
            return (reward.type === 1 && this.settings.farmRewardCodes
                || reward.type === 2 && this.settings.farmInGame
                || reward.type === 3 && this.settings.farmCollectibles
                || reward.type === 4 && this.settings.farmVirtualCurrency
                || reward.type === 5 && this.settings.farmFractionalPremium);
        });
    }

    updateQuests() {
        const availableQuests = [...QuestsStore.quests.values()];
        const acceptableQuests = availableQuests.filter(x => !x.userStatus?.enrolledAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
        const completableQuests = availableQuests.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
        for (const quest of acceptableQuests) {
            if (this.isQuestEligibleForFarming(quest)) {
                this.acceptQuest(quest);
            }
        }
        for (const quest of completableQuests) {
            if (this.completingQuests.has(quest.id)) {
                if (this.completingQuests.get(quest.id) === false) {
                    this.completingQuests.delete(quest.id);
                }
            } else {
                this.completeQuest(quest);
            }
        }
        /* console.log("Available quests updated:", availableQuests);
        console.log("Acceptable quests updated:", acceptableQuests);
        console.log("Completable quests updated:", completableQuests); */
    }

    patchTitleBar() {
        if (this.settings.showQuestsButtonTopBar) {
            Patcher.after(this.meta.name + "-title-bar", windowArea, "TF", (_, [props], ret) => {
                if (props.windowKey?.startsWith("DISCORD_")) return ret;
                if (props.trailing?.props?.children) {
                    props.trailing.props.children.unshift(React.createElement(this.QuestButton, { type: "title-bar" }));
                }
            });
            reRender("." + trailing, this.meta.name + "-title-bar");
        }
    }

    unpatchTitleBar() {
        Patcher.unpatchAll(this.meta.name + "-title-bar");
        reRender("." + trailing, this.meta.name + "-title-bar");
    }

    acceptQuest(quest) {
        if (!this.settings.acceptQuestsAutomatically) return;
        const action = {
            questContent: QuestLocationMap.QUEST_HOME_DESKTOP,
            questContentCTA: "ACCEPT_QUEST",
            sourceQuestContent: 0,
        };
        QuestApplyAction(quest.id, action).then(() => {
            console.log("Accepted quest:", quest.config.messages.questName);
        }).catch(err => {
            console.error("Failed to accept quest:", quest.config.messages.questName, err);
        });
    }

    stopCompletingAll() {
        for (const questId of this.completingQuests.keys()) {
            if (this.completingQuests.has(questId)) {
                this.completingQuests.set(questId, false);
            }
        }
        console.log("Stopped completing all quests.");
    }

    completeQuest(quest) {
        let isApp = typeof DiscordNative !== "undefined";
        if (!quest) {
            console.log("You don't have any uncompleted quests!");
        } else {
            const pid = Math.floor(Math.random() * 30000) + 1000;

            const applicationId = quest.config.application.id;
            const applicationName = quest.config.application.name;
            const questName = quest.config.messages.questName;
            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
            const secondsNeeded = taskConfig.tasks[taskName].target;
            let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

            if (!isApp && taskName !== "WATCH_VIDEO" && taskName !== "WATCH_VIDEO_ON_MOBILE") {
                console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!");
                return;
            }

            this.completingQuests.set(quest.id, true);

            console.log(`Completing quest ${questName} (${quest.id}) - ${taskName} for ${secondsNeeded} seconds.`);

            switch (taskName) {
                case "WATCH_VIDEO":
                case "WATCH_VIDEO_ON_MOBILE":
                    const maxFuture = 10, speed = 7, interval = 1;
                    const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
                    let completed = false;
                    let watchVideo = async () => {
                        while (true) {
                            const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                            const diff = maxAllowed - secondsDone;
                            const timestamp = secondsDone + speed;

                            if (!this.completingQuests.get(quest.id)) {
                                console.log("Stopping completing quest:", questName);
                                this.completingQuests.set(quest.id, false);
                                break;
                            }

                            if (diff >= speed) {
                                const res = await RestApi.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                                completed = res.body.completed_at != null;
                                secondsDone = Math.min(secondsNeeded, timestamp);
                            }

                            if (timestamp >= secondsNeeded) {
                                this.completingQuests.set(quest.id, false);
                                break;
                            }
                            await new Promise(resolve => setTimeout(resolve, interval * 1000));
                        }
                        if (!completed) {
                            await RestApi.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                        }
                        console.log("Quest completed!");
                    }
                    watchVideo();
                    console.log(`Spoofing video for ${questName}.`);
                    break;

                case "PLAY_ON_DESKTOP":
                    RestApi.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                        const appData = res.body[0];
                        const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");

                        const fakeGame = {
                            cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                            exeName,
                            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                            hidden: false,
                            isLauncher: false,
                            id: applicationId,
                            name: appData.name,
                            pid: pid,
                            pidPath: [pid],
                            processName: appData.name,
                            start: Date.now(),
                        };
                        const realGames = this.fakeGames.size == 0 ? RunningGameStore.getRunningGames() : [];
                        this.fakeGames.set(quest.id, fakeGame);
                        const fakeGames = Array.from(this.fakeGames.values());
                        DiscordModules.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

                        let playOnDesktop = (event) => {
                            if (event.questId !== quest.id) return;
                            let progress = quest.config.configVersion === 1 ? event.userStatus.streamProgressSeconds : Math.floor(event.userStatus.progress.PLAY_ON_DESKTOP.value);
                            console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                            if (!this.completingQuests.get(quest.id) || progress >= secondsNeeded) {
                                console.log("Stopping completing quest:", questName);

                                this.fakeGames.delete(quest.id);
                                const games = RunningGameStore.getRunningGames();
                                const added = this.fakeGames.size == 0 ? games : [];
                                DiscordModules.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: added, games: games });
                                DiscordModules.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", playOnDesktop);

                                if (progress >= secondsNeeded) {
                                    console.log("Quest completed!");
                                    this.completingQuests.set(quest.id, false);
                                }
                            }
                        }
                        DiscordModules.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", playOnDesktop);

                        console.log(`Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                    })
                    break;

                case "STREAM_ON_DESKTOP":
                    const fakeApp = {
                        id: applicationId,
                        name: `FakeApp ${applicationName} (CompleteDiscordQuest)`,
                        pid: pid,
                        sourceName: null,
                    };
                    this.fakeApplications.set(quest.id, fakeApp);

                    let streamOnDesktop = (event) => {
                        if (event.questId !== quest.id) return;
                        let progress = quest.config.configVersion === 1 ? event.userStatus.streamProgressSeconds : Math.floor(event.userStatus.progress.STREAM_ON_DESKTOP.value);
                        console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                        if (!this.completingQuests.get(quest.id) || progress >= secondsNeeded) {
                            console.log("Stopping completing quest:", questName);

                            this.fakeApplications.delete(quest.id);
                            DiscordModules.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", streamOnDesktop);

                            if (progress >= secondsNeeded) {
                                console.log("Quest completed!");
                                this.completingQuests.set(quest.id, false);
                            }
                        }
                    }
                    DiscordModules.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", streamOnDesktop)

                    console.log(`Spoofed your stream to ${applicationName}. Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                    console.log("Remember that you need at least 1 other person to be in the vc!");
                    break;

                case "PLAY_ACTIVITY":
                    const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
                    const streamKey = `call:${channelId}:1`;

                    let playActivity = async () => {
                        console.log("Completing quest", questName, "-", quest.config.messages.questName);

                        while (true) {
                            const res = await RestApi.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                            const progress = res.body.progress.PLAY_ACTIVITY.value;
                            console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                            await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                            if (!this.completingQuests.get(quest.id) || progress >= secondsNeeded) {
                                console.log("Stopping completing quest:", questName);

                                if (progress >= secondsNeeded) {
                                    await RestApi.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                                    console.log("Quest completed!")
                                    this.completingQuests.set(quest.id, false);
                                }
                                break;
                            }
                        }
                    }
                    playActivity();
                    break;

                default:
                    console.error("Unknown task type:", taskName);
                    this.completingQuests.set(quest.id, false);
                    break;
            }
        }
    }

    questsStatus() {
        const availableQuests = [...QuestsStore.quests.values()];
        return availableQuests.reduce((acc, x) => {
            if (new Date(x.config.expiresAt).getTime() < Date.now()) {
                acc.expired++;
            } else if (x.userStatus?.claimedAt) {
                acc.claimed++;
            } else if (x.userStatus?.completedAt) {
                acc.claimable++;
            } else if (x.userStatus?.enrolledAt) {
                acc.enrolled++;
            } else {
                acc.enrollable++;
            }
            return acc;
        }, { enrollable: 0, enrolled: 0, claimable: 0, claimed: 0, expired: 0 });
    }

    QuestsCount = () => {
        const [status, setStatus] = React.useState(this.questsStatus());

        const checkForNewQuests = () => {
            setStatus(this.questsStatus());
        };

        React.useEffect(() => {
            QuestsStore.addChangeListener(checkForNewQuests);
            return () => {
                QuestsStore.removeChangeListener(checkForNewQuests);
            };
        }, []);

        const children = [];
        if (status.enrollable > 0) {
            children.push(
                React.createElement(Tooltip, { text: "Enrollable" },
                    ({ onMouseEnter, onMouseLeave }) =>
                        React.createElement(CountBadge, {
                            onMouseEnter: onMouseEnter,
                            onMouseLeave: onMouseLeave,
                            count: status.enrollable,
                            color: "var(--status-danger)"
                        })
                )
            );
        }
        if (status.enrolled > 0) {
            children.push(
                React.createElement(Tooltip, { text: "Enrolled" },
                    ({ onMouseEnter, onMouseLeave }) =>
                        React.createElement(CountBadge, {
                            onMouseEnter: onMouseEnter,
                            onMouseLeave: onMouseLeave,
                            count: status.enrolled,
                            color: "var(--status-warning)"
                        })
                )
            );
        }
        if (status.claimable > 0) {
            children.push(
                React.createElement(Tooltip, { text: "Claimable" },
                    ({ onMouseEnter, onMouseLeave }) =>
                        React.createElement(CountBadge, {
                            onMouseEnter: onMouseEnter,
                            onMouseLeave: onMouseLeave,
                            count: status.claimable,
                            color: "var(--status-positive)"
                        })
                )
            );
        }
        if (status.claimed > 0) {
            children.push(
                React.createElement(Tooltip, { text: "Claimed" },
                    ({ onMouseEnter, onMouseLeave }) =>
                        React.createElement(CountBadge, {
                            onMouseEnter: onMouseEnter,
                            onMouseLeave: onMouseLeave,
                            count: status.claimed,
                            color: "var(--blurple-50)"
                        })
                )
            );
        }

        return React.createElement(Flex, {
            flexDirection: Flex.Direction.HORIZONTAL,
            justify: Flex.Justify.END,
            style: { gap: "5px" },
            className: "quest-button-badges",
            shrink: false
        }, ...children);
    }

    // type: "title-bar" | "settings-bar"
    QuestButton = ({ type }) => {
        const [state, setState] = React.useState(this.questsStatus());

        const checkForNewQuests = () => {
            setState(this.questsStatus());
        };

        React.useEffect(() => {
            QuestsStore.addChangeListener(checkForNewQuests);
            return () => {
                QuestsStore.removeChangeListener(checkForNewQuests);
            };
        }, []);

        const className = state.enrollable ? "quest-button-enrollable" : state.enrolled ? "quest-button-enrolled" : state.claimable ? "quest-button-claimable" : "";
        const tooltip = state.enrollable ? `${state.enrollable} Enrollable Quests` : state.enrolled ? `${state.enrolled} Enrolled Quests` : state.claimable ? `${state.claimable} Claimable Quests` : "Quests";
        if (type === "title-bar") {
            return React.createElement(TopBarButton[0], {
                className: className,
                iconClassName: undefined,
                disabled: navigateToQuestHome === undefined,
                showBadge: state.enrollable > 0 || state.enrolled > 0 || state.claimable > 0,
                badgePosition: "bottom",
                icon: QuestIcon.q,
                iconSize: 20,
                onClick: navigateToQuestHome,
                onContextMenu: undefined,
                tooltip: tooltip,
                tooltipPosition: "bottom",
                hideOnClick: false
            });
        } else if (type === "settings-bar") {
            return React.createElement(SettingsBarButton, {
                tooltipText: tooltip,
                onContextMenu: undefined,
                onClick: navigateToQuestHome,
                disabled: navigateToQuestHome === undefined,
                className: "quest-button"
            }, React.createElement(TopBarButton[0], {
                className: className,
                iconClassName: undefined,
                disabled: navigateToQuestHome === undefined,
                showBadge: state.enrollable > 0 || state.enrolled > 0 || state.claimable > 0,
                badgePosition: "bottom",
                icon: QuestIcon.q,
                iconSize: 20,
                onClick: navigateToQuestHome,
                onContextMenu: undefined,
                hideOnClick: false
            }));
        }
    }
};