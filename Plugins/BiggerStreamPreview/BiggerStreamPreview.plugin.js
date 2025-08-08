/**
 * @name BiggerStreamPreview
 * @author nicola02nb
 * @authorLink https://github.com/nicola02nb
 * @description View bigger stream previews via the context menu.
 * @version 1.1.12
 * @source https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BiggerStreamPreview
 */
const config = {
	changelog: [
		{ title: "New Features", type: "added", items: ["Added changelog"] },
		//{ title: "Bug Fix", type: "fixed", items: [""] },
		//{ title: "Improvements", type: "improved", items: [""] },
		//{ title: "On-going", type: "progress", items: [""] }
	]
}

const { Webpack, ContextMenu, React, DOM } = BdApi;
const { Filters } = Webpack;

const openModal = Webpack.getModule(Filters.byStrings('onCloseRequest', 'onCloseCallback', 'instant', 'backdropStyle'), { searchExports: true });

const ModalRoot = Webpack.getModule(Filters.byStrings('.ImpressionTypes.MODAL,"aria-labelledby":'), { searchExports: true });
const ModalSize = Webpack.getModule(m => m?.DYNAMIC, { searchExports: true });
const RenderLinkComponent = Webpack.getModule(m => m.type?.toString?.().includes("MASKED_LINK"), { searchExports: false });
const ImageModal = Webpack.getModule(m => m.type?.toString?.().includes("ZOOM_OUT_IMAGE_PRESSED"), { searchExports: true });

const useStateFromStores = Webpack.getModule(Filters.byStrings("useStateFromStores"), { searchExports: true });

const ApplicationStreamingStore = Webpack.getStore("ApplicationStreamingStore");
const ApplicationStreamPreviewStore = Webpack.getStore("ApplicationStreamPreviewStore");

module.exports = class BiggerStreamPreview {
	constructor(meta) {
		this.meta = meta;
	}

	showChangelog() {
		const savedVersion = this.BdApi.Data.load("version");
		if (savedVersion !== this.meta.version && config.changelog.length > 0) {
			this.BdApi.UI.showChangelogModal({
				title: this.meta.name,
				subtitle: this.meta.version,
				changes: config.changelog
			});
			this.BdApi.Data.save("version", this.meta.version);
		}
	}

	start() {
		this.showChangelog();

		DOM.addStyle(".bigger-stream-preview { background: transparent !important; }");
		this.patchUserContextMenu();
		this.patchStreamContextMenu();
	}

	stop() {
		this.unpatchUserContextMenu();
		this.unpatchStreamContextMenu();
		DOM.removeStyle(this.meta.name);
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

	fetchImageInfo(url) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve({ width: img.width, height: img.height });
			img.onerror = reject;
			img.src = url;
		});
	}

	isValidUrl(url) {
		return url && url.startsWith("https://");
	}

	async openImageModal(url) {
		const imageInfo = await this.fetchImageInfo(url);
		const imgProps = {
			//src: url,
			alt: "Stream Preview",
			width: imageInfo.width,
			height: imageInfo.height,
		};
		const imageModalProps = {
			type: "IMAGE",
			url: url,
			proxyUrl: url,
			original: url,
			zoomThumbnailPlaceholder: url,
			animated: false,
			srcIsAnimated: false,
		}

		const OpenLink = React.createElement('div', { className: "imageModalOptions", }, React.createElement(RenderLinkComponent, {
			className: "downloadLink",
			href: url,
		}, "Open in Browser"));
		const StreamImage = React.createElement('div', { className: "imageModalwrapper", }, React.createElement(ImageModal, {
			media: {
				...imageModalProps,
				...imgProps,
			},
			obscured: false,
		}), OpenLink);

		openModal(props => (
			React.createElement(ModalRoot, { className: "bigger-stream-preview", size: ModalSize.DYNAMIC, ...props, },
				StreamImage
			)
		));
	}

	handleUserContextMenu = (menu, { user }) => {
		if (!user) return;
		const [stream, previewUrl] = useStateFromStores([ApplicationStreamingStore, ApplicationStreamPreviewStore], () => {
			const stream = ApplicationStreamingStore.getAnyStreamForUser(user.id);
			const previewUrl = stream && ApplicationStreamPreviewStore.getPreviewURL(
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
		const previewUrl = useStateFromStores([ApplicationStreamPreviewStore], () => ApplicationStreamPreviewStore.getPreviewURL(
			stream.guildId,
			stream.channelId,
			stream.ownerId
		));

		this.appendStreamPreviewMenuGroup(menu.props.children, previewUrl);
	};
};