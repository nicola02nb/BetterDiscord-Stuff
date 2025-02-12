/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 2.8.1
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
*/
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added button in settings to test TTS"] },
        { title: "Bug Fix", type: "fixed", items: ["Fixed some issues with volume slider made by ShizCalev (PR #12)"] },
        { title: "Bug Fix", type: "fixed", items: ["Fixed enableTTS not working"] },
        //{ title: "Improvements", type: "improved", items: [""] },
    ],
    settings: [
        { type: "switch", id: "enableTTS", name: "Enable TTS", note: "Enables/Disables the TTS.", value: true },
        { type: "switch", id: "enableTTSCommand", name: "Enable /tts Command", note: "Allow playback and usage of /tts command.", value: true },
        { type: "switch", id: "enableUserAnnouncement", name: "Enable User Announcement", note: "Enables/Disables the User Announcement when join/leaves the channel.", value: true },
        { type: "switch", id: "enableMessageReading", name: "Enable Message Reading", note: "Enables/Disables the message reading from channels.", value: true },
        { type: "category", id: "messageReadingSettings", name: "Message Reading Settings", collapsible: true, shown: false, settings: [
            { type: "switch", id: "messagePrependNames", name: "Enables Prepending Usernames Before Messages Reading", note: "Reads also the name ot the user of the message that will be read by TTS.", value: true },
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
            ] },
            { type: "dropdown", id: "messagesChannelsToRead", name: "Channels where TTS should Read", note: "Choose the channels you want messages to be read.", value: "never", options: [
                { label: "Never", value: "never" },
                { label: "All Channels", value: "allChannels" },
                { label: "Suscribed Channels or Servers", value: "subscribedChannelOrGuild" },
                { label: "Focused Channel", value: "focusedChannel" },
                { label: "Connected Channel", value: "connectedChannel" },
                { label: "Focused Server Channels", value: "focusedGuildChannels" },
                { label: "Connected Server Channels", value: "connectedGuildChannels" },
            ]},
            { type: "custom", id: "subscribedChannels", name: "Subscribed Channels", note: "List of channels that are subscribed to TTS.", children: [] },
            { type: "custom", id: "subscribedGuild", name: "Subscribed Servers", note: "List of servers that are subscribed to TTS.", children: [] },
        ]},
        { type: "category", id: "ttsSourceSelection", name: "TTS Voice Source", collapsible: true, shown: false, settings: [
            { type: "dropdown", id: "ttsSource", name: "TTS Source", note: "Choose the channel you want to play the TTS.", value: "streamlabs", options: [
                    { label: "Streamlabs", value: "streamlabs" },
            ]},
            { type: "dropdown", id: "ttsVoice", name: "Voice for TTS", note: "Changes voice used for TTS.", value: "Brian", options: [
                    { label: "Brian", value: "Brian" },
            ]}
        ]},
        { type: "category", id: "messageBlockFilters", name: "Message Block Filters", collapsible: true, shown: false, settings: [
            { type: "custom", id: "mutedUsers", name: "Muted Users", note: "List of users that muted to TTS.", children: [] },
            { type: "switch", id: "blockBlockedUsers", name: "Block Blocked Users", note: "Blocks blocked users from TTS.", value: true },
            { type: "switch", id: "blockIgnoredUsers", name: "Block Ignored Users", note: "Blocks ignored users from TTS.", value: true },
            { type: "switch", id: "blockNotFriendusers", name: "Block Not Friend Users", note: "Blocks not friends users from TTS.", value: false },
            { type: "switch", id: "blockMutedChannels", name: "Block Muted Channels", note: "Blocks muteds channels from TTS.", value: true },
            { type: "switch", id: "blockMutedGuilds", name: "Block Muted Guilds", note: "Blocks muteds server/guilds from TTS.", value: false },
        ]},
        { type: "slider", id: "ttsVolume", name: "TTS Volume", note: "Changes the volume of the TTS.", step: 0.1, value: 100, min: 0, max: 100, units: "%", markers: [0, 25, 50, 75, 100], inline: false },
        { type: "slider", id: "ttsSpeechRate", name: "TTS Speech Rate", note: "Changes the speed of the TTS.", step: 0.05, value: 1, min: 0.1, max: 2, units: "x", markers: [0.1, 1, 1.25, 1.5, 1.75, 2], inline: false },
        { type: "custom", id: "ttsPreview", name: "Play TTS Preview", note: "Plays a default test message.", children: [] },
        { type: "number", id: "ttsDelayBetweenMessages", name: "Delay Between messages (ms)", note: "Only works for Syncronous messages.", value: 1000 },
        { type: "keybind", id: "ttsToggle", name: "Toggle TTS", note: "Shortcut to toggle the TTS.", value: [] },
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

