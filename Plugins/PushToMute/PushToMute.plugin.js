/**
 * @name PushToMute
 * @description A plugin that adds a keybind to mute the microphone while it is pressed.
 * @version 1.0.0
 * @author nicola02nb
 */
const config = {
    changelog: [
        //{ title: "New Stuff", type: "added", items: ["", ""] },
        //{ title: "Bugs Squashed", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "keybind", id: "pushToMute", name: "Set Keybind to Mute", note: "Set key to mute yourself while it pressed.", clearable: true, value: [] },
        { type: "switch", id: "worksOnFocus", name: "Works on Focus", note: "If enabled, the keybind will work also when Discord is focused.", value: false },
    ]
};

const { Webpack  } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);

const MediaEngineStore = Webpack.getStore("MediaEngineStore");

const DiscordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
const platform = process.platform;
const ctrl = platform === "win32" ? 0xa2 : platform === "darwin" ? 0xe0 : 0x25;
const keybindModule = Webpack.getModule(m => m.ctrl === ctrl, { searchExports: true });

var console = {};

const PUSH_TO_MUTE_KEYBIND = 3000;

module.exports = class BasePlugin {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
        this.keyBindsIds = [];

        this.handleKeyUp = this.keyUp.bind(this);
        this.handleKeyDown = this.keyDown.bind(this);
    }

    setConfigSetting(id, newValue) {
        for (const setting of config.settings) {
            if (setting.id === id) {
                this.BdApi.Data.save(id, newValue);
                this.settings[id] = newValue;
                setting.value = newValue;
                return;
            }
            if (setting.settings) {
                for (const settingInt of setting.settings) {
                    if (settingInt.id === id) {
                        this.BdApi.Data.save(id, newValue);
                        this.settings[id] = newValue;
                        settingInt.value = newValue;
                        return;
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
                this.setConfigSetting(id, value);
                switch (id) {
                    case "pushToMute":
                        this.updateKeybind();
                        break;
                    case "worksOnFocus":
                        this.updateKeybind();
                }
            }
        });
    }

    start() {
        this.initSettingsValues();
        this.updateKeybind();
    }

    stop() {
        this.unregisterKeybinds();
    }

    toggleMute() {
        DiscordModules.dispatch({
            type: "AUDIO_TOGGLE_SELF_MUTE",
            context: "default",
            syncRemote: false,
            playSoundEffect: true
        });
    }

    keyUp() {
        const isMuted = MediaEngineStore.isSelfMute();
        if (!isMuted) return;
        this.toggleMute();
    }   

    keyDown() {
        const isMuted = MediaEngineStore.isSelfMute();
        if (isMuted) return;
        this.toggleMute();
    }

    updateKeybind() {
        this.unregisterKeybinds();

        let i = 0;

        const worksOnFocus = this.settings.worksOnFocus || false;
        const pushToMuteKeys = this.settings.pushToMute || [];
        if (this.settings.pushToMute.length > 0) {
            const mappedKeybinds = this.mapKeybind(pushToMuteKeys);
            for (const keybind of mappedKeybinds) {
                this.registerKeybind(PUSH_TO_MUTE_KEYBIND + i, keybind, this.handleKeyUp, { blurred: true, focused: worksOnFocus, keydown: false, keyup: true });
                i++;
                this.registerKeybind(PUSH_TO_MUTE_KEYBIND + i, keybind, this.handleKeyDown, { blurred: true, focused: worksOnFocus, keydown: true, keyup: false });
                i++;
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

    registerKeybind(id, keybind, toCall, options) {
        if (!Array.isArray(keybind) || keybind.length === 0) {
            console.error("Keybind keybind is not an array or is empty. Keybind: ", keybind);
            return;
        }
        DiscordUtils.inputEventRegister(
            id,
            keybind,
            () => { toCall() },
            options
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