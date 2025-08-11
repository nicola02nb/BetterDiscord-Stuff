/**
 * @name ShowPing
 * @description Displays your live ping
 * @version 2.6.3
 * @author nicola02nb
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/ShowPing
*/
const config = {
    changelog: [
        { title: "New Features", type: "added", items: ["Added changelog"] },
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

const { Webpack, React, Data, DOM, Patcher, UI } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const RTCConnectionStore = Webpack.getStore("RTCConnectionStore");

const { labelWrapper, rtcConnectionStatusConnected } = Webpack.getByKeys("labelWrapper", "rtcConnectionStatusConnected");
const { voiceButtonsContainer } = Webpack.getByKeys("voiceButtonsContainer");
const labelClasses = Webpack.getModule(m => m["hovered"] && m["default"]);
const textMdMedium = Webpack.getModule(m => m["text-md/medium"] && !m["avatar"] && !m["defaultColor"])["text-md/medium"];
const ConnectionStatus = Webpack.getModule((exports, module, id) => id === "423516");
module.exports = class ShowPing {
    constructor(meta) {
        this.meta = meta;
        
        this.settings = new Proxy({}, {
            get: (_target, key) => {
                return Data.load(this.meta.name, key) ?? config.settings.find(setting => setting.id === key || setting.settings?.find(s => s.id === key))?.value;
            },
            set: (_target, key, value) => {
                Data.save(this.meta.name, key, value);
                config.settings.find(setting => setting.id === key || setting.settings?.find(s => s.id === key)).value = value;
                return true;
            }
        });

        this.statusBar = null;
        this.pingElement = null;
        this.pingObserver = null;

        this.updatePing = null;
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
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
		if (savedVersion !== this.meta.version && config.changelog.length > 0) {
			UI.showChangelogModal({
				title: this.meta.name,
				subtitle: this.meta.version,
				changes: config.changelog
			});
			Data.save(this.meta.name, "version", this.meta.version);
		}
    }

    start() {
        this.showChangelog();

        DOM.addStyle(this.meta.name, `
            .${rtcConnectionStatusConnected.split(" ")[0]} .${labelClasses["default"]} {display: flex; !important; }
            .${voiceButtonsContainer} {margin-left: 2px !important;}
            .${labelWrapper} > button {width: 100%; display: inline;}
            .${labelClasses["default"]} > div {text-overflow: ellipsis; overflow: hidden;}
            .${labelClasses["hover"]} > div {text-overflow: ellipsis; overflow: hidden;}
            .pingDisplay {min-width: min-content;}`);
        
        Patcher.after(this.meta.name, ConnectionStatus, "Z", (_, args, ret) => {
            const container = ret;
            container.props.children = [container.props.children];
            if (Array.isArray(container?.props?.children)) {
                container?.props?.children?.push(React.createElement(this.PingElement));
            }
            return ret;
        });
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
            className: `${textMdMedium} pingDisplay`,
            children: "\u00A0" + (ping !== undefined ? `${ping} ms` : "N/A")
        });
    }

    displayKrispButton(show) {
        if (show) {
            DOM.removeStyle(this.meta.name+"-hidekrispStyle");
        } else {
            DOM.addStyle(this.meta.name+"-hidekrispStyle", `.${voiceButtonsContainer} > button[aria-label*="Krisp"] {display: none !important;}`);
        }
    }
};