var Config = require("./config");
var fs = require("fs");
var path = require("path");
var execSync = require("child_process").execSync;

var needPermissionsFixed = [
    path.join(__dirname, "..", "chanlogs"),
    path.join(__dirname, "..", "chandump"),
    path.join(__dirname, "..", "google-drive-subtitles")
];

function fixPermissions(user, group) {
    var uid = resolveUid(user);
    var gid = resolveGid(group);
    needPermissionsFixed.forEach(function (dir) {
        if (fs.existsSync(dir)) {
            fs.chownSync(dir, uid, gid);
        }
    });
}

function resolveUid(user) {
    return parseInt(execSync('id -u ' + user), 10);
}

function resolveGid(group) {
    return parseInt(execSync('id -g ' + group), 10);
}

if (Config.get("setuid.enabled")) {
    setTimeout(function() {
        try {
            fixPermissions(Config.get("setuid.user"), Config.get("setuid.group"));
            console.log("Old User ID: " + process.getuid() + ", Old Group ID: " +
                    process.getgid());
            process.setgid(Config.get("setuid.group"));
            process.setuid(Config.get("setuid.user"));
            console.log("New User ID: " + process.getuid() + ", New Group ID: "
                    + process.getgid());
        } catch (err) {
            console.log("Error setting uid: " + err.stack);
            process.exit(1);
        }
    }, (Config.get("setuid.timeout")));
};
