/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 1.1.16
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
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, UI, Data } = BdApi;
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

const DiscordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
const platform = process.platform;
const ctrl = platform === "win32" ? 0xa2 : platform === "darwin" ? 0xe0 : 0x25;
const keybindModule = Webpack.getModule(m => m.ctrl === ctrl, { searchExports: true });

const TOGGLE_STREAM_KEYBIND = 3000;

module.exports = class ShortcutScreenshareScreen {
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

    getSettingsPanel() {
        return UI.buildSettingsPanel({
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
        this.initSettings();
        this.showChangelog();

        this.updateKeybinds();
    }

    stop() {
        this.unregisterKeybinds();
    }

    showToast(message, type) {
        if (this.settings.showToast) {
            UI.showToast(message, { type: type, icon: false });
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
        const streamkey = this.getActiveStreamKey();
        if (streamkey === null) return false;
        const streamSource = StreamRTCConnectionStore.getStreamSourceId(streamkey);
        if (streamSource) {
            return streamSource.startsWith("window");
        }
        return false;
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
        streamStart(this.streamGuildId, this.streamChannelId, this.streamOptions);
        this.showToast("Screenshare started!", "success");
    }

    async toggleGameOrScreen() {
        await this.updateStreamSetting();
        this.updateStream();
        this.showToast(`Switched to ${!this.isStreamingWindow() ? "screen" : "game"} sharing!`, "info");
    }

    toggleAudio() {
        this.settings.shareAudio = !this.settings.shareAudio;
        this.streamOptions.sound = this.settings.shareAudio;
        this.updateStream();
        this.showToast(`Audio sharing ${this.settings.shareAudio ? "enabled" : "disabled"}!`, "info");
    }

    stopStream() {
        const streamkey = this.getActiveStreamKey();
        if (streamkey === null) return;
        streamStop(streamkey);
        this.streamChannelId = null;
        this.streamGuildId = null;
        this.streamOptions = null;
        this.showToast("Screenshare stopped!", "info");
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
        const game = RunningGameStore.getVisibleGame();
        const isStreamingWindow = this.isStreamingWindow();
        const streamGame = firstInit ? !this.settings.shareAlwaysScreen && game !== null : !isStreamingWindow && game !== null;
        const displayIndex = this.settings.displayNumber - 1;
        const screenPreviews = await this.getPreviews("getScreenPreviews");
        const windowPreviews = await this.getPreviews("getWindowPreviews");

        if (!streamGame && game && screenPreviews.length === 0) return;
        if (displayIndex >= screenPreviews.length) {
            this.settings.displayNumber = 1;
            displayIndex = 1;
        }

        const screenPreview = screenPreviews[displayIndex];
        const windowPreview = windowPreviews.find(window => window.id.endsWith(game?.windowHandle));

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

        let i = 0;

        for (const [shortcutName, shortcutFunction] of Object.entries(shortcuts)) {
            if (this.settings[shortcutName]?.length > 0) {
                const mappedKeybinds = this.mapKeybind(this.settings[shortcutName]);
                for (const keybind of mappedKeybinds) {
                    this.registerKeybind(TOGGLE_STREAM_KEYBIND + i, keybind, shortcutFunction);
                    i++;
                }
            }
        }
    }

    mapKeybind(keybind) {
        const mappedKeybinds = [];

        const specialKeys = [];
        const normalKeys = [];

        for (const key of keybind) {
            const keyL = key.toLowerCase();
            if (keyL === "control") keyL = "ctrl";
            if (keyL.startsWith("arrow")) keyL = keyL.replace("arrow", "");
            if (keyL.startsWith("page")) keyL = keyL.replace("page", "page ");

            if (keyL === "ctrl" || keyL === "shift" || keyL === "alt" || keyL === "meta") {
                specialKeys.push(keyL);
            }
            else {
                normalKeys.push(keyL);
            }
        };

        const numberOfCombinations = Math.pow(2, specialKeys.length);
        for (let i = 0; i < numberOfCombinations; i++) {
            const combination = [];
            for (let j = 0; j < specialKeys.length; j++) {
                if ((i & Math.pow(2, j)) > 0) {
                    combination.push([0, keybindModule[specialKeys[j]]]);
                }
                else {
                    combination.push([0, keybindModule["right " + specialKeys[j]]]);
                }
            }
            mappedKeybinds.push(combination);
        }
        for (const mappedKeybind of mappedKeybinds) {
            for (const key of normalKeys) {
                mappedKeybind.push([0, keybindModule[key]]);
            }
        }

        return mappedKeybinds;
    }

    registerKeybind(id, keybind, toCall) {
        if (!Array.isArray(keybind) || keybind.length === 0) {
            console.error("Keybind keybind is not an array or is empty. Keybind: ", keybind);
            return;
        }
        DiscordUtils.inputEventRegister(
            id,
            keybind,
            (isDown) => { if (isDown) toCall() },
            { blurred: true, focused: true, keydown: true, keyup: false }
        );
        this.keyBindsIds.push(id);
    }

    unregisterKeybinds() {
        for (const id of this.keyBindsIds) {
            DiscordUtils.inputEventUnregister(id);
        }
        this.keyBindsIds = [];
    }
};