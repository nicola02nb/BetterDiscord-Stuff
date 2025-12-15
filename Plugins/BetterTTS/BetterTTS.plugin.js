/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 2.17.2
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
*/
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "switch", id: "enableTTS", name: "Enable TTS", note: "Enables/Disables the TTS.", value: true },
        { type: "switch", id: "enableTTSCommand", name: "Enable /tts Command", note: "Allow playback and usage of /tts command.", value: true },
        { type: "switch", id: "enableUserAnnouncement", name: "Enable User Announcement", note: "Enables/Disables the User Announcement when join/leaves the channel.", value: true },
        { type: "switch", id: "enableMessageReading", name: "Enable Message Reading", note: "Enables/Disables the message reading from channels.", value: true },
        {
            type: "category", id: "ttsMessageSources", name: "TTS Message Sources", collapsible: true, shown: false, settings: [
                {
                    type: "dropdown", id: "messagesChannelsToRead", name: "Channels where TTS should Read", note: "Choose the channels you want messages to be read.", value: "never", options: [
                        { label: "Never", value: "never" },
                        { label: "All Channels", value: "allChannels" },
                        { label: "Focused Channel", value: "focusedChannel" },
                        { label: "Connected Channel", value: "connectedChannel" },
                        { label: "Focused Server Channels", value: "focusedGuildChannels" },
                        { label: "Connected Server Channels", value: "connectedGuildChannels" },
                    ]
                },
                {
                    type: "dropdown", id: "ingnoreWhenConnected", name: "Ignore TTS when in Voice Channel", note: "Choose the channels you want messages to be ignored while in a voice channel.", value: "never", options: [
                        { label: "None", value: "none" },
                        { label: "Subscribed", value: "subscribed" },
                        { label: "Focused/Connected", value: "focusedConnected" },
                        { label: "All", value: "all" },
                    ]
                },
                { type: "custom", id: "subscribedChannels", name: "Subscribed Channels", note: "List of channels that are subscribed to TTS.", children: [] },
                { type: "custom", id: "subscribedGuild", name: "Subscribed Servers", note: "List of servers that are subscribed to TTS.", children: [] },
            ]
        },
        {
            type: "category", id: "messageReadingSettings", name: "Message Reading Settings", collapsible: true, shown: false, settings: [
                {
                    type: "dropdown", id: "channelInfoReading", name: "Channel Info Reading", note: "Sets which of the channel should prepend server and/or channel name.", value: "none", options: [
                        { label: "None", value: "none" },
                        { label: "Subscribed", value: "subscribed" },
                        { label: "Focused/Connected", value: "focusedConnected" },
                        { label: "All", value: "all" },
                    ]
                },
                { type: "switch", id: "messagePrependGuild", name: "Enables Prepending Server Name Before Messages Reading", note: "Reads also the name of the server where the message comes from.", value: false },
                { type: "switch", id: "messagePrependChannel", name: "Enables Prepending Channel Name Before Messages Reading", note: "Reads also the name of the channel where the message comes from.", value: false },
                { type: "switch", id: "messagePrependNames", name: "Enables Prepending Usernames Before Messages Reading", note: "Reads also the name of the user that sent the message.", value: true },
                {
                    type: "dropdown", id: "messageNamesReading", name: "Usernames Reading", note: "Sets which of the names of a user used by tts.", value: "default", options: [
                        { label: "Default", value: "default" },
                        { label: "Username", value: "userName" },
                        { label: "Display Name", value: "globalName" },
                        { label: "Friend Name", value: "friendName" },
                        { label: "Server Name", value: "serverName" },
                    ]
                },
                {
                    type: "dropdown", id: "messageLinksReading", name: "Message Links Reading", note: "Select how links should be read by TTS.", value: "domain", options: [
                        { label: "Remove Links", value: "remove" },
                        { label: "Read Only Domain", value: "domain" },
                        { label: "Sobstitute With word URL", value: "sobstitute" },
                        { label: "Keep URL", value: "keep" },
                    ]
                },
                { type: "switch", id: "messageSpoilersReading", name: "Enables Reading Messages Spoilers", note: "If enabled, it will read messages spoilers content.", value: false },
            ]
        },
        {
            type: "category", id: "ttsSourceSelection", name: "TTS Voice Source", collapsible: true, shown: false, settings: [
                { type: "custom", id: "ttsSource", name: "TTS Source", note: "Choose the channel you want to play the TTS.", value: "streamelements", children: [] },
                { type: "custom", id: "ttsVoice", name: "Voice for TTS", note: "Changes voice used for TTS.", value: "Brian", children: [] },
                { type: "text", id: "streamelementsApiKey", name: "StreamElements API Key", note: "Your StreamElements API Key. Required only if you use StreamElements as TTS source. You can get it from https://streamelements.com/dashboard/account/channels (Overlay Token).", value: "" },
            ]
        },
        {
            type: "category", id: "messageBlockFilters", name: "Message Block Filters", collapsible: true, shown: false, settings: [
                { type: "custom", id: "mutedUsers", name: "Muted Users", note: "List of users that muted to TTS.", children: [] },
                { type: "switch", id: "blockBlockedUsers", name: "Block Blocked Users", note: "Blocks blocked users from TTS.", value: true },
                { type: "switch", id: "blockIgnoredUsers", name: "Block Ignored Users", note: "Blocks ignored users from TTS.", value: true },
                { type: "switch", id: "blockNotFriendusers", name: "Block Not Friend Users", note: "Blocks not friends users from TTS.", value: false },
                { type: "switch", id: "blockMutedChannels", name: "Block Muted Channels", note: "Blocks muteds channels from TTS.", value: true },
                { type: "switch", id: "blockMutedGuilds", name: "Block Muted Guilds", note: "Blocks muteds server/guilds from TTS.", value: false },
            ]
        },
        {
            type: "category", id: "ttsAudioSettings", name: "TTS Audio Settings", collapsible: true, shown: false, settings: [
                { type: "slider", id: "ttsVolume", name: "TTS Volume", note: "Changes the volume of the TTS.", step: 0.1, value: 100, min: 0, max: 100, units: "%", markers: [0, 25, 50, 75, 100], inline: false },
                { type: "slider", id: "ttsSpeechRate", name: "TTS Speech Rate", note: "Changes the speed of the TTS.", step: 0.05, value: 1, min: 0.1, max: 2, units: "x", markers: [0.1, 1, 1.25, 1.5, 1.75, 2], inline: false },
                { type: "custom", id: "ttsPreview", name: "Play TTS Preview", note: "Plays a default test message.", children: [] },
                { type: "number", id: "ttsDelayBetweenMessages", name: "Delay Between messages (ms)", note: "Only works for Syncronous messages.", value: 1000 },
            ]
        },
        {
            type: "category", id: "textReplacer", name: "Text Replacer", collapsible: true, shown: false, settings: [
                { type: "custom", id: "textReplacerRules", name: "Rules", note: "Sobstitute Texts that matches your regex before reading it.", children: [] },
                { type: "custom", id: "textReplacerAdd", name: "Add Rule", note: "Adds a regex rule to sobstitute matches with a custom text.", children: [] },
            ]
        },
        {
            type: "category", id: "keybinds", name: "Keybinds", collapsible: true, shown: false, settings: [
                { type: "keybind", id: "ttsToggle", name: "Toggle TTS", note: "Shortcut to toggle the TTS.", clearable: true, value: [] },
            ]
        },
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, Patcher, React, ContextMenu, Utils, Components, Data, DOM, UI } = BdApi;
const { Filters } = Webpack;
const [
    DiscordModules, ChannelStore, GuildStore, GuildMemberStore, MediaEngineStore, RelationshipStore,
    RTCConnectionStore, SelectedChannelStore, SelectedGuildStore, UserGuildSettingsStore, UserSettingsProtoStore, UserStore,
    listenIcon] = Webpack.getBulk(
        { filter: (m => m.dispatch && m.subscribe) },
        { filter: Filters.byStoreName('ChannelStore') },
        { filter: Filters.byStoreName('GuildStore') },
        { filter: Filters.byStoreName('GuildMemberStore') },
        { filter: Filters.byStoreName('MediaEngineStore') },
        { filter: Filters.byStoreName('RelationshipStore') },
        { filter: Filters.byStoreName('RTCConnectionStore') },
        { filter: Filters.byStoreName('SelectedChannelStore') },
        { filter: Filters.byStoreName('SelectedGuildStore') },
        { filter: Filters.byStoreName('UserGuildSettingsStore') },
        { filter: Filters.byStoreName('UserSettingsProtoStore') },
        { filter: Filters.byStoreName('UserStore') },
        { filter: Filters.byStrings("evenodd", "M12 22a10 10 0 1"), searchExports: true }
    );

