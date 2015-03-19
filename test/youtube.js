var fs = require('fs')
var expect = require('chai').expect
var youtube = require('../')

suite('Youtube videos', function () {
  test('export', function () {
    expect(youtube).to.be.a('function')
  })

  if (process.env.CI) { return }

  var CLIENT_ID = process.env.NIGHTMARE_OAUTH2_CLIENT_ID
  var CLIENT_SECRET = process.env.NIGHTMARE_OAUTH2_CLIENT_SECRET
  var EMAIL = process.env.NIGHTMARE_OAUTH2_EMAIL
  var PASSWORD = process.env.NIGHTMARE_OAUTH2_PASSWORD

  var client = null
  var videoId = null

  var video = __dirname + '/fixtures/video.mp4'
  var options = {
    resource: {
      snippet: {
        title: 'test video',
        description: 'This is a test video uploaded via the YouTube API'
      },
      status: {
        privacyStatus: 'private'
      }
    }
  }

  test('authenticate', function (done) {
    client = youtube({ email: EMAIL, password: PASSWORD })
    client.authenticate(CLIENT_ID, CLIENT_SECRET, function (err) {
      done(err)
    })
  })

  test('upload', function (done) {
    client.upload(video, options, function (err, body) {
      expect(body).to.be.an('object')
      videoId = body.id
      done()
    })
  })

  test('update', function (done) {
    options.resource.snippet.description = 'Hello World'
    client.update(options, function (err, body) {
      // video cannot be updated until it has been
      // processed, so we need to wait at least 1 minute
      done()
    })
  })

  test('list', function (done) {
    client.list({ maxResults: 10 }, function (err, data) {
      expect(data).to.be.an('object')
      done(err)
    })
  })

  test('rate', function (done) {
    client.rate(videoId, 'like', function (err) {
      done()
    })
  })

  test('thumbnails', function (done) {
    var media = { mimeType: 'image/png', body: fs.createReadStream('./test/fixtures/thumbnail.png') }
    client.thumbnails(videoId, media, function (err) {
      done()
    })
  })

  test('getRating', function (done) {
    client.getRating(videoId, function (err, data) {
      expect(data).to.be.an('object')
      expect(data.items[0].rating).to.be.equal('none')
      done(err)
    })
  })

  test('delete', function (done) {
    client.delete(videoId, done)
  })
})
