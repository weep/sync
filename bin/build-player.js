#!/usr/bin/env node

var coffee = require('coffeescript');
var fs = require('fs');
var path = require('path');

var order = [
    'base.coffee',
    'vimeo.coffee',
    'youtube.coffee',
    'dailymotion.coffee',
    'videojs.coffee',
    'playerjs.coffee',
    'streamable.coffee',
    'gdrive-player.coffee',
    'raw-file.coffee',
    'soundcloud.coffee',
    'embed.coffee',
    'twitch.coffee',
    'livestream.com.coffee',
    'custom-embed.coffee',
    'rtmp.coffee',
    'smashcast.coffee',
    'ustream.coffee',
    'imgur.coffee',
    'gdrive-youtube.coffee',
    'hls.coffee',
    'update.coffee'
];

var buffer = '';
order.forEach(function (file) {
    buffer += fs.readFileSync(path.join('player', file)) + '\n';
});

fs.writeFileSync(path.join('www', 'js', 'player.js'), coffee.compile(buffer));
