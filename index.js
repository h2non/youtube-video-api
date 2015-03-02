var fs = require('fs')
var http = require('http')
var mime = require('mime')
var merge = require('merge')
var EventEmitter = require('events').EventEmitter
var progress = require('request-progress')
var parseUrl = require('url').parse
var google = require('googleapis')
var youtube = google.youtube('v3')
var OAuth2Client = google.auth.OAuth2

var PORT = 8488
var REDIRECT_URL = 'http://localhost:8488'

module.exports = function (opts) {
  return new YoutubeVideo(opts)
}

function YoutubeVideo(opts) {
  this.opts = opts || {}
  this.oauth = null
  this._authenticated = false
}

YoutubeVideo.prototype = Object.create(EventEmitter.prototype)

YoutubeVideo.prototype.authenticate = function (clientId, clientSecret, token) {
  if (this._authenticated) { return }
  this.oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URL)

  if (token) {
    return setCredentials(this, token)
  }

  getAccessToken(this, onAuthenticate.bind(this))

  function onAuthenticate(err, token) {
    if (err) this.emit('error', err)
    else setCredentials(this, token)
  }
}

YoutubeVideo.prototype.insert =
YoutubeVideo.prototype.upload = function (path, params, callback) {
  if (!this._authenticated) { missingAuthentication() }

  var video = fs.createReadStream(path)

  var options = merge({}, this.opts, {
    autoLevels: true,
    part: 'status,snippet',
    mediaType: mime.lookup(path)
  }, params)

  options.media = { body: video }
  options.auth = this.oauth

  var request = youtube.videos.insert(options, callback)

  return progress(request)
}

YoutubeVideo.prototype.delete = function (id, callback) {
  if (!this._authenticated) { missingAuthentication() }
  return youtube.videos.delete({ id: id, auth: this.oauth }, callback)
}

function getAccessToken(self, callback) {
  // generate consent page url
  var url = self.oauth.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload'
    ]
  })

  var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end()

    var query = parseUrl(req.url, true).query
    if (query.code) {
      callback(null, query.code)
      server.close()
    }
  }).listen(PORT, function (err) {
    if (err) return callback(err)
    self.emit('auth:authorize', url)
  })
}

function setCredentials(self, code) {
  self.oauth.getToken(code, function (err, tokens) {
    if (err) return self.emit('error', err)
    self.oauth.setCredentials(tokens)
    self._authenticated = true
    self.emit('auth:success', tokens)
  })
}

function missingAuthentication() {
  throw new Error('You must be authenticate before perform this operation')
}
