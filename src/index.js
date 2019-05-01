import css from './style.scss';

import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
//import { far } from '@fortawesome/free-regular-svg-icons';
//import { fab } from '@fortawesome/free-brands-svg-icons';
library.add(fas/*, far, fab*/);
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

//TODO: Save the state of the player into an object and use it for almost everything so that it is easier to port the app to the YanuX Framework.
const player = YouTubePlayer('player', { width: 1920, height: 1080, playerVars: { controls: 0 }});
const seekBar = document.getElementById('seekBar');
seekBar.value = 0;
player.on('stateChange', e => {
    console.log(e.data);
    let timer;
    if (e.data === 1) {
        const updateSeekBar = () => {
            player.getCurrentTime().then(currTime => {
                console.log("Current Time:", currTime);
                seekBar.value = currTime;
            });
        };
        seekBar.onchange = function (e) {
            console.log('seekBar change:', this.value);
            timer = setInterval(updateSeekBar, 1000);
            player.seekTo(this.value, true).then(() => player.playVideo());
        }
        seekBar.onmousedown = function (e) {
            console.log('seekBar onmousedown:', this.value);
            clearInterval(timer);
            player.seekTo(this.value, false);
        }
        player.getDuration().then(duration => {
            console.log("Duration:", duration);
            seekBar.max = duration;
        });
        timer = setInterval(updateSeekBar, 1000);
    } else {
        clearInterval(timer);
    }
});

const viewerForm = document.getElementById('viewer-form')
viewerForm.onsubmit = e => {
    const videoUrl = document.getElementById('video-url').value;
    const videoId = extractYouTubeVideoIdFromUrl(videoUrl)
    player.cueVideoById(videoId);
    e.preventDefault();
};

const playButton = document.getElementById('playButton');
playButton.onclick = e => {
    player.playVideo();
};

const pauseButton = document.getElementById('pauseButton');
pauseButton.onclick = e => {
    player.pauseVideo();
};

const stopButton = document.getElementById('stopButton');
stopButton.onclick = e => {
    player.stopVideo();
}

const seekBackwardButton = document.getElementById('seekBackwardButton');
seekBackwardButton.onclick = e => {
    player.getCurrentTime()
        .then(currTime => player.seekTo(currTime - 5, true))
        .then(() => player.playVideo());
};

const seekForwardButton = document.getElementById('seekForwardButton');
seekForwardButton.onclick = e => {
    player.getCurrentTime()
        .then(currTime => player.seekTo(currTime + 5, true))
        .then(() => player.playVideo());
};

//TODO: Not properly implemented because I don't have playlist support.
//Perhaps I should do something like this: https://stackoverflow.com/questions/32855634/adding-a-video-to-a-playlist-using-the-youtube-player-iframe-api
const previousVideoButton = document.getElementById('previousVideoButton');
previousVideoButton.onclick = e => {
    player.previousVideo();
};

const nextVideoButton = document.getElementById('nextVideoButton');
nextVideoButton.onclick = e => {
    player.nextVideo();
};