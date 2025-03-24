/**
 * @name NoSpotifyPause
 * @description Prevents Discord from pausing your Spotify when streaming or gaming.
 * @version 0.0.7
 * @author nicola02nb bep
 * @invite hFuY8DfDGK
 * @authorLink https://github.com/nicola02nb
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/NoSpotifyPause
*/
const config = {
  changelog: [
    { title: "Improvements", type: "improved", items: ["Removed ZeresPlugin library dependency"] },
    { title: "Bug Fix", type: "fixed", items: ["Fixed Plugin not working"] },
  ]
};

const { Webpack } = BdApi;

const SpotifyStore = Webpack.getStore("SpotifyStore");

const [ SpotifyModule, PauseFunction ] = [...Webpack.getWithKey(Webpack.Filters.byStrings("PLAYER_PAUSE"))];

module.exports = class NoSpotifyPause {
  constructor(meta) {
    this.meta = meta;
    this.BdApi = new BdApi(this.meta.name);
  }
  start() {    
    this.BdApi.Patcher.instead(SpotifyModule, PauseFunction, (e, t) => {
      this.BdApi.Logger.log("Preventing Spotify from pausing");
    });
    this.BdApi.Patcher.instead(SpotifyStore, "wasAutoPaused", (context) => {
      return false;
    });
  }
  stop() {
    this.BdApi.Patcher.unpatchAll();
  }
};