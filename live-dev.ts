import fs from "fs";
import path from "path";

const type = process.argv[2];
const name = process.argv[3];

if (type === "plugin" || type === "theme") {
    if (!name) {
        console.error("Error: Extension name must be provided as the third argument.");
        process.exit(1);
    }
    const addonDir = path.resolve(__dirname, type.charAt(0).toUpperCase() + type.slice(1) + "s", name);

    if (!fs.existsSync(addonDir)) {
        console.error(`Error: ${addonDir} does not exist.`);
        process.exit(1);
    }

    fs.watch(addonDir, (eventType, filename) => {
        if (filename) {
            console.log(`File ${filename} was ${eventType}`);
            if (filename.endsWith(".js")) {
                const srcPath = path.join(addonDir, filename);
                const destDir = path.join(process.env.APPDATA || "", "BetterDiscord", type + "s");
                const destPath = path.join(destDir, filename);
                fs.copyFile(srcPath, destPath, (err) => {
                    if (err) {
                        console.error(`Failed to copy ${filename}:`, err);
                    } else {
                        console.log(`Copied ${filename} to BetterDiscord ${type}s folder.`);
                    }
                });
            }
        }
    });
    console.log(`Watching for file updates in ${addonDir}`);
} else {
    console.error(`Error: Type is required and must be either 'plugin' or 'theme'.`);
    process.exit(1);
}