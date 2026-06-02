/**
 * @name ShortcutPlaySoundboard
 * @description Play soundboards sounds from keyboard shortcuts.
 * @version 1.0.1
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutPlaySoundboard
 */
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "custom", id: "soundsMap", name: "Sounds Map", note: "Map of sounds to their shortcuts.", children: [] },
        { type: "number", id: "delayBetweenSounds", name: "Delay Between Sounds", note: "Delay between playing sounds in milliseconds.", value: 1000, min: 0, step: 100 },
        { type: "switch", id: "showToast", name: "Show Toasts", note: "If enabled, toasts will be shown when a soundboard sound is played.", value: true },
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { ContextMenu, Webpack, UI, Data, React, Components, DOM, Patcher, Utils } = BdApi;
const { Button, Flex, Text, Tooltip, SettingItem, DropdownInput } = Components;
const { Filters } = Webpack;

const [RTCConnectionStore, SoundboardStore, MediaEngineStore, KeyboardIcon] = Webpack.getBulk(
    { filter: Filters.byStoreName("RTCConnectionStore") },
    { filter: Filters.byStoreName("SoundboardStore") },
    { filter: Filters.byStoreName("MediaEngineStore") },
    { filter: Filters.byStrings("evenodd", "M4 4a3 3 0 0 0-3"), searchExports: true }
);
const SendSoundboardSoundModule = Webpack.getBySource(".SOUNDBOARD),", "__OVERLAY__,")
const SendSoundboardSoundKey = Object.keys(SendSoundboardSoundModule).find(key => {
    const funcStr = SendSoundboardSoundModule[key].toString();
    return funcStr.includes(".SOUNDBOARD),") && funcStr.includes("__OVERLAY__,");
});
const FetchSoundboardSoundsModule = Webpack.getBySource("OVERLAY_SOUNDBOARD_SOUNDS_FETCH_REQUEST", "EXPRESSION_PICKER_SOUNDBOARD_SOUNDS_LOADED");
const FetchSoundboardSoundsKey = Object.keys(FetchSoundboardSoundsModule).find(key => {
    const funcStr = FetchSoundboardSoundsModule[key].toString();
    return funcStr.includes("OVERLAY_SOUNDBOARD_SOUNDS_FETCH_REQUEST") && funcStr.includes("EXPRESSION_PICKER_SOUNDBOARD_SOUNDS_LOADED");
});


