var path = require("path");
var fs = require("fs");
var net = require("net");
var express = require("express");
var webroot = path.join(__dirname, "..", "www");
var sendJade = require("./jade").sendJade;
var Server = require("../server");
var $util = require("../utilities");
var Logger = require("../logger");
var Config = require("../config");
var db = require("../database");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var static = require("serve-static");
var morgan = require("morgan");

const LOG_FORMAT = ':real-address - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
morgan.token('real-address', function (req) { return req._ip; });

/**
 * Extracts an IP address from a request.  Uses X-Forwarded-For if the IP is localhost
 */
function ipForRequest(req) {
    var ip = req.ip;
    if (ip === "127.0.0.1" || ip === "::1") {
        var xforward = req.header("x-forwarded-for");
        if (typeof xforward !== "string") {
            xforward = [];
        } else {
            xforward = xforward.split(",");
        }

        for (var i = 0; i < xforward.length; i++) {
            if (net.isIP(xforward[i])) {
                return xforward[i];
            }
        }
        return ip;
    }
    return ip;
}

/**
 * Redirects a request to HTTPS if the server supports it
 */
function redirectHttps(req, res) {
    if (!req.secure && Config.get("https.enabled")) {
        var ssldomain = Config.get("https.full-address");
        res.redirect(ssldomain + req.path);
        return true;
    }
    return false;
}

/**
 * Redirects a request to HTTP if the server supports it
 */
function redirectHttp(req, res) {
    if (req.secure) {
        var domain = Config.get("http.full-address");
        res.redirect(domain + req.path);
        return true;
    }
    return false;
}

/**
 * Handles a GET request for /r/:channel - serves channel.html
 */
function handleChannel(req, res) {
    if (!$util.isValidChannelName(req.params.channel)) {
        res.status(404);
        res.send("Invalid channel name '" + req.params.channel + "'");
        return;
    }

    var loginName = false;
    if (req.cookies.auth) {
        loginName = req.cookies.auth.split(":")[0];
    }

    var sio;
    if (net.isIPv6(ipForRequest(req))) {
        sio = Config.get("io.ipv6-default");
    }

    if (!sio) {
        sio = Config.get("io.ipv4-default");
    }

    sio += "/socket.io/socket.io.js";

    sendJade(res, "channel", {
        channelName: req.params.channel,
        loggedIn: loginName !== false,
        loginName: loginName,
        sioSource: sio
    });
}

/**
 * Handles a request for the index page
 */
function handleIndex(req, res) {
    var loginName = false;
    if (req.cookies.auth) {
        loginName = req.cookies.auth.split(":")[0];
    }

    var channels = Server.getServer().packChannelList(true);
    channels.sort(function (a, b) {
        if (a.usercount === b.usercount) {
            return a.uniqueName > b.uniqueName ? -1 : 1;
        }

        return b.usercount - a.usercount;
    });

    sendJade(res, "index", {
        loggedIn: loginName !== false,
        loginName: loginName,
        channels: channels
    });
}

/**
 * Handles a request for the socket.io information
 */
function handleSocketConfig(req, res) {
    res.type("application/javascript");

    var sioconfig = Config.get("sioconfig");
    var iourl;
    var ip = ipForRequest(req);
    var ipv6 = false;

    if (net.isIPv6(ip)) {
        iourl = Config.get("io.ipv6-default");
        ipv6 = true;
    }

    if (!iourl) {
        iourl = Config.get("io.ipv4-default");
    }
    sioconfig += "var IO_URL='" + iourl + "';";
    sioconfig += "var IO_V6=" + ipv6 + ";";
    res.send(sioconfig);
}

function handleUserAgreement(req, res) {
    var loginName = false;
    if (req.cookies.auth) {
        loginName = req.cookies.auth.split(":")[0];
    }

    sendJade(res, "tos", {
        loggedIn: loginName !== false,
        loginName: loginName,
        domain: Config.get("http.domain")
    });
}

function handleContactPage(req, res) {
    var loginName = false;
    if (req.cookies.auth) {
        loginName = req.cookies.auth.split(":")[0];
    }

    // Make a copy to prevent messing with the original
    var contacts = Config.get("contacts").map(function (c) {
        return {
            name: c.name,
            email: c.email,
            title: c.title
        };
    });

    // Rudimentary hiding of email addresses to prevent spambots
    contacts.forEach(function (c) {
        c.emkey = $util.randomSalt(16)
        var email = new Array(c.email.length);
        for (var i = 0; i < c.email.length; i++) {
          email[i] = String.fromCharCode(
            c.email.charCodeAt(i) ^ c.emkey.charCodeAt(i % c.emkey.length)
          );
        }
        c.email = escape(email.join(""));
        c.emkey = escape(c.emkey);
    });

    sendJade(res, "contact", {
        loggedIn: loginName !== false,
        loginName: loginName,
        contacts: contacts
    });
}

module.exports = {
    /**
     * Initializes webserver callbacks
     */
    init: function (app) {
        app.use(function (req, res, next) {
            req._ip = ipForRequest(req);
            next();
        });
        app.use(bodyParser.urlencoded({
            extended: false,
            limit: '1kb' // No POST data should ever exceed this size under normal usage
        }));
        app.use(cookieParser());
        app.use(morgan(LOG_FORMAT, {
            stream: require("fs").createWriteStream(path.join(__dirname, "..", "..",
            "http.log"), {
                flags: "a",
                encoding: "utf-8"
            })
        }));

        if (Config.get("http.gzip")) {
            app.use(require("compression")({ threshold: Config.get("http.gzip-threshold") }));
            Logger.syslog.log("Enabled gzip compression");
        }

        if (Config.get("http.minify")) {
            var cache = path.join(__dirname, "..", "..", "www", "cache")
            if (!fs.existsSync(cache)) {
                fs.mkdirSync(cache);
            }
            app.use(require("express-minify")({
                cache: cache
            }));
            Logger.syslog.log("Enabled express-minify for CSS and JS");
        }

        app.get("/r/:channel", handleChannel);
        app.get("/", handleIndex);
        app.get("/sioconfig", handleSocketConfig);
        app.get("/useragreement", handleUserAgreement);
        app.get("/contact", handleContactPage);
        require("./auth").init(app);
        require("./account").init(app);
        require("./acp").init(app);
        app.use(static(path.join(__dirname, "..", "..", "www"), {
            maxAge: Config.get("http.max-age") || Config.get("http.cache-ttl")
        }));
        app.use(function (err, req, res, next) {
            if (err) {
                if (err.message && err.message.match(/failed to decode param/i)) {
                    return res.status(400).send("Malformed path: " + req.path);
                } else if (err.message && err.message.match(/requested range not/i)) {
                    return res.status(416).end();
                } else if (err.message && err.message.match(/request entity too large/i)) {
                    return res.status(413).end();
                } else if (err.message && err.message.match(/bad request/i)) {
                    return res.status(400).end("Bad Request");
                }
                Logger.errlog.log(err.stack);
                res.status(500).end();
            } else {
                next();
            }
        });
    },

    ipForRequest: ipForRequest,

    redirectHttps: redirectHttps,

    redirectHttp: redirectHttp,
};
