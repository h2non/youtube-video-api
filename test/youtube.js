var expect = require('chai').expect
var youtube = require('../')

suite('Youtube videos', function () {
  var CLIENT_ID = process.env.GOOGLE_API_CLIENT_ID
  var CLIENT_SECRET = process.env.GOOGLE_API_CLIENT_SECRET

  var client = youtube()
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
      console.log(tokens)
      done()
    })

    client.on('auth:authorize', function (url) {
      console.log('Authorization required. Open:', url)
      require('open')(url)
    })

    client.on('error', done)

    client.authenticate(CLIENT_ID, CLIENT_SECRET)
  })

  test('upload', function (done) {
    client.upload(video, options, function (err, body) {
      console.log(body)
      videoId = body.id
    })
      .on('error', done)
      .on('response', function (res) {
        expect(res.statusCode).to.be.equal(200)
        done()
      })
  })

  test('delete', function (done) {
    client.delete(videoId)
      .on('error', done)
      .on('response', function (res) {
        expect(res.statusCode).to.be.equal(204)
        done()
      })
  })
})
