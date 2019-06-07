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
//jQuery
import $ from "jquery";
//query-string
import * as queryString from "query-string";
//YouTube Player API
import YouTubePlayer from 'youtube-player';
//YanuX Coordinator
import { FeathersCoordinator, Credentials, ComponentsRuleEngine } from "@yanux/coordinator";

const componentsRestrictions = {
    "viewer-form": {
        "display": true,
        "input": {
            "operator": "OR",
            "values": [{
                "operator": "AND",
                "values": ["keyboard", "mouse"]
            }, "touchscreen"]
        }
    },
    "player": {
        "display": {
            "operator": "AND",
            "values": {
                "resolution": {
                    "operator": ">=",
                    "value": [1280, null],
                },
                /*
                "size": {
                    "operator": ">=",
                    "value": [160, 90],
                    "enforce": false
                },
                "pixelRatio": {
                    "operator": "NOT",
                    "values": {
                        "operator": ">",
                        "value": 2.0
                    },
                    "enforce": false
                }
                */
            }
        },
        "speakers": {
            "channels": {
                "operator": "AND",
                "values": [
                    {
                        "operator": ">=",
                        "value": 2,
                        "enforce": true
                    },
                    {
                        "operator": ">=",
                        "value": 1,
                    }
                ]
            }
        }
    },
    "controls": {
        "display": true,
        "input": {
            "operator": "OR",
            "values": [{
                "operator": "AND",
                "values": ["keyboard", "mouse"]
            }, "touchscreen"]
        }
    }
}


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

function applyComponentsConfig(componentsConfig) {
    for (const component in componentsConfig) {
        if (componentsConfig[component]) {
            $("#" + component).css("display", "block");
        } else {
            $("#" + component).css("display", "none");
        }
    }
}

function initDisplay(params) {
    const componentsConfig = {}
    if (params.hiddenComponents) {
        params.hiddenComponents.split(",").forEach(c => {
            componentsConfig[c] = false;
        });
    }
    if (params.displayedComponents) {
        params.displayedComponents.split(",").forEach(c => {
            componentsConfig[c] = true;
        });
    }
    applyComponentsConfig(componentsConfig);
}

function updateProxemics(coordinator, proxemics) {
    const localDeviceUuid = coordinator.device.deviceUuid;
    console.log("Proxemics:", proxemics);
    console.log("Local Device UUID:", localDeviceUuid);
    coordinator.getActiveInstances().then(activeInstances => {
        const componentsRuleEngine = new ComponentsRuleEngine(localDeviceUuid, activeInstances, proxemics, componentsRestrictions);
        componentsRuleEngine.run().then(data => {
            console.log('Components Config:', data.componentsConfig);
            applyComponentsConfig(data.componentsConfig);
        });
    });
}

function initLogin() {
    const loginLink = document.querySelector('#login a');
    loginLink.textContent = 'Login'
    loginLink.href = `http://${window.location.hostname}:3001/oauth2/authorize?client_id=yanux-youtube-viewer&response_type=token&redirect_uri=${window.location.href}`
    loginLink.onclick = null;
}

function initLogout(coordinator) {
    const loginLink = document.querySelector('#login a');
    loginLink.textContent = 'Logout ' + coordinator.user.email;
    loginLink.href = '#'
    loginLink.onclick = e => {
        coordinator.logout();
        initLogin();
        e.preventDefault();
    }
}

function updatePlayer(player, state, prevState) {
    if ($('#player').css('display') !== 'none') {
        if (!player) {
            player = YouTubePlayer('player', {
                width: 1920,
                height: 1080,
                playerVars: { controls: 0 }
            });
            player.cueVideoById(state.videoId, state.currTime);
        }
    }
    if (player && state.videoId && state.videoId !== prevState.videoId) {
        player.cueVideoById(state.videoId, state.currTime);
    }
    if (player && $('#player').css('display') !== 'none') {
        if (state.state === 'play') {
            player.playVideo();
            player.getCurrentTime(currTime => {
                if (Math.abs(currTime - state.currTime) > 5) {
                    player.seekTo(state.currTime, true);
                }
            })
        } else if (state.state === 'pause') {
            player.pauseVideo();
        } else if (state.state === 'stop') {
            player.stopVideo();
        }
    } else if (player) {
        player.destroy();
        player = null;
    }
    const seekBar = document.getElementById('seekBar');
    const playbackTimer = document.getElementById('playbackTimer');
    seekBar.value = Math.floor(state.currTime);
    seekBar.max = Math.floor(state.duration);
    playbackTimer.textContent = printTime(state.currTime) + '/' + printTime(state.duration);
    _.assign(prevState, state);
    return { state, prevState, player };
}


