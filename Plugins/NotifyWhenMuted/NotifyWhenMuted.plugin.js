/**
 * @name NotifyWhenMuted
 * @description Plays a sound when user tries to speak while muted
 * @version 1.0.0
 * @author nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/NotifyWhenMuted
 * @updateUrl https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/NotifyWhenMuted/NotifyWhenMuted.plugin.js
*/

const defaultAudioUrl = "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/NotifyWhenMuted/stop_talking.wav";
const config = {
    changelog: [],
    settings: [
        { type: "text", id: "audioUrl", name: "Custom Audio URL", note: "URL to the audio file to play when user tries to speak while muted", value: defaultAudioUrl },
    ]
};

const { Webpack, Patcher } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const VoiceStatesStore = Webpack.getStore("VoiceStateStore");
const getConnectedUser = Webpack.getByKeys("getCurrentUser");
const userProfileMod = Webpack.getByKeys("getUserProfile");

var console = {};


module.exports = class NotifyWhenMuted {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
        console = this.api.Logger;
        this.initSettingsValues();
    }

    initSettingsValues() {
        config.settings[0].value = this.api.Data.load("audioUrl") ?? config.settings[0].value;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                switch (id) {
                    case "audioUrl":
                        value = this.isValidURL(value);
                        config.settings[0].value = value;
                        break;
                }
                this.api.Data.save(id, value);
            }
        });
    }

    isValidURL(string) {
        try {
            new URL(string);
            console.log("Valid URL");
            return string;
        } catch (e) {
            console.error("Invalid URL");
            return defaultAudioUrl;
        }
    }

    start() {
        this.handleSpeak = this.handleSpeaking.bind(this);

        this.playing = false;

        DiscordModules.subscribe("SPEAKING", this.handleSpeak);
    }

    stop() {
        DiscordModules.unsubscribe("SPEAKING", this.handleSpeak);
        Patcher.unpatchAll(this.meta.name);
    }

    handleSpeaking(event) {
        console.log(event);
        let userId = getConnectedUser.getCurrentUser().id;
        if (!this.playing && event.userId === userId) {
            let userVoiceState = VoiceStatesStore.getVoiceStateForUser(userId);
            if (!userVoiceState.selfMute && !userVoiceState.selfDeaf) return;
            this.playing = true;
            const audio = new Audio(config.settings[0].value);
            audio.onended = () => this.playing = false;
            audio.play();
        }
    }
};