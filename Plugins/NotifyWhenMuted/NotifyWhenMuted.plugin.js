/**
 * @name NotifyWhenMuted
 * @description Plays a sound when user tries to speak while muted
 * @version 1.4.2
 * @author nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/NotifyWhenMuted
*/

const defaultAudioUrl = "https://raw.githubusercontent.com/nicola02nb/BetterDiscord-Stuff/main/Plugins/NotifyWhenMuted/stop_talking.wav";
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added button nearby krisp button to toggle on/off"] },
        //{ title: "Bug Fix", type: "fixed", items: ["Fixed enableTTS not working"] },
        //{ title: "Improvements", type: "improved", items: [""] },
    ],
    settings: [
        { type: "switch", id: "enabled", name: "Enable Notify When Muted", note:"Enables/Disables the plugin audio notifications.", settings: [] },
        { type: "switch", id: "notifyWhenDeafen", name: "Notify When Deafen", note: "Notify when you are self deafen.", value: true },
        { type: "switch", id: "notifyServerMuted", name: "Notify When Server Muted", note: "Notify when you get muted by server.", value: false },
        { type: "text", id: "audioUrl", name: "Custom Audio URL", note: "URL to the audio file to play when user tries to speak while muted.", value: defaultAudioUrl },
        { type: "slider", id: "audioVolume", name: "Audio Volume", note: "Sets audio volume.", value: 100, min: 0, max: 100, step: 1, units: "%", markers: [0, 25, 50, 75, 100] },
        { type: "number", id: "delayBetweenNotifications", name: "Delay Between Audio Notifications (ms)", note: "Delay Between Audio Notifications in milliseconds.", value: 5000 },
        { type: "switch", id: "showToggleButton", name: "Show Toggle Button", note:"Displays a button nearby krisp in the RTC panel to toggle On/Off the audio notifications.", value: true }
    ]
};

function setConfigSetting(id, newValue) {
    for (const setting of config.settings) {
        if (setting.id === id) {
            Data.save("NotifyWhenMuted", id, newValue);
            return setting.value = newValue;
        }
        if (setting.settings) {
            for (const settingInt of setting.settings) {
                if (settingInt.id === id) {
                    Data.save("NotifyWhenMuted", id, newValue);
                    settingInt.value = newValue;
                }
            }
        }
    }
}

const { Webpack, Patcher, React, Components, Data } = BdApi;
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const buttonStates = Webpack.getByKeys("enabled","button");
const buttonLook = Webpack.getByKeys("button","lookBlank","colorBrand","grow");
const voiceButtonsContainer = Webpack.getModule((a,b) => b.id == 600164);
//const voiceButtonsContainer = {f: Webpack.getByStrings("HORIZONTAL", "START", "STRETCH")};
//const voiceButtonsContainer = [...Webpack.getModules(Webpack.Filters.byStrings("HORIZONTAL", "START", "STRETCH"))][0];

var console = {};

