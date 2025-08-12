import fs from "fs";
import path from "path";

const type = process.argv[2];

if (type === "plugin" || type === "theme") {
    const addonDir = path.resolve(__dirname, type.charAt(0).toUpperCase() + type.slice(1) + "s");

    if (!fs.existsSync(addonDir)) {
        console.error(`Error: ${addonDir} does not exist.`);
        process.exit(1);
    }

    // Watch all subfolders (recursively) inside addonDir
    function watchRecursively(dir: string) {
        fs.watch(dir, (eventType, filename) => {
            if (filename) {
                const fullPath = path.join(dir, filename);
                fs.stat(fullPath, (err, stats) => {
                    if (!err && stats.isDirectory()) {
                        // If a new directory is added, watch it too
                        watchRecursively(fullPath);
                    }
                });
                console.log(`File ${filename} was ${eventType} in ${dir}`);
                if (filename.endsWith(".js")) {
                    const destDir = path.join(process.env.APPDATA || "", "BetterDiscord", type + "s");
                    const destPath = path.join(destDir, filename);
                    fs.copyFile(fullPath, destPath, (err) => {
                        if (err) {
                            console.error(`Failed to copy ${filename}:`, err);
                        } else {
                            console.log(`Copied ${filename} to BetterDiscord ${type}s folder.`);
                        }
                    });
                }
            }
        });

        // Watch existing subdirectories
        fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            if (entry.isDirectory()) {
                watchRecursively(path.join(dir, entry.name));
            }
        });
    }

    watchRecursively(addonDir);
    console.log(`Watching for file updates in ${addonDir}`);
} else {
    console.error(`Error: Type is required and must be either 'plugin' or 'theme'.`);
    process.exit(1);
}