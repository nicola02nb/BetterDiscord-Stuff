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
const MediaEngineStore = Webpack.getStore("MediaEngineStore");

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
            return string;
        } catch (e) {
            return defaultAudioUrl;
        }
    }

    start() {
        this.handleSpeak = this.handleSpeaking.bind(this);

        this.audio = null;

        Patcher.after(this.meta.name, MediaEngineStore, "getSpeakingWhileMuted", this.handleSpeak);
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        if(this.audio) {
            this.audio.pause();
            this.audio = null;
        }
    }

    handleSpeaking(_, args, ret) {
        if (ret) {
            if (this.audio && !this.audio.ended) {
                return; // Prevent multiple audio from playing together
            }
            this.audio = new Audio(config.settings[0].value);
            this.audio.onended = () => this.audio = null;
            this.audio.play();  
        }
    }
};
