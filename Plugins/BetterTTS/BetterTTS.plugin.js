/**
 * @name BetterTTS
 * @description A plugin that allows you to play a custom TTS when a message is received.
 * @version 1.1.0
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/BetterTTS/BetterTTS.plugin.js
 */
const config = {
    changelog: [],
    settings: [
        {
            type: "switch",
            id: "enbleTTS",
            name: "Enable TTS",
            note: "Enables/Disables the TTS",
            value: true
        },
        {
            type: "switch",
            id: "enbleUSerAnnouncement",
            name: "Enable User Announcement",
            note: "Enables/Disables the User Announcement when join/leaves the channel",
            value: true
        },
        {
            type: "dropdown",
            id: "selectedChannel",
            name: "Which channel should be played:",
            note: "Choose the channel you want to play the TTS",
            value: "connectedChannel",
            options: [
                { label: "Connected Channel", value: "connectedChannel" },
                { label: "Focused Channel", value: "focusedChannel" },
                { label: "Suscribed Channel", value: "subscribedChannel" },
            ]
        },
        {
            type: "keybind",
            id: "toggleTTS",
            name: "Toggle TTS",
            note: "Shortcut to toggle the TTS",
            value: ["Control", "0"]
        },
        {
            type: "category",
            id: "ttsVoiceSource",
            name: "TTS Voice Source",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "dropdown",
                    id: "sourceTTS",
                    name: "TTS Source:",
                    note: "Choose the channel you want to play the TTS",
                    value: "streamlabs",
                    options: [
                        { label: "Streamlabs", value: "streamlabs" },
                    ]
                },
                {
                    type: "dropdown",
                    id: "voiceTTS",
                    name: "Voice for TTS:",
                    note: "",
                    value: "Brian",
                    options: [
                        { label: "Brian", value: "Brian" },
                    ]
                }
            ]
        },
        {
            type: "text",
            id: "currentSubscribedChannel",
            name: "Current Subscribed Channel ID",
            note: "Current Subscribed Channel ID",
            value: ""
        }
    ]
};

const { Webpack } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ChannelStore = BdApi.Webpack.getStore("ChannelStore");
const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
const UserStore = Webpack.getStore("UserStore");
const getConnectedUser = Webpack.getModule(BdApi.Webpack.Filters.byProps("getCurrentUser"));
const Button = BdApi.Components.Button;

