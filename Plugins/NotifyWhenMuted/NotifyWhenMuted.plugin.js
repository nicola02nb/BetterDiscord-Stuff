/**
 * @name NotifyWhenMuted
 * @description Plays a sound when user tries to speak while muted
 * @version 1.1.3
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/NotifyWhenMuted
*/

const defaultAudioUrl = "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/NotifyWhenMuted/stop_talking.wav";
const config = {
    changelog: [],
    settings: [
        { type: "switch", id: "notifyServerMuted", name: "Notify When Server Muted", note: "Notify when you get muted by server", value: false },
        { type: "text", id: "audioUrl", name: "Custom Audio URL", note: "URL to the audio file to play when user tries to speak while muted", value: defaultAudioUrl },
        { type: "number", id: "delayBetweenNotifications", name: "Delay Between Audio Notifications (ms)", note: "Delay Between Audio Notifications in milliseconds", value: 5000 },
    ]
};

const { Webpack, Patcher } = BdApi;
const MediaEngineStore = Webpack.getStore("MediaEngineStore");

var console = {};

const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = class NotifyWhenMuted {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(this.meta.name);
        console = this.api.Logger;
        this.initSettingsValues();
    }

    initSettingsValues() {
        config.settings[0].value = this.api.Data.load("notifyServerMuted") ?? config.settings[0].value;
        config.settings[1].value = this.api.Data.load("audioUrl") ?? config.settings[1].value;
        config.settings[2].value = this.api.Data.load("delayBetweenNotifications") ?? config.settings[2].value;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                switch (id) {
                    case "notifyServerMuted":
                        config.settings[0].value = value;
                        break;
                    case "audioUrl":
                        value = this.isValidURL(value);
                        config.settings[1].value = value;
                        break;
                    case "delayBetweenNotifications":
                        value = parseInt(value);
                        config.settings[2].value = value;
                        break;
                }
                this.api.Data.save(id, value);
            }
        });
    }

    isValidURL(string) {
        try {
            new URL(string);
            return string;
        } catch (e) {
            return defaultAudioUrl;
        }
    }

    start() {
        this.handleSpeak = this.handleSpeaking.bind(this);

        this.isPlaying = false;

        Patcher.after(this.meta.name, MediaEngineStore, "getSpeakingWhileMuted", this.handleSpeak);
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
    }

    async handleSpeaking(_, args, ret) {
        if (!(MediaEngineStore.isSelfMute() || MediaEngineStore.isSelfDeaf()
            || config.settings[0].value)) return;
        if (ret && !this.isPlaying) {
            this.isPlaying = true;
            this.audio = new Audio(config.settings[1].value);
            this.audio.addEventListener('ended', async () => {
                await delay(config.settings[2].value);
                this.isPlaying = false;
            });
            this.audio.play();
        }
    }
};