const speakMessage = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.speak"))];
const cancelSpeak = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.cancel"))];
const setTTSType = [...Webpack.getWithKey(Webpack.Filters.byStrings("setTTSType"))];

module.exports = class BetterTTS {
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

        this.audioPlayer = null;

        this.ttsMutedUsers = new Set(Data.load(this.meta.name, "ttsMutedUsers")) ?? new Set();
        this.ttsSubscribedChannels = new Set(Data.load(this.meta.name, "ttsSubscribedChannels")) ?? new Set();
        this.ttsSubscribedGuilds = new Set(Data.load(this.meta.name, "ttsSubscribedGuilds")) ?? new Set();
        this.textReplacerRules = new Set(Data.load(this.meta.name, "textReplacerRules")) ?? new Set();
        this.updateRelationships();

        this.keyShortcut = null;
    }

    // Settings    
    listeners = {};
    subscribe = (event, callback) => {
        this.listeners[event] = callback;
    };
    emit = (event, data) => {
        if (this.listeners[event]) {
            this.listeners[event](data);
        }
    };

    DropdownSources = ({ selected = "discord" }) => {
        const options = sourcesOptions;
        const [selectedSource, setSelectedSource] = React.useState(selected || options[0]?.value);

        return React.createElement(Components.DropdownInput, {
            value: selectedSource,
            onChange: React.useCallback((newSource) => {
                setSelectedSource(newSource);
                this.updateSettingValue(undefined, "ttsSource", newSource);
                this.emit("sourceChanged", newSource);
            }),
            options: options
        });
    };

    DropdownVoices = ({ source = "discord", selected }) => {
        const [selectedSource, setSelectedSource] = React.useState(source);
        const [options, setOptions] = React.useState(getVoices(selectedSource));
        const [selectedVoice, setSelectedVoice] = React.useState(selected || getDefaultVoice(source) || options[0]?.value);

        this.subscribe("sourceChanged", (newSource) => {
            setSelectedSource(newSource);
            setOptions(getVoices(newSource));
            const newVoice = getDefaultVoice(newSource) || options[0]?.value;
            setSelectedVoice(newVoice);
            this.updateSettingValue(undefined, "ttsVoice", newVoice);
        });

        return React.createElement(Components.DropdownInput, {
            value: selectedVoice,
            onChange: React.useCallback((newVoice) => {
                setSelectedVoice(newVoice);
                this.updateSettingValue(undefined, "ttsVoice", newVoice);
            }),
            options: options
        });
    };

    DropdownButtonGroup = ({ labeltext, setName, getFunction }) => {
        const [selectedOption, setSelectedOption] = React.useState("");

        const options = Array.from(this[setName]);

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Components.DropdownInput, {
                value: selectedOption,
                onChange: (event) => {
                    setSelectedOption(event);
                },
                options: [{ label: "Select", value: "" }, ...options.map((option, index) => {
                    let obj = getFunction(option);
                    let name = obj?.name ?? obj?.username;
                    return { label: name, value: option };
                })]
            },),
            React.createElement(Components.Button, {
                onClick: () => {
                    if (selectedOption === "") return;
                    options.splice(options.indexOf(selectedOption), 1);
                    setSelectedOption("");
                    this[setName].delete(selectedOption);
                    this.settings[setName] = this[setName];
                }
            }, labeltext),
        );
    };

    PreviewTTS = () => {
        const [isPlaying, setIsPlaying] = React.useState(false);
        const [text, setText] = React.useState("This is what text-to-speech sounds like at the current speed.");

        const getLabel = (play) => {
            let icon;
            if (play) {
                icon = React.createElement("svg",
                    { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", fill: "currentColor", class: "bi bi-pause-fill", viewBox: "0 0 16 16" },
                    React.createElement("path", { d: "M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" })
                );
            } else {
                icon = React.createElement("svg",
                    { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", fill: "currentColor", class: "bi bi-play-fill", viewBox: "0 0 16 16" },
                    React.createElement("path", { d: "m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" })
                );
            }
            return React.createElement(React.Fragment, null, icon, "Preview");
        };

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Components.TextInput, {
                value: text,
                placeholder: "Enter text to preview",
                onChange: (event) => {
                    setText(event);
                }
            }),
            React.createElement(Components.Button, {
                onClick: () => {
                    this.audioPlayer.stopTTS();
                    if (!isPlaying) {
                        this.audioPlayer.enqueueTTSMessage(text, true);
                    }
                    setIsPlaying(!isPlaying);
                }
            }, getLabel(isPlaying))
        );
    };

    TextReplaceDropdown = ({ }) => {
        const [selectedOption, setSelectedOption] = React.useState(0);

        const options = Array.from(this.textReplacerRules);

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Components.DropdownInput, {
                value: selectedOption,
                onChange: (event) => {
                    setSelectedOption(event);
                },
                options: [{ label: "Select", value: 0 }, ...options.map((option, index) => {
                    return { label: option.regex + " - " + option.replacement, value: index + 1 };
                })]
            },),
            React.createElement(Components.Button, {
                onClick: () => {
                    if (selectedOption === 0) return;
                    let deleted = options.splice(selectedOption - 1, 1);
                    setSelectedOption(0);
                    this.textReplacerRules.delete(deleted[0]);
                    Data.save(this.meta.name, "textReplacerRules", this.textReplacerRules);
                }
            }, "Remove Regex"),
        );
    };

    TextReplaceAdd = () => {
        const [regex, setRegex] = React.useState("");
        const [replacement, setReplacement] = React.useState("");

        const disabled = regex === "" || replacement === "";

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Components.TextInput, {
                value: regex,
                placeholder: "Enter Regex",
                onChange: (event) => {
                    setRegex(event);
                },
            }),
            React.createElement(Components.TextInput, {
                value: replacement,
                placeholder: "Text To Soubstitute",
                onChange: (event) => {
                    setReplacement(event);
                }
            }),
            React.createElement(Components.Button, {
                disabled: disabled,
                onClick: () => {
                    this.textReplacerRules.add({ regex: regex, replacement: replacement });
                    Data.save(this.meta.name, "textReplacerRules", this.textReplacerRules);
                    setRegex("");
                    setReplacement("");
                }
            }, "Add Regex")
        );
    };

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
        config.settings[4].settings[2].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Channel", setName: "ttsSubscribedChannels", getFunction: ChannelStore.getChannel })];
        config.settings[4].settings[3].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Server", setName: "ttsSubscribedGuilds", getFunction: GuildStore.getGuild })];
        config.settings[6].settings[0].children = [React.createElement(this.DropdownSources, { selected: this.settings.ttsSource })];
        config.settings[6].settings[1].children = [React.createElement(this.DropdownVoices, { source: this.settings.ttsSource, selected: this.settings.ttsVoice })];
        config.settings[7].settings[0].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unmute User", setName: "ttsMutedUsers", getFunction: UserStore.getUser })];
        config.settings[8].settings[2].children = [React.createElement(this.PreviewTTS)];
        config.settings[9].settings[0].children = [React.createElement(this.TextReplaceDropdown, {})];
        config.settings[9].settings[1].children = [React.createElement(this.TextReplaceAdd)];
        return UI.buildSettingsPanel({
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
                    this.audioPlayer.stopTTS();
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
            case "ttsSource":
                this.audioPlayer.updateTTSSourceAndVoice(value);
                config.settings[6].settings[1].options = getVoices(value);
                break;
            case "ttsVoice":
                this.audioPlayer.updateTTSSourceAndVoice(this.settings.ttsSource, value);
                break;
            case "streamelementsApiKey":
                streamElementsTTS.streamelementsApiKey = value;
                break;
            case "ttsSpeechRate":
                this.audioPlayer.updateRate(value);
                break;
            case "ttsVolume":
                this.audioPlayer.updateVolume(value / 100);
                break;
            case "ttsDelayBetweenMessages":
                value = parseInt(value);
                this.audioPlayer.updateDelay(value);
                break;
            case "ttsToggle":
                this.updateToggleKeys(value);
                break;
            default:
                break;
        }
        this.settings[id] = value;
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

    // Plugin start/stop
    start() {
        this.initSettings();
        this.showChangelog();

        DOM.addStyle(this.meta.name, `label[for="textReplacerAdd"] + input[type="text"]{ min-width: 100px; width: 150px;}`);
        this.handleMessage = this.messageRecieved.bind(this);
        this.handleAnnouceUsers = this.annouceUser.bind(this);
        this.handleUpdateRelations = this.updateRelationships.bind(this);
        this.handleSpeakMessage = this.speakMessage.bind(this);
        this.handleStopTTS = this.stopTTS.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);

        this.updateToggleKeys(this.settings.ttsToggle);

        this.audioPlayer = new AudioPlayer(this.settings.ttsSource,
            this.settings.ttsVoice,
            this.settings.ttsSpeechRate,
            this.settings.ttsDelayBetweenMessages,
            this.settings.ttsVolume / 100);
        this.audioPlayer.updateConfig(this.settings.ttsSource, this.settings.ttsVoice, this.settings.ttsSpeechRate, this.settings.ttsDelayBetweenMessages, this.settings.ttsVolume / 100);
        streamElementsTTS.streamelementsApiKey = this.settings.streamelementsApiKey;

        document.addEventListener("keydown", this.handleKeyDown);
        DiscordModules.subscribe("RELATIONSHIP_ADD", this.handleUpdateRelations);
        DiscordModules.subscribe("RELATIONSHIP_REMOVE", this.handleUpdateRelations);
        DiscordModules.subscribe("SPEAK_MESSAGE", this.handleSpeakMessage);
        DiscordModules.subscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleStopTTS);
        if (this.settings.enableMessageReading) {
            DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
        }
        if (this.settings.enableUserAnnouncement) {
            DiscordModules.subscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
        }

        this.patchOriginalTTS();
        this.patchContextMenus();
    }

    stop() {
        this.unpatchContextMenus();
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.handleAnnouceUsers);
        DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
        DiscordModules.unsubscribe("AUDIO_TOGGLE_SELF_DEAF", this.handleStopTTS);
        DiscordModules.unsubscribe("SPEAK_MESSAGE", this.handleSpeakMessage);
        DiscordModules.unsubscribe("RELATIONSHIP_REMOVE", this.handleUpdateRelations);
        DiscordModules.unsubscribe("RELATIONSHIP_ADD", this.handleUpdateRelations);
        document.removeEventListener("keydown", this.handleKeyDown);
        this.audioPlayer.stopTTS();
        DOM.removeStyle(this.meta.name);
    }

    // Event handelers
    patchOriginalTTS() {
        Patcher.instead(this.meta.name, speakMessage[0], speakMessage[1], (thisObject, args, originalFunction) => {
            setTTSType[0][setTTSType[1]]("NEVER"); // Disables the original TTS
        });
        Patcher.instead(this.meta.name, cancelSpeak[0], cancelSpeak[1], (thisObject, args, originalFunction) => {
            return;
        });
    }

    messageRecieved(event) {
        if (!this.settings.enableTTS) return;
        let message = event.message;
        if ((event.guildId || !message.member) && this.shouldPlayMessage(event.message)) {
            let text = this.getPatchedContent(message, message.guild_id);
            this.audioPlayer.enqueueTTSMessage(text);
        }
    }

    annouceUser(event) {
        if (!this.settings.enableTTS) return;
        let connectedChannelId = RTCConnectionStore.getChannelId();
        let userId = UserStore.getCurrentUser().id;
        for (const userStatus of event.voiceStates) {
            if (connectedChannelId && userStatus.userId !== userId) {
                if (userStatus.channelId !== userStatus.oldChannelId) {
                    let username = this.getUserName(userStatus.userId, userStatus.guildId);
                    if (userStatus.channelId === connectedChannelId) {
                        this.audioPlayer.enqueueTTSMessage(`${username} joined`, true);
                    } else if (userStatus.oldChannelId === connectedChannelId) {
                        this.audioPlayer.enqueueTTSMessage(`${username} left`, true);
                    }
                }
            }
        }
    }

    speakMessage(event) {
        if (!this.settings.enableTTS) return;
        let text = this.getPatchedContent(event.message, event.channel.guild_id);
        this.audioPlayer.enqueueTTSMessage(text);
    }

    stopTTS() {
        if (MediaEngineStore.isSelfDeaf())
            this.audioPlayer.stopTTS();
    }

    updateRelationships() {
        this.usersBlocked = new Set(RelationshipStore.getBlockedIDs());
        this.usersIgnored = new Set(RelationshipStore.getIgnoredIDs());
        this.usersFriends = new Set(RelationshipStore.getFriendIDs());
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

    patchContextMenus() {
        this.patchUserContext = this.patchUserContextMenu.bind(this);
        this.patchChannelContext = this.patchChannelContextMenu.bind(this);
        this.patchGuildContext = this.patchGuildContextMenu.bind(this);

        ContextMenu.patch("user-context", this.patchUserContext);
        ContextMenu.patch("channel-context", this.patchChannelContext);
        ContextMenu.patch("guild-context", this.patchGuildContext);
    }

    unpatchContextMenus() {
        ContextMenu.unpatch("user-context", this.patchUserContext);
        ContextMenu.unpatch("channel-context", this.patchChannelContext);
        ContextMenu.unpatch("guild-context", this.patchGuildContext);
    }

    patchUserContextMenu(returnValue, props) {
        if (!props.user) return;
        let userId = props.user.id;
        let channelId = props.channel.id;
        const buttonFilterUser = button => (button?.props?.id === "mute" || button?.props?.id === "block");
        const buttonFilterChats = button => (button?.props?.id === "mute-channel" || button?.props?.id === "unmute-channel");
        let buttonParent1 = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilterUser));
        let buttonParent2 = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilterChats));
        let ttsToggleUser = ContextMenu.buildItem({
            type: "toggle",
            label: "Mute TTS Messages",
            checked: this.ttsMutedUsers.has(userId),
            action: (newValue) => {
                if (newValue.currentTarget.ariaChecked
                    !== "true") {
                    this.ttsMutedUsers.add(userId);
                } else {
                    this.ttsMutedUsers.delete(userId);
                }
                Data.save(this.meta.name, "ttsMutedUsers", this.ttsMutedUsers);
            }
        });
        let ttsTestAnnouceUser = ContextMenu.buildItem({
            type: "button",
            label: "Speak Announcement",
            icon: listenIcon,
            action: () => {
                const guildId = SelectedGuildStore.getGuildId();
                let username = this.getUserName(userId, guildId);
                this.audioPlayer.enqueueTTSMessage(`${username} joined`, true);
            }
        });
        let ttsToggleChat = ContextMenu.buildItem({
            type: "toggle",
            label: "TTS Subscribe Chat",
            checked: this.ttsSubscribedChannels.has(channelId),
            action: (newValue) => {
                if (newValue.currentTarget.ariaChecked
                    !== "true") {
                    this.ttsSubscribedChannels.add(channelId);
                } else {
                    this.ttsSubscribedChannels.delete(channelId);
                }
                Data.save(this.meta.name, "ttsSubscribedChannels", this.ttsSubscribedChannels);
            }
        });
        if (Array.isArray(buttonParent1)) {
            buttonParent1.push(ttsToggleUser);
            buttonParent1.push(ttsTestAnnouceUser);
        }
        if (Array.isArray(buttonParent2))
            buttonParent2.push(ttsToggleChat);
    }

    patchChannelContextMenu(returnValue, props) {
        let channelId = props.channel.id;
        const buttonFilter = button => (button?.props?.id === "mute-channel" || button?.props?.id === "unmute-channel");
        let buttonParent = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilter));
        let ttsGroup = ContextMenu.buildItem({
            type: "toggle",
            label: "TTS Subscribe Channel",
            checked: this.ttsSubscribedChannels.has(channelId),
            action: (newValue) => {
                if (newValue.currentTarget.ariaChecked
                    !== "true") {
                    this.ttsSubscribedChannels.add(channelId);
                } else {
                    this.ttsSubscribedChannels.delete(channelId);
                }
                Data.save(this.meta.name, "ttsSubscribedChannels", this.ttsSubscribedChannels);
            }
        });
        if (Array.isArray(buttonParent))
            buttonParent.push(ttsGroup);
    }

    patchGuildContextMenu(returnValue, props) {
        if (!props.guild) return;
        let guildId = props.guild.id;
        const buttonFilter = button => button?.props?.id === "guild-notifications";
        let buttonParent = Utils.findInTree(returnValue, e => Array.isArray(e) && e.some(buttonFilter));
        let ttsGroup = ContextMenu.buildItem({
            type: "toggle",
            label: "TTS Subscribe Server",
            checked: this.ttsSubscribedGuilds.has(guildId),
            action: (newValue) => {
                if (newValue.currentTarget.ariaChecked
                    !== "true") {
                    this.ttsSubscribedGuilds.add(guildId);
                } else {
                    this.ttsSubscribedGuilds.delete(guildId);
                }
                Data.save(this.meta.name, "ttsSubscribedGuilds", this.ttsSubscribedGuilds);
            }
        });
        if (Array.isArray(buttonParent))
            buttonParent.push(ttsGroup);
    }

    isConnected() {
        let channelId = SelectedChannelStore.getVoiceChannelId();
        return channelId !== null;
    }

    shouldIngnoreWhenConnected(source) {
        if (!this.isConnected()) return false;
        switch (this.settings.ingnoreWhenConnected) {
            case "none":
                return false;
            case "subscribed":
                return this.settings.ingnoreWhenConnected === source;
            case "focusedConnected":
                return this.settings.ingnoreWhenConnected === source;
            case "all":
                return true;
            default:
                break;
        }
        return false;
    }

    // Message evaluation
    shouldPlayMessage(message) {
        let isSelfDeaf = MediaEngineStore.isSelfDeaf();
        if (isSelfDeaf || message.state === "SENDING" || message.content === "")
            return false;

        let messageAuthorId = message.author.id;
        let messageChannelId = message.channel_id;
        let messageGuildId = message.guild_id;

        let userId = UserStore.getCurrentUser().id;
        let focusedChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
        let connectedChannel = RTCConnectionStore.getChannelId();
        let focusedGuild = SelectedGuildStore.getGuildId();
        let connectedGuild = RTCConnectionStore.getGuildId();

        this.mutedChannels = UserGuildSettingsStore.getMutedChannels(messageGuildId);
        this.mutedGuild = UserGuildSettingsStore.isMuted(messageGuildId);

        if (this.ttsMutedUsers.has(messageAuthorId)
            || this.settings.blockBlockedUsers && this.usersBlocked.has(messageAuthorId)
            || this.settings.blockIgnoredUsers && this.usersIgnored.has(messageAuthorId)
            || this.settings.blockNotFriendusers && !this.usersFriends.has(messageAuthorId)
            || this.settings.blockMutedChannels && this.mutedChannels.has(messageChannelId)
            || this.settings.blockMutedGuilds && this.mutedGuild) {
            return false;
        }
        if (message.tts) { // command /tts
            message.prependGuildChannel = false;
            return true;
        }
        if (messageAuthorId === userId) {
            return false;
        }

        message.prependGuildChannel = this.settings.channelInfoReading === "focusedConnected" || this.settings.channelInfoReading === "all";
        switch (this.settings.messagesChannelsToRead) {
            case "never":
                break;
            case "allChannels":
                return true;
            case "focusedChannel":
                return messageChannelId === focusedChannel && !this.shouldIngnoreWhenConnected("focusedConnected");
            case "connectedChannel":
                return messageChannelId === connectedChannel && !this.shouldIngnoreWhenConnected("focusedConnected");
            case "focusedGuildChannels":
                return messageGuildId === focusedGuild && !this.shouldIngnoreWhenConnected("focusedConnected");
            case "connectedGuildChannels":
                return messageGuildId === connectedGuild && !this.shouldIngnoreWhenConnected("focusedConnected");
            default:
                break;
        }
        if (this.ttsSubscribedChannels.has(messageChannelId) || this.ttsSubscribedGuilds.has(messageGuildId)) {
            message.prependGuildChannel = this.settings.channelInfoReading === "subscribed" || this.settings.channelInfoReading === "all";
            return true && !this.shouldIngnoreWhenConnected("subscribed");
        }

        return false;
    }

    getUserName(userId, guildId) {
        let user = UserStore.getUser(userId);
        switch (this.settings.messageNamesReading) {
            case "userName":
                return user.username;
            case "globalName":
                return user.globalName ?? user.username;
            case "friendName":
                return RelationshipStore.getNickname(userId) ?? user.globalName ?? user.username;
            case "serverName":
                return GuildMemberStore.getNick(guildId, userId) ?? user.globalName ?? user.username;
            default:
                if (guildId) {
                    return GuildMemberStore.getNick(guildId, userId) ?? user.globalName ?? user.username;
                } else {
                    return RelationshipStore.getNickname(userId) ?? user.globalName ?? user.username;
                }
        }
    }

    getPatchedContent(message, guildId) {
        let text = message.content
            .replace(/<@!?(\d+)>/g, (match, userId) => this.getUserName(userId, guildId))
            .replace(/<@&?(\d+)>/g, (match, roleId) => GuildStore.getRoles(guildId)[roleId]?.name)
            .replace(/<#(\d+)>/g, (match, channelId) => ChannelStore.getChannel(channelId)?.name)
            .replace(/<a?:(\w+):(\d+)>/g, (match, emojiName) => "Emoji " + emojiName)
            .replace(/\|\|([^|]+)\|\|/g, (match, content) => this.settings.messageSpoilersReading ? content : "Spoiler")
            .replace(/https?:\/\/[^\s]+/g, (url) => {
                switch (this.settings.messageLinksReading) {
                    case 'remove':
                        return '';
                    case 'domain':
                        const domain = new URL(url).hostname;
                        return domain;
                    case 'sobstitute':
                        return 'URL';
                    case 'keep':
                        return url;
                    default:
                        return url;
                }
            });
        this.textReplacerRules.forEach(rule => {
            let parts = /\/(.*)\/(.*)/.exec(rule.regex);
            let regex;
            if (regex == null)
                regex = new RegExp(rule.regex);
            else
                regex = new RegExp(parts[1], parts[2]);
            text = text.replace(regex, rule.replacement);
        });
        if (text === "") return;
        let toRead = "";
        if (this.settings.messagePrependChannel || this.settings.messagePrependGuild || this.settings.messagePrependNames) {
            if (this.settings.messagePrependNames) {
                let username = this.getUserName(message.author.id, guildId);
                toRead += `${username} `;
            }
            if ((this.settings.messagePrependGuild || this.settings.messagePrependChannel) && message.prependGuildChannel) {
                toRead += "in ";
                if (this.settings.messagePrependGuild) {
                    let guild = GuildStore.getGuild(guildId);
                    toRead += `${guild?.name} `;
                }
                if (this.settings.messagePrependChannel) {
                    let channel = ChannelStore.getChannel(message.channel_id);
                    toRead += `${channel?.name} `;
                }
            }
            toRead += `said ${text}`;
        } else {
            toRead += text;
        }
        return toRead;
    }

    // TTS Toggle
    toggleTTS() {
        let isEnabled = this.settings.enableTTS;
        if (isEnabled) {
            UI.showToast("TTS Muted 🔇");
        } else {
            UI.showToast("TTS Enabled 🔊");
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
};

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}

class AudioPlayer {
    usersCache = new Map();

    sourceInterface = discordTTS;

    previewMessages = [];
    userAnnouncements = [];
    normalMessages = [];
    isPlaying = false;
    isPriority = false;
    usingCache = false;
    playingText = "";
    media = undefined;

    rate = 1.0;
    delay = 0;
    volume = 1.0;
    updateConfig(source, voice, rate, delay, volume) {
        this.updateTTSSourceAndVoice(source, voice);
        this.updateRate(rate);
        this.updateDelay(delay);
        this.updateVolume(volume);
    }

    updateTTSSourceAndVoice(source, voice) {
        this.sourceInterface = getSource(source);
        if (!voice) {
            voice = this.sourceInterface.getDefaultVoice();
        }
        this.sourceInterface.setVoice(voice);
        this.usersCache.clear();
    }

    updateRate(rate) {
        this.rate = rate;
        if (this.media instanceof Audio)
            this.media.playbackRate = rate;
        else if (this.media instanceof SpeechSynthesisUtterance)
            this.media.rate = rate;
    }

    updateDelay(delay) {
        this.delay = delay;
    }

    updateVolume(volume) {
        this.volume = volume;
        if (this.media instanceof Audio)
            this.media.volume = clamp(volume, 0, 1);
        else if (this.media instanceof SpeechSynthesisUtterance)
            this.media.volume = clamp(volume, 0, 1);
    }

    enqueueTTSMessage(text, type) {
        if (!text) return;
        if (type === "preview") {
            this.previewMessages.push(text);
        } else if (type === "user") {
            this.userAnnouncements.push(text);
        } else {
            this.normalMessages.push(text);
        }
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.playTTS();
        }
    }

    stopCurrentTTS() {
        if (this.media instanceof Audio)
            this.media.pause();
        else if (this.media instanceof SpeechSynthesisUtterance)
            speechSynthesis.cancel();
        this.playingText = "";
        this.media = undefined;
        this.playNextTTS();
    }

    stopTTS() {
        this.isPlaying = false;
        this.previewMessages = [];
        this.userAnnouncements = [];
        this.normalMessages = [];
        this.stopCurrentTTS();
    }

    playNextTTS() {
        setTimeout(() => {
            this.playingText = "";
            this.media = undefined;
            if (this.previewMessages.length > 0 || this.userAnnouncements.length > 0 || this.normalMessages.length > 0) {
                this.playTTS();
            } else {
                this.isPlaying = false;
            }
        }, this.delay);
    }

    playAudio() {
        if (this.media instanceof HTMLAudioElement) {
            try {
                this.media.playbackRate = this.rate;
                this.media.volume = clamp(this.volume, 0, 1);
                this.media.addEventListener("ended", () => this.playNextTTS());
                this.media.play();
            } catch (error) {
                console.error("Error playing audio:", error);
                this.playNextTTS();
            }
        } else if (this.media instanceof SpeechSynthesisUtterance) {
            this.media.rate = this.rate;
            this.media.volume = clamp(this.volume, 0, 1);
            this.media.onend = () => this.playNextTTS();
            speechSynthesis.speak(this.media);
        } else {
            this.playNextTTS();
        }
    }

    playTTS() {
        this.isPriority = this.previewMessages.length > 0;
        this.usingCache = this.userAnnouncements.length > 0;
        this.playingText = this.isPriority ? this.previewMessages.shift() || "" : this.usingCache ? this.userAnnouncements.shift() || "" : this.normalMessages.shift() || "";
        if (this.playingText) {
            if (this.usingCache) {
                const cachedAudio = this.usersCache.get(this.playingText);
                if (cachedAudio) {
                    this.media = cachedAudio;
                    this.playAudio();
                    return;
                }
            }
            this.sourceInterface.getMedia(this.playingText).then(media => {
                if (this.usingCache) this.usersCache.set(this.playingText, media);
                this.media = media;
                this.playAudio();
            }).catch(error => {
                console.error("Error getting media:", error);
                this.playNextTTS();
            });
        } else {
            this.stopCurrentTTS();
        }
    }
};

