/**
 * @name NoSpotifyPause
 * @description Prevents Discord from pausing your Spotify when streaming or gaming.
 * @version 1.0.1
 * @author nicola02nb bep
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/NoSpotifyPause
*/
const config = {
	changelog: [
		{ title: "New Features", type: "added", items: ["Added changelog"] },
		//{ title: "Bug Fix", type: "fixed", items: [""] },
		//{ title: "Improvements", type: "improved", items: [""] },
		//{ title: "On-going", type: "progress", items: [""] }
	]
};

const { Webpack, Patcher, Data, UI } = BdApi;

const SpotifyStore = Webpack.getStore("SpotifyStore");

const [SpotifyModule, PauseFunction] = [...Webpack.getWithKey(Webpack.Filters.byStrings("PLAYER_PAUSE"))];

module.exports = class NoSpotifyPause {
	constructor(meta) {
		this.meta = meta;
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
		Patcher.instead(this.meta.name, SpotifyModule, PauseFunction, (originalFunc, args) => { });
		Patcher.instead(this.meta.name, SpotifyStore, "wasAutoPaused", (originalFunc, args) => {
			return false;
		});
	}

	stop() {
		Patcher.unpatchAll(this.meta.name);
	}
};