/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 1.2.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutScreenshareScreen
 */
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: ["Added changelog"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "number", id: "displayNumber", name: "Default Display to Screenshare", note: "Set the default display number to screenshare.", value: 1, min: 1, max: 1, step: 1 },
        {
            type: "category", id: "keybinds", name: "Keybinds", settings: [
                { type: "keybind", id: "toggleStreamShortcut", name: "Toggle Stream Shortcut", note: "Set the shortcut to toggle the stream.", clearable: true, value: [] },
                { type: "keybind", id: "toggleGameOrScreenShortcut", name: "Toggle Game/Screen Shortcut", note: "Set the shortcut to toggle between sharing game or screen.", clearable: true, value: [] },
                { type: "keybind", id: "toggleAudioShortcut", name: "Toggle Audio Shortcut", note: "Set the shortcut to toggle audio sharing.", clearable: true, value: [] },
                { type: "keybind", id: "startStreamShortcut", name: "Start Stream Shortcut", note: "Set the shortcut to start the stream.", clearable: true, value: [] },
                { type: "keybind", id: "stopStreamShortcut", name: "Stop Stream Shortcut", note: "Set the shortcut to stop the stream.", clearable: true, value: [] },
            ]
        },
        {
            type: "category", id: "streamOptions", name: "Stream Options", settings: [
                { type: "switch", id: "disablePreview", name: "Disable Preview", note: "If enabled, the preview will be disabled.", value: false },
                { type: "switch", id: "shareAudio", name: "Share Audio", note: "If enabled, the audio will be shared.", value: true },
                { type: "switch", id: "shareAlwaysScreen", name: "Share Always Screen", note: "If enabled, when you start a stream, it will always screenshare the screen instead of a game.", value: false },
            ]
        },
        { type: "switch", id: "showToast", name: "Show Toasts", note: "If enabled, toasts will be shown when the stream is started or stopped.", value: true },
        /* { type: "category", id: "testButtons", name: "Test Buttons", settings: [
            { type: "button", id: "toggleStream", name: "Start/Stop Stream", note: "Starts/Stops the stream.", children: ["Start/Stop"], onClick: () => pluginToggleStream() },
            { type: "button", id: "toggleGameOrScreen", name: "Toggle Game/Screen", note: "Toggles between sharing game or screen.", children: ["Toggle"], onClick: () => pluginToggleGameOrScreen() },
        ]} */
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack } = BdApi;
const { Filters } = Webpack;

const [ApplicationStreamingStore, StreamRTCConnectionStore, MediaEngineStore, RunningGameStore, RTCConnectionStore,
    streamStart, streamStop] = Webpack.getBulk(
        { filter: Filters.byStoreName("ApplicationStreamingStore") },
        { filter: Filters.byStoreName("StreamRTCConnectionStore") },
        { filter: Filters.byStoreName("MediaEngineStore") },
        { filter: Filters.byStoreName("RunningGameStore") },
        { filter: Filters.byStoreName("RTCConnectionStore") },
        { filter: Filters.byStrings("STREAM_START", "GUILD", "CALL", "OVERLAY"), searchExports: true },
        { filter: Filters.byStrings("\"STREAM_STOP\""), searchExports: true }
    );

var console = {};

