var expect = require('chai').expect
var exec = require('child_process').exec

suite('command-line', function () {
  var videoId = null
  var cmd = 'bin/youtube-video-api '

  if (process.env.CI) { return }

  test('upload', function (done) {
    var args = [
      'upload',
      '--video test/fixtures/video.mp4',
      '--file test/fixtures/config.json'
    ]

    exec(cmd + args.join(' '), function (err, stdout, stderr) {
      var video = JSON.parse(stdout)
      expect(video.id).to.not.empty
      expect(video.snippet).to.not.empty
      videoId = video.id
      done(err)
    })
  })

  test('update', function (done) {
    var args = [
      'update',
      '--id ' + videoId,
      '--file test/fixtures/config.json'
    ]

    exec(cmd + args.join(' '), function (err, stdout, stderr) {
      done()
    })
  })

  test('rate', function (done) {
    var args = [
      'rate',
      '--id ' + videoId,
      '--rating like'
    ]

    exec(cmd + args.join(' '), function (err, stdout, stderr) {
      done()
    })
  })

  test('list', function (done) {
    var args = [
      'list',
      '-d'
    ]

    exec(cmd + args.join(' '), function (err, stdout, stderr) {
      var data = JSON.parse(stdout)
      expect(data).to.be.an('object')
      done(err)
    })
  })

  test('delete', function (done) {
    var args = [
      'delete',
      '--id ' + videoId
    ]

    exec(cmd + args.join(' '), function (err, stdout, stderr) {
      done(err)
    })
  })
})
