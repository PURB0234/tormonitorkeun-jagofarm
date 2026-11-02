// server.js - Entry point bridge for hosting panels (KolabPanel / cPanel / Docker)
const path = require("path");
const fs = require("fs");

const standaloneDir = path.join(__dirname, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

if (fs.existsSync(standaloneServer)) {
    process.chdir(standaloneDir);
    require(standaloneServer);
} else {
    console.error("Error: Standalone build not found. Please run 'npm run build' first.");
    process.exit(1);
}
