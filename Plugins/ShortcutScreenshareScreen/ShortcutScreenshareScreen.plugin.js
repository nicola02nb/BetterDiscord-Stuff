/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 1.3.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutScreenshareScreen
 */
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Improved keyboard shortcut recording and registration"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "number", id: "displayNumber", name: "Default Display to Screenshare", note: "Set the default display number to screenshare.", value: 1, min: 1, max: 1, step: 1 },
        {
            type: "category", id: "keybinds", name: "Keybinds", settings: [
                { type: "custom", id: "toggleStreamShortcut", name: "Toggle Stream Shortcut", note: "Set the shortcut to toggle the stream.", children: [], value: [] },
                { type: "custom", id: "startStreamShortcut", name: "Start Stream Shortcut", note: "Set the shortcut to start the stream.", children: [], value: [] },
                { type: "custom", id: "stopStreamShortcut", name: "Stop Stream Shortcut", note: "Set the shortcut to stop the stream.", children: [], value: [] },
                { type: "custom", id: "toggleGameOrScreenShortcut", name: "Toggle Game/Screen Shortcut", note: "Set the shortcut to toggle between sharing game or screen.", children: [], value: [] },
                { type: "custom", id: "toggleAudioShortcut", name: "Toggle Audio Shortcut", note: "Set the shortcut to toggle audio sharing.", children: [], value: [] },
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

const { Webpack, UI, Data, React, Components, DOM } = BdApi;
const { Button, Flex, Text, Tooltip } = Components;
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

const [TOGGLE_STREAM_KEYBIND, TOGGLE_GAME_OR_SCREEN_KEYBIND, TOGGLE_AUDIO_KEYBIND, START_STREAM_KEYBIND, STOP_STREAM_KEYBIND] = [30000, 30001, 30002, 30003, 30004];

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

        this.streamChannelId = null;
        this.streamGuildId = null;
        this.streamOptions = null;

        this.shortcuts = {
            toggleStreamShortcut: { id: TOGGLE_STREAM_KEYBIND, callback: this.toggleStream.bind(this) },
            toggleGameOrScreenShortcut: { id: TOGGLE_GAME_OR_SCREEN_KEYBIND, callback: this.toggleGameOrScreen.bind(this) },
            toggleAudioShortcut: { id: TOGGLE_AUDIO_KEYBIND, callback: this.toggleAudio.bind(this) },
            startStreamShortcut: { id: START_STREAM_KEYBIND, callback: this.startStream.bind(this) },
            stopStreamShortcut: { id: STOP_STREAM_KEYBIND, callback: this.stopStream.bind(this) }
        }
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
        const onChange = (category, id, value) => {
            this.settings[id] = value;
            switch (id) {
                case "toggleStreamShortcut":
                case "toggleGameOrScreenShortcut":
                case "toggleAudioShortcut":
                case "startStreamShortcut":
                case "stopStreamShortcut":
                    this.updateKeybind(id);
                    break;
                case "disablePreview":
                    this.updateStream({ previewDisabled: value });
                    break;
                case "shareAudio":
                    this.updateStream({ sound: value });
                    break;
            }
        };

        config.settings[1].settings[0].children = [React.createElement(ReadKeybind, { id: "toggleStreamShortcut", value: this.settings.toggleStreamShortcut, onChange: onChange })];
        config.settings[1].settings[1].children = [React.createElement(ReadKeybind, { id: "startStreamShortcut", value: this.settings.startStreamShortcut, onChange: onChange })];
        config.settings[1].settings[2].children = [React.createElement(ReadKeybind, { id: "stopStreamShortcut", value: this.settings.stopStreamShortcut, onChange: onChange })];
        config.settings[1].settings[3].children = [React.createElement(ReadKeybind, { id: "toggleGameOrScreenShortcut", value: this.settings.toggleGameOrScreenShortcut, onChange: onChange })];
        config.settings[1].settings[4].children = [React.createElement(ReadKeybind, { id: "toggleAudioShortcut", value: this.settings.toggleAudioShortcut, onChange: onChange })];

        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: onChange,
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

        this.registerKeybinds();
        DOM.addStyle(this.meta.name, style);
    }

    stop() {
        DOM.removeStyle(this.meta.name);
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
        this.streamChannelId = RTCConnectionStore.getChannelId();
        this.streamGuildId = RTCConnectionStore.getGuildId(this.streamChannelId);
        const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
        if (activeStream) {
            this.showToast("You are already streaming!", "warning");
        } else if (this.streamChannelId) {
            await this.initializeStreamSetting();
            streamStart(this.streamGuildId, this.streamChannelId, this.streamOptions);
            this.showToast("Screenshare started!", "success");
        } else {
            this.showToast("No active call to start screenshare!", "error");
        }
    }

    async stopStream() {
        const streamkey = this.getActiveStreamKey();
        if (streamkey) {
            streamStop(streamkey);
            this.streamChannelId = null;
            this.streamGuildId = null;
            this.streamOptions = null;
            this.showToast("Screenshare stopped!", "info");
        } else {
            this.showToast("No active screenshare to stop!", "warning");
        }
    }

    async toggleGameOrScreen() {
        await this.updateStreamSetting();
        this.updateStream();
        this.showToast(`Switched to ${!this.isStreamingWindow() ? "screen" : "game"} sharing!`, "info");
    }

    toggleStream() {
        if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
            this.stopStream();
        } else {
            this.startStream();
        }
    }

    toggleAudio() {
        if (!this.streamOptions) {
            return;
        }
        this.settings.shareAudio = !this.settings.shareAudio;
        this.streamOptions.sound = this.settings.shareAudio;
        const updated = this.updateStream();
        if (updated) {
            this.showToast(`Audio sharing ${this.settings.shareAudio ? "enabled" : "disabled"}!`, "info");
        } else {
            this.showToast("No active screenshare to toggle audio!", "warning");
        }
    }

    getStreamOptions(source) {
        return {
            audioSourceId: null,
            goLiveModalDurationMs: 0,
            nativePickerStyleUsed: undefined,
            pid: source?.pid ? source.pid : null,
            previewDisabled: this.settings.disablePreview,
            sound: this.settings.shareAudio,
            sourceId: source?.id ? source.id : null,
            sourceName: source?.name ? source.name : null,
        };
    }

    async initializeStreamSetting() {
        await this.updateStreamSetting(true);
    }

    async updateStreamSetting(firstInit = false) {
        const game = RunningGameStore.getVisibleGame();
        const streamingWindow = this.isStreamingWindow();
        const streamGame = firstInit ? !this.settings.shareAlwaysScreen && game !== null : !streamingWindow && game !== null;
        let displayIndex = this.settings.displayNumber - 1;
        const screenPreviews = await this.getPreviews("getScreenPreviews");
        const windowPreviews = await this.getPreviews("getWindowPreviews");

        if (!streamGame && game && screenPreviews.length === 0) return;
        if (displayIndex >= screenPreviews.length) {
            this.settings.displayNumber = 1;
            displayIndex = 1;
        } else if (displayIndex < 0) {
            this.settings.displayNumber = screenPreviews.length;
            displayIndex = screenPreviews.length - 1;
        }

        const screenPreview = screenPreviews[displayIndex];
        const windowPreview = windowPreviews.find(window => window.id.endsWith(game?.windowHandle));

        this.streamOptions = this.getStreamOptions(windowPreview && streamGame ? windowPreview : screenPreview);
    }

    updateStream({ previewDisabled = null, sound = null } = {}) {
        if (ApplicationStreamingStore.getCurrentUserActiveStream() && this.streamGuildId && this.streamChannelId && this.streamOptions) {
            if (previewDisabled !== null) {
                this.streamOptions.previewDisabled = previewDisabled;
            }
            if (sound !== null) {
                this.streamOptions.sound = sound;
            }
            streamStart(this.streamGuildId, this.streamChannelId, this.streamOptions);
            return true;
        } else {
            return false;
        }
    }

    updateKeybind(id) {
        const shortcut = this.shortcuts[id];
        if (shortcut) {
            registerKeybind(shortcut.id, this.settings[id], shortcut.callback);
        }
    }

    registerKeybinds() {
        this.unregisterKeybinds();

        for (const [settingId, shortcut] of Object.entries(this.shortcuts)) {
            const keys = this.settings[settingId];
            registerKeybind(shortcut.id, keys, shortcut.callback);
        }
    }

    unregisterKeybinds() {
        for (const shortcut of Object.values(this.shortcuts)) {
            unregisterKeybind(shortcut.id);
        }
    }
}

const DiscordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
const keycodesToStringModule = Webpack.getBySource(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON");
const keycodesToStringKey = Object.keys(keycodesToStringModule).find(key => {
    const funcStr = keycodesToStringModule[key].toString();
    return funcStr.includes(".KEYBOARD_KEY") && funcStr.includes(".KEYBOARD_MODIFIER_KEY") && funcStr.includes(".MOUSE_BUTTON") && funcStr.includes(".GAMEPAD_BUTTON");
});
const keycodesToString = keycodesToStringModule[keycodesToStringKey];
const BinIconModule = Webpack.getBySource("M14.25 1c.41 0");
const BinIcon = BinIconModule[Object.keys(BinIconModule)[0]];

function registerKeybind(id, keys, callback) {
    unregisterKeybind(id);
    if (Array.isArray(keys) && keys.length > 0) {
        DiscordUtils.inputEventRegister(
            id,
            keys,
            (isDown) => { if (isDown) callback() },
            { blurred: true, focused: true, keydown: true, keyup: false }
        );
    }
}

function unregisterKeybind(id) {
    DiscordUtils.inputEventUnregister(id);
}

function ReadKeybind({ id, value, onChange, disabled }) {
    const [recording, setRecording] = React.useState(false);
    const [keys, setKeys] = React.useState(value || []);
    const stopCapture = React.useRef(undefined);

    function updateRecording() {
        if (!recording) {
            startRecording();
        } else {
            stopRecording();
        }
    }

    function handleKeybindCapture(keys) {
        stopRecording();
        if (keys.length) {
            onChange(null, id, keys);
            setKeys(keys);
        }
    }

    function startRecording() {
        setRecording(true);
        if (!stopCapture.current) {
            stopCapture.current = DiscordUtils.inputCaptureRegisterElement(id, handleKeybindCapture);
        }
    }

    function stopRecording() {
        setRecording(false);
        /* if (stopCapture.current) {
            stopCapture.current();
            stopCapture.current = undefined;
        } */
    }

    function handleClear() {
        onChange(null, id, []);
        setKeys([]);
        stopRecording();
    }

    return React.createElement(Tooltip, { text: keycodesToString(keys).toUpperCase() || "No Keybind Set" },
        ({ onMouseEnter, onMouseLeave }) =>
            React.createElement("div", {
                className: "bd-setting-recorder-container" + (recording ? " recording" : "") + (disabled ? " disabled" : ""),
                onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave
            },
                React.createElement(Flex, {
                    className: "bd-setting-recorder-layout",
                    flexDirection: Flex.Direction.HORIZONTAL,
                    justify: Flex.Justify.END,
                    alignItems: Flex.Align.CENTER
                },
                    React.createElement(FocusedInput, {
                        id: id,
                        onBlur: stopRecording,
                        recording: recording,
                        disabled: disabled,
                        value: keycodesToString(keys).toUpperCase()
                    }),
                    [
                        React.createElement(Button, {
                            className: "bd-setting-recorder-button",
                            color: recording ? Button.Colors.RED : Button.Colors.TRANSPARENT,
                            size: Button.Sizes.SMALL,
                            onClick: updateRecording, onMouseDown: e => e.preventDefault()
                        },
                            React.createElement(Text, { style: { color: "inherit" } },
                                !recording ? value.length ? "Record Keybind" : "Edit Keybind" : "Stop Recording"
                            )
                        ),
                        React.createElement(Button, {
                            className: "bd-setting-recorder-button",
                            color: Button.Colors.RED,
                            size: Button.Sizes.ICON,
                            onClick: handleClear, onMouseDown: e => e.preventDefault(),
                            disabled: keys.length === 0 || disabled,
                            title: "Clear Keybind"
                        }, React.createElement(BinIcon, null))
                    ]
                )
            )
    );
}

function FocusedInput({ id, onBlur, recording, disabled, value }) {
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        if (recording) {
            inputRef.current?.focus();
        } else {
            inputRef.current?.blur();
        }
    }, [recording]);

    return React.createElement("input", {
        id: id,
        onBlur: onBlur,
        type: "text",
        readOnly: true,
        disabled: disabled,
        value: value,
        placeholder: "No Keybind Set",
        className: "bd-setting-recorder-input",
        ref: inputRef
    });
}