// TTS Sources
class AbstractTTSSource {
    sourceOption = { label: "Abstract", value: "abstract" };

    constructor() {
        const retrive = async () => {
            this.voicesLabels = await this.retrieveVoices();
            if (this.voicesLabels.length === 0) {
                setTimeout(retrive, 5000);
            }
        };
        retrive();
    }

    voicesLabels = [{ label: "No voices available", value: "none" }];
    selectedVoice = "";

    async retrieveVoices() {
        throw new Error("Method not implemented.");
    }

    getDefaultVoice() {
        throw new Error("Method not implemented.");
    }

    getVoices() {
        return this.voicesLabels;
    }

    setVoice(voice) {
        this.selectedVoice = voice;
    }

    async getMedia(text) {
        throw new Error("Method not implemented.");
    }
}
const discordTTS = new class DiscordTTS extends AbstractTTSSource {
    sourceOption = { label: "Discord", value: "discord" };

    getDefaultVoice() {
        return speechSynthesis.getVoices()[0].voiceURI;
    }

    async retrieveVoices() {
        const voices = speechSynthesis.getVoices();
        this.voicesLabels = voices
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(voice => ({
                label: voice.name,
                value: voice.voiceURI
            }));
        return this.voicesLabels;
    }

    async getMedia(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices().find(v => v.voiceURI === this.selectedVoice) || speechSynthesis.getVoices()[0];
        return utterance;
    }
}
const streamElementsTTS = new class StreamElementsTTS extends AbstractTTSSource {
    sourceOption = { label: "StreamElements", value: "streamelements" };

    getDefaultVoice() {
        return "Brian";
    }

    async retrieveVoices() {
        try {
            const response = await fetch("https://api.streamelements.com/kappa/v2/speech/voices");
            if (!response.ok) {
                console.error("Failed to load voices");
                return this.voicesLabels;
            }
            const data = await response.json();
            const voices = data.voices;
            this.voicesLabels = Object.values(voices)
                .sort((a, b) => a.languageName.localeCompare(b.languageName))
                .map((voice) => ({
                    label: `${voice.name} (${voice.languageName} ${voice.languageCode})`,
                    value: voice.id
                }));
        } catch (error) {
            throw new Error("Failed to load voices");
        }
        return this.voicesLabels;
    }

    async getMedia(text) {
        return new Promise((resolve, reject) => {
            text = encodeURIComponent(text);
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${this.selectedVoice}&text=${text}&key=${this.streamelementsApiKey}`;
            const audio = new Audio(url);
            audio.addEventListener("loadeddata", () => resolve(audio));
            audio.addEventListener("error", () => reject(new Error("Failed to load audio")));
        });
    }
}
const tikTokTTS = new class TikTokTTS extends AbstractTTSSource {
    sourceOption = { label: "TikTok", value: "tiktok" };

    getDefaultVoice() {
        return "en_us_001";
    }

    async retrieveVoices() {
        this.voicesLabels = [
            { label: "GHOSTFACE", value: "en_us_ghostface" },
            { label: "CHEWBACCA", value: "en_us_chewbacca" },
            { label: "C3PO", value: "en_us_c3po" },
            { label: "STITCH", value: "en_us_stitch" },
            { label: "STORMTROOPER", value: "en_us_stormtrooper" },
            { label: "ROCKET", value: "en_us_rocket" },
            { label: "MADAME_LEOTA", value: "en_female_madam_leota" },
            { label: "GHOST_HOST", value: "en_male_ghosthost" },
            { label: "PIRATE", value: "en_male_pirate" },
            { label: "AU_FEMALE_1", value: "en_au_001" },
            { label: "AU_MALE_1", value: "en_au_002" },
            { label: "UK_MALE_1", value: "en_uk_001" },
            { label: "UK_MALE_2", value: "en_uk_003" },
            { label: "US_FEMALE_1", value: "en_us_001" },
            { label: "US_FEMALE_2", value: "en_us_002" },
            { label: "US_MALE_1", value: "en_us_006" },
            { label: "US_MALE_2", value: "en_us_007" },
            { label: "US_MALE_3", value: "en_us_009" },
            { label: "US_MALE_4", value: "en_us_010" },
            { label: "MALE_JOMBOY", value: "en_male_jomboy" },
            { label: "MALE_CODY", value: "en_male_cody" },
            { label: "FEMALE_SAMC", value: "en_female_samc" },
            { label: "FEMALE_MAKEUP", value: "en_female_makeup" },
            { label: "FEMALE_RICHGIRL", value: "en_female_richgirl" },
            { label: "MALE_GRINCH", value: "en_male_grinch" },
            { label: "MALE_DEADPOOL", value: "en_male_deadpool" },
            { label: "MALE_JARVIS", value: "en_male_jarvis" },
            { label: "MALE_ASHMAGIC", value: "en_male_ashmagic" },
            { label: "MALE_OLANTERKKERS", value: "en_male_olantekkers" },
            { label: "MALE_UKNEIGHBOR", value: "en_male_ukneighbor" },
            { label: "MALE_UKBUTLER", value: "en_male_ukbutler" },
            { label: "FEMALE_SHENNA", value: "en_female_shenna" },
            { label: "FEMALE_PANSINO", value: "en_female_pansino" },
            { label: "MALE_TREVOR", value: "en_male_trevor" },
            { label: "FEMALE_BETTY", value: "en_female_betty" },
            { label: "MALE_CUPID", value: "en_male_cupid" },
            { label: "FEMALE_GRANDMA", value: "en_female_grandma" },
            { label: "MALE_XMXS_CHRISTMAS", value: "en_male_m2_xhxs_m03_christmas" },
            { label: "MALE_SANTA_NARRATION", value: "en_male_santa_narration" },
            { label: "MALE_SING_DEEP_JINGLE", value: "en_male_sing_deep_jingle" },
            { label: "MALE_SANTA_EFFECT", value: "en_male_santa_effect" },
            { label: "FEMALE_HT_NEYEAR", value: "en_female_ht_f08_newyear" },
            { label: "MALE_WIZARD", value: "en_male_wizard" },
            { label: "FEMALE_HT_HALLOWEEN", value: "en_female_ht_f08_halloween" },
            { label: "FR_MALE_1", value: "fr_001" },
            { label: "FR_MALE_2", value: "fr_002" },
            { label: "DE_FEMALE", value: "de_001" },
            { label: "DE_MALE", value: "de_002" },
            { label: "ES_MALE", value: "es_002" },
            { label: "ES_MX_MALE", value: "es_mx_002" },
            { label: "BR_FEMALE_1", value: "br_001" },
            { label: "BR_FEMALE_2", value: "br_003" },
            { label: "BR_FEMALE_3", value: "br_004" },
            { label: "BR_MALE", value: "br_005" },
            { label: "BP_FEMALE_IVETE", value: "bp_female_ivete" },
            { label: "BP_FEMALE_LUDMILLA", value: "bp_female_ludmilla" },
            { label: "PT_FEMALE_LHAYS", value: "pt_female_lhays" },
            { label: "PT_FEMALE_LAIZZA", value: "pt_female_laizza" },
            { label: "PT_MALE_BUENO", value: "pt_male_bueno" },
            { label: "ID_FEMALE", value: "id_001" },
            { label: "JP_FEMALE_1", value: "jp_001" },
            { label: "JP_FEMALE_2", value: "jp_003" },
            { label: "JP_FEMALE_3", value: "jp_005" },
            { label: "JP_MALE", value: "jp_006" },
            { label: "KR_MALE_1", value: "kr_002" },
            { label: "KR_FEMALE", value: "kr_003" },
            { label: "KR_MALE_2", value: "kr_004" },
            { label: "JP_FEMALE_FUJICOCHAN", value: "jp_female_fujicochan" },
            { label: "JP_FEMALE_HASEGAWARIONA", value: "jp_female_hasegawariona" },
            { label: "JP_MALE_KEIICHINAKANO", value: "jp_male_keiichinakano" },
            { label: "JP_FEMALE_OOMAEAIIKA", value: "jp_female_oomaeaika" },
            { label: "JP_MALE_YUJINCHIGUSA", value: "jp_male_yujinchigusa" },
            { label: "JP_FEMALE_SHIROU", value: "jp_female_shirou" },
            { label: "JP_MALE_TAMAWAKAZUKI", value: "jp_male_tamawakazuki" },
            { label: "JP_FEMALE_KAORISHOJI", value: "jp_female_kaorishoji" },
            { label: "JP_FEMALE_YAGISHAKI", value: "jp_female_yagishaki" },
            { label: "JP_MALE_HIKAKIN", value: "jp_male_hikakin" },
            { label: "JP_FEMALE_REI", value: "jp_female_rei" },
            { label: "JP_MALE_SHUICHIRO", value: "jp_male_shuichiro" },
            { label: "JP_MALE_MATSUDAKE", value: "jp_male_matsudake" },
            { label: "JP_FEMALE_MACHIKORIIITA", value: "jp_female_machikoriiita" },
            { label: "JP_MALE_MATSUO", value: "jp_male_matsuo" },
            { label: "JP_MALE_OSADA", value: "jp_male_osada" },
            { label: "SING_FEMALE_ALTO", value: "en_female_f08_salut_damour" },
            { label: "SING_MALE_TENOR", value: "en_male_m03_lobby" },
            { label: "SING_FEMALE_WARMY_BREEZE", value: "en_female_f08_warmy_breeze" },
            { label: "SING_MALE_SUNSHINE_SOON", value: "en_male_m03_sunshine_soon" },
            { label: "SING_FEMALE_GLORIOUS", value: "en_female_ht_f08_glorious" },
            { label: "SING_MALE_IT_GOES_UP", value: "en_male_sing_funny_it_goes_up" },
            { label: "SING_MALE_CHIPMUNK", value: "en_male_m2_xhxs_m03_silly" },
            { label: "SING_FEMALE_WONDERFUL_WORLD", value: "en_female_ht_f08_wonderful_world" },
            { label: "SING_MALE_FUNNY_THANKSGIVING", value: "en_male_sing_funny_thanksgiving" },
            { label: "MALE_NARRATION", value: "en_male_narration" },
            { label: "MALE_FUNNY", value: "en_male_funny" },
            { label: "FEMALE_EMOTIONAL", value: "en_female_emotional" }
        ];
        return this.voicesLabels;
    }

    async getMedia(text) {
        return new Promise((resolve, reject) => {
            try {
                fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text, voice: this.selectedVoice })
                }).then(async response => {
                    const data = await response.json();
                    const audio = new Audio();
                    audio.src = `data:audio/mpeg;base64,${data.data}`;
                    audio.addEventListener("loadeddata", () => resolve(audio));
                    audio.addEventListener("error", () => reject(new Error("Failed to load audio")));
                }).catch(error => {
                    reject(error);
                });
            } catch (error) {
                reject(new Error("Failed to load audio"));
            }
        });
    }
}

const sourcesOptions = [
    discordTTS.sourceOption,
    streamElementsTTS.sourceOption,
    tikTokTTS.sourceOption
];

function getSource(source) {
    switch (source) {
        case "discord":
            return discordTTS;
        case "streamelements":
            return streamElementsTTS;
        case "tiktok":
            return tikTokTTS;
        default:
            return undefined;
    }
}

function getVoices(source) {
    const sourceInterface = getSource(source);
    return sourceInterface ? sourceInterface.getVoices() : [];
}

function getDefaultVoice(source) {
    const sourceInterface = getSource(source);
    return sourceInterface ? sourceInterface.getDefaultVoice() : "";
}