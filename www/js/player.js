/*}
The MIT License (MIT)
Copyright (c) 2013 Calvin Montgomery

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var VIMEO_FLASH = false;

function removeOld(replace) {
    $("#sc_volume").remove();
    replace = replace || $("<div/>");
    var old = $("#ytapiplayer");
    replace.insertBefore(old);
    old.remove();
    replace.attr("id", "ytapiplayer");
}

var YouTubePlayer = function (data) {
    var self = this;
    waitUntilDefined(window, "YT", function () {
        waitUntilDefined(YT, "Player", function () {
            removeOld();
            self.paused = false;
            self.videoId = data.id;
            self.videoLength = data.seconds;
            var wmode = USEROPTS.wmode_transparent ? "transparent" : "opaque";
            self.player = new YT.Player("ytapiplayer", {
                height: VHEIGHT,
                width: VWIDTH,
                videoId: data.id,
                playerVars: {
                    autohide: 2,        // Autohide controls
                    autoplay: 1,        // Autoplay video
                    controls: 1,        // Show controls
                    iv_load_policy: 3,  // No annotations
                    rel: 0,             // No related videos
                    wmode: wmode
                },
                events: {
                    onReady: function () {
                        PLAYER.setVolume(VOLUME);
                        $("#ytapiplayer").width(VWIDTH).height(VHEIGHT);
                    },
                    onStateChange: function (ev) {
                        if(PLAYER.paused && ev.data != YT.PlayerState.PAUSED ||
                           !PLAYER.paused && ev.data == YT.PlayerState.PAUSED) {
                            self.paused = (ev.data == YT.PlayerState.PAUSED);
                            if(CLIENT.leader)
                                sendVideoUpdate();
                        }
                        else {
                            self.paused = (ev.data == YT.PlayerState.PAUSED);
                        }
                        if(CLIENT.leader && ev.data == YT.PlayerState.ENDED) {
                            socket.emit("playNext");
                        }
                    }
                }
            });
            $("#ytapiplayer").css("border", "none");
        });
    });

    self.load = function (data) {
        if(self.player && self.player.loadVideoById) {
            self.player.loadVideoById(data.id, data.currentTime);
            if (USEROPTS.default_quality) {
                self.player.setPlaybackQuality(USEROPTS.default_quality);
                // What's that?  Another stupid hack for the HTML5 player?
                self.player.setPlaybackQuality(USEROPTS.default_quality);
            }
            self.videoId = data.id;
            self.videoLength = data.seconds;
        }
    };

    self.pause = function () {
        if(self.player && self.player.pauseVideo)
            self.player.pauseVideo();
    };

    self.play = function () {
        if(self.player && self.player.playVideo)
        {
            self.player.playVideo();
            if (USEROPTS.default_quality) {
                self.player.setPlaybackQuality(USEROPTS.default_quality);
                // What's that?  Another stupid hack for the HTML5 player?
                self.player.setPlaybackQuality(USEROPTS.default_quality);
            }
        }
    };

    self.isPaused = function (callback) {
        if(self.player && self.player.getPlayerState) {
            var state = self.player.getPlayerState();
            callback(state != YT.PlayerState.PLAYING);
        } else {
            callback(false);
        }
    };

    self.getTime = function (callback) {
        if(self.player && self.player.getCurrentTime)
            callback(self.player.getCurrentTime());
    };

    self.seek = function (time) {
        if(self.player && self.player.seekTo)
            self.player.seekTo(time, true);
    };

    self.getVolume = function (cb) {
        if (!self.player || !self.player.getVolume || !self.player.isMuted) {
            return;
        }

        // YouTube's API is strange in the sense that getVolume() returns
        // the regular (unmuted) volume even if it is muted...
        // YouTube's volume is 0..100, normalize it to 0..1
        var vol = self.player.isMuted() ? 0 : (self.player.getVolume() / 100);
        cb(vol);
    };

    self.setVolume = function (vol) {
        if (self.player && self.player.setVolume) {
            if (vol > 0) {
                self.player.unMute();
            }
            self.player.setVolume(vol * 100);
        }
    };
};

var VimeoPlayer = function (data) {
    var self = this;
    waitUntilDefined(window, "$f", function () {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init = function () {
            var iframe = $("<iframe/>");
            removeOld(iframe);
            var prto = location.protocol;
            iframe.attr("src", prto+"//player.vimeo.com/video/"+self.videoId+"?api=1&player_id=ytapiplayer");
            iframe.attr("webkitAllowFullScreen", "");
            iframe.attr("mozallowfullscreen", "");
            iframe.attr("allowFullScreen", "");
            if(USEROPTS.wmode_transparent)
                iframe.attr("wmode", "transparent");
            iframe.css("border", "none");
            iframe.width(VWIDTH);
            iframe.height(VHEIGHT);

            $f(iframe[0]).addEvent("ready", function () {
                self.player = $f(iframe[0]);
                self.player.api("play");

                self.player.addEvent("finish", function () {
                    if(CLIENT.leader) {
                        socket.emit("playNext");
                    }
                });

                self.player.addEvent("pause", function () {
                    self.paused = true;
                    if(CLIENT.leader)
                        sendVideoUpdate();
                });

                self.player.addEvent("play", function () {
                    self.paused = false;
                    if(CLIENT.leader)
                        sendVideoUpdate();
                });

                self.setVolume(VOLUME);
            }.bind(self));
        };

        self.load = function (data) {
            self.videoId = data.id;
            self.videoLength = data.seconds;
            self.init();
        };

        self.pause = function () {
            if(self.player && self.player.api)
                self.player.api("pause");
        };

        self.play = function () {
            if(self.player && self.player.api)
                self.player.api("play");
        };

        self.isPaused = function (callback) {
            callback(self.paused);
        };

        self.getTime = function (callback) {
            if(self.player && self.player.api) {
                // Vimeo api returns time as a string because fuck logic
                self.player.api("getCurrentTime", function (time) {
                    callback(parseFloat(time));
                });
            }
        };

        self.seek = function(time) {
            if(self.player && self.player.api)
                self.player.api("seekTo", time);
        };

        self.getVolume = function (cb) {
            if (self.player && self.player.api) {
                self.player.api("getVolume", cb);
            }
        };

        self.setVolume = function (vol) {
            self.player.api("setVolume", vol);
        };

        self.init();
    });
};

var VimeoFlashPlayer = function (data) {
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        removeOld();
        var prto = location.protocol;
        var url = prto+"//vimeo.com/moogaloop.swf?clip_id="+self.videoId;
        url += "&" + [
            "server=vimeo.com",
            "api=2",
            "show_title=0",
            "show_byline=0",
            "show_portrait=0",
            "fullscreen=1",
            "loop=0"
        ].join("&");
        var flashvars = {
            api: 2,
            player_id: "ytapiplayer"
        };
        var params = {
            allowfullscreen: true,
            allowScriptAccess: "always",
            wmode: USEROPTS.wmode_transparent ? "transparent" : undefined
        };
        swfobject.embedSWF(url,
                           "ytapiplayer",
                           VWIDTH,
                           VHEIGHT,
                           "9.0.0",
                           "expressInstall.swf",
                           flashvars,
                           params);

        self.player = $("#ytapiplayer")[0];
        waitUntilDefined(self.player, "api_addEventListener", function () {
            self.player.api_addEventListener("ready", function () {
                self.player.api_play();

                self.player.api_addEvent("finish", function () {
                    if(CLIENT.leader)
                        socket.emit("playNext");
                });

                self.player.api_addEvent("pause", function () {
                    PLAYER.paused = true;
                    if(CLIENT.leader)
                        sendVideoUpdate();
                });

                self.player.api_addEvent("play", function () {
                    PLAYER.paused = false;
                    if(CLIENT.leader)
                        sendVideoUpdate();
                });

                self.setVolume(VOLUME);
            });
        });
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () {
        if(self.player && self.player.api_pause)
            self.player.api_pause();
    };

    self.play = function () {
        if(self.player && self.player.api_play)
            self.player.api_play();
    };

    self.isPaused = function (callback) {
        callback(self.paused);
    };

    self.getTime = function (callback) {
        if(self.player && self.player.api_getCurrentTime) {
            var t = parseFloat(self.player.api_getCurrentTime());
            callback(t);
        }
    };

    self.seek = function (time) {
        if(self.player.api_seekTo);
            self.player.api_seekTo(time);
    };

    self.getVolume = function (cb) {
        if (self.player && self.player.api_getVolume) {
            cb(self.player.api_getVolume());
        }
    };

    self.setVolume = function (vol) {
        self.player.api_setVolume(vol);
    };

    self.init();
};

var DailymotionPlayer = function (data) {
    var self = this;
    waitUntilDefined(window, "DM", function () {
        removeOld();
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.player = DM.player("ytapiplayer", {
            video: data.id,
            width: parseInt(VWIDTH, 10),
            height: parseInt(VHEIGHT, 10),
            params: { autoplay: 1 }
        });

        self.player.addEventListener("apiready", function (e) {
            self.player.addEventListener("ended", function (e) {
                if(CLIENT.leader) {
                    socket.emit("playNext");
                }
            });

            self.player.addEventListener("pause", function (e) {
                PLAYER.paused = true;
                if(CLIENT.leader)
                    sendVideoUpdate();
            });

            self.player.addEventListener("playing", function (e) {
                PLAYER.paused = false;
                if(CLIENT.leader)
                    sendVideoUpdate();
                if (!self.volumeIsSet) {
                    try {
                        self.setVolume(VOLUME);
                        self.volumeIsSet = true;
                    } catch (err) {

                    }
                }
            });
        });
    });

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        if (self.player && self.player.api) {
            self.player.api("load", data.id);
        }
    };

    self.pause = function () {
        if(self.player && self.player.api)
            self.player.api("pause");
    };

    self.play = function () {
        if(self.player && self.player.api)
            self.player.api("play");
    };

    self.isPaused = function (callback) {
        callback(self.paused);
    };

    self.getTime = function (callback) {
        if(self.player)
            callback(self.player.currentTime);
    };

    self.seek = function (seconds) {
        if(self.player && self.player.api)
            self.player.api("seek", seconds);
    };

    self.getVolume = function (cb) {
        if (self.player) {
            cb(self.player.volume);
        }
    };

    self.setVolume = function (vol) {
        if (self.player && self.player.api) {
            self.player.api("volume", vol);
        }
    };
};

var SoundcloudPlayer = function (data) {
    var self = this;
    // The getVolume function on their widget throws TypeErrors
    // Go figure
    self.soundcloudIsSeriouslyFuckingBroken = VOLUME;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    waitUntilDefined(window, "SC", function () {
        unfixSoundcloudShit();
        var iframe = $("<iframe/>");
        removeOld(iframe);

        iframe.attr("id", "ytapiplayer");
        iframe.attr("src", "https://w.soundcloud.com/player/?url="+self.videoId);
        iframe.css("width", "100%").attr("height", "166");
        iframe.css("border", "none");

        var volslider = $("<div/>").attr("id", "sc_volume")
            .insertAfter(iframe);

        volslider.slider({
            range: "min",
            value: VOLUME * 100,
            stop: function (event, ui) {
                self.player.setVolume(ui.value);
                self.soundcloudIsSeriouslyFuckingBroken = ui.value / 100;
            }
        });

        self.player = SC.Widget("ytapiplayer");

        self.player.bind(SC.Widget.Events.READY, function () {
            self.player.load(self.videoId, { auto_play: true });

            self.player.bind(SC.Widget.Events.PAUSE, function () {
                PLAYER.paused = true;
                if(CLIENT.leader)
                    sendVideoUpdate();
            });

            self.player.bind(SC.Widget.Events.FINISH, function () {
                if(CLIENT.leader) {
                    socket.emit("playNext");
                }
            });

            self.player.bind(SC.Widget.Events.PLAY, function () {
                PLAYER.paused = false;
                if(CLIENT.leader)
                    sendVideoUpdate();
            });

            // THAT'S RIGHT, YOU CAN'T SET THE VOLUME BEFORE IT STARTS PLAYING
            var soundcloudNeedsToFuckingFixTheirPlayer = function () {
                self.setVolume(VOLUME);
                self.player.unbind(SC.Widget.Events.PLAY_PROGRESS);
            };
            self.player.bind(SC.Widget.Events.PLAY_PROGRESS, soundcloudNeedsToFuckingFixTheirPlayer);
        }.bind(self));
    });

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        if(self.player && self.player.load) {
            self.player.load(data.id, { auto_play: true });
            var soundcloudNeedsToFuckingFixTheirPlayer = function () {
                self.setVolume(VOLUME);
                self.player.unbind(SC.Widget.Events.PLAY_PROGRESS);
            };
            self.player.bind(SC.Widget.Events.PLAY_PROGRESS, soundcloudNeedsToFuckingFixTheirPlayer);
        }
    };

    self.pause = function () {
        if(self.player && self.player.pause)
            self.player.pause();
    };

    self.play = function () {
        if(self.player && self.player.play)
            self.player.play();
    };

    self.isPaused = function (callback) {
        if(self.player && self.player.isPaused)
            self.player.isPaused(callback);
        else
            callback(false);
    };

    self.getTime = function (callback) {
        if(self.player && self.player.getPosition) {
            self.player.getPosition(function (pos) {
                callback(pos / 1000);
            });
        }
    };

    self.seek = function (seconds) {
        if(self.player && self.player.seekTo)
            self.player.seekTo(seconds * 1000);
    };

    self.getVolume = function (cb) {
        cb(self.soundcloudIsSeriouslyFuckingBroken);
    };

    self.setVolume = function (vol) {
        self.player.setVolume(vol * 100);
    };
};

var LivestreamPlayer = function (data) {
    removeOld();
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        var flashvars = { channel: self.videoId };
        var params = { AllowScriptAccess: "always" };
        var prto = location.protocol;
        swfobject.embedSWF(
            prto+"//cdn.livestream.com/chromelessPlayer/v20/playerapi.swf",
            "ytapiplayer",
            VWIDTH, VHEIGHT,
            "9.0.0",
            "expressInstall.swf",
            flashvars,
            params
        );
    };

    self.load = function(data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    waitUntilDefined(window, "swfobject", function () {
        self.init();
    });
};

var TwitchTVPlayer = function (data) {
    removeOld();
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        var url = "http://www.twitch.tv/widgets/live_embed_player.swf?channel="+self.videoId;
        var params = {
            allowFullScreen: "true",
            allowScriptAccess: "always",
            allowNetworking: "all",
            movie: "http://www.twitch.tv/widgets/live_embed_player.swf",
            id: "live_embed_player_flash",
            flashvars: "hostname=www.twitch.tv&channel="+self.videoId+"&auto_play=true&start_volume=" + VOLUME
        };
        swfobject.embedSWF(url,
            "ytapiplayer",
            VWIDTH, VHEIGHT,
            "8",
            null, null,
            params,
            {}
        );
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    waitUntilDefined(window, "swfobject", function () {
        self.init();
    });
};

var JustinTVPlayer = function (data) {
    removeOld();
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        var prto = location.protocol;
        var url = "http://www.justin.tv/widgets/live_embed_player.swf?channel="+self.videoId;
        var params = {
            allowFullScreen: "true",
            allowScriptAccess: "always",
            allowNetworking: "all",
            movie: "http://www.justin.tv/widgets/live_embed_player.swf",
            id: "live_embed_player_flash",
            flashvars: "hostname=www.justin.tv&channel="+self.videoId+"&auto_play=true&start_volume=" + VOLUME
        };
        swfobject.embedSWF(url,
            "ytapiplayer",
            VWIDTH, VHEIGHT,
            "8",
            null, null,
            params,
            {}
        );
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    waitUntilDefined(window, "swfobject", function () {
        self.init();
    });
};

function rtmpEventHandler(id, ev, data) {
    if (ev === "volumechange") {
        PLAYER.volume = (data.muted ? 0 : data.volume);
    }
}

var RTMPPlayer = function (data) {
    removeOld();
    var self =this;
    self.volume = VOLUME;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        var prto = location.protocol;
        var url = prto+"//fpdownload.adobe.com/strobe/FlashMediaPlayback_101.swf";
        var src = encodeURIComponent(self.videoId);
        var params = {
            allowFullScreen: "true",
            allowScriptAccess: "always",
            allowNetworking: "all",
            wMode: "direct",
            movie: prto+"//fpdownload.adobe.com/strobe/FlashMediaPlayback_101.swf",
            flashvars: "src="+src+"&streamType=live&javascriptCallbackFunction=rtmpEventHandler&autoPlay=true&volume=" + VOLUME
        };
        swfobject.embedSWF(url,
            "ytapiplayer",
            VWIDTH, VHEIGHT,
            "8",
            null, null,
            params,
            {}
        );
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function (cb) {
        cb(self.volume);
    };

    self.setVolume = function () { };

    waitUntilDefined(window, "swfobject", function () {
        self.init();
    });
};

function flashEventHandler(id, ev, data) {
    switch (ev) {
        case "timeupdate":
            PLAYER.currentTime = data.currentTime;
            break;
        case "pause":
            PLAYER.paused = data.paused;
            if (CLIENT.leader)
                sendVideoUpdate();
            break;
        case "play":
            PLAYER.paused = data.paused;
            if (CLIENT.leader)
                sendVideoUpdate();
            break;
        case "volumechange":
            PLAYER.volume = (data.muted ? 0 : data.volume);
            break;
        case "progress":
            break;
        case "onJavaScriptBridgeCreated":
            PLAYER.player = $("#ytapiplayer")[0];
            break;
        default:
            break;
    }
}

var FlashPlayer = function (data) {
    removeOld();
    var self = this;
    self.volume = VOLUME;
    self.videoId = data.id;
    self.videoUrl = data.url;
    self.videoLength = data.seconds;
    self.paused = false;
    self.currentTime = 0;

    self.init = function () {
        var params = {
            allowFullScreen: "true",
            allowScriptAccess: "always",
            allowNetworking: "all",
            wMode: "direct"
        };

        var flashvars = {
            src: encodeURIComponent(self.videoUrl),
            // For some reason this param seems not to work
            clipStartTime: Math.floor(data.currentTime),
            javascriptCallbackFunction: "flashEventHandler",
            autoPlay: true,
            volume: VOLUME
        };

        if (self.videoUrl.indexOf("rtmp") === 0) {
            flashvars.streamType = "live";
        } else {
            flashvars.streamType = "recorded";
        }

        swfobject.embedSWF("/StrobeMediaPlayback.swf",
            "ytapiplayer",
            VWIDTH, VHEIGHT,
            "10.1.0",
            null,
            flashvars,
            params,
            { name: "ytapiplayer" }
        );

        self.player = $("#ytapiplayer")[0];
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoUrl = data.url;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () {
        if (self.player && self.player.pause)
            self.player.pause();
    };

    self.play = function () {
        // Why is it play2?  What happened to play1?
        if (self.player && self.player.play2)
            self.player.play2();
    };

    self.isPaused = function (cb) {
        cb(self.paused);
    };

    self.getTime = function (cb) {
        cb(self.currentTime);
    };

    self.seek = function (to) {
        if (self.player && self.player.seek) {
            self.player.seek(Math.floor(to));
        }
    };

    self.getVolume = function (cb) {
        cb(self.volume);
    };

    self.setVolume = function (vol) {
        if (self.player && self.player.setVolume)
            self.player.setVolume(vol);
    };

    waitUntilDefined(window, "swfobject", function () {
        self.init();
    });
};

var JWPlayer = function (data) {
    var self = this;
    self.videoId = data.id;
    if (data.url) {
        self.videoURL = data.url;
    } else {
        self.videoURL = data.id;
    }
    self.videoLength = data.seconds;
    self.init = function () {
        removeOld();

        jwplayer("ytapiplayer").setup({
            file: self.videoURL,
            width: VWIDTH,
            height: VHEIGHT,
            autostart: true
        });
        jwplayer().onPlay(function() {
            self.paused = false;
            if(CLIENT.leader)
                sendVideoUpdate();
        });
        jwplayer().onPause(function() {
            self.paused = true;
            if(CLIENT.leader)
                sendVideoUpdate();
        });
        jwplayer().onComplete(function() {
            socket.emit("playNext");
        });
        self.setVolume(VOLUME);
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () {
        if(jwplayer)
            jwplayer().pause(true);
    };

    self.play = function () {
        if(jwplayer)
            jwplayer().play(true);
    };

    self.isPaused = function (callback) {
        if(jwplayer)
            callback(jwplayer().getState() !== "PLAYING");
    };

    self.getTime = function (callback) {
        // Only return time for non-live media
        if(jwplayer && jwplayer().getDuration() != -1) {
            callback(jwplayer().getPosition());
        }
    };

    self.seek = function (time) {
        if(jwplayer)
            jwplayer().seek(time);
    };

    self.getVolume = function (cb) {
        cb(jwplayer().getVolume() / 100);
    };

    self.setVolume = function (vol) {
        jwplayer().setVolume(vol * 100);
    };

    waitUntilDefined(window, "jwplayer", function () { self.init(); });
};

var UstreamPlayer = function (data) {
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        var iframe = $("<iframe/>");
        removeOld(iframe);
        iframe.attr("width", VWIDTH);
        iframe.attr("height", VHEIGHT);
        var prto = location.protocol;
        iframe.attr("src", prto+"//www.ustream.tv/embed/"+self.videoId+"?v=3&wmode=direct");
        iframe.attr("frameborder", "0");
        iframe.attr("scrolling", "no");
        iframe.css("border", "none");
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    self.init();
};

var ImgurPlayer = function (data) {
    var self = this;
    self.init = function () {
        var iframe = $("<iframe/>");
        removeOld(iframe);
        iframe.attr("width", VWIDTH);
        iframe.attr("height", VHEIGHT);
        var prto = location.protocol;
        iframe.attr("src", prto+"//imgur.com/a/"+self.videoId+"/embed");
        iframe.attr("frameborder", "0");
        iframe.attr("scrolling", "no");
        iframe.css("border", "none");
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    self.init();
};

var CustomPlayer = function (data) {
    var self = this;
    self.videoId = data.id;
    self.videoLength = data.seconds;
    self.init = function () {
        removeOld();
        var div = $("#ytapiplayer");
        div.attr("id", "");
        div.append(self.videoId);

        self.player = div.find("iframe");
        if(self.player.length === 0) self.player = div.find("object");
        if(self.player.length === 0) self.player = div;
        self.player.attr("id", "ytapiplayer");
        self.player.attr("width", VWIDTH);
        self.player.attr("height", VHEIGHT);
    };

    self.load = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.init();
    };

    self.pause = function () { };

    self.play = function () { };

    self.isPaused = function () { };

    self.getTime = function () { };

    self.seek = function () { };

    self.getVolume = function () { };

    self.setVolume = function () { };

    self.init();
};

var GoogleDocsPlayer = function (data) {
    var self = this;
    self.init = function (data) {
        self.videoId = data.id;
        self.videoLength = data.seconds;
        self.paused = false;
        var wmode = USEROPTS.wmode_transparent ? "transparent" : "opaque";
        self.player = $("<object/>", data.object)[0];
        $(self.player).attr("data", data.object.data);
        $(self.player).attr("width", VWIDTH)
                      .attr("height", VHEIGHT);
        data.params.forEach(function (p) {
            $("<param/>", p).appendTo(self.player);
        });
        removeOld($(self.player));
        self.setVolume(VOLUME);
    };

    self.load = function (data) {
        self.init(data);
    };

    self.pause = function () {
        if(self.player && self.player.pauseVideo)
            self.player.pauseVideo();
    };

    self.play = function () {
        if(self.player && self.player.playVideo)
            self.player.playVideo();
    };

    self.isPaused = function (callback) {
        if(self.player && self.player.getPlayerState) {
            var state = self.player.getPlayerState();
            callback(state != YT.PlayerState.PLAYING);
        } else {
            callback(false);
        }
    };

    self.getTime = function (callback) {
        if(self.player && self.player.getCurrentTime)
            callback(self.player.getCurrentTime());
    };

    self.seek = function (time) {
        if(self.player && self.player.seekTo)
            self.player.seekTo(time, true);
    };

    self.getVolume = function (cb) {
        if (!self.player || !self.player.getVolume || !self.player.isMuted) {
            return;
        }

        // YouTube's API is strange in the sense that getVolume() returns
        // the regular (unmuted) volume even if it is muted...
        // YouTube's volume is 0..100, normalize it to 0..1
        var vol = self.player.isMuted() ? 0 : (self.player.getVolume() / 100);
        cb(vol);
    };

    self.setVolume = function (vol) {
        if (self.player && self.player.setVolume) {
            self.player.setVolume(vol * 100);
        }
    };

    self.init(data);
};

function RawVideoPlayer(data) {
    var self = this;
    self.init = function (data) {
        self.videoId = data.id;
        self.videoURL = data.url;
        var video = $("<video/>")
            .attr("src", self.videoURL)
            .attr("controls", "controls")
            .attr("id", "#ytapiplayer")
            .attr("width", VWIDTH)
            .attr("height", VHEIGHT)
            .html("Your browser does not support HTML5 <code>&lt;video&gt;</code> tags :(");
        video.error(function (err) {
            setTimeout(function () {
                fallbackRaw(data);
            }, 100);
        });
        removeOld(video);
        self.player = video[0];
        self.setVolume(VOLUME);
    };

    self.load = function (data) {
        self.init(data);
    };

    self.pause = function () {
        if (self.player) {
            self.player.pause();
        }
    };

    self.play = function () {
        if (self.player) {
            self.player.play();
        }
    };

    self.isPaused = function (callback) {
        if (self.player) {
            callback(self.player.paused);
        }
    };

    self.getTime = function (callback) {
        if (self.player) {
            callback(self.player.currentTime);
        }
    };

    self.seek = function (time) {
        if (self.player) {
            self.player.currentTime = time;
        }
    };

    self.getVolume = function (cb) {
        if (self.player) {
            if (self.player.muted) {
                cb(0);
            } else {
                cb(self.player.volume);
            }
        }
    };

    self.setVolume = function (vol) {
        if (self.player) {
            self.player.volume = vol;
        }
    };

    self.init(data);
};


function handleMediaUpdate(data) {
    // Don't update if the position is past the video length, but
    // make an exception when the video length is 0 seconds
    if (typeof PLAYER.videoLength === "number") {
        if (PLAYER.videoLength > 0 &&
            data.currentTime > PLAYER.videoLength) {
            return;
        }
    }
    var wait = data.currentTime < 0;
    // Media change
    if(data.id && data.id !== PLAYER.videoId) {
        if(data.currentTime < 0)
            data.currentTime = 0;
        PLAYER.load(data);
        PLAYER.play();
    }

    if (wait) {
        var tm = 1;
        /* Stupid hack -- In this thrilling episode of
           "the YouTube API developers should eat a boat", the
           HTML5 player apparently breaks if I play()-seek(0)-pause()
           quickly (as a "start buffering but don't play yet"
           mechanism)
        */
        if (PLAYER.type === "yt") {
            tm = 500;
        }
        setTimeout(function () {
            PLAYER.seek(0);
            PLAYER.pause();
        }, tm);
        return;
    }

    // Don't synch if leader or synch disabled
    if(CLIENT.leader || !USEROPTS.synch)
        return;

    // Handle pause/unpause
    if(data.paused) {
        PLAYER.isPaused(function (paused) {
            if (!paused) {
                PLAYER.seek(data.currentTime);
                PLAYER.pause();
            }
        });
    } else {
        PLAYER.isPaused(function (paused) {
            if(paused)
                PLAYER.play();
        });
    }

    // Handle time change
    PLAYER.getTime(function (seconds) {
        var time = data.currentTime;
        var diff = time - seconds || time;
        var acc = USEROPTS.sync_accuracy;
        // Dailymotion can't seek more accurately than to the nearest
        // 2 seconds.  It gets stuck looping portions of the video
        // at the default synch accuracy of 2.
        // I've found 5 works decently.
        if (PLAYER.type === "dm")
            acc = Math.max(acc, 5.0);

        if(diff > acc) {
            PLAYER.seek(time);
        } else if(diff < -acc) {
            // Don't synch all the way back, causes buffering problems
            // because for some dumb reason YouTube erases the buffer
            // when you seek backwards
            //
            // ADDENDUM 2013-10-24 Except for dailymotion because
            // their player is inaccurate
            if (PLAYER.type !== "dm")
                time += 1;
            PLAYER.seek(time);
        }
    });
}

var constructors = {
    "yt": YouTubePlayer,
    "vi": VIMEO_FLASH ? VimeoFlashPlayer : VimeoPlayer,
    "dm": DailymotionPlayer,
    "sc": SoundcloudPlayer,
    "li": LivestreamPlayer,
    "tw": TwitchTVPlayer,
    "jt": JustinTVPlayer,
    "us": UstreamPlayer,
    "rt": FlashPlayer,
    "jw": JWPlayer,
    "im": ImgurPlayer,
    "cu": CustomPlayer,
    "gd": GoogleDocsPlayer,
    "rv": RawVideoPlayer,
    "fl": FlashPlayer
};

function loadMediaPlayer(data) {
    if(data.type in constructors) {
        PLAYER = new constructors[data.type](data);
        PLAYER.type = data.type;
    }
}
