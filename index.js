const fs = require('fs')
const path = require('path')
const mime = require('mime')
const merge = require('merge')
const stream = require('stream')
const parseUrl = require('url').parse
const google = require('googleapis')
const Nightmare = require('nightmare')
const NightmareGoogle = require('nightmare-google-oauth2')
const version = require('./package.json').version

const youtube = google.youtube('v3')
const OAuth2Client = google.auth.OAuth2

const REDIRECT_URL = 'http://localhost:8488'
const CREDENTIALS_FILENAME = '.google-oauth2-credentials.json'

const SCOPE = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload'
].join(' ')

exports = module.exports = function (opts) {
  return new YoutubeVideo(opts)
}

exports.google = google
exports.youtube = youtube
exports.VERSION = version

function YoutubeVideo (opts) {
  this._authenticated = false
  this.opts = merge({ saveTokens: true }, opts)
}

YoutubeVideo.prototype.insert =
YoutubeVideo.prototype.upload = function (pathOrStream, params, callback) {
  var videoStream, mimeType;
  if (pathOrStream instanceof stream.Readable) {
    videoStream = pathOrStream  //pass mediaType in params
  } else {
    videoStream = fs.createReadStream(pathOrStream)
    mimeType = mime.lookup(pathOrStream)
  }
  const options = merge({}, this.opts.video, {
    autoLevels: true,
    part: 'status,snippet',
    mediaType: mimeType
  }, params)

  options.media = { body: videoStream }
  options.auth = this.oauth

  return this._command('insert', options, callback)
}

YoutubeVideo.prototype.remove =
YoutubeVideo.prototype.delete = function (id, callback) {
  return this._command('delete', { id: id }, callback)
}

YoutubeVideo.prototype.list = function (params, callback) {
  const options = merge({}, { part: 'status,snippet' }, this.opts.video, params)
  return this._command('list', options, callback)
}

YoutubeVideo.prototype.update = function (params, callback) {
  const options = merge({}, { part: 'status,snippet' }, this.opts.video, params)
  return this._command('update', options, callback)
}

YoutubeVideo.prototype.getRating = function (id, callback) {
  return this._command('getRating', { id: id }, callback)
}

YoutubeVideo.prototype.rate = function (id, rating, callback) {
  return this._command('rate', { id: id, rating: rating }, callback)
}

YoutubeVideo.prototype.thumbnails = function (id, media, callback) {
  const params = merge({ auth: this.oauth }, { videoId: id, media: media })
  return youtube.thumbnails.set(params, callback)
}

YoutubeVideo.prototype._command = function (action, params, callback) {
  if (!this._authenticated) return missingAuthentication(callback)
  const options = merge({ auth: this.oauth }, params)
  return youtube.videos[action](options, callback)
}

YoutubeVideo.prototype.auth =
YoutubeVideo.prototype.authenticate = function (clientId, clientSecret, tokens, cb) {
  cb = [].slice.call(arguments).filter(function (arg) { return typeof arg === 'function' }).shift() || noop
  if (this._authenticated) return cb(null, self.tokens)

  // Fetch variadic arguments
  clientId = typeof clientId === 'string' ? clientId : this.opts.clientId
  clientSecret = typeof clientSecret === 'string' ? clientSecret : this.opts.clientSecret
  tokens = tokens && typeof tokens === 'object' ? tokens : this.opts.tokens

  if (!clientId || !clientSecret) {
    throw new TypeError('Missing required params: clientId, clientSecret')
  }

  this.oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URL)
  oauthLazyHandshake.call(this, tokens, cb)
}

function oauthLazyHandshake (tokens, cb) {
  const file = this.opts.file || CREDENTIALS_FILENAME
  const fetchCredentials = setCredentials.call(this, cb)

  if (!tokens && fs.existsSync(file)) {
    tokens = JSON.parse(fs.readFileSync(file))
  }

  if (tokens && tokens.access_token) {
    return fetchCredentials(null, tokens)
  }

  getAccessToken.call(this, fetchCredentials)
}

function getAccessToken (callback) {
  const params = {
    email: this.opts.email || process.env.GOOGLE_LOGIN_EMAIL,
    password: this.opts.password || process.env.GOOGLE_LOGIN_PASSWORD,
    clientId: this.oauth.clientId_,
    clientSecret: this.oauth.clientSecret_,
    useAccount: this.opts.useAccount,
    scope: this.opts.scope || SCOPE
  }

  new Nightmare()
    .use(NightmareGoogle.getToken(params, callback))
    .run(function (err) {
      if (err) callback(err)
    })
}

function setCredentials (cb) {
  const self = this

  return function (err, tokens) {
    if (err || !tokens) {
      return cb(err || new Error('Cannot retrieve OAuth2 tokens'))
    }

    self.oauth.setCredentials(tokens)
    self._authenticated = true

    if (self.opts.saveTokens) {
      saveTokens(tokens, self.opts.file)
    }

    self.tokens = tokens
    cb(null, tokens)
  }
}

function saveTokens (tokens, file) {
  file = file || CREDENTIALS_FILENAME

  const filePath = file.indexOf('/') !== 0
    ? path.join(process.cwd(), file)
    : file

  fs.writeFileSync(
    filePath,
    JSON.stringify(tokens, null, 2)
  )
}

function missingAuthentication (cb) {
  cb(new Error('Authentication is required to do this operation'))
}

function noop () {}
