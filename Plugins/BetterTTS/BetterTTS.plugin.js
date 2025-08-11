/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 2.14.3
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
*/
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added changelog"] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        { type: "switch", id: "enableTTS", name: "Enable TTS", note: "Enables/Disables the TTS.", value: true },
        { type: "switch", id: "enableTTSCommand", name: "Enable /tts Command", note: "Allow playback and usage of /tts command.", value: true },
        { type: "switch", id: "enableUserAnnouncement", name: "Enable User Announcement", note: "Enables/Disables the User Announcement when join/leaves the channel.", value: true },
        { type: "switch", id: "enableMessageReading", name: "Enable Message Reading", note: "Enables/Disables the message reading from channels.", value: true },
        { type: "category", id: "ttsMessageSources", name: "TTS Message Sources", collapsible: true, shown: false, settings: [
            { type: "dropdown", id: "messagesChannelsToRead", name: "Channels where TTS should Read", note: "Choose the channels you want messages to be read.", value: "never", options: [
                { label: "Never", value: "never" },
                { label: "All Channels", value: "allChannels" },
                { label: "Focused Channel", value: "focusedChannel" },
                { label: "Connected Channel", value: "connectedChannel" },
                { label: "Focused Server Channels", value: "focusedGuildChannels" },
                { label: "Connected Server Channels", value: "connectedGuildChannels" },
            ]},
            { type: "dropdown", id: "ingnoreWhenConnected", name: "Ignore TTS when in Voice Channel", note: "Choose the channels you want messages to be ignored while in a voice channel.", value: "never", options: [
                { label: "None", value: "none" },
                { label: "Subscribed", value: "subscribed" },
                { label: "Focused/Connected", value: "focusedConnected" },
                { label: "All", value: "all" },
            ]},
            { type: "custom", id: "subscribedChannels", name: "Subscribed Channels", note: "List of channels that are subscribed to TTS.", children: [] },
            { type: "custom", id: "subscribedGuild", name: "Subscribed Servers", note: "List of servers that are subscribed to TTS.", children: [] },
        ]},
        { type: "category", id: "messageReadingSettings", name: "Message Reading Settings", collapsible: true, shown: false, settings: [
            { type: "dropdown", id: "channelInfoReading", name: "Channel Info Reading", note: "Sets which of the channel should prepend server and/or channel name.", value: "none", options: [
                { label: "None", value: "none" },
                { label: "Subscribed", value: "subscribed" },
                { label: "Focused/Connected", value: "focusedConnected" },
                { label: "All", value: "all" },
            ]},
            { type: "switch", id: "messagePrependGuild", name: "Enables Prepending Server Name Before Messages Reading", note: "Reads also the name of the server where the message comes from.", value: false },
            { type: "switch", id: "messagePrependChannel", name: "Enables Prepending Channel Name Before Messages Reading", note: "Reads also the name of the channel where the message comes from.", value: false },
            { type: "switch", id: "messagePrependNames", name: "Enables Prepending Usernames Before Messages Reading", note: "Reads also the name of the user that sent the message.", value: true },
            { type: "dropdown", id: "messageNamesReading", name: "Usernames Reading", note: "Sets which of the names of a user used by tts.", value: "default", options: [
                { label: "Default", value: "default" },
                { label: "Username", value: "userName" },
                { label: "Display Name", value: "globalName" },
                { label: "Friend Name", value: "friendName" },
                { label: "Server Name", value: "serverName" },
            ]},
            { type: "dropdown", id: "messageLinksReading", name: "Message Links Reading", note: "Select how links should be read by TTS.", value: "domain", options: [
                { label: "Remove Links", value: "remove" },
                { label: "Read Only Domain", value: "domain" },
                { label: "Sobstitute With word URL", value: "sobstitute" },
                { label: "Keep URL", value: "keep" },
            ]},
            { type: "switch", id: "messageSpoilersReading", name: "Enables Reading Messages Spoilers", note: "If enabled, it will read messages spoilers content.", value: false },          
        ]},
        { type: "category", id: "ttsSourceSelection", name: "TTS Voice Source", collapsible: true, shown: false, settings: [
            { type: "custom", id: "ttsSource", name: "TTS Source", note: "Choose the channel you want to play the TTS.", value:"streamlabs", children: []},
            { type: "custom", id: "ttsVoice", name: "Voice for TTS", note: "Changes voice used for TTS.", value:"Brian", children: []}
        ]},
        { type: "category", id: "messageBlockFilters", name: "Message Block Filters", collapsible: true, shown: false, settings: [
            { type: "custom", id: "mutedUsers", name: "Muted Users", note: "List of users that muted to TTS.", children: [] },
            { type: "switch", id: "blockBlockedUsers", name: "Block Blocked Users", note: "Blocks blocked users from TTS.", value: true },
            { type: "switch", id: "blockIgnoredUsers", name: "Block Ignored Users", note: "Blocks ignored users from TTS.", value: true },
            { type: "switch", id: "blockNotFriendusers", name: "Block Not Friend Users", note: "Blocks not friends users from TTS.", value: false },
            { type: "switch", id: "blockMutedChannels", name: "Block Muted Channels", note: "Blocks muteds channels from TTS.", value: true },
            { type: "switch", id: "blockMutedGuilds", name: "Block Muted Guilds", note: "Blocks muteds server/guilds from TTS.", value: false },
        ]},
        { type: "category", id: "ttsAudioSettings", name: "TTS Audio Settings", collapsible: true, shown: false, settings: [
            { type: "slider", id: "ttsVolume", name: "TTS Volume", note: "Changes the volume of the TTS.", step: 0.1, value: 100, min: 0, max: 100, units: "%", markers: [0, 25, 50, 75, 100], inline: false },
            { type: "slider", id: "ttsSpeechRate", name: "TTS Speech Rate", note: "Changes the speed of the TTS.", step: 0.05, value: 1, min: 0.1, max: 2, units: "x", markers: [0.1, 1, 1.25, 1.5, 1.75, 2], inline: false },
            { type: "custom", id: "ttsPreview", name: "Play TTS Preview", note: "Plays a default test message.", children: [] },
            { type: "number", id: "ttsDelayBetweenMessages", name: "Delay Between messages (ms)", note: "Only works for Syncronous messages.", value: 1000 },
        ]},
        { type: "category", id: "textReplacer", name: "Text Replacer", collapsible: true, shown: false, settings: [
            { type: "custom", id: "textReplacerRules", name: "Rules", note: "Sobstitute Texts that matches your regex before reading it.", children: [] },
            { type: "custom", id: "textReplacerAdd", name: "Add Rule", note: "Adds a regex rule to sobstitute matches with a custom text.", children: [] },
        ]},
        { type: "category", id: "keybinds", name: "Keybinds", collapsible: true, shown: false, settings: [
            { type: "keybind", id: "ttsToggle", name: "Toggle TTS", note: "Shortcut to toggle the TTS.", clearable: true, value: [] },
        ]},
    ]
};

