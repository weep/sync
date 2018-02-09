2018-01-07
==========

**Build changes:** When the `babel` dependency was first added to transpile ES6
code to ES5, an interactive prompt was added to the `postinstall` script before
transpilation, in case the user had made local modifications to the files in
`lib` which previously would have been detected as a git conflict when pulling.

It has now been sufficiently long that this is no longer needed, so I've removed
it.  As always, users wishing to make local modifications (or forks) should edit
the code in `src/` and run `npm run build-server` to regenerate `lib/`.

This commit also removes the bundled `www/js/player.js` file in favor of having
`postinstall` generate it from the sources in `player/`.

2017-12-24
==========

As of December 2017, Vid.me is no longer in service.  Accordingly, Vid.me
support in CyTube has been deprecated.

2017-11-27
==========

The Google Drive userscript has been updated once again. Violentmonkey is
now explicitly supported. Google login redirects are caught and handled.
See directly below on how to regenerate the user script again.

2017-11-15
==========

The Google Drive userscript has been updated due to breaking changes in
Greasemonkey 4.0.  Remember to generate the script by running:

    $ npm run generate-userscript "Your Site Name" http://your-site.example.com/r/*

2017-11-05
==========

The latest commit introduces a referrer check in the account page handlers.
This is added as a short-term mitigation for a recent report that account
management functions (such as deleting channels) can be executed without the
user's consent if placed in channel JS.

Longer term options are being considered, such as moving account management to a
separate subdomain to take advantage of cross-origin checks in browsers, and
requiring the user to re-enter their password to demonstrate intent.  As always,
I recommend admins take extreme caution when accepting channel JS.

2017-09-26
==========

**Breaking change:** the `nodemailer` dependency has been upgraded to version
4.x.  I also took this opportunity to make some modifications to the email
configuration and move it out of `config.yaml` to `conf/email.toml`.

To upgrade:

  * Run `npm upgrade` (or `rm -rf node_modules; npm install`)
  * Copy `conf/example/email.toml` to `conf/email.toml`
  * Edit `conf/email.toml` to your liking
  * Remove the `mail:` block from `config.yaml`

This feature only supports sending via SMTP for now.  If there is demand for
other transports, feel free to open an issue or submit a pull request.

2017-09-19
==========

The `/useragreement` default page has been removed.  Server administrators can
substitute their own terms of service page by editing `templates/footer.pug`

2017-09-19
==========

This commit removes an old kludge that redirected users to HTTPS (when enabled)
specifically for the account authorization pages (e.g., `/login`).  The code for
doing this was to work around limitations that no longer exist, and does not
represent current security best practices.

The recommended solution to ensure that users are logged in securely (assuming
you've configured support for HTTPS) is to use
[Strict-Transport-Security](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)
to direct browsers to access the HTTPS version of the website at all times.  You
can enable this by configuring a reverse proxy (e.g. nginx) in front of CyTube
to intercept HTTP traffic and redirect it to HTTPS, and add the
`Strict-Transport-Security` header when returning the response from CyTube.

2017-07-22
==========

Support for the old version of Vimeo's OAuth API (the `vimeo-oauth`
configuration block) has been dropped.  It's unlikely anyone was using this,
since you haven't been able to register new API keys for it in years (it was
superseded by a newer OAuth API, which CyTube does not support), and in fact I
lost my credentials for this API and no longer have a way to test it.

Vimeo videos can still be added -- the metadata will be queried from the
anonymous API which has been the default since the beginning.

2017-07-17
==========

