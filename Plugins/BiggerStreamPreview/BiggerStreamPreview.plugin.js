/**
 * @name BiggerStreamPreview
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @invite hFuY8DfDGK
 * @description View bigger stream previews via the context menu.
 * @version 1.1.5
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BiggerStreamPreview
 */
// Original code by Marmota (Jaime Filho) https://github.com/jaimeadf/BetterDiscordPlugins/tree/main/packages/BiggerStreamPreview 

const { Webpack, ContextMenu, React } = BdApi;
const { Filters } = Webpack;

const openModal = Webpack.getModule(Filters.byStrings("modalKey", "Layer", "onCloseCallback"), { searchExports: true });

const ModalRoot = Webpack.getModule(Filters.byStrings("impressionType", "MODAL"), { searchExports: true });
const ModalSize = Webpack.getModule(Filters.byProps("DYNAMIC"), { searchExports: true });
const RenderLinkComponent = Webpack.getModule(m => m.type?.toString?.().includes("MASKED_LINK"), { searchExports: false });
const ImageModal = Webpack.getModule(Filters.byStrings("renderLinkComponent", "zoomThumbnailPlaceholder"), { searchExports: true });

const useStateFromStores = Webpack.getModule(Filters.byStrings("useStateFromStores"), { searchExports: true });

const StreamStore = Webpack.getModule(Filters.byProps("getStreamForUser"));
const StreamPreviewStore = Webpack.getModule(Filters.byProps("getPreviewURL"));

var console = {};

module.exports = class BiggerStreamPreview {
  constructor(meta) {
    this.meta = meta;
    this.BdApi = new BdApi(this.meta.name);
    console = this.BdApi.Logger;
  }

  start() {
    this.BdApi.DOM.addStyle(".bigger-stream-preview { background: transparent !important; }");
    this.patchUserContextMenu();
    this.patchStreamContextMenu();
  }

  stop() {
    this.unpatchUserContextMenu();
    this.unpatchStreamContextMenu();
    this.BdApi.DOM.removeStyle();
  }

  patchUserContextMenu() {
    ContextMenu.patch("user-context", this.handleUserContextMenu);
  }

  unpatchUserContextMenu() {
    ContextMenu.unpatch("user-context", this.handleUserContextMenu);
  }

  patchStreamContextMenu() {
    ContextMenu.patch("stream-context", this.handleStreamContextMenu);
  }

  unpatchStreamContextMenu() {
    ContextMenu.unpatch("stream-context", this.handleStreamContextMenu);
  }

  appendStreamPreviewMenuGroup(menu, previewUrl) {
    menu.props.children.splice(
      menu.props.children.length - 1,
      0,
      this.buildStreamPreviewMenuGroup(previewUrl)
    );
  }

  buildStreamPreviewMenuGroup(previewUrl) {
    return (
      React.createElement(ContextMenu.Group, null
        , React.createElement(ContextMenu.Item, {
          id: "stream-preview",
          label: "View Stream Preview",
          action: () => this.openImageModal(previewUrl),
          disabled: !previewUrl,
        }
        )
      )
    );
  }

  openImageModal(previewUrl) {
    openModal(props => (
      React.createElement(ModalRoot, { className: "bigger-stream-preview", size: ModalSize.DYNAMIC, ...props, }
        , React.createElement('div', { className: "imageModalwrapper", }, React.createElement(ImageModal, {
          media: {
            ...props,
            type: "IMAGE",
            url: previewUrl,
            proxyUrl: previewUrl,
            height: "fit-content",
            width: "fit-content",
          },
        }), React.createElement('div', { className: "imageModalOptions", }, React.createElement(RenderLinkComponent, {
          className: "downloadLink",
          href: previewUrl,
        }, "Open in Browser"

        )))
      )
    ));
  }

  handleUserContextMenu = (menu, { user }) => {
    if(!user) return;
    const [stream, previewUrl] = useStateFromStores([StreamStore, StreamPreviewStore], () => {
      const stream = StreamStore.getAnyStreamForUser(user.id);
      const previewUrl = stream && StreamPreviewStore.getPreviewURL(
        stream.guildId,
        stream.channelId,
        stream.ownerId
      );
      return [stream, previewUrl];
    });

    if (stream) {
      this.appendStreamPreviewMenuGroup(menu, previewUrl);
    }
  };

  handleStreamContextMenu = (menu, { stream }) => {
    const previewUrl = useStateFromStores([StreamPreviewStore], () => StreamPreviewStore.getPreviewURL(
      stream.guildId,
      stream.channelId,
      stream.ownerId
    ));

    this.appendStreamPreviewMenuGroup(menu.props.children, previewUrl);
  };
}