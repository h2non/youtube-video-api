# youtube-video-api [![Build Status](https://travis-ci.org/h2non/youtube-video-api.svg?branch=master)][travis] [![Dependency Status](https://gemnasium.com/h2non/youtube-video-api.png)][gemnasium] [![NPM version](https://badge.fury.io/js/youtube-video-api.png)][npm]

Simple node.js/io.js programmatic interface to easily upload and delete videos from YouTube using its API v3

It uses OAuth2 to authorize the client to upload videos, so that means you need to authorize the client from a web browser.
You must create a new Web client APi credencials from the [Google API console](https://code.google.com/apis/console) 
and add `http://localhost:8488` as redirect URL

**Note**: this is a rudimentary beta implementation, don't use it for serious stuff yet

## Installation

```bash
$ npm install youtube-video-api --save
```

## Usage

```js
var Youtube = require('youtube-video-api')
```

```js
var youtube = Youtube({ part: 'status,snippet' })

youtube.on('auth:authorize', function (url) {
  console.log('Authorization required. Please open the URL:', url)
})

youtube.on('auth:success', uploadVideo)

youtube.authenticate('my-client-id', 'my-client-secret')

function uploadVideo() {
  var params = {
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

  youtube.upload('path/to/video.mp4', params, function (err, body, res) {
    if (err) return console.error('Cannot upload video:', err)

    console.log('Video was uploaded successfully with ID:', body.id)
  })
  .on('progress', function (percent) {
    console.log('% uploaded:', percent)
  })
}

```
 
## API

### youtube([ options ])

Youtube Videos API constructor. Returns an evented API based on `EventEmitter` subscribers

#### youtube#upload(video [, callback ])
Alias: `insert`

Upload a new video with custom metadata

You can see all the allowed params [here](https://developers.google.com/youtube/v3/docs/videos/insert)

#### youtube#delete(id [, callback ])

Delete a video, passing its ID as `string`

#### youtube#authenticate(clientId, clientSecret [, token ])

Authorize the client to perform read/write API operations. You **must call this method** on each new Youtube client 

#### youtube#on(event, fn)

Dispached events:

- **error** - `error` - Fired when some error happend
- **auth:success** - `token` - Fired when the client was authorized successfully
- **auth:authorize** - `url` - Fired with the URL to provide explicit permissing to the OAuth2 client

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio

[travis]: https://travis-ci.org/h2non/youtube-video-api
[gemnasium]: https://gemnasium.com/h2non/youtube-video-api
[npm]: http://npmjs.org/package/youtube-video-api
[grunt]: http://gruntjs.com
