var fs = require('fs')
var path = require('path')
var mime = require('mime')
var merge = require('merge')
var EventEmitter = require('events').EventEmitter
var progress = require('request-progress')
var parseUrl = require('url').parse
var google = require('googleapis')
var Nightmare = require('nightmare')
var youtube = google.youtube('v3')
var OAuth2Client = google.auth.OAuth2
var NightmareGoogle = require('nightmare-google-oauth2')

var REDIRECT_URL = 'http://localhost:8488'
var CREDENTIALS_FILENAME = '.google-oauth2-credentials.json'

exports = module.exports = function (opts) {
  return new YoutubeVideo(opts)
}

function YoutubeVideo(opts) {
  this.oauth = null
  this._authenticated = false
  this.opts = merge({ saveTokens: true }, opts)
}

YoutubeVideo.prototype = Object.create(EventEmitter.prototype)

YoutubeVideo.prototype.authenticate = function (clientId, clientSecret, tokens) {
  if (this._authenticated) { return }
  this.oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URL)

  var storePath = storeFilePath()
  if (!tokens && fs.existsSync(storePath)) {
    tokens = JSON.parse(fs.readFileSync(storePath))
  }

  if (tokens && tokens.access_token) {
    return setCredentials(this, tokens)
  }

  getAccessToken(this, onAuthenticate.bind(this))

  function onAuthenticate(err, tokens) {
    if (err) this.emit('error', err)
    else setCredentials(this, tokens)
  }
}

YoutubeVideo.prototype.insert =
YoutubeVideo.prototype.upload = function (path, params, callback) {
  if (!this._authenticated) { missingAuthentication() }

  var video = fs.createReadStream(path)

  var options = merge({}, this.opts.video, {
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
  var params = {
    email: self.email || process.env.GOOGLE_LOGIN_EMAIL,
    password: self.password || process.env.GOOGLE_LOGIN_PASSWORD,
    clientId: self.oauth.clientId_,
    clientSecret: self.oauth.clientSecret_,
    scope: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload'
    ].join(' ')
  }

  new Nightmare()
    .use(NightmareGoogle.getToken(params, callback))
    .run(function (err) {
      if (err) callback(err)
    })
}

function setCredentials(self, tokens) {
  self.oauth.setCredentials(tokens)
  self._authenticated = true
  self.emit('auth:success', tokens)

  if (self.opts.saveTokens) {
    saveTokens(tokens)
  }
}

function saveTokens(tokens) {
  fs.writeFile(
    storeFilePath(),
    JSON.stringify(tokens, null, 2)
  )
}

function storeFilePath() {
  return path.join(process.cwd(), CREDENTIALS_FILENAME)
}

function missingAuthentication() {
  throw new Error('You must be authenticate before perform this operation')
}
