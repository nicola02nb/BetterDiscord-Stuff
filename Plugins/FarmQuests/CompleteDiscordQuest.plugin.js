/**
 * @name CompleteDiscordQuest
 * @description A plugin that comppletes you multiple discord quests in background simultaneously.
 * @version 1.1.1
 * @author nicola02nb
 */

// Porting of https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb for betterdiscord

const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: ["Added changelog"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "switch", id: "showQuestsButton", name: "Show Quests Button", note: "Whether to show the quests button in the top bar.", value: true },
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, Data, UI, Patcher, DOM, React } = BdApi;
const { Filters } = Webpack;
const [ DiscordModules, ApplicationStreamingStore, RunningGameStore, QuestsStore, ChannelStore, GuildChannelStore, TopBarRender, TopBarButton, {navigateToQuestHome}, QuestIcon, RestApi] = Webpack.getBulk(
    { filter: (m => m.dispatch && m.subscribe) },
    { filter: Filters.byStoreName("ApplicationStreamingStore") },
    { filter: Filters.byStoreName("RunningGameStore") },
    { filter: Filters.byStoreName("QuestsStore") },
    { filter: Filters.byStoreName("ChannelStore") },
    { filter: Filters.byStoreName("GuildChannelStore") },
    { filter: Filters.bySource("leading:", ",windowKey:") },
    { filter: Filters.bySource("badgePosition:") },
    { filter: Filters.byKeys("navigateToQuestHome") },
    { filter: Filters.bySource("\"M7.5 21.7a8.95") },
    { filter: m => typeof m === 'object' && m.del && m.put, searchExports: true }
);

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

        this.availableQuests = [];
        this.completableQuests = [];

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

        DOM.addStyle(this.meta.name, `.quest-button-enrollable > [class^="iconBadge"] { background-color: var(--status-danger); }
            .quest-button-enrolled > [class^="iconBadge"] { background-color: var(--status-warning); }
            .quest-button-claimable > [class^="iconBadge"] { background-color: var(--status-positive); }`);
        //BdApi.UI.showConfirmationModal("title", React.createElement(this.QuestButton));
        //BdApi.ReactDOM.createRoot(document.querySelectorAll("[class^=\"bar_\"] > [class^=\"trailing_\"")[1]).render(this.QuestButton);
        BdApi.ReactUtils.getInternalInstance(document.querySelectorAll("[class^=\"bar_\"] > [class^=\"trailing_\"")[1])?.pendingProps?.children.unshift(this.QuestButton);
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

        this.updateQuests();
        QuestsStore.addChangeListener(this.updateQuests);
    }

    stop() {
        QuestsStore.removeChangeListener(this.updateQuests);
        this.stopCompletingAll();
        Patcher.unpatchAll(this.meta.name);
        DOM.removeStyle(this.meta.name);
    }

    questsStatus() {
        const availableQuests = [...QuestsStore.quests.values()];
        return availableQuests.reduce((acc, x) => {
            if (x.id === "1248385850622869556") return acc;
            else if (new Date(x.config.expiresAt).getTime() < Date.now()) {
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

    QuestButton = () => {
        const [status, setStatus] = React.useState({ enrollable: 0, enrolled: 0, claimable: 0, claimed: 0, expired: 0 });

        const checkForNewQuests = () => {
            setStatus(this.questsStatus());
        };
        React.useEffect(() => {
            QuestsStore.addChangeListener(checkForNewQuests);
            return () => {
                QuestsStore.removeChangeListener(checkForNewQuests);
            };
        }, []);

        return React.createElement(TopBarButton.JO, { 
            className:status.enrollable ? "quest-button-enrollable" : status.enrolled ? "quest-button-enrolled" : status.claimable ? "quest-button-claimable" : "",
            iconClassName:undefined,
            /* children={undefined} */
            selected:undefined,
            disabled:navigateToQuestHome === undefined,
            showBadge:status.enrollable > 0 || status.enrolled > 0 || status.claimable > 0,
            badgePosition:"bottom",
            icon:QuestIcon.q,
            iconSize:20,
            onClick:navigateToQuestHome,
            onContextMenu:undefined,
            tooltip:status.enrollable ? `${status.enrollable} Enrollable Quests` : status.enrolled ? `${status.enrolled} Enrolled Quests` : status.claimable ? `${status.claimable} Claimable Quests` : "Quests",
            tooltipPosition:"bottom",
            hideOnClick:false
        });
    }

    updateQuests() {
        this.availableQuests = [...QuestsStore.quests.values()];
        this.completableQuests = this.availableQuests.filter(x => x.id !== "1248385850622869556" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
        for (const quest of this.completableQuests) {
            if (this.completingQuests.has(quest.id)) {
                if (this.completingQuests.get(quest.id) === false) {
                    this.completingQuests.delete(quest.id);
                }
            } else {
                this.completeQuest(quest);
            }
        }
        console.log("Completable quests updated:", this.completableQuests);
    }

    stopCompletingAll() {
        for (const quest of this.completableQuests) {
            if (this.completingQuests.has(quest.id)) {
                this.completingQuests.set(quest.id, false);
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
};