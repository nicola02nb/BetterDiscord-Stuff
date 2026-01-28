/**
 * @name ShowPing
 * @description Displays your live ping
 * @version 2.6.12
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
*/
const config = {
    changelog: [
        //{ title: "New Features", type: "added", items: [""] },
        //{ title: "Bug Fix", type: "fixed", items: [""] },
        //{ title: "Improvements", type: "improved", items: [""] },
        //{ title: "On-going", type: "progress", items: [""] }
    ],
    settings: [
        {
            type: "switch",
            id: "hideKrispButton",
            name: "Hide krisp button",
            note: "If enabled, hides krisp button near disconnect channel button",
            value: true
        },
    ]
};
function getSetting(key) {
    return config.settings.reduce((found, setting) => found ? found : (setting.id === key ? setting : setting.settings?.find(s => s.id === key)), undefined)
}

const { Webpack, React, Data, DOM, Patcher, UI } = BdApi;
const { Filters } = Webpack;
const [DiscordModules, RTCConnectionStore, { labelWrapper, rtcConnectionStatusConnected }, { voiceButtonsContainer }, labelClasses, textMdMedium, ConnectionStatus] =
    Webpack.getBulk(
        { filter: Filters.byKeys("subscribe", "dispatch"), searchExports: true },
        { filter: Filters.byStoreName("RTCConnectionStore") },
        { filter: Filters.byKeys("labelWrapper", "rtcConnectionStatusConnected") },
        { filter: Filters.byKeys("voiceButtonsContainer") },
        { filter: Filters.byKeys("hovered", "default") },
        { filter: (m => m["text-md/medium"] && !m.avatar && !m.active && !m.h1) },
        { filter: Filters.bySource("hasVideo", "hasConnectedChannel", "textVariant") }
    );
module.exports = class ShowPing {
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

        this.statusBar = null;
        this.pingElement = null;
        this.pingObserver = null;

        this.updatePing = null;
    }

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
        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                if (id === "hideKrispButton") {
                    this.displayKrispButton(!value);
                }
                this.settings[id] = value;
            },
        });
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

    start() {
        this.initSettings();
        this.showChangelog();

        DOM.addStyle(this.meta.name, `
            .${rtcConnectionStatusConnected.split(" ")[0]} .${labelClasses["default"]} {display: flex; !important; }
            .${voiceButtonsContainer} {margin-left: 2px !important;}
            .${labelWrapper} > button {width: 100%; display: inline;}
            .${labelClasses["default"]} > div {text-overflow: ellipsis; overflow: hidden;}
            .${labelClasses["hover"]} > div {text-overflow: ellipsis; overflow: hidden;}
            .pingDisplay {min-width: min-content;}`);

        Patcher.after(this.meta.name, ConnectionStatus, "A", (_, args, ret) => {
            const container = ret;
            container.props.children = [container.props.children];
            if (Array.isArray(container?.props?.children)) {
                container?.props?.children?.push(React.createElement(this.PingElement));
            }
            return ret;
        });

        if (this.settings.hideKrispButton) {
            this.displayKrispButton(false);
        }
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        DiscordModules.unsubscribe("RTC_CONNECTION_PING", this.handlePing);
        this.displayKrispButton(true);
        DOM.removeStyle(this.meta.name);
    }

    PingElement() {
        const [ping, setPing] = React.useState(RTCConnectionStore.getLastPing());

        const updatePing = (_) => {
            setPing(RTCConnectionStore.getLastPing());
        };

        DiscordModules.subscribe("RTC_CONNECTION_PING", updatePing);

        return React.createElement("div", {
            className: `${textMdMedium["text-md/medium"]} pingDisplay`,
            children: "\u00A0" + (ping !== undefined ? `${ping} ms` : "N/A")
        });
    }

    displayKrispButton(show) {
        if (show) {
            DOM.removeStyle(this.meta.name + "-hidekrispStyle");
        } else {
            DOM.addStyle(this.meta.name + "-hidekrispStyle", `.${voiceButtonsContainer} > button[aria-label$="Krisp"] {display: none;}`); // TODO: improve selector
        }
    }
};