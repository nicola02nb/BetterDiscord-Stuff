/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 2.2.2
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/BetterTTS/BetterTTS.plugin.js
 */
const config = {
    changelog: [],
    settings: [
        { type: "switch", id: "enableTTS", name: "Enable TTS", note: "Enables/Disables the TTS", value: true },
        { type: "switch", id: "enableTTSCommand", name: "Enable /tts Command", note: "Allo playback and usage of /tts command", value: true },
        { type: "switch", id: "enableUserAnnouncement", name: "Enable User Announcement", note: "Enables/Disables the User Announcement when join/leaves the channel", value: true },
        { type: "switch", id: "enableMessageReading", name: "Enable Message Reading", note: "Enables/Disables the message reading from channels", value: true },
        {
            type: "category", id: "messageReadingSettings", name: "Message Reading Settings", collapsible: true, shown: false, settings: [
                { type: "switch", id: "messagePrependNames", name: "Enables Prepending Usernames Before Messages Reading", note: "Reads also the name ot the user of the message that will be read by TTS", value: true },
                {
                    type: "dropdown", id: "selectedChannel", name: "Which channel should be played:", note: "Choose the channel you want to play the TTS", value: "never", options: [
                        { label: "Never", value: "never" },
                        { label: "All Channels", value: "allChannels" },
                        { label: "Suscribed Channel", value: "subscribedChannel" },
                        { label: "Focused Channel", value: "focusedChannel" },
                        { label: "Connected Channel", value: "connectedChannel" },
                        { label: "Focused Guild Channels", value: "focusedGuildChannels" },
                        { label: "Connected Guild Channels", value: "connectedGuildChannels" }
                    ]
                },
                { type: "text", id: "subscribedChannel", name: "Current Subscribed Channel ID", note: "Current Subscribed Channel ID", value: "" },
            ]
        },
        {
            type: "category", id: "ttsSourceSelection", name: "TTS Voice Source", collapsible: true, shown: false, settings: [
                {
                    type: "dropdown", id: "ttsSource", name: "TTS Source:", note: "Choose the channel you want to play the TTS", value: "streamlabs", options: [
                        { label: "Streamlabs", value: "streamlabs" }]
                },
                {
                    type: "dropdown", id: "ttsVoice", name: "Voice for TTS:", note: "Changes voice used for TTS", value: "Brian", options: [
                        { label: "Brian", value: "Brian" }]
                }]
        },
        {
            type: "category", id: "messageBlockFilters", name: "Message Block Filters", collapsible: true, shown: false, settings: [
                { type: "switch", id: "blockBlockedUsers", name: "Block Blocked Users", note: "Blocks blocked users from TTS", value: true },
                { type: "switch", id: "blockIgnoredUsers", name: "Block Ignored Users", note: "Blocks ignored users from TTS", value: true },
                { type: "switch", id: "blockNotFriendusers", name: "Block Not Friend Users", note: "Blocks not friends users from TTS", value: false },
                { type: "switch", id: "blockMutedChannels", name: "Block Muted Channels", note: "Blocks muteds channels from TTS", value: true },
                { type: "switch", id: "blockMutedGuilds", name: "Block Muted Guilds", note: "Blocks muteds server/guilds from TTS", value: false },
            ]
        },
        { type: "slider", id: "ttsSpeechRate", name: "TTS Speech Rate", note: "Changes the speed of the TTS", step: 0.05, value: 1, min: 0.1, max: 2, units: "x", markers: [0.1, 1, 1.25, 1.5, 1.75, 2], inline: false },
        { type: "number", id: "ttsDelayBetweenMessages", name: "Delay Between messages (ms)", note: "Only works for Syncronous messages", value: 1000 },
        { type: "keybind", id: "ttsToggle", name: "Toggle TTS", note: "Shortcut to toggle the TTS", value: [] },
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

const { Webpack, Patcher, React, Data, ContextMenu, Utils } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ChannelStore = Webpack.getStore("ChannelStore");
const SelectedGuildStore = Webpack.getStore("SelectedGuildStore");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
const UserStore = Webpack.getStore("UserStore");
const IconClasses = Webpack.getByKeys("browser", "icon");
const IconWrapperClasses = Webpack.getByKeys("iconWrapper", "clickable");
const Tooltip = Webpack.getByKeys("Tooltip", "FormSwitch")?.Tooltip;
const speakMessage = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.speak"))];
const cancelSpeak = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.cancel"))];
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const UserGuildSettingsStore = Webpack.getStore("UserGuildSettingsStore");
const UserSettingsProtoStore = Webpack.getStore("UserSettingsProtoStore");
const RelationshipStore = Webpack.getStore("RelationshipStore");
const setTTSType = [...Webpack.getWithKey(Webpack.Filters.byStrings("setTTSType"))];
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");

const { useState } = React;
var console = {};

module.exports = class BetterTTS {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
        this.keyShortcut = null;
    }

    // Settings
    initSettingsValues() {
        for (const setting of config.settings) {
            if (setting.type === "category") {
                for (const settingInt of setting.settings) {
                    settingInt.value = Data.load("BetterTTS", settingInt.id) ?? settingInt.value;
                    this.settings[settingInt.id] = settingInt.value;
                }
            } else {
                setting.value = Data.load("BetterTTS", setting.id) ?? setting.value;
                this.settings[setting.id] = setting.value;
            }
        }
        config.settings[5].settings[1].options = StreamElementsTTS.getVoices();
    }

    getSettingsPanel() {
        config.settings[5].settings[1].options = StreamElementsTTS.voicesLables;
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
                if (!value)
                    this.cancelTTS();
                break;
            case "enableTTSCommand":
                UserSettingsProtoStore.settings.textAndImages.enableTtsCommand.value = value;
                break;
            case "enableUserAnnouncement":
                if (value) {
                    DiscordModules.subscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
                } else {
                    DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
                }
                break;
            case "enableMessageReading":
                if (value) {
                    DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
                } else {
                    DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
                }
                break;
            case "sourceTTS":
                this.AudioPlayer.updateSource(value);
                break;
            case "voiceTTS":
                this.AudioPlayer.updateVoice(value);
                break;
            case "ttsSpeechRate":
                this.AudioPlayer.updateRate(value);
                break;
            case "delayBetweenMessages":
                value = parseInt(value);
                this.AudioPlayer.updateDelay(value);
                break;
            case "toggleTTS":
                this.updateToggleKeys(value);
                break;
            default:
                console.warn(`Unknown setting id: ${id}`);
                break;
        }
        this.settings[id] = value;
        setConfigSetting(id, value);
    }

    // Plugin start/stop
    start() {
        this.handleMessage = this.handleMessageRecieved.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleAnnouceUsers = this.annouceUser.bind(this);
        this.handleUpdateRelations = this.updateRelationships.bind(this);
        this.patchContextMenus = this.patchContextMenu.bind(this);

        this.initSettingsValues();
        this.updateToggleKeys(this.settings.toggleTTS);
        //UserSettingsProtoStore.settings.textAndImages.enableTtsCommand?.value = this.settings.enableTTSCommand;

        this.ttsMutedUsers = new Set(Data.load("BetterTTS", "ttsMutedUsers")) ?? new Set();
        this.updateRelationships();

        this.AudioPlayer = new AudioPlayer(this.settings.ttsSource,
            this.settings.ttsVoice,
            this.settings.ttsSpeechRate,
            this.settings.ttsDelayBetweenMessages);

        document.addEventListener("keydown", this.handleKeyDown);
        DiscordModules.subscribe("RELATIONSHIP_ADD", this.handleUpdateRelations);
        DiscordModules.subscribe("RELATIONSHIP_REMOVE", this.handleUpdateRelations);
        if (this.settings.enableTTS) {
            DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
        }
        if (this.settings.enableUserAnnouncement) {
            DiscordModules.subscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
        }

        this.patchOriginalTTS();
        this.patchTitleBar();
        ContextMenu.patch("user-context", this.patchContextMenus);
    }

    stop() {
        ContextMenu.unpatch("user-context", this.patchContextMenus);
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
        DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
        DiscordModules.unsubscribe("RELATIONSHIP_ADD", this.handleUpdateRelations);
        DiscordModules.unsubscribe("RELATIONSHIP_REMOVE", this.handleUpdateRelations);
        document.removeEventListener("keydown", this.handleKeyDown);
        this.AudioPlayer.stopTTS();
    }

    // Event handelers
    patchOriginalTTS() {
        Patcher.instead(this.meta.name, speakMessage[0], speakMessage[1], (_, e, t) => {
            setTTSType[0][setTTSType[1]]("NEVER");
        });
        Patcher.instead(this.meta.name, cancelSpeak[0], cancelSpeak[1], (_, e, t) => {
            this.cancelTTS();
        });
    }

    annouceUser(event) {
        let connectedChannelId = RTCConnectionStore.getChannelId();
        let userId = UserStore.getCurrentUser().id;
        for (const userStatus of event.voiceStates) {
            if (connectedChannelId && userStatus.userId !== userId) {
                if (userStatus.channelId !== userStatus.oldChannelId) {
                    let user = UserStore.getUser(userStatus.userId);
                    if (userStatus.channelId === connectedChannelId) {
                        this.AudioPlayer.addToQueue(`${user.globalName} joined`);
                    } else if (userStatus.oldChannelId === connectedChannelId) {
                        this.AudioPlayer.addToQueue(`${user.globalName} left`);
                    }
                }
            }
        }
    }

    handleMessageRecieved(event) {
        if (this.shouldPlayMessage(event.message)) {
            let message = event.message;
            if (this.settings.enableMessageReading) {
                let text = message.content;
                if (this.settings.messagePrependNames) {
                    let author = UserStore.getUser(message.author.id);
                    text = `${author.username} said ${text}`;
                }
                this.AudioPlayer.addToQueue(text);
            }
        }
    }

    updateRelationships() {
        this.usersBlocked = new Set(RelationshipStore.getBlockedIDs());
        this.usersIgnored = new Set(RelationshipStore.getIgnoredIDs());
        this.usersFriends = new Set(RelationshipStore.getFriendIDs());
    }

    cancelTTS() {
        this.AudioPlayer.stopTTS();
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
        this.BuildToolbarComponent = this.ToolbarComponent.bind(this);
        const ChannelHeader = Webpack.getByKeys("Icon", "Divider", { defaultExport: false, });
        Patcher.before(this.meta.name, ChannelHeader, "ZP", (thisObject, methodArguments, returnValue) => {
            if (this.settings.selectedChannel === "subscribedChannel" && Array.isArray(methodArguments[0]?.children))
                if (methodArguments[0].children.some?.(child =>
                    child?.props?.channel ||
                    child?.props?.children?.some?.(grandChild => typeof grandChild === 'string')))

                    if (!methodArguments[0].children.some?.(child => child?.key === this.meta.name))
                        methodArguments[0].children.splice(2, 0, React.createElement(this.BuildToolbarComponent, { key: this.meta.name }));
        });
    }

    patchContextMenu(returnValue, props) {
        const buttonFilter = button => button?.props?.id === "invite-to-server";
        let buttonParent = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilter));
        let newA = ContextMenu.buildItem({
            type: "toggle",
            label: "Mute TTS Messages",
            checked: this.ttsMutedUsers.has(props.user.id),
            action: (newValue) => {
                if (newValue.currentTarget.ariaChecked
                    !== "true") {
                    this.ttsMutedUsers.add(props.user.id);
                } else {
                    this.ttsMutedUsers.delete(props.user.id);
                }
                Data.save("BetterTTS", "ttsMutedUsers", this.ttsMutedUsers);
            }
        });
        if (Array.isArray(buttonParent))
            buttonParent.push(newA);
    }

    // Message evaluation
    shouldPlayMessage(message) {
        let isSelfDeaf = MediaEngineStore.isSelfDeaf();
        let selectedChannel = this.settings.selectedChannel;
        if (isSelfDeaf)
            return false;

        let messageAuthorId = message.author.id;
        let messageChannelId = message.channel_id;
        let messageGuildId = message.guild_id;

        let userId = UserStore.getCurrentUser().id
        let subscribedChannel = this.settings.subscribedChannel;
        let focusedChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
        let connectedChannel = RTCConnectionStore.getChannelId();
        let focusedGuild = SelectedGuildStore.getGuildId();
        let connectedGuild = RTCConnectionStore.getGuildId();

        this.mutedChannels = UserGuildSettingsStore.getMutedChannels(messageGuildId);
        this.mutedGuild = UserGuildSettingsStore.isMuted(messageGuildId);

        if (messageAuthorId === userId
            || this.ttsMutedUsers.has(messageAuthorId)
            || this.settings.blockBlockedUsers && this.usersBlocked.has(messageAuthorId)
            || this.settings.blockIgnoredUsers && this.usersIgnored.has(messageAuthorId)
            || this.settings.blockNotFriendusers && !this.usersFriends.has(messageAuthorId)
            || this.settings.blockMutedChannels && this.mutedChannels.has(messageChannelId)
            || this.settings.blockMutedGuilds && this.mutedGuild) {
            return false;
        }

        switch (selectedChannel) {
            case "never":
                return false;
            case "allChannels":
                return true;
            case "subscribedChannel":
                return messageChannelId === subscribedChannel;
            case "focusedChannel":
                return messageChannelId === focusedChannel || message.tts;
            case "connectedChannel":
                return messageChannelId === connectedChannel;
            case "focusedGuildChannels":
                return messageGuildId === focusedGuild;
            case "connectedGuildChannels":
                return messageGuildId === connectedGuild;
            default:
                return false;
        }
    }

    // TTS Toggle
    toggleTTS() {
        let isEnabled = this.settings.enableTTS;
        if (isEnabled) {
            this.BdApi.UI.showToast("TTS Muted 🔇");
        } else {
            this.BdApi.UI.showToast("TTS Enabled 🔊");
        }
        this.updateSettingValue(null, "enableTTS", !isEnabled);
    }

    updateToggleKeys(keys) {
        if (keys && keys.length === 0) {
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
        const state = this.settings.subscribedChannel === SelectedChannelStore.getCurrentlySelectedChannelId();
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
                                this.updateSettingValue(null, "subscribedChannel", currentChannel);
                            }
                            else {
                                this.BdApi.UI.showToast(`TTS Unsubbbed from ${channelName}`);
                                this.updateSettingValue(null, "subscribedChannel", "");
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
    constructor(source, voice, rate, delay) {
        this.updateConfig(source, voice, rate, delay);

        this.isPlaying = false;
        this.playingText = undefined;
        this.audio = null;
        this.messagesToPlay = [];
    }

    updateConfig(source, voice, rate, delay) {
        this.source = source;
        this.voice = voice;
        this.rate = rate;
        this.delay = rate;
    }

    addToQueue(text) {
        this.messagesToPlay.push(text);
        if (this.playingText === undefined) {
            this.startTTS();
        }
    }

    updateSource(source) {
        this.source = source;
    }

    updateVoice(voice) {
        this.voice = voice;
    }

    updateRate(rate) {
        this.rate = rate;
        if (this.audio)
            this.audio.playbackRate = rate;
    }

    updateDelay(delay) {
        this.delay = delay;
    }

    stopTTS() {
        if (this.audio)
            this.audio.pause();
        this.isPlaying = false;
        this.playingText = undefined;
        this.audio = null;
        this.messagesToPlay = [];
    }

    // Play TTS
    async startTTS() {
        this.playingText = this.messagesToPlay.shift();
        if (this.playingText !== undefined) {
            switch (this.source) {
                case "streamlabs":
                    this.audio = await StreamElementsTTS.getAudio(this.playingText, this.voice);
                    break;
            }
            if (this.audio) {
                this.audio.playbackRate = this.rate;
                this.audio.addEventListener('ended', () => {
                    if (this.messagesToPlay.length === 0) {
                        this.playingText = undefined;
                        this.audio = null;
                    } else {
                        this.startTTS();
                    }
                });
                this.audio.play();
            }
        }
    }
}

// TTS Sources
class StreamElementsTTS {
    static voicesLables = [];
    static async getVoices() {
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
        text = encodeURIComponent(text);
        let url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${text}`;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            return audio;
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }
}