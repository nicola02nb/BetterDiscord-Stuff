/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 1.0.2
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
        { type: "keybind", id: "toggleStreamShortcut", name: "Toggle Stream Shortcut", note: "Set the shortcut to toggle the stream.", clearable: true, value: [] },
        { type: "switch", id: "disablePreview", name: "Disable Preview", note: "If enabled, the preview will be disabled.", value: false },
        { type: "switch", id: "shareAudio", name: "Share Audio", note: "If enabled, the audio will be shared.", value: true },
        { type: "switch", id: "shareAlwaysScreen", name: "Share Always Screen", note: "If enabled, when you start a stream, it will always screenshare the screen instead of a game.", value: false },
        { type: "button", id: "toggleStream", name: "Start/Stop Stream", note: "Starts/Stops the stream.", children: ["Start/Stop"], onClick: () => pluginToggleStream() }
    ]
};

const { Webpack } = BdApi;
const { Filters } = Webpack;

const ApplicationStreamingStore = Webpack.getStore("ApplicationStreamingStore");
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");
const RunningGameStore = Webpack.getStore("RunningGameStore");
const StreamRTCConnectionStore = Webpack.getStore("StreamRTCConnectionStore");

const streamStart = Webpack.getModule(Filters.byStrings("STREAM_START", "GUILD", "CALL", "OVERLAY"), { searchExports: true });
const streamStop = Webpack.getModule(Filters.byStrings("STREAM_STOP"), { searchExports: true });

const platform = process.platform;
const ctrl = platform === "win32" ? 0xa2 : platform === "darwin" ? 0xe0 : 0x25;
const keybindModule = Webpack.getModule(m => m.ctrl === ctrl, { searchExports: true });

const TOGGLE_STREAM_KEYBIND = 3006;

var console = {};
var pluginToggleStream = () => { };

module.exports = class ShortcutScreenshareScreen {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
        this.nKeybinds = 0;
        this.screenPreviews = [];
        pluginToggleStream = this.toggleStream.bind(this);
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
        this.updateScreenPreviews().then(() => {
            config.settings[0].max = this.screenPreviews.length;
        });
        return this.BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.settings[id] = value;
                this.setConfigSetting(id, value);
                if (id === "toggleStreamShortcut") {
                    this.updateKeybind();
                }
            }
        });
    }

    start() {
        this.initSettingsValues();
        this.updateKeybind();
        this.updateScreenPreviews();
    }

    stop() {
        this.unregisterKeybind();
    }

    async updateScreenPreviews(width = 100, height = 100) {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        this.screenPreviews = await mediaEngine.getScreenPreviews(width, height);
    }

    updateKeybind() {
        this.unregisterKeybind();
        if (this.settings.toggleStreamShortcut.length < 2) return;
        // Create all possible key combinations based on special keys like shift and ctrl
        const mappedKeybinds = [];
        const specialKeys = [];
        const normalKeys = [];

        // First identify special keys and regular keys
        this.settings.toggleStreamShortcut.forEach((key) => {
            key = key.toLowerCase();
            if (key === "control") key = "ctrl";
            if (key.startsWith("arrow")) key = key.replace("arrow", "");

            if (key === "ctrl" || key === "shift" || key === "alt" || key === "meta") {
                specialKeys.push(key);
            } else {
                normalKeys.push(key);
            }
        });

        // Create all permutations
        let numberOfCombinations = Math.pow(2, specialKeys.length);
        this.nKeybinds = numberOfCombinations;
        for (let i = 0; i < numberOfCombinations; i++) {
            let combination = [];
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

        // Append to all combinations all normal keys
        for (const mappedKeybind of mappedKeybinds) {
            for (const key of normalKeys) {
                mappedKeybind.push([0, keybindModule[key]]);
            }
        }

        for (let i = 0; i < mappedKeybinds.length; i++) {
            this.registerKeybind(mappedKeybinds[i], TOGGLE_STREAM_KEYBIND+i);
        }
    }

    registerKeybind(keybind, id) {
        DiscordNative.nativeModules.requireModule("discord_utils").inputEventRegister(
            id, 
            keybind,
            (isDown) => { if (isDown) this.toggleStream() },
            { blurred: true, focused: true, keydown: true, keyup: true }
        );
    }

    unregisterKeybind() {
        for (let i = 0; i < this.nKeybinds; i++){
            DiscordNative.nativeModules.requireModule("discord_utils").inputEventUnregister(TOGGLE_STREAM_KEYBIND+i);
        }
    }

    toggleStream() {
        if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
            this.stopStream();
        } else {
            this.startStream();
        }
    }

    startStream() {
        let game = RunningGameStore.getVisibleGame();
        let streamGame = !this.settings.shareAlwaysScreen && game;
        let displayIndex = this.settings.displayNumber - 1;

        if (!streamGame && game && this.screenPreviews.length === 0) return;
        if (displayIndex >= this.screenPreviews.length) {
            this.settings.displayNumber = 1;
            this.setConfigSetting("displayNumber", 1);
            displayIndex = this.settings.displayNumber - 1;
        }

        let windowPreview = this.screenPreviews[displayIndex];
        let channelId = RTCConnectionStore.getChannelId();
        let guildId = RTCConnectionStore.getGuildId(channelId);
        let options = {
            audioSourceId: null,
            goLiveModalDurationMs: 8132,
            nativePickerStyleUsed: undefined,
            pid: streamGame ? game.pid : null,
            previewDisabled: this.settings.disablePreview,
            sound: this.settings.shareAudio,
            sourceId: streamGame ? game.id : windowPreview.id,
            sourceName: streamGame ? game.name : windowPreview.name,
        };

        streamStart(guildId, channelId, options);
    }

    stopStream() {
        let streamkey = StreamRTCConnectionStore.getActiveStreamKey();
        streamStop(streamkey);
    }
};