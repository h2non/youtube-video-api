# youtube-video-api [![Build Status](https://api.travis-ci.org/h2non/youtube-video-api.svg?branch=master)][travis] [![NPM version](https://img.shields.io/npm/v/youtube-video-api.svg)][npm] ![Downloads](https://img.shields.io/npm/dm/youtube-video-api.svg)

Straightforward **node.js/io.js programmatic and command-line interface to** easily **upload, list, update, rate, thumbnail and delete videos** from **YouTube** using [OAuth2](https://developers.google.com/accounts/docs/OAuth2) and [Google API v3](https://developers.google.com/youtube/v3/docs/videos).

It was designed to provide a reliable server-to-server automation solution, with additional support for transparent Google API OAuth2 token negotiation retrieval using [Nightmare](http://nightmarejs.org) + [Electron](https://github.com/atom/electron) in case that you don't have a valid OAuth2 token or simply you want to use a fresh token every time automatically

**Rationale note**: I created this package to solve my personal frustration after using further solutions to interact with Youtube Videos API in a realiable way. I wish it can dissipate your frustration as well.

## Installation

```bash
npm install youtube-video-api --save
```

For command-line usage install it as global package:
```bash
npm install -g youtube-video-api
```

## Configuration

If you already have a valid OAuth2 token, you can create in your working directory a file called `.google-oauth2-credentials.json` to store it.

This will avoid you to define your Google account email and password to automatically obtain a valid OAuth2 token using [PhantomJS](http://phantomjs.org), however if you want to get a fresh OAuth2 token automatically on-the-fly read [this](#google-oauth)

Example file:
```json
{
  "access_token": "xx99.xxxxxxxxx-xxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_type": "Bearer",
  "refresh_token": "1/xxxxxxxxxxxxxxxxxx_xxxxx-xxxxxxxxxx_xxxxxxxxx_xxxxxxxxx",
  "expiry_date": 1425349408683
}
```

Only `access_token` and `refresh_token` fields are mandatory.
 
## Command-line interface

```bash
youtube-video-api --help
```

```bash
Usage: bin/youtube-video-api <command> [options]

Commands:
  upload    Upload a video to Youtube                                           
  delete    Remove a video from Youtube                                         
  update    Update a video from Youtube                                         
  rate      Rate a video from Youtube                                           
  list      List videos from Youtube                                            

Options:
  -h, --help      Show help                                                     
  --version       Show version number                                           
  --file, -f      path to video config JSON file                                
  --client, -c    Google API Client ID. You can pass it as env variable:
                  GOOGLE_API_CLIENT_ID
                  [required]  [default: ""]
  --secret, -s    Google API Client Secret. You can pass it as env variable:
                  GOOGLE_API_CLIENT_SECRET
                               [required]  [default: ""]
  --token, -t     Google API OAuth2 token. You can pass it as env variable:
                  GOOGLE_API_TOKEN
  --refresh, -r   Google API OAuth2 refresh token. You can pass it as env
                  variable: GOOGLE_API_REFRESH_TOKEN
  --email, -e     Google account email, used for automatic OAuth2. You can pass
                  it as env variable: GOOGLE_LOGIN_EMAIL
  --password, -p  Google account password, used for automatic OAuth2. You can
                  pass it as env variable: GOOGLE_LOGIN_PASSWORD
  --account, -a   Google default email account to use in case of multiple 
                  associated Google accounts
  --id, -i        Video idenfitier
  --video, -v     File path to video
  --rating, -x    Video rating score
  --next, -n      Return the next page token results for list command
  --prev, -p      Return the previous page token results for list command
  --credentials, -w  custom path to JSON file with token credentials
  --debug, -d     Enable debug mode [default: false]

Examples:
  youtube-video-api upload -c clientId -s clientSecret -f config.json -v video.mp4
  youtube-video-api remove -c clientId -s clientSecret -i 23XsFi23LKD
  youtube-video-api update -c clientId -s clientSecret -c config.json
  youtube-video-api rate -c clientId -s clientSecret -i 23XsFi23LKD -v 5
  youtube-video-api list -c clientId -s clientSecret --next
```

## API

```js
var Youtube = require('youtube-video-api')
```

```js
var youtube = Youtube({ 
  video: {
    part: 'status,snippet' 
  }
})

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

youtube.authenticate('my-client-id', 'my-client-secret', function (err, tokens) {
  if (err) return console.error('Cannot authenticate:', err)
  uploadVideo()
})

function uploadVideo() {
  youtube.upload('path/to/video.mp4', params, function (err, video) {
    // 'path/to/video.mp4' can be replaced with readable stream. 
    // When passing stream adding mediaType to params is advised.
    if (err) {
      return console.error('Cannot upload video:', err)
    }

    console.log('Video was uploaded with ID:', video.id)
  
    // this is just a test! delete it
    youtube.delete(video.id, function (err) {
      if (!err) console.log('Video was deleted')
    })
  })
}
```

### youtube([ options ])

Youtube Videos API constructor. Returns an evented API based on `EventEmitter` subscribers

Supported options:

- **saveTokens** `boolean` - Save OAuth tokens in `.google-oauth2-credentials.json`. Default `true`
- **video** `object` - Default video options to send to the API. Documentation [here](https://developers.google.com/youtube/v3/docs/videos)
- **email** `string` - Optional. Google Account email login required obtain a valid OAuth2 token. You can pass it as env variable `GOOGLE_LOGIN_EMAIL`
- **password** `string` - Optional. Google Account password login required to obtain a valid OAuth2 token. You can pass it as env variable `GOOGLE_LOGIN_PASSWORD`
- **clientId** `string` - Optional. Google API OAuth Client ID
- **clientSecret** `string` - Optional. Google API OAuth Client Secret
- **tokens** `object` - Optional. Google API OAuth Client Tokens. Object must contains the following keys: `access_token` and `refresh_token`
- **useAccount** `string` - In case of multiple associated Google accounts, define the email of the desired account to use
- **file** `string` - Credentials JSON file path. Default to `.google-oauth2-credentials.json`
- **scope** `string` - Google API scope. Default to `https://www.googleapis.com/auth/youtube.upload`

#### youtube#authenticate([ clientId, clientSecret [, tokens ] ], cb)
Alias: `auth`

Authorize the client to perform read/write API operations. 
You **must call this method** on each new Youtube client before interact with the API.

This function is variadic (it allow multiple number of arguments)

If the file `google-oauth2-credentials.json` already exists with valid OAuth2 tokens, 
you can simply call this method just with a callback 
```js
youtube.auth(function (err, tokens) {
  if (err) return console.error('Cannot auth:', err)

  console.log('Auth tokens:', tokens)
})
```

#### youtube#upload(video, params [, callback ])
Alias: `insert`

Upload a new video with custom metadata. `video` argument can be the path to the video file or a readable stream of the video. When passing stream adding mediaType to params is advised.  
You can see all the allowed params [here](https://developers.google.com/youtube/v3/docs/videos/insert)

#### youtube#delete(id [, callback ])
Alias: `remove`

Delete a video, passing its ID. See endpoint [documentation](https://developers.google.com/youtube/v3/docs/videos/delete)

#### youtube#list(options, callback)

Returns a list of videos that match the API request parameters. 

#### youtube#update(options, callback)

Updates a video's metadata. See endpoint [documentation](https://developers.google.com/youtube/v3/docs/videos/update)

#### youtube#rate(id, rating, callback)

Add a like or dislike rating to a video or remove a rating from a video. See endpoint [documentation](https://developers.google.com/youtube/v3/docs/videos/rate)

#### youtube#getRating(id, callback)

Retrieves the ratings that the authorized user gave to a list of specified videos. 
See endpoint [documentation](https://developers.google.com/youtube/v3/docs/videos/getRating)

#### youtube#thumbnails(id, media, callback)

Uploads a custom video thumbnail to YouTube and set it for the given video ID.
See endpoint [documentation](https://developers.google.com/youtube/v3/docs/thumbnails/set)

```js
youtube.thumbnails(videoId, { 
    mimeType: 'image/jpg', 
    body: fs.createReadStream('image.jpg') 
  }, function (err) {
    if (err) console.error('Cannot define the thumbnail')
  })
```

### youtube.google

Expose the [node.js Google APIs](https://github.com/google/google-api-nodejs-client) module

### youtube.youtube

Expose the [node.js Google APIs](https://github.com/google/google-api-nodejs-client) YouTube API constructor

### youtube.VERSION

Expose the package current semantic version 

## Google OAuth

### Automatically obtain a valid OAuth2 token

Be sure you have a project and a Web Application credentials with a Client ID and Client Secret 
from the [Google API Console][console] > `API & Auth` > `Credentials`

Then you must add the following URI as allowed redirects (without final slash):
```
http://localhost:8488
```

Then you should see something like:

<img src="http://oi59.tinypic.com/2w3udmd.jpg" />

Example getting a valid OAuth token on-the-fly:
```js
var youtube = Youtube({ 
  video: {
    part: 'status,snippet'
  },
  email: 'john@gmail.com',
  password: 'svp3r_p@s$p0rd'
})

youtube.on('auth:success', function (err) {
  if (!err) {
    youtube.upload('path/to/video.mp4', {}, function (err, video) {
      if (!err) console.log('Video was uploaded:', video.id)
    })
  }
})

youtube.authenticate('my-client-id', 'my-client-secret')
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio

[console]: https://code.google.com/apis/console/
[travis]: https://travis-ci.org/h2non/youtube-video-api
[npm]: http://npmjs.org/package/youtube-video-api