module.exports = class ShortcutScreenshareScreen {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

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

        this.keyBindsIds = [];

        this.streamChannelId = null;
        this.streamGuildId = null;
        this.streamOptions = null;

        this.toggleStreamHandle = this.toggleStream.bind(this);
        this.toggleGameOrScreenHandle = this.toggleGameOrScreen.bind(this);
        this.toggleAudiohandle = this.toggleAudio.bind(this);
        this.startStreamHandle = this.startStream.bind(this);
        this.stopStreamHandle = this.stopStream.bind(this);
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
                this.settings[id] = value;
                switch (id) {
                    case "toggleStreamShortcut":
                        this.updateKeybinds();
                        break;
                    case "toggleGameOrScreenShortcut":
                        this.updateKeybinds();
                        break;
                    case "toggleAudioShortcut":
                        this.updateKeybinds();
                        break;
                    case "startStreamShortcut":
                        this.updateKeybinds();
                        break;
                    case "stopStreamShortcut":
                        this.updateKeybinds();
                        break;
                    case "disablePreview":
                        this.settings.shareAudio
                        if (this.streamOptions)
                            this.streamOptions.previewDisabled = value;
                        this.updateStream();
                        break;
                    case "shareAudio":
                        this.settings.shareAudio
                        if (this.streamOptions)
                            this.streamOptions.sound = value;
                        this.updateStream();
                        break;
                }
            }
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
        this.BdApi.DOM.addStyle(`
            .bd-toast.toast-stream-stopped.icon {background-image: none;}
            .bd-toast.toast-stream-start.icon {background: "📺";}
        `);
        this.initSettingsValues();
        this.updateKeybinds();
    }

    stop() {
        this.unregisterKeybinds();
        this.BdApi.DOM.removeStyle();
    }

    showToast(message, type) {
        if (this.settings.showToast) {
            this.BdApi.UI.showToast(message, { type: type, icon: false });
        }
    }

    getActiveStreamKey() {
        const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
        if (activeStream) {
            const guildId = activeStream.guildId;
            if (guildId) {
                return activeStream.streamType + ":" + guildId + ":" + activeStream.channelId + ":" + activeStream.ownerId;
            } else {
                return activeStream.streamType + ":" + activeStream.channelId + ":" + activeStream.ownerId;
            }
        }
        return null;
    }

    isStreamingWindow() {
        let streamkey = this.getActiveStreamKey();
        if (streamkey === null) return false;
        let streamSource = StreamRTCConnectionStore.getStreamSourceId(streamkey);
        return streamSource === null || streamSource.startsWith("window");
    }

    async getPreviews(functionName, width = 376, height = 212) {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        let previews = await mediaEngine[functionName](width, height);
        if (functionName === "getScreenPreviews") {
            config.settings[0].max = previews.length;
        }
        return previews;
    }

    async startStream() {
        await this.initializeStreamSetting();
        if (!this.streamChannelId === undefined || !this.streamGuildId || !this.streamOptions) {
            this.showToast("No channel or guild found for streaming!", "error");
            return;
        }
        streamStart(this.streamGuildId, this.streamChannelId, this.streamOptions);
        this.showToast("Screenshare started!", "success");
    }

    async toggleGameOrScreen() {
        await this.updateStreamSetting();
        this.updateStream();
        this.showToast(`Switched to ${this.isStreamingWindow() ? "screen" : "game"} sharing!`, "info");
    }

    toggleAudio() {
        this.settings.shareAudio = !this.settings.shareAudio;
        this.streamOptions.sound = this.settings.shareAudio;
        this.updateStream();
        this.showToast(`Audio sharing ${this.settings.shareAudio ? "enabled" : "disabled"}!`, "info");
    }

    stopStream() {
        let streamkey = this.getActiveStreamKey();
        if (streamkey === null) return;
        streamStop(streamkey);
        this.streamChannelId = null;
        this.streamGuildId = null;
        this.streamOptions = null;
        this.showToast("Screenshare stopped!", "error");
    }

    toggleStream() {
        if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
            this.stopStream();
        } else {
            this.startStream();
        }
    }

    getStreamOptions(surce) {
        return {
            audioSourceId: null,
            goLiveModalDurationMs: 1858,
            nativePickerStyleUsed: undefined,
            pid: surce?.pid ? surce.pid : null,
            previewDisabled: this.settings.disablePreview,
            sound: this.settings.shareAudio,
            sourceId: surce?.id ? surce.id : null,
            sourceName: surce?.name ? surce.name : null,
        };
    }

    async initializeStreamSetting() {
        await this.updateStreamSetting(true);
    }

    async updateStreamSetting(firstInit = false) {
        let game = RunningGameStore.getVisibleGame();
        let streamGame = firstInit ? !this.settings.shareAlwaysScreen && game !== null : !this.isStreamingWindow() && game !== null;
        let displayIndex = this.settings.displayNumber - 1;
        let screenPreviews = await this.getPreviews("getScreenPreviews");
        let windowPreviews = await this.getPreviews("getWindowPreviews");

        if (!streamGame && game && screenPreviews.length === 0) return;
        if (displayIndex >= screenPreviews.length) {
            this.settings.displayNumber = 1;
            displayIndex = 1;
        }

        let screenPreview = screenPreviews[displayIndex];
        let windowPreview = windowPreviews.find(window => window.id.endsWith(game?.windowHandle));

        this.streamChannelId = RTCConnectionStore.getChannelId();
        this.streamGuildId = RTCConnectionStore.getGuildId(this.streamChannelId);

        this.streamOptions = this.getStreamOptions(windowPreview && streamGame ? windowPreview : screenPreview);
    }

    updateStream() {
        if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
            streamStart(this.streamGuildId, this.streamChannelId, this.streamOptions);
        }
    }

    updateKeybinds() {
        this.unregisterKeybinds();
        const shortcuts = {
            toggleStreamShortcut: this.toggleStreamHandle,
            toggleGameOrScreenShortcut: this.toggleGameOrScreenHandle,
            toggleAudioShortcut: this.toggleAudiohandle,
            startStreamShortcut: this.startStreamHandle,
            stopStreamShortcut: this.stopStreamHandle
        };

        for (const [shortcutName, shortcutFunction] of Object.entries(shortcuts)) {
            if (this.settings[shortcutName]?.length > 0) {
                const keys = this.settings[shortcutName];
                this.BdApi.Keybinds.registerGlobalKeybind(keys, shortcutFunction);
            }
        }
    }
    unregisterKeybinds() {
        this.BdApi.Keybinds.unregisterAllKeybinds();
    }
};