const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = class NotifyWhenMuted {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
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
        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.updateSetting(id, value);
            }
        });
    }

    updateSetting(id, value) {
        switch (id) {
            case "audioUrl":
                value = this.isValidURL(value);
                break;
            case "audioVolume":
                value = parseInt(value);
                if (this.audio) this.audio.volume = value / 100;
                break;
            case "delayBetweenNotifications":
                value = parseInt(value);
                break;
        }
        this.settings[id] = value;
        setConfigSetting(id, value);
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
        this.addButton = this.handleAddButton.bind(this);

        this.BdApi.DOM.addStyle(`.toggleNotifyMuted > svg {transition: transform 1s ease-in-out;}
            .toggleNotifyMuted:hover > svg {animation: zoomOscillate 1s forwards ease-in-out;}
            @keyframes zoomOscillate {
                0% {transform: scale(1.3) rotate(0deg);}
                35% {transform: scale(1.3) rotate(5deg);}
                85% {transform: scale(1.3) rotate(-5deg);}
                100% {transform: scale(1) rotate(0deg);}
            }`);
        
        this.initSettingsValues();
        this.isPlaying = false;

        Patcher.after(this.meta.name, MediaEngineStore, "getSpeakingWhileMuted", this.handleSpeak);
        Patcher.after(this.meta.name, voiceButtonsContainer, "Z", this.handleAddButton);
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        this.BdApi.DOM.removeStyle();
    }

    async handleSpeaking(_, args, ret) {
        if (!config.settings[0].value
            || !this.settings.notifyServerMuted && !MediaEngineStore.isSelfMute() && MediaEngineStore.isMute()
            || MediaEngineStore.isSelfDeaf() && !this.settings.notifyWhenDeafen) return;
        if (ret && !this.isPlaying) {
            this.isPlaying = true;
            this.audio = new Audio(this.settings.audioUrl);
            this.audio.volume = this.settings.audioVolume / 100;
            this.audio.addEventListener('ended', async () => {
                await delay(this.settings.delayBetweenNotifications);
                this.isPlaying = false;
            });
            this.audio.play();
        }
    }

    handleAddButton(_, args, ret) {
        if(!config.settings[6].value) return ret;
        const ToggleButton = () =>{
            const [enabled, setEnabled] = React.useState(config.settings[0].value);
            const update = () => {
                setConfigSetting("enabled", !enabled);
                setEnabled(!enabled);
            }
    
            const getIcon = (enabled) => {
                return React.createElement("svg", {
                    xmlns:"http://www.w3.org/2000/svg",
                    width:"20",
                    height:"20",
                    fill:"currentColor",
                    viewBox:"0 0 16 16"}, 
                    React.createElement("path", {
                        d: "M 8 16 a 2 2 0 0 0 2 -2 l -4 0 a 2 2 0 0 0 2 2 m 0 -14.1 l -0.8 0.2 a 4 4 0 0 0 -3.2 3.9 c 0 0.6 -0.1 2.2 -0.5 3.7 c -0.2 0.8 -0.4 1.6 -0.7 2.3 l 10.2 0 c -0.3 -0.7 -0.5 -1.5 -0.7 -2.3 c -0.3 -1.5 -0.5 -3.1 -0.5 -3.7 a 4 4 0 0 0 -3.2 -3.9 l -0.8 -0.2 z m 6.2 10.1 c 0.2 0.5 0.5 0.8 0.8 1 l -14 0 c 0.3 -0.2 0.6 -0.6 0.8 -1 c 0.9 -1.8 1.2 -5.1 1.2 -6 c 0 -2.4 1.7 -4.4 4 -4.9 a 1 1 0 1 1 2 0 a 5 5 0 0 1 4 4.9 c 0 0.9 0.3 4.2 1.2 6",
                        fill: !enabled ? "var(--status-danger)" :"currentColor" }
                    ),
                    React.createElement("g", { transform: "translate(4.7,3.3) scale(1,1) translate(-4.7,-3.3) translate(4.7,11.4) matrix(0.5,0,0,0.5,-0.8,-8)"},
                        React.createElement("path", { 
                            d: "M 13 8 c 0 0.6 -0.1 1.1 -0.3 1.6 l -0.8 -0.8 a 4 4 0 0 0 0.1 -0.8 l 0 -1 a 0.5 0.5 0 0 1 1 0 l 0 1 z m -5 4 c 0.8 0 1.6 -0.2 2.2 -0.7 l 0.7 0.7 a 5 5 0 0 1 -2.4 0.9 l 0 2 l 3 0 a 0.5 0.5 0 0 1 0 1 l -7 0 a 0.5 0.5 0 0 1 0 -1 l 3 0 l 0 -2 a 5 5 0 0 1 -4.5 -5 l 0 -1 a 0.5 0.5 0 0 1 1 0 l 0 1 a 4 4 0 0 0 4 4 m 3 -9 l 0 4.9 l -5.8 -5.8 a 3 3 0 0 1 5.8 1",
                            fill: "currentColor" }
                        ),
                        React.createElement("path", { 
                            d: "M 9.5 10.6 l -4.5 -4.5 l 0 1.9 a 3 3 0 0 0 4.5 2.6 m -7.8 -9.3 l 12 12 l 0.7 -0.7 l -12 -12 l -0.7 0.7 z",
                            fill: "currentColor" }
                        )
                    )
                );
            }
    
            return React.createElement(Components.Tooltip, {
                text: enabled ? "Notify Muted Enabled" : "Notify Muted Disabled"
            }, (props) => React.createElement(
                "button", {
                    ...props,
                    className: "toggleNotifyMuted " + buttonStates.button + " " + buttonStates.enabled + " " + buttonLook.button + " " + buttonLook.lookBlank + " " + buttonLook.colorBrand + " " + buttonLook.grow,
                    onClick: () => {
                        update();
                    },
                }, getIcon(enabled)
            ))
        };
        if(args[0]?.className?.includes("voiceButtonsContainer_")) {
            const button = React.createElement(ToggleButton);
            button.type = ToggleButton;
            ret.props?.children?.unshift(button);
        }
        return ret;
    }    
};