let shortcutIdCounter = 4000;

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

        this.soundsMap = new Map();
        this.lastSendTime = 0;
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

    RegisteredKeybindsSetting = ({ labeltext, set, getFunction }) => {
        const [selectedOption, setSelectedOption] = React.useState("");

        const options = Array.from(this.soundsMap.keys());

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(DropdownInput, {
                value: selectedOption,
                onChange: (event) => {
                    setSelectedOption(event[0]);
                },
                options: [{ label: "Select", value: "" }, ...options.map((option, index) => {
                    let obj = getFunction(option);
                    let name = obj?.name + (obj?.emojiName ? ` ${obj.emojiName}` : "") || `Unknown Sound (${option})`;
                    return { label: name, value: option };
                })]
            },),
            React.createElement(Button, {
                size: Button.Sizes.ICON,
                color: Button.Colors.RED,
                title: `Remove Selected ${labeltext}`,
                onClick: () => {
                    if (selectedOption === "") return;
                    options.splice(options.indexOf(selectedOption), 1);
                    setSelectedOption("");
                    this.updateKeybind(selectedOption, []);
                }
            }, React.createElement(BinIcon))
        );
    };

    getSettingsPanel() {
        const onChange = (category, id, value) => {
            this.settings[id] = value;
            switch (id) {
                default:
                    break;
            }
        };

        config.settings[0].children = [React.createElement(this.RegisteredKeybindsSetting, { labeltext: "Keybinds", setName: "soundsMap", getFunction: SoundboardStore.getSoundById })];

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

        DOM.addStyle(this.meta.name, style);
        this.registerShortcuts();
        this.patchContextMenu();

        this.fetchSoundboardSounds();
    }

    stop() {
        this.unpatchContextMenus();
        this.unregisterShortcuts();
        DOM.removeStyle(this.meta.name);
    }

    showToast(message, type) {
        if (this.settings.showToast) {
            UI.showToast(message, { type: type, icon: false });
        }
    }

    updateKeybind(soundId, keys) {
        if (!soundId) return;
        const shortcut = this.soundsMap.get(soundId);
        if (shortcut) {
            this.unregisterShortcut(shortcut);
            this.soundsMap.delete(soundId);
            Data.save(this.meta.name, "soundsMap", Array.from(this.soundsMap.entries()));
        }
        if (!Array.isArray(keys) || keys.length === 0) {
            return;
        }
        const keybindId = shortcut?.id || shortcutIdCounter++;
        const newShortcut = { id: keybindId, keys: keys };
        this.registerShortcut(soundId, newShortcut);
        this.soundsMap.set(soundId, newShortcut);
        Data.save(this.meta.name, "soundsMap", Array.from(this.soundsMap.entries()));
    }

    async fetchSoundboardSounds() {
        if (!SoundboardStore.hasFetchedAllSounds()) {
            this.showToast("Fetching soundboard sounds...", "info");
            await FetchSoundboardSoundsModule[FetchSoundboardSoundsKey]();
        }
    }

    playSound(soundId) {
        const sound = SoundboardStore.getSoundById(soundId);
        const channelId = RTCConnectionStore.getChannelId();
        if (!sound) {
            this.showToast(`Sound with ID ${soundId} not found.`, "error");
            return;
        }
        if (!channelId) {
            this.showToast("You are not in a voice channel.", "warning");
            return;
        }
        if (MediaEngineStore.isSelfMute() || MediaEngineStore.isSelfDeaf()) {
            this.showToast("You are muted or deafened.", "warning");
            return;
        }
        const currentTime = Date.now();
        if (currentTime - this.lastSendTime < this.settings.delayBetweenSounds) {
            this.showToast("Please wait before playing another sound.", "warning");
            return;
        }
        this.lastSendTime = currentTime;
        const locations = [
            "rtc panel",
            "soundboard button",
            "soundboard popout",
            "soundboard favorites section"
        ];
        SendSoundboardSoundModule[SendSoundboardSoundKey](sound, channelId, locations, 1);
        this.showToast(`Playing sound: ${sound.name} ${sound.emojiName}`, "success");
    }

    registerShortcuts() {
        const soundsMapSetting = Data.load(this.meta.name, "soundsMap") ?? [];
        if (soundsMapSetting && Array.isArray(soundsMapSetting)) {
            for (const [soundId, shortcut] of soundsMapSetting) {
                this.registerShortcut(soundId, shortcut);
                this.soundsMap.set(soundId, shortcut);
            }
        }
    }

    registerShortcut(soundId, shortcut) {
        const toCall = () => {
            this.playSound(soundId);
        };
        registerKeybind(shortcut.id, shortcut.keys, toCall);
    }

    unregisterShortcut(shortcut) {
        if (!shortcut) return;
        unregisterKeybind(shortcut.id);
    }

    unregisterShortcuts() {
        for (const [soundId, shortcut] of this.soundsMap.entries()) {
            this.unregisterShortcut(shortcut);
            this.soundsMap.delete(soundId);
        }
    }

    patchContextMenu() {
        ContextMenu.patch("sound-button-context", this.patchSoundContextMenu);
    }

    unpatchContextMenus() {
        ContextMenu.unpatch("sound-button-context", this.patchSoundContextMenu);
    }

    patchSoundContextMenu = (returnValue, props) => {
        const buttonFilter = button => (button?.props?.id === "download-soundboard-sound");
        const buttonParent = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilter));
        const buttonSetShortcut = ContextMenu.buildItem({
            type: "button",
            label: "Set Shortcut",
            icon: KeyboardIcon,
            action: () => {
                const sound = props.sound;
                if (sound) {
                    UI.alert(`Shortcut for: ${sound.name} ${sound.emojiName}`, React.createElement("div", null,
                        React.createElement(SettingItem, {
                            id: `shortcut-soundboard-${sound.soundId}`,
                            name: "Set Shortcut",
                            note: "Set the keyboard shortcut to play this soundboard sound.",
                            inline: true
                        },
                            React.createElement(ReadKeybind, {
                                id: `shortcut-soundboard-${sound.soundId}`,
                                value: this.soundsMap.get(sound.soundId)?.keys || [],
                                onChange: (category, id, keys) => {
                                    this.updateKeybind(sound.soundId, keys);
                                }
                            })),
                    ));
                }
            }
        });
        if (Array.isArray(buttonParent)) {
            buttonParent.push(buttonSetShortcut);
        }
    }
    
}

const DiscordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
const keycodesToStringModule = Webpack.getBySource(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON");
const keycodesToStringKey = Object.keys(keycodesToStringModule).find(key => {
    const funcStr = keycodesToStringModule[key].toString();
    return funcStr.includes(".join(\"+\")");
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