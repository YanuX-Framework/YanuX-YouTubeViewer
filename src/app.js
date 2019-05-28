//CSS (incl. Bootstrap)
import './style.scss';
//Bootstrap JavaScript 
import 'bootstrap';

//Font Awesome
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
library.add(fas);
library.add(far);
library.add(fab);
dom.watch();

//lodash
import _ from "lodash";
//query-string
import * as queryString from "query-string";
//YouTube Player API
import YouTubePlayer from 'youtube-player';
//YanuX Coordinator
import { FeathersCoordinator, Credentials } from "@yanux/coordinator";


function extractYouTubeVideoIdFromUrl(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[7].length == 11) {
        return match[7];
    } else {
        alert("Could not extract an YouTube video ID.");
    }
}

function printTime(time) {
    function str_pad_left(str, pad, length) {
        return (new Array(length + 1).join(pad) + str).slice(-length);
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time - minutes * 60);
    return str_pad_left(minutes, '0', 2) + ':' + str_pad_left(seconds, '0', 2);
}

function initLogin() {
    const loginLink = document.querySelector('#login a');
    loginLink.textContent = 'Login'
    loginLink.href = `http://${window.location.hostname}:3001/oauth2/authorize?client_id=yanux-youtube-viewer&response_type=token&redirect_uri=${window.location.href}`
    loginLink.onclick = null;
}

function initLogout(username) {
    const loginLink = document.querySelector('#login a');
    loginLink.textContent = 'Logout ' + username;
    loginLink.href = '#'
    loginLink.onclick = e => {
        coordinator.logout();
        initLogin();
        e.preventDefault();
    }
}

function updateState(player, state, prevState) {
    const playerStateUpdate = () => {
        if (state.state === 'play') {
            player.playVideo();
        } else if (state.state === 'pause') {
            player.pauseVideo();
        } else if (state.stop === 'stop') {
            player.stopVideo();
        }
        prevState.state = state.state;
    }
    if (state.videoId && state.videoId != prevState.videoId) {
        player.cueVideoById(state.videoId, state.currTime);
        prevState.videoId = state.videoId;
    }
    playerStateUpdate();
}

function initCoordinator(coordinator) {
    coordinator.init().then(results => {
        const player = YouTubePlayer('player', {
            width: 1920,
            height: 1080,
            playerVars: { controls: 0 }
        });
        const prevState = {
            videoId: null,
            state: 'stop',
            currTime: 0
        }
        let initialState = results[0];
        let currState = initialState;
        if (initialState) {
            console.log("User:", coordinator.user)
            console.log("Initial State:", initialState);
            initLogout(coordinator.user.email);
            updateState(player, currState, prevState);
        }
        coordinator.subscribeResource(state => {
            currState = state;
            console.log("State Changed:", currState);
            updateState(player, currState, prevState);
        });
        coordinator.subscribeEvents(event => {
            console.log("Event Subscription:", event);
            if (event.name === "seekTo") {
                player.seekTo(event.value, true).then(() => player.playVideo());
            }
        })
        //TODO:
        //Save the state of the player into an object and use it for almost everything so that it is easier to port the app to the YanuX Framework.
        //TODO: Perhaps I should do something like this:
        //https://stackoverflow.com/questions/32855634/adding-a-video-to-a-playlist-using-the-youtube-player-iframe-api
        const seekBar = document.getElementById('seekBar');
        const playbackTimer = document.getElementById('playbackTimer');
        seekBar.value = 0;
        player.on('stateChange', e => {
            console.log('Player Status', e.data);
            switch (e.data) {
                case 0:
                case 5:
                    currState.state = 'stop'
                    break;
                case 1:
                    currState.state = 'play'
                    break;
                case 2:
                    currState.state = 'pause'
                    break;
                default:
                    break;
            }
            updateState(player, currState, prevState);
            let timer;
            if (e.data === 1) {
                const updateSeekBar = () => {
                    player.getCurrentTime().then(currTime => {
                        console.log("Current Time:", currTime);
                        currState.currTime = currTime;
                        seekBar.value = currTime;
                        playbackTimer.textContent = printTime(currTime) + '/' + printTime(currState.duration);
                        coordinator.setResourceData(currState);
                    });
                    if (currState.state === 'play') {
                        timer = setTimeout(updateSeekBar, 1000);
                    } else {
                        clearTimeout(timer);
                    }
                };
                seekBar.onchange = function (e) {
                    console.log('seekBar change:', this.value);
                    coordinator.emitEvent(parseFloat(this.value), "seekTo")
                        .then(event => console.log('Log Event Promise', event))
                        .catch(err => console.error('Log Event Error', err));
                }
                seekBar.onmousedown = function (e) {
                    console.log('seekBar onmousedown:', this.value);
                    player.seekTo(this.value, false);
                }
                player.getDuration().then(duration => {
                    console.log("Duration:", duration);
                    seekBar.max = duration;
                    currState.duration = duration;
                    coordinator.setResourceData(currState);
                });
                updateSeekBar();
            }
        });
        const viewerForm = document.getElementById('viewer-form')
        viewerForm.onsubmit = e => {
            const videoUrl = document.getElementById('video-url').value;
            const videoId = extractYouTubeVideoIdFromUrl(videoUrl);
            currState = {
                videoId,
                state: 'stop',
                currTime: 0,
                duration: 0
            }
            coordinator.setResourceData(currState);
            e.preventDefault();
        };
        const playButton = document.getElementById('playButton');
        playButton.onclick = e => {
            currState.state = 'play';
            coordinator.setResourceData(currState);
        };
        const pauseButton = document.getElementById('pauseButton');
        pauseButton.onclick = e => {
            currState.state = 'pause';
            coordinator.setResourceData(currState);
        };
        const stopButton = document.getElementById('stopButton');
        stopButton.onclick = e => {
            currState.state = 'stop';
            coordinator.setResourceData(currState);
        }
        const seekBackwardButton = document.getElementById('seekBackwardButton');
        seekBackwardButton.onclick = e => {
            player.getCurrentTime()
                .then(currTime => {
                    currState.currTime = currTime - 5;
                    player.seekTo(currState.currTime, true)
                }).then(() => player.playVideo());
        };
        const seekForwardButton = document.getElementById('seekForwardButton');
        seekForwardButton.onclick = e => {
            player.getCurrentTime()
                .then(currTime => {
                    currState.currTime = currTime + 5;
                    player.seekTo(currState.currTime, true)
                }).then(() => player.playVideo());
        };
    }).catch(e => {
        console.error(e);
        coordinator.logout();
        alert('Try to log back in!')
        initLogin();
    });
}

function main() {
    const params = queryString.parse(location.hash);
    console.log("Params:", params);
    const coordinator = new FeathersCoordinator(
        params.brokerUrl || `http://${window.location.hostname}:3002`,
        params.localDeviceUrl || "http://localhost:3003",
        params.app || "yanux-youtube-viewer"
    );
    window.coordinator = coordinator;
    initLogin();
    if (!params.access_token) {
        sessionStorage.setItem('hash', window.location.hash);
    }
    if (coordinator.credentials) {
        initCoordinator(coordinator);
    } else if (params.access_token) {
        coordinator.credentials = new Credentials("yanux", [
            params.access_token,
            params.app || "yanux-youtube-viewer"
        ]);
        coordinator.init().then(data => {
            location.hash = sessionStorage.getItem('hash');
            location.reload();
        });
    }
}
main();