const { Webpack, Patcher, Data, React, ContextMenu, Utils, Components } = BdApi;
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
                    settingInt.value = this.BdApi.Data.load(settingInt.id) ?? settingInt.value;
                    this.settings[settingInt.id] = settingInt.value;
                }
            } else {
                setting.value = this.BdApi.Data.load(setting.id) ?? setting.value;
                this.settings[setting.id] = setting.value;
            }
        }
        StreamElementsTTS.getVoices();
        //UserSettingsProtoStore.settings.textAndImages.enableTtsCommand?.value = this.settings.enableTTSCommand;
        this.ttsMutedUsers = new Set(this.BdApi.Data.load("ttsMutedUsers")) ?? new Set();
        this.ttsSubscribedChannels = new Set(this.BdApi.Data.load("ttsSubscribedChannels")) ?? new Set();
        this.ttsSubscribedGuilds = new Set(this.BdApi.Data.load("ttsSubscribedGuilds")) ?? new Set();
        this.updateRelationships();
    }

    DropdownButtonGroup = ({labeltext, setName, getFunction}) => {
        const [selectedOption, setSelectedOption] = React.useState("");

        const options = Array.from(this[setName]);

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(
                Components.DropdownInput,
                {
                    value: selectedOption,
                    onChange: (event) => {
                        setSelectedOption(event);
                    },
                    options: [{ label: "Select", value: "" }, ...options.map((option, index) => { 
                        let obj = getFunction(option);
                        let name = obj?.name ?? obj?.username;
                        return { label: name, value: option }; })]
                },

            ),
            React.createElement(
                Components.Button,
                { onClick: () => {
                    if (selectedOption === "") return;
                    options.splice(options.indexOf(selectedOption), 1);
                    setSelectedOption("");
                    this[setName].delete(selectedOption);
                    this.BdApi.Data.save(setName, this[setName]);
                }},
                labeltext
            )
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
        }

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Components.TextInput, {
                value: text,
                placeholder: "Enter text to preview",
                onChange: (event) => {
                    console.log(event);
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

    getSettingsPanel() {
        config.settings[4].settings[4].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Channel", setName: "ttsSubscribedChannels", getFunction: ChannelStore.getChannel })];
        config.settings[4].settings[5].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unsubscribe Server", setName: "ttsSubscribedGuilds", getFunction: GuildStore.getGuild })];
        config.settings[5].settings[1].options = StreamElementsTTS.voicesLables;
        config.settings[6].settings[0].children = [React.createElement(this.DropdownButtonGroup, { labeltext: "Unmute User", setName: "ttsMutedUsers", getFunction: UserStore.getUser })];
        config.settings[9].children = [React.createElement(this.PreviewTTS)];
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
        setConfigSetting(id, value);
    }

    // Plugin start/stop
    start() {
        this.handleMessage = this.messageRecieved.bind(this);
        this.handleAnnouceUsers = this.annouceUser.bind(this);
        this.handleUpdateRelations = this.updateRelationships.bind(this);
        this.handleSpeakMessage = this.speakMessage.bind(this);
        this.handleStopTTS = this.stopTTS.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);

        this.initSettingsValues();
        this.updateToggleKeys(this.settings.toggleTTS);

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
    }

    // Event handelers
    patchOriginalTTS() {
        Patcher.instead(this.meta.name, speakMessage[0], speakMessage[1], (_, e, t) => {
            setTTSType[0][setTTSType[1]]("NEVER");
        });
        Patcher.instead(this.meta.name, cancelSpeak[0], cancelSpeak[1], (_, e, t) => {
            return;
        });
    }

    messageRecieved(event) {
        if(!this.settings.enableTTS) return
        let message = event.message;
        if ((event.guildId || !message.member) && this.shouldPlayMessage(event.message)) {
            let text = this.getPatchedContent(message, message.guild_id);
            this.AudioPlayer.addToQueue(text);
        }
    }

    annouceUser(event) {
        if(!this.settings.enableTTS) return
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
        if(!this.settings.enableTTS) return
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
                this.BdApi.Data.save("ttsMutedUsers", this.ttsMutedUsers);
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
                this.BdApi.Data.save("ttsSubscribedChannels", this.ttsSubscribedChannels);
            }
        });
        if (Array.isArray(buttonParent1))
            buttonParent1.push(ttsToggleUser);
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
                this.BdApi.Data.save("ttsSubscribedChannels", this.ttsSubscribedChannels);
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
                this.BdApi.Data.save("ttsSubscribedGuilds", this.ttsSubscribedGuilds);
            }
        });
        if (Array.isArray(buttonParent))
            buttonParent.push(ttsGroup);
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
        if (message.tts) {
            return true;
        }
        if (messageAuthorId === userId) {
            return false;
        }

        switch (this.settings.messagesChannelsToRead) {
            case "never":
                return false;
            case "allChannels":
                return true;
            case "subscribedChannelOrGuild":
                return this.ttsSubscribedChannels.has(messageChannelId) || this.ttsSubscribedGuilds.has(messageGuildId);
            case "focusedChannel":
                return messageChannelId === focusedChannel;
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
        if (text === "") return;
        if (this.settings.messagePrependNames) {
            let username = this.getUserName(message.author.id, guildId);
            text = `${username} said ${text}`;
        }
        return text;
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
        this.audio = null;
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
        if (this.audio)
            this.audio.playbackRate = rate;
    }

    updateVolume(volume) {
        this.volume = volume;
        if (this.audio)
            this.audio.volume = clamp(volume, 0, 1);
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
                this.audio.volume = clamp(this.volume, 0, 1);
                this.audio.addEventListener('ended', async () => {
                    await delay(this.delay);
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