function initCoordinator(coordinator) {
    coordinator.init().then(results => {
        const prevState = {
            videoId: null,
            state: 'stop',
            currTime: 0
        }
        const initialState = results[0];
        const initialProxemics = results[1];
        let currState = initialState;
        let player;
        const update = () => {
            updateProxemics(coordinator, coordinator.proxemics.state)
            const stateUpdate = updatePlayer(player, currState, prevState);
            player = stateUpdate.player;
        }
        if (initialState && initialProxemics) {
            console.log("User:", coordinator.user)
            console.log("Initial State:", initialState);
            console.log("Initial Proxemics:", initialProxemics);
            initLogout(coordinator);
            update();
        }
        coordinator.subscribeResource(state => {
            currState = state;
            console.log("State Changed:", currState);
            update();
        });
        updateProxemics(coordinator, initialProxemics);
        coordinator.subscribeProxemics(proxemics => {
            console.log('Proxemics', proxemics);
            update();

        });
        coordinator.subscribeInstances(instance => {
            console.log('Instances', instance);
            update();
        });
        coordinator.subscribeEvents(event => {
            console.log("Event Subscription:", event);
            if (player && event.name === "seekTo") {
                player.seekTo(event.value.time, true);
                if (event.value.state === 'play') {
                    player.playVideo();
                }
            }
        });
        //TODO:
        //Save the state of the player into an object and use it for almost everything so that it is easier to port the app to the YanuX Framework.
        //TODO: Perhaps I should do something like this:
        //https://stackoverflow.com/questions/32855634/adding-a-video-to-a-playlist-using-the-youtube-player-iframe-api
        const seekBar = document.getElementById('seekBar');
        let seekBarPlaybackState = currState.state;
        seekBar.onmousedown = function (e) {
            console.log('seekBar onmousedown:', this.value);
            if (player) {
                player.seekTo(this.value, false);
            }
        }
        seekBar.onchange = function (e) {
            console.log('seekBar change:', this.value);
            coordinator.emitEvent({ state: seekBarPlaybackState, time: parseFloat(this.value) }, 'seekTo')
                .then(event => console.log('Log Event Promise', event))
                .catch(err => console.error('Log Event Error', err));
        }
        seekBar.value = 0;
        if (player) {
            player.on('stateChange', e => {
                console.log('Player Status', e.data);
                switch (e.data) {
                    case 0:
                    case 5:
                        currState.state = 'stop'
                        break;
                    case 1:
                    case 3:
                        currState.state = 'play'
                        break;
                    case 2:
                        currState.state = 'pause'
                        break;
                    default:
                        currState.state = 'stop'
                        break;
                }
                let timer;
                if (e.data === 1) {
                    const updateSeekBar = () => {
                        player.getCurrentTime().then(currTime => {
                            console.log("Current Time:", currTime);
                            if (currState.currTime !== currTime) {
                                currState.currTime = currTime;
                                coordinator.setResourceData(currState);
                            }
                        });
                        if (currState.state === 'play') {
                            timer = setTimeout(updateSeekBar, 1000);
                        } else {
                            clearTimeout(timer);
                        }
                    };
                    seekBarPlaybackState = currState.state;
                    player.getDuration().then(duration => {
                        console.log("Duration:", duration);
                        currState.duration = duration;
                        coordinator.setResourceData(currState);
                    });
                    updateSeekBar();
                }
            });
        }
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
                    coordinator.emitEvent({ state: seekBarPlaybackState, time: currTime - 5 }, 'seekTo')
                });
        };
        const seekForwardButton = document.getElementById('seekForwardButton');
        seekForwardButton.onclick = e => {
            player.getCurrentTime()
                .then(currTime => {
                    coordinator.emitEvent({ state: seekBarPlaybackState, time: currTime + 5 }, 'seekTo')
                });
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
    initDisplay(params);
    initLogin();
    if (!params.access_token) {
        sessionStorage.setItem('hash', window.location.hash);
    }
    if (coordinator.credentials) {
        initCoordinator(coordinator, player);
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