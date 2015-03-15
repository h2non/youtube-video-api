var fs = require('fs')
var path = require('path')
var mime = require('mime')
var merge = require('merge')
var parseUrl = require('url').parse
var google = require('googleapis')
var Nightmare = require('nightmare')
var NightmareGoogle = require('nightmare-google-oauth2')
var version = require('./package.json').version

var youtube = google.youtube('v3')
var OAuth2Client = google.auth.OAuth2

var REDIRECT_URL = 'http://localhost:8488'
var CREDENTIALS_FILENAME = '.google-oauth2-credentials.json'

exports = module.exports = function (opts) {
  return new YoutubeVideo(opts)
}

exports.google = google
exports.youtube = youtube
exports.VERSION = version

function YoutubeVideo(opts) {
  this._authenticated = false
  this.opts = merge({ saveTokens: true }, opts)
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

YoutubeVideo.prototype.list = function (params, callback) {
  var options = merge({}, { part: 'status,snippet', chart: 'mostPopular' }, this.opts.video, params)
  return this._command('list', options, callback)
}

YoutubeVideo.prototype.update = function (params, callback) {
  var options = merge({}, { part: 'status,snippet' }, this.opts.video, params)
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
  var options = merge({ auth: this.oauth }, params)
  return youtube.videos[action](options, callback)
}

YoutubeVideo.prototype.auth =
YoutubeVideo.prototype.authenticate = function (clientId, clientSecret, tokens, cb) {
  if (this._authenticated) { return }

  var args = Array.prototype.slice.call(arguments)
  clientId = typeof clientId === 'string' ? clientId : this.opts.clientId
  clientSecret = typeof clientSecret === 'string' ? clientSecret : this.opts.clientSecret
  tokens = typeof tokens === 'object' ? tokens : this.opts.tokens

  cb = args.filter(function (arg) {
    return typeof arg === 'function'
  }).shift()

  if (!clientId || !clientSecret) {
    throw new TypeError('Missing required params: clientId and clientSecret')
  }

  this.oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URL)
  oauthLazyHandshake.call(this, tokens, cb)
}

function oauthLazyHandshake(tokens, cb) {
  if (!tokens && fs.existsSync(CREDENTIALS_FILENAME)) {
    tokens = JSON.parse(fs.readFileSync(CREDENTIALS_FILENAME))
  }
  if (tokens && tokens.access_token) {
    return setCredentials.call(this, tokens, cb)
  }

  getAccessToken.call(this, function onAuthenticate(err, tokens) {
    if (err) return cb(err)

    setCredentials.call(this, tokens, cb)
  }.bind(this))
}

function getAccessToken(callback) {
  var scope = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload'
  ].join(' ')

  var params = {
    email: this.email || process.env.GOOGLE_LOGIN_EMAIL,
    password: this.password || process.env.GOOGLE_LOGIN_PASSWORD,
    clientId: this.oauth.clientId_,
    clientSecret: this.oauth.clientSecret_,
    scope: scope
  }

  new Nightmare()
    .use(NightmareGoogle.getToken(params, callback))
    .run(function (err) {
      if (err) callback(err)
    })
}

function setCredentials(tokens, cb) {
  this.oauth.setCredentials(tokens)
  this._authenticated = true

  if (this.opts.saveTokens) {
    saveTokens(tokens)
  }

  cb(null, tokens)
}

function saveTokens(tokens) {
  var filePath = path.join(process.cwd(), CREDENTIALS_FILENAME)

  fs.writeFileSync(
    filePath,
    JSON.stringify(tokens, null, 2)
  )
}

function missingAuthentication(callback) {
  callback(new Error('Authentication is required to do this operation'))
}
