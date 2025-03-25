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

const { Webpack, Patcher } = BdApi;

const SpotifyStore = Webpack.getStore("SpotifyStore");

const [ SpotifyModule, PauseFunction ] = [...Webpack.getWithKey(Webpack.Filters.byStrings("PLAYER_PAUSE"))];

module.exports = class NoSpotifyPause {
  constructor(meta) {
    this.meta = meta;
  }
  start() {    
    Patcher.instead(this.meta.name, SpotifyModule, PauseFunction, (originalFunc, args) => { });
    Patcher.instead(this.meta.name, SpotifyStore, "wasAutoPaused", (originalFunc, args) => {
      return false;
    });
  }
  stop() {
    Patcher.unpatchAll(this.meta.name);
  }
};