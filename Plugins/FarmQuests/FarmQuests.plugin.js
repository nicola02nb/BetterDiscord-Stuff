/**
 * @name FarmQuests
 * @description @description A plugin that farms you multiple discord quests in background simultaneously.
 * @version 1.0.0
 * @author nicola02nb
 */

// Porting of https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb for betterdiscord

const config = {
    changelog: [
        { title: "New Stuff", type: "added", items: ["Added more settings", "Added changelog"] },
        { title: "Bugs Squashed", type: "fixed", items: ["React errors on reload"] },
        { title: "Improvements", type: "improved", items: ["Improvements to the base plugin"] },
        { title: "On-going", type: "progress", items: ["More modals and popouts being added", "More classes and modules being added"] }
    ],
    settings: [
        { type: "number", id: "checkForNewQuests", name: "Interval to check for new quests(min)", note: "The time (in minutes) to check for new quests", value: 5, min: 1, step: 1 },
    ]
};

const { Webpack } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ApplicationStreamingStore = Webpack.getStore("ApplicationStreamingStore");
const RunningGameStore = Webpack.getStore("RunningGameStore");
const QuestsStore = Webpack.getStore("QuestsStore");
const ChannelStore = Webpack.getStore("ChannelStore");
const GuildChannelStore = Webpack.getStore("GuildChannelStore");
const api = Webpack.getBySource('bind(null,"get")')?.tn;

var console = {};

module.exports = class BasePlugin {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
        this.updateInterval = null;

        this.availableQuests = [];
        this.farmableQuests = [];

        this.farmingQuest = new Map();
        this.fakeGames = new Map();
        this.fakeApplications = new Map();
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
                switch (id) {
                    case "checkForNewQuests":
                        this.startInterval();
                        break;
                }
            }
        });
    }

    start() {
        this.initSettingsValues();

        this.BdApi.Patcher.instead(RunningGameStore, "getRunningGames", (_, _args, originalFunction) => {
            if (this.fakeGames.size > 0) {
                return Array.from(this.fakeGames.values());
            }
            return originalFunction();
        });
        this.BdApi.Patcher.instead(RunningGameStore, "getGameForPID", (_, [pid], originalFunction) => {
            if (this.fakeGames.size > 0) {
                return Array.from(this.fakeGames.values()).find(game => game.pid === pid);
            }
            return originalFunction(pid);
        });
        this.BdApi.Patcher.instead(ApplicationStreamingStore, "getStreamerActiveStreamMetadata", (_, _args, originalFunction) => {
            if (this.fakeApplications.size > 0) {
                return Array.from(this.fakeApplications.values()).at(0);
            }
            return originalFunction();
        });

        this.updateQuests();
        this.startInterval();
    }

    stop() {
        this.stopInterval();
        this.BdApi.Patcher.unpatchAll();
    }

    startInterval() {
        this.stopInterval();
        this.updateInterval = setInterval(() => {
            this.updateQuests();
        }, this.settings.checkForNewQuests * 60 * 1000);
    }

    stopInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateQuests() {
        this.availableQuests = [...QuestsStore.quests.values()];
        this.farmableQuests = this.availableQuests.filter(x => x.id !== "1248385850622869556" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
        for (const quest of this.farmableQuests) {
            if (this.farmingQuest.has(quest.id)) {
                if (this.farmingQuest.get(quest.id) === false) {
                    this.farmingQuest.delete(quest.id);
                }
            } else {
                this.farmQuest(quest);
            }
        }
        console.log("Farmable quests updated:", this.farmableQuests);
    }

    stopFarmingAll() {
        for (const quest of this.farmableQuests) {
            if (this.farmingQuest.has(quest.id)) {
                this.farmingQuest.set(quest.id, false);
            }
        }
        console.log("Stopped farming all quests.");
    }

    farmQuest(quest) {
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

            this.farmingQuest.set(quest.id, true);

            console.log(`Farming quest ${questName} (${quest.id}) - ${taskName} for ${secondsNeeded} seconds.`);

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

                            if (!this.farmingQuest.get(quest.id)) {
                                console.log("Stopping farming quest:", questName);
                                this.farmingQuest.set(quest.id, false);
                                break;
                            }

                            if (diff >= speed) {
                                const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                                completed = res.body.completed_at != null;
                                secondsDone = Math.min(secondsNeeded, timestamp);
                            }

                            if (timestamp >= secondsNeeded) {
                                this.farmingQuest.set(quest.id, false);
                                break;
                            }
                            await new Promise(resolve => setTimeout(resolve, interval * 1000));
                        }
                        if (!completed) {
                            await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                        }
                        console.log("Quest completed!");
                    }
                    watchVideo();
                    console.log(`Spoofing video for ${questName}.`);
                    break;

                case "PLAY_ON_DESKTOP":
                    api.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
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

                            if (!this.farmingQuest.get(quest.id) || progress >= secondsNeeded) {
                                console.log("Stopping farming quest:", questName);

                                this.fakeGames.delete(quest.id);
                                const games = RunningGameStore.getRunningGames();
                                const added = this.fakeGames.size == 0 ? games : [];
                                DiscordModules.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: added, games: games });
                                DiscordModules.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", playOnDesktop);

                                if (progress >= secondsNeeded) {
                                    console.log("Quest completed!");
                                    this.farmingQuest.set(quest.id, false);
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
                        name: `FakeApp ${applicationName} (FarmQuests)`,
                        pid: pid,
                        sourceName: null,
                    };
                    this.fakeApplications.set(quest.id, fakeApp);

                    let streamOnDesktop = (event) => {
                        if (event.questId !== quest.id) return;
                        let progress = quest.config.configVersion === 1 ? event.userStatus.streamProgressSeconds : Math.floor(event.userStatus.progress.STREAM_ON_DESKTOP.value);
                        console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                        if (!this.farmingQuest.get(quest.id) || progress >= secondsNeeded) {
                            console.log("Stopping farming quest:", questName);

                            this.fakeApplications.delete(quest.id);
                            DiscordModules.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", streamOnDesktop);

                            if (progress >= secondsNeeded) {
                                console.log("Quest completed!");
                                this.farmingQuest.set(quest.id, false);
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
                            const res = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                            const progress = res.body.progress.PLAY_ACTIVITY.value;
                            console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                            await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                            if (!this.farmingQuest.get(quest.id) || progress >= secondsNeeded) {
                                console.log("Stopping farming quest:", questName);

                                if (progress >= secondsNeeded) {
                                    await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                                    console.log("Quest completed!")
                                    this.farmingQuest.set(quest.id, false);
                                }
                                break;
                            }
                        }
                    }
                    playActivity();
                    break;

                default:
                    console.error("Unknown task type:", taskName);
                    this.farmingQuest.set(quest.id, false);
                    break;
            }
        }
    }
};