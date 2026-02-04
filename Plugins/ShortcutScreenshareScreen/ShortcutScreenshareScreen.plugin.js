/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 2.0.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutScreenshareScreen
 */
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["More fine grained keybind settings"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        { title: "Improvements", type: "improved", items: ["Reorganization of keybind settings", "Plugin logic improvements"] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        {
            type: "category", id: "keybinds", name: "Keybinds", collapsible: true, shown: false, settings: [
                { type: "custom", id: "streamScreenKeybind", name: "Toggle Stream Screen", note: "Toggles start/stop streaming the screen.", children: [], value: [] },
                { type: "custom", id: "streamDeviceKeybind", name: "Toggle Stream Device", note: "Toggles start/stop streaming the device.", children: [], value: [] },
                { type: "custom", id: "streamGameKeybind", name: "Toggle Stream Game", note: "Toggles start/stop streaming the game.", children: [], value: [] },
                { type: "custom", id: "streamStopKeybind", name: "Stop Stream", note: "Stops the current stream.", children: [], value: [] },
                { type: "custom", id: "toggleSwitchSourceKeybind", name: "Toggle Switch Source Keybind", note: "Set the shortcut to toggle switch between two sources.", children: [], value: [] },
                { type: "custom", id: "toggleShareAudioKeybind", name: "Toggle Audio Keybind", note: "Set the shortcut to toggle audio sharing.", children: [], value: [] },
                { type: "custom", id: "toggleSharePreviewKeybind", name: "Toggle Preview Keybind", note: "Set the shortcut to toggle preview.", children: [], value: [] },
            ]
        },
        {
            type: "category", id: "defaultSources", name: "Default Sources", collapsible: true, shown: false, value: "", settings: [
                { type: "dropdown", id: "screenToStream", name: "Default Display", note: "Set the default display to stream.", options: [] },
                { type: "dropdown", id: "deviceToStream", name: "Default Device", note: "Set the default device to stream.", options: [] }
            ]
        },
        {
            type: "category", id: "streamOptions", name: "Stream Options", collapsible: true, shown: false, value: "", settings: [
                { type: "switch", id: "disablePreview", name: "Disable Preview", note: "If enabled, the stream preview will be disabled.", value: false },
                { type: "switch", id: "shareAudio", name: "Share Audio", note: "If enabled, the stream audio will be shared.", value: true },
            ]
        },
        { type: "dropdown", id: "behaviorWhileIfAlreadyStreaming", name: "Keybind Behavior If Already Streaming", note: "Determines what happens if a keybind is pressed while already streaming.", value: "stopStream", options: [
            { label: "Stop Stream", value: "stopStream" },
            { label: "Toggle Source", value: "toggleSource" },
        ]},
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
    dispatchStreamStart, dispatchStreamStop] = Webpack.getBulk(
        { filter: Filters.byStoreName("ApplicationStreamingStore") },
        { filter: Filters.byStoreName("StreamRTCConnectionStore") },
        { filter: Filters.byStoreName("MediaEngineStore") },
        { filter: Filters.byStoreName("RunningGameStore") },
        { filter: Filters.byStoreName("RTCConnectionStore") },
        { filter: Filters.byStrings("STREAM_START", "GUILD", "CALL", "OVERLAY"), searchExports: true },
        { filter: Filters.byStrings("\"STREAM_STOP\""), searchExports: true }
    );

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

        this.mappedSourcesTypes = {
            "screen": "game",
            "device": "screen",
            "game": "screen",
        };

        this.shortcuts = {
            streamScreenKeybind: { id: 30001, callback: this.streamScreen.bind(this) },
            streamDeviceKeybind: { id: 30002, callback: this.streamDevice.bind(this) },
            streamGameKeybind: { id: 30003, callback: this.streamGame.bind(this) },
            streamStopKeybind: { id: 30004, callback: this.stopStream.bind(this) },
            toggleSwitchSourceKeybind: { id: 30005, callback: this.toggleSwitchSource.bind(this) },
            toggleShareAudioKeybind: { id: 30006, callback: this.toggleShareAudio.bind(this) },
            toggleSharePreviewKeybind: { id: 30007, callback: this.toggleSharePreview.bind(this) },
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

    async getSettingsPanel() {
        const onChange = (category, id, value) => {
            this.settings[id] = value;
            switch (id) {
                case "streamScreenKeybind":
                case "streamDeviceKeybind":
                case "streamGameKeybind":
                case "streamStopKeybind":
                case "toggleSwitchSourceKeybind":
                case "toggleShareAudioKeybind":
                case "toggleSharePreviewKeybind":
                    this.updateKeybind(id);
                    break;
                case "disablePreview":
                case "shareAudio":
                    this.updateStream();
                    break;
            }
        };

        config.settings[0].settings[0].children = [React.createElement(ReadKeybind, { id: "streamScreenKeybind", value: this.settings.streamScreenKeybind, onChange: onChange })];
        config.settings[0].settings[1].children = [React.createElement(ReadKeybind, { id: "streamDeviceKeybind", value: this.settings.streamDeviceKeybind, onChange: onChange })];
        config.settings[0].settings[2].children = [React.createElement(ReadKeybind, { id: "streamGameKeybind", value: this.settings.streamGameKeybind, onChange: onChange })];
        config.settings[0].settings[3].children = [React.createElement(ReadKeybind, { id: "streamStopKeybind", value: this.settings.streamStopKeybind, onChange: onChange })];
        config.settings[0].settings[4].children = [React.createElement(ReadKeybind, { id: "toggleSwitchSourceKeybind", value: this.settings.toggleSwitchSourceKeybind, onChange: onChange })];
        config.settings[0].settings[5].children = [React.createElement(ReadKeybind, { id: "toggleShareAudioKeybind", value: this.settings.toggleShareAudioKeybind, onChange: onChange })];
        config.settings[0].settings[6].children = [React.createElement(ReadKeybind, { id: "toggleSharePreviewKeybind", value: this.settings.toggleSharePreviewKeybind, onChange: onChange })];
        
        config.settings[1].settings[0].options = await this.getSources("screen").then(sources => [{ label: "Default", value: "" }, ...sources.map((source, index) => ({ label: `Display ${index + 1} - ${source.name}`, value: `${index + 1}`}))]);
        config.settings[1].settings[1].options = await this.getSources("device").then(sources => [{ label: "Default", value: "" }, ...sources.map(source => ({ label: source.name, value: source.id }))]);
        
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

    isStreaming() {
        return ApplicationStreamingStore.getCurrentUserActiveStream() !== null;
    }

    /**
     * @typedef {"screen" | "device" | "game"} StreamType
     */

    /**
     * @returns {string | null}
     */
    getActiveStreamKey() {
        const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
        if (activeStream) {
            const { streamType, guildId, channelId, ownerId } = activeStream;
            switch (streamType) {
                case 'guild':
                    return [streamType, guildId, channelId, ownerId].join(":");
                case 'call':
                    return [streamType, channelId, ownerId].join(":");
            }
        }
        return null;
    }

    /**
     * @returns {StreamType | null}
     */
    whatIsStreaming() {
        if (!this.isStreaming()) {
            return null;
        }
        const streamSource = StreamRTCConnectionStore.getStreamSourceId(this.getActiveStreamKey());
        if (streamSource === null) {
            return null;
        } else if (streamSource === undefined) {
            return "game";
        } else if (streamSource.startsWith("screen")) {
            return "screen";
        } else if (streamSource.startsWith("camera")) {
            return "device";
        }
    }

    /** 
     * @param {StreamType} type 
     * @returns {Promise<Array<{ exeName: string | null, id: string | null, name: string | null, pid: number | null }>>}
     */
    async getSources(type) {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        let sources = [];
        if (type === "screen") {
            sources = await mediaEngine.getScreenPreviews(376, 212); // name
        } else if (type === "device") {
            sources = await mediaEngine.getVideoInputDevices();
            sources = sources.map(source => ({ ...source, id: "camera:"+source.id, audioSourceId: "default" })); 
        } else if (type === "game") {
            const runningGame = RunningGameStore.getVisibleGame();
            sources = []; // exeName
            if (runningGame) {
                sources.push(runningGame);
            }
        }
        sources = sources.map(source => ({ audioSourceId: source?.audioSourceId, exeName: source?.exeName, id: source?.id, name: source?.name, pid: source?.pid, sourceId: source?.sourceId }));
        return sources;
    }

    /** 
     * @param {{ id?: string | null, name?: string | null, pid?: number | null }} source
     */
    getStreamOptions(source) {
        return {
            analyticsLocations: [
                "rtc panel",
                "go live modal v2"
            ],
            audioSourceId: "default",
            goLiveModalDurationMs: 6361.5,
            nativePickerStyleUsed: undefined,
            pid: source?.pid ? source.pid : undefined,
            previewDisabled: this.settings.disablePreview,
            sourcePid: null,
            sourceIcon: undefined,//base64 icon string
            sound: this.settings.shareAudio,
            sourceId: source?.id ? source.id : undefined,
            sourceName: source?.name ? source.name : undefined,
        };
    }

    /** 
     * @param {StreamType} type 
     * @returns {Promise<ReturnType<typeof this.getStreamOptions> | null>}
     */
    async getStreamOptionsFor(type) {
        const sources = await this.getSources(type);
        if (sources.length === 0) {
            return null;
        }
        if (type === "screen") {
            const displayIndex = (parseInt(this.settings.screenToStream) || 1) - 1;
            const screenSource = sources[displayIndex] || sources[0];
            return this.getStreamOptions(screenSource);
        } else if (type === "device") {
            const deviceId = this.settings.deviceToStream;
            const deviceSource = sources.find(source => source.id === deviceId) || sources[0];
            return this.getStreamOptions(deviceSource);
        } else if (type === "game") {
            const gameSource = sources[0];
            return this.getStreamOptions(gameSource);
        }
    }

    /** 
     * @param {StreamType} type
     */
    async startStream(type) {
        if (RTCConnectionStore.isConnected()) {
            if (this.isStreaming()) {
                switch (this.settings.behaviorWhileIfAlreadyStreaming) {
                    case "stopStream":
                        await this.stopStream();
                        break;
                    case "toggleSource":
                        const currentType = this.whatIsStreaming();
                        const newType = currentType === type ? this.mappedSourcesTypes[currentType] : type;
                        const streamSettings = await this.getStreamOptionsFor(newType);
                        if (!streamSettings) {
                            this.showToast(`No available sources to switch to for type ${newType}!`, "error");
                            return;
                        }
                        dispatchStreamStart(RTCConnectionStore.getGuildId(), RTCConnectionStore.getChannelId(), streamSettings);
                        this.showToast(`Screenshare source switched to ${newType}!`, "info");
                        break;
                }
            } else {
                const streamSettings = await this.getStreamOptionsFor(type);
                if (!streamSettings) {
                    this.showToast(`No available sources to start stream with for type ${type}!`, "error");
                    return;
                }
                dispatchStreamStart(RTCConnectionStore.getGuildId(), RTCConnectionStore.getChannelId(), streamSettings);
                this.showToast("Screenshare started!", "success");
            }
        } else {
            this.showToast("No active call to start screenshare!", "error");
        }
    }

    async stopStream() {
        if (this.isStreaming()) {
            const streamkey = this.getActiveStreamKey();
            dispatchStreamStop(streamkey);
            this.showToast("Screenshare stopped!", "info");
        } else {
            this.showToast("No active screenshare to stop!", "warning");
        }
    }

    async updateStream() {
        if (this.isStreaming()) {
            const streamSettings = await this.getStreamOptionsFor(this.whatIsStreaming());
            if (!streamSettings) {
                this.showToast(`No available sources to update stream with!`, "error");
                return;
            }
            dispatchStreamStart(RTCConnectionStore.getGuildId(), RTCConnectionStore.getChannelId(), streamSettings);
            this.showToast("Screenshare updated!", "info");
        } else {
            this.showToast("No active screenshare to update!", "warning");
        }
    }

    async streamScreen() {
        await this.startStream("screen");
    }

    async streamDevice() {
        await this.startStream("device");
    }

    async streamGame() {
        await this.startStream("game");
    }

    async toggleSwitchSource() {
        const currentType = this.whatIsStreaming();
        if (currentType) {
            const newType = this.mappedSourcesTypes[currentType];
            const streamSettings = await this.getStreamOptionsFor(newType);
            if (!streamSettings) {
                this.showToast(`No available sources to switch to for type ${newType}!`, "error");
                return;
            }
            dispatchStreamStart(RTCConnectionStore.getGuildId(), RTCConnectionStore.getChannelId(), streamSettings);
            this.showToast(`Screenshare source switched to ${newType}!`, "info");
        } else {
            this.showToast("No active screenshare to switch source on!", "warning");
        }
    }

    async toggleShareAudio() {
        this.settings.shareAudio = !this.settings.shareAudio;
        await this.updateStream();
        this.showToast(`Stream Audio sharing ${this.settings.shareAudio ? "enabled" : "disabled"}!`, "info");
    }

    async toggleSharePreview() {
        this.settings.disablePreview = !this.settings.disablePreview;
        await this.updateStream();
        this.showToast(`Stream Preview ${this.settings.disablePreview ? "disabled" : "enabled"}!`, "info");
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
                                !recording ? keys.length ? "Edit Keybind" : "Record Keybind" : "Stop Recording"
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