module.exports = class BetterTTS {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
        this.keyShortcut = {
            key: "0",
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
        };
        this.subscribeButton = null;
    }

    initSettingsValues() {
        StreamElementsTTS.loadVoices();
        for (const setting of config.settings) {
            if (setting.type === "category") {
                for (const settingInt of setting.settings) {
                    settingInt.value = this.api.Data.load(settingInt.id) ?? settingInt.value;
                }
            } else {
                setting.value = this.api.Data.load(setting.id) ?? setting.value;
            }
        }
        this.updateToggleKeys(config.settings[3].value);
        this.subscribedChannel = config.settings[5].value ?? "";
    }

    // Settings
    getSettingsPanel() {
        config.settings[4].settings[1].options = StreamElementsTTS.voicesLables;
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.updateSettingValue(category, id, value);
            }
        });
    }

    updateSettingValue(category, id, value) {
        switch (id) {
            case "enbleTTS":
                config.settings[0].value = value;
                if (value)
                    DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
                else
                    DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
                break;
            case "enbleUSerAnnouncement":
                config.settings[1].value = value;
                if (config.settings[0].value) {
                    if (value)
                        DiscordModules.subscribe("VOICE_STATE_UPDATES", this.annouceUsers);
                    else
                        DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.annouceUsers);
                }
                break;
            case "selectedChannel":
                config.settings[2].value = value;
                break;
            case "toggleTTS":
                config.settings[3].value = value;
                this.updateToggleKeys(value);
                break;
            case "sourceTTS":
                config.settings[4].settings[0].value = value;
                break;
            case "voiceTTS":
                config.settings[4].settings[1].value = value;
                break;
            case "currentSubscribedChannel":
                config.settings[5].value = value;
                this.subscribedChannel = value;
                break;
            default:
                break;
        }
        this.api.Data.save(id, value);
    }

    start() {
        this.initSettingsValues();
        this.api.DOM.addStyle(``);

        this.handleMessage = this.handleMessageRecieved.bind(this);
        this.keyDown = this.onKeyDown.bind(this);
        this.annouceUsers = this.annouceUser.bind(this);
        this.handleToolbar = this.handleToolbarLoad.bind(this);

        document.addEventListener("keydown", this.keyDown);
        if (config.settings[0].value) {
            DiscordModules.subscribe("MESSAGE_CREATE", this.handleMessage);
        }
        if (config.settings[1].value) {
            DiscordModules.subscribe("VOICE_STATE_UPDATES", this.annouceUsers);
        }
        DiscordModules.subscribe("CHANNEL_SELECT", this.handleToolbar);

        let currentChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
        if (currentChannel !== null && currentChannel !== undefined)
            this.addButton();
    }

    stop() {
        this.removeButton();
        DiscordModules.unsubscribe("CHANNEL_SELECT", this.handleToolbar);
        DiscordModules.unsubscribe("VOICE_STATE_UPDATES", this.annouceUsers);
        DiscordModules.unsubscribe("MESSAGE_CREATE", this.handleMessage);
        document.removeEventListener("keydown", this.keyDown);
        this.api.DOM.removeStyle();
    }

    // Event handelers
    onKeyDown(event) {
        if (event.ctrlKey === this.keyShortcut.ctrlKey
            && event.shiftKey === this.keyShortcut.shiftKey
            && event.altKey === this.keyShortcut.altKey
            && event.key === this.keyShortcut.key) {
            this.toggleTTS();
        }
    }

    handleMessageRecieved(event) {
        if (this.shouldSendMessage(event.message)) {
            this.playTTSfromSource(event.message.content);
        }
    }

    annouceUser(event) {
        let channelId = SelectedChannelStore.getVoiceChannelId();
        let userId = getConnectedUser.getCurrentUser().id;
        for (const status of event.voiceStates) {
            if (status.userId === userId)
                continue;
            if (status.channelId !== status.oldChannelId) {
                let user = UserStore.getUser(status.userId);
                if (status.channelId === channelId) {
                    this.playTTSfromSource(`${user.globalName} joined the channel`);
                } else if (status.oldChannelId === channelId) {
                    this.playTTSfromSource(`${user.globalName} left the channel`);
                }
            }
        }
    }

    handleToolbarLoad(event) {
        let toolbar = document.querySelector("[class^='upperContainer_']");
        let observer = new MutationObserver(this.addButton.bind(this));
        observer.observe(toolbar, { childList: true, attributes: true, subtree: true });

        let currentChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
        if (currentChannel != event.channelId) {
            setTimeout(() => this.handleToolbarLoad(), 500);
        } else {
            this.addButton();
        }
    }

    // Play TTS
    playTTSfromSource(text) {
        switch (config.settings[4].settings[0].value) {
            case "streamlabs":
                StreamElementsTTS.playSound(text, config.settings[4].settings[1].value);
                break;
        }
    }

    // Message evaluation
    shouldSendMessage(message) {
        let selectedChannel = config.settings[2].value;

        let messageChannelId = message.channel_id;
        let voiceChannelId = SelectedChannelStore.getVoiceChannelId();
        let selectedChannelId = SelectedChannelStore.getCurrentlySelectedChannelId();

        switch (selectedChannel) {
            case "connectedChannel":
                return messageChannelId === voiceChannelId;
            case "focusedChannel":
                return messageChannelId === selectedChannelId;
            case "subscribedChannel":
                return message.channel_id === this.subscribedChannel;
            default:
                return false;
        }
    }

    // TTS Toggle
    toggleTTS() {
        if (config.settings[0].value) {
            this.api.showToast("TTS Muted 🔇");
        } else {
            this.api.showToast("TTS Enabled 🔊");
        }
        this.updateSettingValue(null, "enbleTTS", !config.settings[0].value);
    }

    updateToggleKeys(keys) {
        this.keyShortcut.ctrlKey = false;
        this.keyShortcut.shiftKey = false;
        this.keyShortcut.altKey = false;
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
    addButton() {
        if (this.subscribeButton) {
            this.removeButton();
        }
        const titleContainer = document.querySelector('[class^="upperContainer_"]')?.querySelector('[class^="children_"]');

        const button = document.createElement('button');
        button.classList.add(Button.Colors.BLURPLE, Button.Looks.BLANK, Button.Sizes.ICON);

        button.style.height = "24px";
        button.style.width = "24px";
        button.style.padding = "0px";
        button.style.margin = "0px";

        button.title = 'Subscribes current channel to TTS';
        button.addEventListener("click", () => {
            this.updateSelectedChannel();
        });

        this.subscribeButton = button;
        this.updateButtonIcon(false);
        const titleWrapper = titleContainer.querySelector('[class^="titleWrapper_"]');
        titleWrapper.insertAdjacentElement('afterend', this.subscribeButton);
    }

    removeButton() {
        if (this.subscribeButton) {
            this.subscribeButton.remove();
            this.subscribeButton = null;
        }
    }

    updateButtonIcon(showToast = true) {
        if (this.subscribeButton) {
            let currentChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
            if (!currentChannel) return;
            let channel = ChannelStore.getChannel(currentChannel);
            let channelName = channel.name;
            if (channelName == "") channelName = channel.rawRecipients[0].display_name;
            if (currentChannel === this.subscribedChannel) {
                this.subscribeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-on" viewBox="0 0 16 16"><path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8"/></svg>';
                if (showToast) this.api.showToast(`TTS Subbed to ${channelName}`);
            } else {
                this.subscribeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"><path d="M11 4a4 4 0 0 1 0 8H8a5 5 0 0 0 2-4 5 5 0 0 0-2-4zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8M0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5"/></svg>';
                if (showToast) this.api.showToast(`TTS Unsubbbed from ${channelName}`);
            }
            this.subscribeButton.children[0].style.height = "24px";
            this.subscribeButton.children[0].style.width = "24px";
        }
    }

    updateSelectedChannel() {
        let currentChannel = SelectedChannelStore.getCurrentlySelectedChannelId();
        if (this.subscribedChannel !== currentChannel)
            this.subscribedChannel = currentChannel;
        else
            this.subscribedChannel = "";
        this.updateButtonIcon();
        this.updateSettingValue(null, "currentSubscribedChannel", this.subscribedChannel);
    }
};

// TTS Sources
class StreamElementsTTS {
    static voicesLables = [];
    static loadVoices() {
        return fetch('https://api.streamelements.com/kappa/v2/speech/voices')
            .then(response => response.json())
            .then(data => {
                let voices = data.voices;
                StreamElementsTTS.voicesLables = Object.values(voices).sort((a, b) => a.languageName.localeCompare(b.languageName)).map(voice => ({
                    label: `${voice.name} (${voice.languageName} ${voice.languageCode})`,
                    value: voice.id
                }));
            })
            .catch(error => this.api.Logger.error('Error loading voices:', error));
    }

    static playSound(text, voice = 'Brian') {
        let url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${text}`;
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.play();
            })
            .catch(error => this.api.Logger.error('Error playing sound:', error));
    }
}