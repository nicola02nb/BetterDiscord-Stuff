/**
 * @name ShortcutScreenshareScreen
 * @description Screenshare screen from keyboard shortcut when no game is running
 * @version 0.9.0
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShortcutScreenshareScreen
 */
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
    ],
    settings: [
        { type: "number", id: "displayNumber", name: "Default Display to Screenshare", note: "Set the default display number to screenshare.", value: 1, min: 1, max: 1, step: 1 },
        { type: "switch", id: "disablePreview", name: "Disable Preview", note: "If enabled, the preview will be disabled.", value: false },
        { type: "switch", id: "shareAudio", name: "Share Audio", note: "If enabled, the audio will be shared.", value: true },
        { type: "switch", id: "shareAlwaysScreen", name: "Share Always Screen", note: "If enabled, when you start a stream, it will always screenshare the screen instead of a game.", value: false },
        { type: "button", id: "toggleStream", name: "Start/Stop Stream", note: "Starts/Stops the stream.", children: ["Start/Stop"], onClick: () => pluginToggleStream() }
    ]
};

const { Webpack, Patcher } = BdApi;
const { Filters } = Webpack;

const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const ApplicationStreamingStore = Webpack.getStore("ApplicationStreamingStore");
const MediaEngineStore = Webpack.getStore("MediaEngineStore");
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");
const StreamRTCConnectionStore = Webpack.getStore("StreamRTCConnectionStore");

const streamStart = Webpack.getModule(Filters.byStrings("STREAM_START", "GUILD", "CALL", "OVERLAY"), { searchExports: true });
const streamStop = Webpack.getModule(Filters.byStrings("STREAM_STOP"), { searchExports: true });

var console = {};

var pluginToggleStream = () => {};

module.exports = class ShortcutScreenshareScreen {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;

        this.settings = {};
        this.windowPreviews = [];
        pluginToggleStream = this.toggleStream.bind(this);
    }

    setConfigSetting(id, newValue) {
        for (const setting of config.settings) {
            if (setting.id === id) {
                this.BdApi.Data.save(id, newValue);
                return setting.value = newValue;
            }
            if (setting.settings) {
                for (const settingInt of setting.settings) {
                    if (settingInt.id === id) {
                        this.BdApi.Data.save(id, newValue);
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
        this.updateScreenPreviews().then(() => {
            config.settings[0].max = this.windowPreviews.length;
        });
        return this.BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                this.settings[id] = value;
                this.setConfigSetting(id, value);
            }
        });
    }

    start() {
        this.initSettingsValues();
        this.updateScreenPreviews();

        /* Patcher.after(this.meta.name, DiscordModules.MessageActions, "sendMessage", (orginalFunc, args, retValue) => {
            console.log(originalFunc, args, retValue);
        }); */
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
    }

    async updateScreenPreviews(width = 100, height = 100) {
        const mediaEngine = MediaEngineStore.getMediaEngine();
        this.windowPreviews = await mediaEngine.getScreenPreviews(width, height);
    }

    toggleStream() {
        if(ApplicationStreamingStore.getCurrentUserActiveStream()) {
            this.stopStream();
        } else {
            this.startStream();
        }
    }

    startStream() {
        let displayIndex = this.settings.displayNumber - 1;
        if(this.windowPreviews.length === 0) return;
        if(displayIndex >= this.windowPreviews.length){
            this.settings.displayNumber = 1;
            this.setConfigSetting("displayNumber", 1);
            displayIndex = this.settings.displayNumber - 1;
        }
    
        let windowPreview = this.windowPreviews[displayIndex];
        let channelId = RTCConnectionStore.getChannelId();
        let guildId = RTCConnectionStore.getGuildId(channelId);
        let options = {
            audioSourceId: null,
            goLiveModalDurationMs: 8132,
            nativePickerStyleUsed: undefined,
            pid: null,
            previewDisabled: this.settings.disablePreview,
            sound: this.settings.shareAudio,
            sourceId: windowPreview.id,
            sourceName: windowPreview.name,
        }

        console.log(options);
    
        streamStart(guildId, channelId, options);
    }

    stopStream() {
        let streamkey = StreamRTCConnectionStore.getActiveStreamKey();
        streamStop(streamkey);
    }
};