The `stats` database table and associated ACP subpage have been removed in favor
of integration with [Prometheus](https://prometheus.io/).  You can enable
Prometheus reporting by copying `conf/example/prometheus.toml` to
`conf/prometheus.toml` and editing it to your liking.  I recommend integrating
Prometheus with [Grafana](https://grafana.com/) for dashboarding needs.

The particular metrics that were saved in the `stats` table are reported by the
following Prometheus metrics:

  * Channel count: `cytube_channels_num_active` gauge.
  * User count: `cytube_sockets_num_connected` gauge (labeled by socket.io
    transport).
  * CPU/Memory: default metrics emitted by the
    [`prom-client`](https://github.com/siimon/prom-client) module.

More Prometheus metrics will be added in the future to make CyTube easier to
monitor :)

2017-07-15
==========

The latest commit upgrades `socket.io` to version 2.0, a major version change
from 1.4.  This release improves performance by switching to `uws` for the
websocket transport, and fixes several bugs; you can read about it
[here](https://github.com/socketio/socket.io/releases/tag/2.0.0).

For browser clients, the upgrade should basically just work with no
intervention.  For node.js clients, all that is needed is to upgrade
`socket.io-client` to 2.0.  For other clients, work required may vary depending
on whether the implementation has compatibility problems with 2.0.

2017-06-20
==========

The latest commit drops support for node.js versions below 6 (the [current
LTS](https://github.com/nodejs/LTS#lts-schedule1)).  This is to allow the babel
preset to avoid generating inefficient code to polyfill ES2015+ features that
are now implemented in the node.js core.

New versions of node.js can be downloaded from the [node.js
website](https://nodejs.org/en/download/), if they are not already available in
your distribution's package manager.

2017-03-20
==========

Polls are now more strictly validated, including the number of options.  The
default limit is 50 options, which you can configure via `poll.max-options`.

2017-03-11
==========

Commit f8183bea1b37154d79db741ac2845adf282e7514 modifes the schema of the
`users` table to include a new column (`name_dedupe`) which has a `UNIQUE`
constraint.  This column is populated with a modified version of the user's name
to prevent the registration of usernames which are bitwise distinct but visually
similar.  'l', 'L', and '1' are all mapped to '1'; 'o', 'O', and '0' are all
mapped to '0'; '\_' and '-' are mapped to '\_'.  On first startup after
upgrading, the new column will be added and populated.

This replaces the earlier solution which was put in place to mitigate PR#489 but
was overly-restrictive since it wildcarded these characters against *any*
character, not just characters in the same group.

2017-03-03
==========

The dependency on `sanitize-html`, which previously pointed to a fork, has now
been switched back to the upstream module.  XSS filtering has been turned off
for the chat filter replacement itself (since this provides no additional
security), and is now only run on the final chat message after filtering.
Certain chat filters and MOTDs which relied on syntactically incorrect HTML,
such as unclosed tags, may have different behavior now, since `sanitize-html`
fixes these.

2016-11-02
==========

After upgrading the dependency on `yamljs`, you may see this error if you didn't
notice and correct a typo in the config.yaml template:

    Error loading config file config.yaml:
    { [Error: Unexpected characters near ",".]
      message: 'Unexpected characters near ",".',
      parsedLine: 88,
      snippet: 'title: \'CyTube\',' }

The fix is to edit config.yaml and remove the trailing comma for the `title:`
property under `html-template`.  If there are other syntax errors that the old
version didn't detect, you will need to correct those as well.

Longer term, I am looking to move away from using `yamljs` to parse
configuration because it's a little buggy and the current configuration system
is confusing.

2016-10-20
==========

Google Drive changed the URL schema for retrieving video metadata, which broke
CyTube's Google Drive support, even with the userscript.  I have updated the
userscript source with the new URL, so server administrators will have to
regenerate the userscript for their site and users will be prompted to install
the newer version.

Additionally, fixing Drive lookups required an update to the `mediaquery`
module, so you will have to do an `npm install` to pull that fix in.

2016-08-23
==========

A few weeks ago, the previous Google Drive player stopped working.  This is
nothing new; Google Drive has consistently broken a few times a year ever since
support for it was added.  However, it's becoming increasingly difficult and
complicated to provide good support for Google Drive, so I've made the decision
to phase out the native player and require a userscript for it, in order to
bypass CORS and allow each browser to request the video stream itself.

See [the updated documentation](docs/gdrive-userscript-serveradmins.md) for
details on how to enable this for your users.

2016-04-27
==========

A new dependency has been added on `cytube-common`, a module that will hold
common code shared between the current version of CyTube and the upcoming work
around splitting it into multiple services.  You will need to be sure to run
`npm install` after pulling in this change to pull in the new dependency.

2016-01-06
==========

This release updates socket.io to version 1.4.0.  The updates to socket.io
include a few security-related fixes, so please be sure to run `npm install`
to ensure the updated version is installed before restarting your CyTube server.

  * https://nodesecurity.io/advisories/67
  * https://github.com/socketio/engine.io/commit/391ce0dc8b88a6609d88db83ea064040a05ab803

2015-10-25
==========

In order to support future clustering support, the legacy `/sioconfig`
endpoint is being deprecated.  Instead, you should make a request to
`/socketconfig/<channel name>.json`.  See [the
documentation](docs/socketconfig.md) for more information.

2015-10-04
==========

  * The channel data storage system has been refactored a bit.  For
    compatibility, the default remains to store JSON objects for each channel in
    the `chandump` folder, however there is now also the option of storing
    channel data in the database.  You can take advantage of this by setting
    `channel-storage: type: 'database'` in your `config.yaml`.
    - In order to migrate existing channel data from the `chandump` files to the
      database, run `node lib/channel-storage/migrate.js`.
  * The database storage method uses foreign keys to associate the channel data
    with the corresponding row in the `channels` table.  This requires that the
    tables be stored using the InnoDB engine rather than MyISAM.  If your CyTube
    tables defaulted to MyISAM, you can fix them by running

    ```sql
    ALTER TABLE `channels` ENGINE = InnoDB;
    ```

2015-09-21
==========

  * CyTube is now transpiled with [babel] to allow the use of ES6/ES2015
    features.  All source files have been moved from `lib` to `src`.
  * Running `npm install` or `npm run postinstall` will prompt you to
    build from `src` to `lib`.
  * Running `npm run build-server` will run the build script without any
    prompts.
  * After updating with `git pull`, you should run `npm install` or `npm run
    build-server` in order to rebuild after the changes.

[babel]: https://babeljs.io/

2015-07-25
==========

  * CyTube now supports subtitles for Google Drive videos.  In order to take
    advantage of this, you must upgrade mediaquery by running `npm install
    cytube/mediaquery`.  Subtitles are cached in the google-drive-subtitles
    folder.

2015-07-07
==========

  * CyTube and CyTube/mediaquery have both been updated to use
    calzoneman/status-message-polyfill to polyfill res.statusMessage on older
    versions of node (e.g., v0.10).  After pulling, run `npm install` to update
    this dependency.  This fixes an issue where HTTP status messages from
    mediaquery were reported as `undefined`, and removes the need for manually
    looking up status messages in `lib/ffmpeg.js`.

2015-07-06
==========

  * As part of the video player rewrite, Google Drive and Google+ metadata
    lookups are now offloaded to CyTube/mediaquery.  After pulling the new
    changes, run `npm install` or `npm update` to update the mediaquery
    dependency.

  * `www/js/player.js` is now built from the CoffeeScript source files in the
    `player/` directory.  Instead of modifying it directly, modify the relevant
    player implementations in `player/` and run `npm run build-player` (or `node
    build-player.js`) to generate `www/js/player.js`.

  * Also as part of the video player rewrite, the schema for custom embeds
    changed so any custom embeds stored in the `channel_libraries` table need to
    be updated.  The automatic upgrade script will convert any custom embeds
    that are parseable (i.e., not truncated by the width of the `id` field using
    the old format) and will delete the rest (you may see a lot of WARNING:
    unable to convert xxx messages-- this is normal).  Custom embeds in channel
    playlists in the chandumps will be converted when the channel is loaded.
