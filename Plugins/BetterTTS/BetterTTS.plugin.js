/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 1.4.2
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/BetterTTS/BetterTTS.plugin.js
 */
const config = {
    changelog: [],
    settings: [
        { type: "switch", id: "enableTTS", name: "Enable TTS", note: "Enables/Disables the TTS", value: true },
        { type: "switch", id: "enableOvverideOriginal", name: "Enable Override Origninal TTS", note: "Overrides Original TTS form Discord", value: true },
        { type: "switch", id: "enableUserAnnouncement", name: "Enable User Announcement", note: "Enables/Disables the User Announcement when join/leaves the channel", value: true },
        { type: "switch", id: "enableMessageReading", name: "Enable Message Reading", note: "Enables/Disables the message reading from channels", value: true },
        {
            type: "category", id: "channelSelection", name: "Channel Selection", collapsible: true, shown: false, settings: [
                {
                    type: "dropdown", id: "selectedChannel", name: "Which channel should be played:", note: "Choose the channel you want to play the TTS", value: "connectedChannel", options: [
                        { label: "Connected Channel", value: "connectedChannel" },
                        { label: "Focused Channel", value: "focusedChannel" },
                        { label: "Suscribed Channel", value: "subscribedChannel" }]
                },
                { type: "text", id: "currentSubscribedChannel", name: "Current Subscribed Channel ID", note: "Current Subscribed Channel ID", value: "" },
            ]
        },
        {
            type: "category", id: "ttsSourceSelection", name: "TTS Voice Source", collapsible: true, shown: false, settings: [
                {
                    type: "dropdown", id: "sourceTTS", name: "TTS Source:", note: "Choose the channel you want to play the TTS", value: "streamlabs", options: [
                        { label: "Streamlabs", value: "streamlabs" }]
                },
                {
                    type: "dropdown", id: "voiceTTS", name: "Voice for TTS:", note: "Changes voice used for TTS", value: "Brian", options: [
                        { label: "Brian", value: "Brian" }]
                }]
        },
        {
            type: "category", id: "audioTiming", name: "Audio Timing", collapsible: true, shown: false, settings: [
                { type: "switch", id: "asynchronousMessages", name: "Enable Asynchronous Messages", note: "Allow TTS Messages audio overlapping", value: false },
                { type: "number", id: "delayBetweenMessages", name: "Delay Between messages (ms)", note: "Only works for Syncronous messages", value: 1000 }]
        },
        { type: "slider", id: "ttsSpeechRate", name: "TTS Speech Rate", note: "Changes the speed of the TTS", step: 0.05, value: 1, min: 0.1, max: 2, units: "x", markers: [0.1, 1, 1.25, 1.5, 1.75, 2], inline: false },
        { type: "keybind", id: "toggleTTS", name: "Toggle TTS", note: "Shortcut to toggle the TTS", value: [] },
    ]
};

function setConfigSetting(id, newValue) {
    for (const setting of config.settings) {
        if (setting.id === id) {
            Data.save("BetterTTS", id, newValue);
            return setting.value = newValue;
        }
        if (setting.settings) {
            for (const settingInt of setting.settings) {
                if (settingInt.id === id) {
                    Data.save("BetterTTS", id, newValue);
                    settingInt.value = newValue;
                }
            }
        }
    }

}

function getConfigSetting(id) {
    for (const setting of config.settings) {
        if (setting.id === id) {
            return setting.value;
        }
        if (setting.settings) {
            for (const settingInt of setting.settings) {
                if (settingInt.id === id) {
                    return settingInt.value;
                }
            }
        }
    }
}

function initSettingsValues() {
    for (const setting of config.settings) {
        if (setting.type === "category") {
            for (const settingInt of setting.settings) {
                settingInt.value = Data.load("BetterTTS", settingInt.id) ?? settingInt.value;
            }
        } else {
            setting.value = Data.load("BetterTTS", setting.id) ?? setting.value;
        }
    }
    config.settings[6].settings[1].options = StreamElementsTTS.loadVoices();
}

