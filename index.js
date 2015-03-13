var fs = require('fs')
var path = require('path')
var mime = require('mime')
var merge = require('merge')
var EventEmitter = require('events').EventEmitter
var parseUrl = require('url').parse
var google = require('googleapis')
var Nightmare = require('nightmare')
var NightmareGoogle = require('nightmare-google-oauth2')

var youtube = google.youtube('v3')
var OAuth2Client = google.auth.OAuth2

var REDIRECT_URL = 'http://localhost:8488'
var CREDENTIALS_FILENAME = '.google-oauth2-credentials.json'

exports = module.exports = function (opts) {
  return new YoutubeVideo(opts)
}

exports.google = google
exports.youtube = youtube
exports.VERSION = require('./package.json').version

function YoutubeVideo(opts) {
  this._authenticated = false
  this.opts = merge({ saveTokens: true }, opts)
}

YoutubeVideo.prototype = Object.create(EventEmitter.prototype)

YoutubeVideo.prototype.auth =
YoutubeVideo.prototype.authenticate = function (clientId, clientSecret, tokens) {
  if (this._authenticated) { return }
  this.oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URL)

  var storePath = CREDENTIALS_FILENAME
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
  var video = fs.createReadStream(path)

  var options = merge({}, this.opts.video, {
    autoLevels: true,
    part: 'status,snippet',
    mediaType: mime.lookup(path)
  }, params)

  options.media = { body: video }
  options.auth = this.oauth

  return this._command('insert', options, callback)
}

YoutubeVideo.prototype.remove =
YoutubeVideo.prototype.delete = function (id, callback) {
  return this._command('delete', { id: id }, callback)
}

YoutubeVideo.prototype.list = function (options, callback) {
  return this._command('list', options, callback)
}

YoutubeVideo.prototype.update = function (options, callback) {
  return this._command('update', options, callback)
}

YoutubeVideo.prototype.getRating = function (id, callback) {
  return this._command('getRating', { id: id }, callback)
}

YoutubeVideo.prototype.rate = function (id, rating, callback) {
  return this._command('rate', { id: id, rating: rating }, callback)
}

YoutubeVideo.prototype._command = function (action, params, callback) {
  if (!this._authenticated) return missingAuthentication(callback)
  return youtube.videos[action](merge({ auth: this.oauth }, params), callback)
}

function getAccessToken(self, callback) {
  var scope = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload'
  ].join(' ')

  var params = {
    email: self.email || process.env.GOOGLE_LOGIN_EMAIL,
    password: self.password || process.env.GOOGLE_LOGIN_PASSWORD,
    clientId: self.oauth.clientId_,
    clientSecret: self.oauth.clientSecret_,
    scope: scope
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
  var filePath = path.join(process.cwd(), CREDENTIALS_FILENAME)

  fs.writeFile(
    filePath,
    JSON.stringify(tokens, null, 2)
  )
}

function missingAuthentication(callback) {
  callback(new Error('Authentication is required to do this operation'))
}
