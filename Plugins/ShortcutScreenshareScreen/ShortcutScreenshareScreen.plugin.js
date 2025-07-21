/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 1.1.7
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutScreenshareScreen
 */
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
    ],
    settings: [
        { type: "number", id: "displayNumber", name: "Default Display to Screenshare", note: "Set the default display number to screenshare.", value: 1, min: 1, max: 1, step: 1 },
        { type: "category", id: "keybinds", name: "Keybinds", settings: [
            { type: "keybind", id: "toggleStreamShortcut", name: "Toggle Stream Shortcut", note: "Set the shortcut to toggle the stream.", clearable: true, value: [] },
            { type: "keybind", id: "toggleGameOrScreenShortcut", name: "Toggle Game/Screen Shortcut", note: "Set the shortcut to toggle between sharing game or screen.", clearable: true, value: [] },
            { type: "keybind", id: "toggleAudioShortcut", name: "Toggle Audio Shortcut", note: "Set the shortcut to toggle audio sharing.", clearable: true, value: [] },
            { type: "keybind", id: "startStreamShortcut", name: "Start Stream Shortcut", note: "Set the shortcut to start the stream.", clearable: true, value: [] },
            { type: "keybind", id: "stopStreamShortcut", name: "Stop Stream Shortcut", note: "Set the shortcut to stop the stream.", clearable: true, value: [] },
        ]},
        { type: "category", id: "streamOptions", name: "Stream Options", settings: [
            { type: "switch", id: "disablePreview", name: "Disable Preview", note: "If enabled, the preview will be disabled.", value: false },
            { type: "switch", id: "shareAudio", name: "Share Audio", note: "If enabled, the audio will be shared.", value: true },
            { type: "switch", id: "shareAlwaysScreen", name: "Share Always Screen", note: "If enabled, when you start a stream, it will always screenshare the screen instead of a game.", value: false },
        ]},
        { type: "switch", id: "showToast", name: "Show Toasts", note: "If enabled, toasts will be shown when the stream is started or stopped.", value: true },
    ]
};

const { Webpack, UI, Data } = BdApi;
const { Filters } = Webpack;

const ApplicationStreamingStore = Webpack.getStore("ApplicationStreamingStore");
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");
const RunningGameStore = Webpack.getStore("RunningGameStore");
const StreamRTCConnectionStore = Webpack.getStore("StreamRTCConnectionStore");

const streamStart = Webpack.getModule(Filters.byStrings("STREAM_START", "GUILD", "CALL", "OVERLAY"), { searchExports: true });
const streamStop = Webpack.getModule(Filters.byStrings("STREAM_STOP"), { searchExports: true });

const DiscordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
const platform = process.platform;
const ctrl = platform === "win32" ? 0xa2 : platform === "darwin" ? 0xe0 : 0x25;
const keybindModule = Webpack.getModule(m => m.ctrl === ctrl, { searchExports: true });

const TOGGLE_STREAM_KEYBIND = 3000;

module.exports = class ShortcutScreenshareScreen {
    constructor(meta) {
        this.meta = meta;

        this.settings = {};
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

    setConfigSetting(id, newValue) {
        for (const setting of config.settings) {
            if (setting.id === id) {
                Data.save(this.meta.name, id, newValue);
                return setting.value = newValue;
            }
            if (setting.settings) {
                for (const settingInt of setting.settings) {
                    if (settingInt.id === id) {
                        Data.save(this.meta.name, id, newValue);
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
                    settingInt.value = Data.load(this.meta.name, settingInt.id) ?? settingInt.value;
                    this.settings[settingInt.id] = settingInt.value;
                }
            } else {
                setting.value = Data.load(this.meta.name, setting.id) ?? setting.value;
                this.settings[setting.id] = setting.value;
            }
        }
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.settings[id] = value;
                this.setConfigSetting(id, value);
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

    start() {
        this.initSettingsValues();
        this.updateKeybinds();
    }

    stop() {
        this.unregisterKeybinds();
    }

    showToast(message, type) {
        if (this.settings.showToast) {
            UI.showToast(message, {type: type, icon: false});
        }
    }

    getActiveStreamKey() {
        const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
        if (activeStream) {
            return activeStream.streamType+":"+activeStream.guildId+":"+activeStream.channelId+":"+activeStream.ownerId;
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
        this.setConfigSetting("shareAudio", this.settings.shareAudio);
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
        let game = RunningGameStore.getVisibleGame();
        let streamGame = firstInit ? !this.settings.shareAlwaysScreen && game !== null : !this.isStreamingWindow() && game !== null;
        let displayIndex = this.settings.displayNumber - 1;
        let screenPreviews = await this.getPreviews("getScreenPreviews");
        let windowPreviews = await this.getPreviews("getWindowPreviews");

        if (!streamGame && game && screenPreviews.length === 0) return;
        if (displayIndex >= screenPreviews.length) {
            this.settings.displayNumber = 1;
            this.setConfigSetting("displayNumber", 1);
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
        let shortcuts = { 
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
            let keyL = key.toLowerCase();
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
            { blurred: true, focused: true, keydown: true, keyup: true }
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