const { Webpack, Patcher, React, Data } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ChannelStore = Webpack.getStore("ChannelStore");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
const UserStore = Webpack.getStore("UserStore");
const getConnectedUser = Webpack.getByKeys("getCurrentUser");
const IconClasses = Webpack.getByKeys("browser", "icon");
const IconWrapperClasses = Webpack.getByKeys("iconWrapper", "clickable");
const Tooltip = Webpack.getByKeys("Tooltip", "FormSwitch")?.Tooltip;
const speak = [...BdApi.Webpack.getWithKey(BdApi.Webpack.Filters.byStrings("speechSynthesis.speak"))];

const { useState } = React;
var console = {};

module.exports = class BetterTTS {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.keyShortcut = null;
    }

    // Settings
    getSettingsPanel() {
        config.settings[6].settings[1].options = StreamElementsTTS.voicesLables;
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.updateSettingValue(category, id, value);
            }
        });
    }

    updateSettingValue(category, id, value) {
        switch (id) {
            case "enableTTS":
                this.isEnabledTTS = value;
                if (!value)
                    this.AudioPlayer.stopTTS();
                break;
            case "enableUserAnnouncement":
                if (value) {
                    DiscordModules.subscribe("VOICE_STATE_UPDATES", this.annouceUsers);
                } else {
                    DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.annouceUsers);
                }
                break;
            case "enableMessageReading":
                if (value) {
                    DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
                } else {
                    DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
                }
                break;
            case "toggleTTS":
                this.updateToggleKeys(value);
                break;
            case "delayBetweenMessages":
                value = parseInt(value);
                this.AudioPlayer.delay = value;
                break;
            case "sourceTTS":
                this.AudioPlayer.source = value;
                break;
            case "voiceTTS":
                this.AudioPlayer.voice = value;
                break;
            case "ttsSpeechRate":
                this.AudioPlayer.updateRate(value);
                break
            case "enableOvverideOriginal":
                if (value) {
                    this.patchOriginalTTS();
                } else {
                    Patcher.unpatchAll(this.meta.name);
                    this.patchTitleBar();
                }
                break;
            default:
                break;
        }
        setConfigSetting(id, value);
    }

    // Plugin start/stop
    start() {
        this.handleMessage = this.handleMessageRecieved.bind(this);
        this.keyDown = this.onKeyDown.bind(this);
        this.annouceUsers = this.annouceUser.bind(this);

        initSettingsValues();
        this.updateToggleKeys(getConfigSetting("toggleTTS"));
        this.isEnabledTTS = getConfigSetting("enableTTS");
        this.AudioPlayer = new AudioPlayer();

        document.addEventListener("keydown", this.keyDown);
        if (getConfigSetting("enableTTS")) {
            DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
        }
        if (getConfigSetting("enableUserAnnouncement")) {
            DiscordModules.subscribe("VOICE_STATE_UPDATES", this.annouceUsers);
        }
        if (getConfigSetting("enableOvverideOriginal")) {
            this.patchOriginalTTS();
        }

        this.patchTitleBar();
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.annouceUsers);
        DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
        document.removeEventListener("keydown", this.keyDown);
        this.AudioPlayer.stopTTS();
    }

    // Event handelers
    patchOriginalTTS() {
        Patcher.instead(this.meta.name, speak[0], speak[1], (_, e, t) => {
            this.appendTTS(e[0].text);
        });
    }

    annouceUser(event) {
        let channelId = SelectedChannelStore.getVoiceChannelId();
        let userId = getConnectedUser.getCurrentUser().id;
        for (const status of event.voiceStates) {
            if (channelId && status.userId !== userId) {
                if (status.channelId !== status.oldChannelId) {
                    let user = UserStore.getUser(status.userId);
                    if (status.channelId === channelId) {
                        this.appendTTS(`${user.globalName} joined`);
                    } else if (status.oldChannelId === channelId) {
                        this.appendTTS(`${user.globalName} left`);
                    }
                }
            }
        }
    }

    handleMessageRecieved(event) {
        if (this.shouldPlayMessage(event.message)) {
            this.appendTTS(event.message.content);
        }
    }

    onKeyDown(event) {
        if (this.keyShortcut
            && event.ctrlKey === this.keyShortcut.ctrlKey
            && event.shiftKey === this.keyShortcut.shiftKey
            && event.altKey === this.keyShortcut.altKey
            && event.key === this.keyShortcut.key) {
            this.toggleTTS();
        }
    }

    patchTitleBar() {
        const ChannelHeader = Webpack.getByKeys("Icon", "Divider", { defaultExport: false, });
        Patcher.before(this.meta.name, ChannelHeader, "ZP", (thisObject, methodArguments, returnValue) => {
            if (getConfigSetting("selectedChannel") === "subscribedChannel" && Array.isArray(methodArguments[0]?.children))
                if (methodArguments[0].children.some?.(child =>
                    child?.props?.channel ||
                    child?.props?.children?.some?.(grandChild => typeof grandChild === 'string')))

                    if (!methodArguments[0].children.some?.(child => child?.key === this.meta.name))
                        methodArguments[0].children.splice(2, 0, React.createElement(this.ToolbarComponent, { key: this.meta.name }));
        });
    }

    appendTTS(text) {
        if (this.isEnabledTTS)
            this.AudioPlayer.addToQueue(text);
    }

    // Message evaluation
    shouldPlayMessage(message) {
        let selectedChannel = getConfigSetting("selectedChannel");
        let messageChannelId = message.channel_id;

        if (message.author.id === getConnectedUser.getCurrentUser().id) {
            return false;
        }

        switch (selectedChannel) {
            case "connectedChannel":
                return messageChannelId === SelectedChannelStore.getVoiceChannelId();
            case "focusedChannel":
                return messageChannelId === SelectedChannelStore.getCurrentlySelectedChannelId();
            case "subscribedChannel":
                return messageChannelId === getConfigSetting("currentSubscribedChannel");
            default:
                return false;
        }
    }

    // TTS Toggle
    toggleTTS() {
        let isEnabled = getConfigSetting("enableTTS");
        if (isEnabled) {
            this.BdApi.UI.showToast("TTS Muted 🔇");
        } else {
            this.BdApi.UI.showToast("TTS Enabled 🔊");
        }
        this.updateSettingValue(null, "enableTTS", !isEnabled);
    }

    updateToggleKeys(keys) {
        if (keys.length === 0) {
            this.keyShortcut = null;
            return;
        } else {
            this.keyShortcut = {
                key: "",
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
            };
        }
        for (const key in keys) {
            switch (keys[key]) {
                case "Control":
                    this.keyShortcut.ctrlKey = true;
                    break;
                case "Shift":
                    this.keyShortcut.shiftKey = true;
                    break;
                case "Alt":
                    this.keyShortcut.altKey = true;
                    break;
                default:
                    this.keyShortcut.key = keys[key];
                    break;
            }
        }
    }

    // Subscribe/Unsubscribe button
    ToolbarComponent() {
        const state = getConfigSetting("currentSubscribedChannel") === SelectedChannelStore.getCurrentlySelectedChannelId();
        const [isChecked, setIsChecked] = useState(state);
        return React.createElement(
            Tooltip,
            { text: "Sub/Unsub TTS to this channel" },
            ({ onMouseEnter, onMouseLeave }) =>
                React.createElement(
                    "div",
                    {
                        className: `${IconClasses.icon} ${IconWrapperClasses.iconWrapper} ${IconWrapperClasses.clickable}`,
                        onMouseEnter,
                        onMouseLeave,
                        checked: isChecked,
                        onClick: () => {
                            setIsChecked(!isChecked);
                            let currentChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
                            let channel = ChannelStore.getChannel(currentChannel);
                            let channelName = channel.name;
                            if (channelName === "") {
                                channelName = channel.rawRecipients[0].username;
                            }
                            if (!isChecked) {
                                this.BdApi.UI.showToast(`TTS Subbed to ${channelName}`);
                                setConfigSetting("currentSubscribedChannel", currentChannel);
                            }
                            else {
                                this.BdApi.UI.showToast(`TTS Unsubbbed from ${channelName}`);
                                setConfigSetting("currentSubscribedChannel", "");
                            }
                        },
                    },
                    React.createElement(
                        "svg",
                        {
                            className: IconWrapperClasses.icon,
                            "aria-hidden": "true",
                            role: "img",
                            width: "24px",
                            height: "24px",
                            fill: "none",
                            viewBox: "0 -960 960 960",
                        },
                        React.createElement("path", {
                            fill: "currentColor",
                            d: isChecked
                                ? "M80-80v-80q46 0 91-6t88-22q-46-23-72.5-66.5T160-349v-91h160v-120h135L324-822l72-36 131 262q20 40-3 78t-68 38h-56v40q0 33-23.5 56.5T320-360h-80v11q0 35 21.5 61.5T316-252l12 3q40 10 45 50t-31 60q-60 33-126.5 46T80-80Zm572-114-57-56q21-21 33-48.5t12-59.5q0-32-12-59.5T595-466l57-57q32 32 50 74.5t18 90.5q0 48-18 90t-50 74ZM765-80l-57-57q43-43 67.5-99.5T800-358q0-66-24.5-122T708-579l57-57q54 54 84.5 125T880-358q0 81-30.5 152.5T765-80Z"
                                : "m855-220-64-64q20-81-3-160t-83-138l56-58q55 54 87 126t32 156q0 36-6.5 71T855-220ZM532-541 398-676l-74-146 72-36 131 262q7 14 8 27.5t-3 27.5ZM80-80v-80q46 0 91-6t88-22q-46-23-72.5-66.5T160-349v-91h160v-120h81l80 80h-81v40q0 33-23.5 56.5T320-360h-80v11q0 35 21.5 61.5T316-252l12 3q40 10 45 50t-31 60q-60 33-126.5 46T80-80Zm740 53L28-820l56-56L876-84l-56 57Z",
                        })
                    )
                )
        );
    }
};

