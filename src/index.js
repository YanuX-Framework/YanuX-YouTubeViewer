import css from './style.scss';

import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
library.add(fas, far, fab);
dom.watch();

import YouTubePlayer from 'youtube-player';

function extractYouTubeVideoIdFromUrl(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[7].length == 11) {
        return match[7];
    } else {
        alert("Could not extract an YouTube video ID.");
    }
}

const player = YouTubePlayer('player', { width: 1280, height: 1080 });
document.getElementById('youtube-viewer-form').addEventListener('submit', function (e) {
    const videoUrl = document.getElementById('youtube-video-url').value;
    const videoId = extractYouTubeVideoIdFromUrl(videoUrl)
    player.loadVideoById(videoId);
    player.playVideo();
    e.preventDefault();
});