const style = `
.bd-setting-recorder-layout {
    cursor: pointer;
}

.bd-setting-recorder-container {
    transition: border .15s ease;
    background-color: var(--input-background-default, #0000001f);
    border: 1px solid;
    border-color: var(--input-border-default, #97979f33);
    border-radius: var(--radius-sm, 8px);
    box-sizing: border-box;
    cursor: pointer;
}

.bd-setting-recorder-container.recording {
    animation: bd-setting-recorder-shadowpulse 1s ease-in infinite;
    border-color: hsl(var(--red-400-hsl, #da3e4499) / 60%);
    box-shadow: 0 0 6px hsl(var(--red-400-hsl, #da3e4499) / 30%);
    color: var(--status-danger, #da3e44);
}

.bd-setting-recorder-container.disabled {
    cursor: not-allowed;
    opacity: .3;
}

@keyframes bd-setting-recorder-shadowpulse {
    0% {
        box-shadow: 0 0 6px hsl(var(--red-400-hsl)/30%)
    }

    50% {
        box-shadow: 0 0 10px hsl(var(--red-400-hsl)/60%)
    }

    100% {
        box-shadow: 0 0 6px hsl(var(--red-400-hsl)/30%)
    }
}

.bd-setting-recorder-button {
    margin: 4px;
}

input.bd-setting-recorder-input {
    font-size: 14px;
    font-weight: var(--font-weight-semibold, 600);
    user-select: none;
    border: none;
    padding-block: 10px;
    padding-inline: 10px 0;
    white-space: nowrap;
    background-color: transparent;
    color: var(--text-normal, #fff);
    width: 100px;
}`;