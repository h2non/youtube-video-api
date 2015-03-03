var expect = require('chai').expect
var youtube = require('../')

suite('Youtube videos', function () {
  var CLIENT_ID = process.env.NIGHTMARE_OAUTH2_CLIENT_ID
  var CLIENT_SECRET = process.env.NIGHTMARE_OAUTH2_CLIENT_SECRET
  var EMAIL = process.env.NIGHTMARE_OAUTH2_EMAIL
  var PASSWORD = process.env.NIGHTMARE_OAUTH2_PASSWORD

  var client = youtube({ email: EMAIL, password: PASSWORD })
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
    client.on('auth:success', function (tokens) {
      done()
    })

    client.on('auth:authorize', function (url) {
      console.log('Authorization required. Open:', url)
    })

    client.on('error', done)

    client.authenticate(CLIENT_ID, CLIENT_SECRET)
  })

  test('upload', function (done) {
    client.upload(video, options, function (err, body) {
      expect(body).to.be.an('object')
      videoId = body.id
      done()
    })
  })

  test('delete', function (done) {
    client.delete(videoId, done)
  })
})