const { Webpack, Patcher, React, ContextMenu, Utils, Components, Data, UI, DOM } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ChannelStore = Webpack.getStore("ChannelStore");
const GuildStore = Webpack.getStore("GuildStore");
const GuildMemberStore = Webpack.getStore("GuildMemberStore");
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const RelationshipStore = Webpack.getStore("RelationshipStore");
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
const SelectedGuildStore = Webpack.getStore("SelectedGuildStore");
const UserGuildSettingsStore = Webpack.getStore("UserGuildSettingsStore");
const UserSettingsProtoStore = Webpack.getStore("UserSettingsProtoStore");
const UserStore = Webpack.getStore("UserStore");

const speakMessage = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.speak"))];
const cancelSpeak = [...Webpack.getWithKey(Webpack.Filters.byStrings("speechSynthesis.cancel"))];
const setTTSType = [...Webpack.getWithKey(Webpack.Filters.byStrings("setTTSType"))];

const listenIcon = Webpack.getModule(Webpack.Filters.byStrings("evenodd", "M12 22a10 10 0 1"), { searchExports: true });

module.exports = class BetterTTS {
    constructor(meta) {
        this.meta = meta;

        this.settings = {};
        this.keyShortcut = null;
    }

    // Settings
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
        //UserSettingsProtoStore.settings.textAndImages.enableTtsCommand?.value = this.settings.enableTTSCommand;
        this.ttsMutedUsers = new Set(Data.load(this.meta.name, "ttsMutedUsers")) ?? new Set();
        this.ttsSubscribedChannels = new Set(Data.load(this.meta.name, "ttsSubscribedChannels")) ?? new Set();
        this.ttsSubscribedGuilds = new Set(Data.load(this.meta.name, "ttsSubscribedGuilds")) ?? new Set();
        this.textReplacerRules = new Set(Data.load(this.meta.name, "textReplacerRules")) ?? new Set();
        this.updateRelationships();
    }
    
    listeners = {};

    subscribe = (event, callback) => {
        this.listeners[event]=callback;
    };

    emit = (event, data) => {
        if (this.listeners[event]) {
            this.listeners[event](data);
        }
    };

    DropdownSources = () => {
        const options = getTTSSources();
        const [selectedSource, setSelectedSource] = React.useState(this.settings.ttsSource || options[0]?.value || "");

        return React.createElement(Components.DropdownInput, {
            value: selectedSource,
            onChange: React.useCallback((value) => {
                setSelectedSource(value);
                this.updateSettingValue(undefined, "ttsSource", value);
                this.emit("sourceChanged", value);
            }),
            options: options
        });
    };

    DropdownVoices = () => {
        const [source, setSource] = React.useState(this.settings.ttsSource || "");
        const [options, setOptions] = React.useState(getTTSVoices(source));
        const [selectedVoice, setSelectedVoice] = React.useState(this.settings.ttsVoice || options[0]?.value || "");

        this.subscribe("sourceChanged", (newSource) => {
            setOptions(getTTSVoices(newSource));
            setSelectedVoice(options[0]?.value || "");
            this.updateSettingValue(undefined, "ttsVoice", selectedVoice);
        });

        return React.createElement(Components.DropdownInput, {
            value: selectedVoice,
            onChange: React.useCallback((value) => {
                setSelectedVoice(value);
                this.updateSettingValue(undefined, "ttsVoice", value);
            }),
            options: options
        });
    };

    DropdownButtonGroup = ({labeltext, setName, getFunction}) => {
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
            React.createElement( Components.Button, {
                onClick: () => {
                    if (selectedOption === "") return;
                    options.splice(options.indexOf(selectedOption), 1);
                    setSelectedOption("");
                    this[setName].delete(selectedOption);
                    Data.save(this.meta.name, setName, this[setName]);
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
                    {xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", fill:"currentColor", class:"bi bi-pause-fill", viewBox:"0 0 16 16"}, 
                    React.createElement("path", {d: "M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"})
                );
            } else {
                icon = React.createElement("svg", 
                    {xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", fill:"currentColor", class:"bi bi-play-fill", viewBox:"0 0 16 16"}, 
                    React.createElement("path", {d: "m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"})
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
            React.createElement(Components.Button,{ 
                onClick: () => {
                    this.AudioPlayer.stopTTS();
                    if (!isPlaying) {
                        this.AudioPlayer.addToQueue(text);
                    }              
                    setIsPlaying(!isPlaying);
                }
            }, getLabel(isPlaying))
        );
    };

    TextReplaceDropdown = ({}) => {
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
                    return {label: option.regex + " - " + option.replacement, value: index + 1 };
                })]
            },),            
            React.createElement( Components.Button, {
                onClick: () => {
                    if (selectedOption === 0) return;
                    let deleted = options.splice(selectedOption-1, 1);
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
                    this.textReplacerRules.add({regex: regex, replacement: replacement});
                    Data.save(this.meta.name, "textReplacerRules", this.textReplacerRules);
                    setRegex("");
                    setReplacement("");
                }
            },"Add Regex")
        );
    };

    getSettingsPanel() {
        config.settings[4].settings[2].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Channel", setName: "ttsSubscribedChannels", getFunction: ChannelStore.getChannel })];
        config.settings[4].settings[3].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Server", setName: "ttsSubscribedGuilds", getFunction: GuildStore.getGuild })];
        config.settings[6].settings[0].children = [React.createElement(this.DropdownSources)];
        config.settings[6].settings[1].children = [React.createElement(this.DropdownVoices)];
        config.settings[7].settings[0].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unmute User", setName: "ttsMutedUsers", getFunction: UserStore.getUser })];
        config.settings[8].settings[2].children = [React.createElement(this.PreviewTTS)];
        config.settings[9].settings[0].children = [React.createElement(this.TextReplaceDropdown, {})];
        config.settings[9].settings[1].children = [React.createElement(this.TextReplaceAdd)];
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
                    this.AudioPlayer.stopTTS();
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
                this.AudioPlayer.updateSource(value);
                config.settings[6].settings[1].options = getTTSVoices(value);
                break;
            case "ttsVoice":
                this.AudioPlayer.updateVoice(value);
                break;
            case "ttsSpeechRate":
                this.AudioPlayer.updateRate(value);
                break;
            case "ttsVolume":
                this.AudioPlayer.updateVolume(value/100);
                break;
            case "ttsDelayBetweenMessages":
                value = parseInt(value);
                this.AudioPlayer.updateDelay(value);
                break;
            case "ttsToggle":
                this.updateToggleKeys(value);
                break;
            default:
                break;
        }
        this.settings[id] = value;
        this.setConfigSetting(id, value);
    }
    
    showChangelog() {
        const savedVersion = Data.load(this.meta.name, "version");
        if (savedVersion !== this.meta.version && config.changelog.length > 0) {
            UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            Data.save(this.meta.name, "version", this.meta.version);
        }
    }

    // Plugin start/stop
    start() {
        this.showChangelog();

        DOM.addStyle(this.meta.name, `label[for="textReplacerAdd"] + input[type="text"]{ min-width: 100px; width: 150px;}`);
        this.handleMessage = this.messageRecieved.bind(this);
        this.handleAnnouceUsers = this.annouceUser.bind(this);
        this.handleUpdateRelations = this.updateRelationships.bind(this);
        this.handleSpeakMessage = this.speakMessage.bind(this);
        this.handleStopTTS = this.stopTTS.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);

        this.initSettingsValues();
        this.updateToggleKeys(this.settings.ttsToggle);

        this.AudioPlayer = new AudioPlayer(this.settings.ttsSource,
            this.settings.ttsVoice,
            this.settings.ttsSpeechRate,
            this.settings.ttsDelayBetweenMessages,
            this.settings.ttsVolume/100);

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
        this.AudioPlayer.stopTTS();
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
        if(!this.settings.enableTTS) return;
        let message = event.message;
        if ((event.guildId || !message.member) && this.shouldPlayMessage(event.message)) {
            let text = this.getPatchedContent(message, message.guild_id);
            this.AudioPlayer.addToQueue(text);
        }
    }

    annouceUser(event) {
        if(!this.settings.enableTTS) return;
        let connectedChannelId = RTCConnectionStore.getChannelId();
        let userId = UserStore.getCurrentUser().id;
        for (const userStatus of event.voiceStates) {
            if (connectedChannelId && userStatus.userId !== userId) {
                if (userStatus.channelId !== userStatus.oldChannelId) {
                    let username = this.getUserName(userStatus.userId, userStatus.guildId);
                    if (userStatus.channelId === connectedChannelId) {
                        this.AudioPlayer.addToQueue(`${username} joined`);
                    } else if (userStatus.oldChannelId === connectedChannelId) {
                        this.AudioPlayer.addToQueue(`${username} left`);
                    }
                }
            }
        }
    }

    speakMessage(event) {
        if(!this.settings.enableTTS) return;
        let text = this.getPatchedContent(event.message, event.channel.guild_id);
        this.AudioPlayer.addToQueue(text);
    }

    stopTTS() {
        if (MediaEngineStore.isSelfDeaf())
            this.AudioPlayer.stopTTS();
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
                this.AudioPlayer.addToQueue(`${username} joined`);
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
        if (Array.isArray(buttonParent1)){
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
        if(!props.guild) return;
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
        if(this.ttsSubscribedChannels.has(messageChannelId) || this.ttsSubscribedGuilds.has(messageGuildId)){
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
                if(guildId) {
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
            }});
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

const delay = ms => new Promise(res => setTimeout(res, ms));

class AudioPlayer {
    constructor(source, voice, rate, delay, volume) {
        this.updateConfig(source, voice, rate, delay, volume);

        this.isPlaying = false;
        this.playingText = undefined;
        this.media = null;
        this.messagesToPlay = [];
    }

    updateConfig(source, voice, rate, delay, volume) {
        this.source = source;
        this.voice = voice;
        this.rate = rate;
        this.delay = delay;
        this.volume = volume;
    }

    addToQueue(text) {
        if (text === "") return;
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
        if (this.media) {
            if(this.media instanceof Audio)
                this.media.playbackRate = rate;
            else if(this.media instanceof SpeechSynthesisUtterance)
                this.media.rate = rate;
        }        
    }

    updateVolume(volume) {
        this.volume = volume;
        if (this.media) {
            if(this.media instanceof Audio)
                this.media.volume = clamp(volume, 0, 1);
            else if(this.media instanceof SpeechSynthesisUtterance)
                this.media.volume = clamp(volume, 0, 1);
        }            
    }

    updateDelay(delay) {
        this.delay = delay;
    }

    stopTTS() {
        if (this.media){
            if(this.media instanceof Audio)
                this.media.pause();
            else if(this.media instanceof SpeechSynthesisUtterance)
                speechSynthesis.cancel();
        }
        this.isPlaying = false;
        this.playingText = undefined;
        this.media = null;
        this.messagesToPlay = [];
    }

    // Play TTS
    async startTTS() {
        this.playingText = this.messagesToPlay.shift();
        if (this.playingText !== undefined) {
            switch (this.source) {
                case "discord":
                    this.media = DiscordTTS.getUtterance(this.playingText, this.voice);
                    break;
                case "streamlabs":
                    this.media = StreamElementsTTS.getAudio(this.playingText, this.voice);
                    break;
            }
            if (this.media instanceof Audio) {
                this.media.playbackRate = this.rate;
                this.media.volume = clamp(this.volume, 0, 1);
                this.media.addEventListener('ended', async () => {
                    await delay(this.delay);
                    if (this.messagesToPlay.length === 0) {
                        this.playingText = undefined;
                        this.media = null;
                    } else {
                        this.startTTS();
                    }
                });
                this.media.play();
            } else if (this.media instanceof SpeechSynthesisUtterance) {
                this.media.rate = this.rate;
                this.media.volume = clamp(this.volume, 0, 1);
                this.media.onend = async () => {
                    await delay(this.delay);
                    if (this.messagesToPlay.length === 0) {
                        this.playingText = undefined;
                        this.media = null;
                    } else {
                        this.startTTS();
                    }
                };
                speechSynthesis.speak(this.media);
            }
        }
    }
}

// TTS Sources
function getTTSSources() {
    const soucrcesLabels = [
        {label:"Discord", value: "discord"},
        {label:"Streamlabs", value: "streamlabs"},
    ];
    return soucrcesLabels;
}
function getTTSVoices(source){
    switch (source) {
        case "discord":
            return DiscordTTS.getVoices();
        case "streamlabs":
            return StreamElementsTTS.getVoices();
        default:
            return [{label: "No voices available", value: "none"}];
    }
}

class DiscordTTS {
    static voicesLables = [{label: "No voices available", value: "none"}];
    static getVoices() {
        let voices = speechSynthesis.getVoices();
        DiscordTTS.voicesLables = voices
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(voice => ({
                label: voice.name,
                value: voice.voiceURI
            }));
        return DiscordTTS.voicesLables;
    }

    static getUtterance(text, voice) {
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices().find(v => v.voiceURI === voice);
        return utterance;
    }
}
class StreamElementsTTS {
    static voicesLables = [{label: "No voices available", value: "none"}];
    static getVoices() {
        const request = new XMLHttpRequest();
        request.open('GET', 'https://api.streamelements.com/kappa/v2/speech/voices', false);
        request.send(null);
    
        if (request.status === 200) {
            const data = JSON.parse(request.responseText);
            let voices = data.voices;
            StreamElementsTTS.voicesLables = Object.values(voices)
                .sort((a, b) => a.languageName.localeCompare(b.languageName))
                .map(voice => ({
                    label: `${voice.name} (${voice.languageName} ${voice.languageCode})`,
                    value: voice.id
                }));
        } else {
            console.error('Error loading voices:', request.statusText);
        }
        return StreamElementsTTS.voicesLables;
    }

    static getAudio(text, voice = 'Brian') {
        text = encodeURIComponent(text);
        let url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${text}`;
        return new Audio(url);
    }
}