class AudioPlayer {
    constructor() {
        this.updateConfig();

        this.isPlaying = false;
        this.ttsToPlay = [];
        this.audio = null;
    }

    updateConfig() {
        this.source = getConfigSetting("sourceTTS");
        this.voice = getConfigSetting("voiceTTS");
        this.rate = getConfigSetting("ttsSpeechRate");
        this.delay = getConfigSetting("delayBetweenMessages");
        this.asynchronous = getConfigSetting("asynchronousMessages");
    }

    addToQueue(text) {
        this.ttsToPlay.push(text);
        if (!this.isPlaying)
            this.playTTSfromSource();
    }

    updateRate(rate) {
        this.rate = rate;
        if (this.audio)
            this.audio.playbackRate = rate;
    }

    stopTTS() {
        if (this.audio)
            this.audio.pause();
        this.audio = null;
        this.isPlaying = false;
        this.ttsToPlay = [];
    }

    // Play TTS
    async playTTSfromSource() {
        this.isPlaying = true;
        const delay = ms => new Promise(res => setTimeout(res, ms));
        let text;
        while ((text = this.ttsToPlay.shift()) !== undefined) {
            switch (this.source) {
                case "streamlabs":
                    this.audio = await StreamElementsTTS.getAudio(text, this.voice);
                    break;
            }
            if (this.audio) {
                this.audio.playbackRate = this.rate;
                this.audio.play();
                if (!this.asynchronous) {
                    await delay(this.audio.duration * 1000 / this.rate);
                    await delay(this.delay);
                }
            }
        }
        this.audio = null;
        this.isPlaying = false;
    }
}

// TTS Sources
class StreamElementsTTS {
    static voicesLables = [];
    static async loadVoices() {
        try {
            const response = await fetch('https://api.streamelements.com/kappa/v2/speech/voices');
            const data = await response.json();
            let voices = data.voices;
            return StreamElementsTTS.voicesLables = Object.values(voices)
                .sort((a, b) => a.languageName.localeCompare(b.languageName))
                .map(voice => ({
                    label: `${voice.name} (${voice.languageName} ${voice.languageCode})`,
                    value: voice.id
                }));
        } catch (error) {
            console.error('Error loading voices:', error);
        }
    }

    static async getAudio(text, voice = 'Brian') {
        let url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${text}`;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            return new Promise((resolve) => {
                audio.addEventListener('loadedmetadata', () => {
                    resolve(audio);
                });
            });
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }
}