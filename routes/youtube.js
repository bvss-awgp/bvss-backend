var express = require('express');
var router = express.Router();
var https = require('https');

/**
 * GET /youtube/videos
 * Fetches the latest videos from the YouTube channel
 */
router.get('/videos', async function (req, res) {
  try {
    var apiKey = process.env.YOUTUBE_API_KEY;
    var channelId = process.env.YOUTUBE_CHANNEL_ID;
    var maxResults = parseInt(req.query.maxResults) || 10;

    if (!apiKey) {
      return res.status(500).json({ 
        message: 'YouTube API key is not configured.',
        videos: [] 
      });
    }

    if (!channelId) {
      return res.status(500).json({ 
        message: 'YouTube Channel ID is not configured.',
        videos: [] 
      });
    }

    // First, get the uploads playlist ID from the channel
    var channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    
    var channelData = await fetchData(channelUrl);
    
    if (!channelData || !channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ 
        message: 'Channel not found.',
        videos: [] 
      });
    }

    var uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    if (!uploadsPlaylistId) {
      return res.status(404).json({ 
        message: 'Uploads playlist not found.',
        videos: [] 
      });
    }

    // Get videos from the uploads playlist
    var videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&order=date&key=${apiKey}`;
    
    var videosData = await fetchData(videosUrl);

    if (!videosData || !videosData.items || videosData.items.length === 0) {
      return res.json({ 
        message: 'No videos found.',
        videos: [] 
      });
    }

    // Format the videos data
    var formattedVideos = videosData.items.map(function (item) {
      var snippet = item.snippet;
      var videoId = snippet.resourceId.videoId;
      
      return {
        videoId: videoId,
        title: snippet.title,
        description: snippet.description || '',
        thumbnail: snippet.thumbnails.high ? snippet.thumbnails.high.url : snippet.thumbnails.default.url,
        publishedAt: snippet.publishedAt,
        youtube: `https://www.youtube.com/watch?v=${videoId}`,
        // Extract author/speaker from description if available, otherwise use channel title
        author: snippet.videoOwnerChannelTitle || snippet.channelTitle || '',
      };
    });

    return res.json({
      videos: formattedVideos,
      message: 'Videos fetched successfully.',
    });
  } catch (error) {
    console.error('Fetch YouTube videos error:', error);
    return res.status(500).json({ 
      message: 'Unable to fetch videos from YouTube.',
      videos: [],
      error: error.message 
    });
  }
});

/**
 * Helper function to fetch data from a URL
 */
function fetchData(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      var data = '';

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        try {
          var parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'YouTube API error'));
          } else {
            resolve(parsed);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', function (error) {
      reject(error);
    });
  });
}

module.exports = router;

