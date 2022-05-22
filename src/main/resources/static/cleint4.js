
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

var loggedIn = false;
var configuration = {
    'iceServers': [
        {'urls': 'stun:stun.stunprotocol.org:3478'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};
var pc;
var peer;
var selfView = document.getElementById('selfView');
var remoteView = document.getElementById('remoteView');

function logError(error) {
    console.log(error.name + ': ' + error.message);
}

function connect(username) {
    console.log('connect');
    var loc = window.location
    console.log(loc.hostname)
    var uri = "wss://" + loc.hostname + ":8080/socket"
    sock = new WebSocket(uri);

    sock.onopen = function(e) {
        console.log('open', e);
        sock.send(
            JSON.stringify(
                {
                    type: "login",
                    data: username
                }
            )
        );
        // should check better here, it could have failed
        // moreover not logout implemented
        loggedIn = true;
        console.log('connected');
    }

    sock.onclose = function(e) {
        console.log('close', e);
    }

    sock.onerror = function(e) {
        console.log('error', e);
    }

    sock.onmessage = function(e) {
        console.log('message', e.data);
        if (!pc) {
            startRTC();
        }

        var message = JSON.parse(e.data);
        if (message.type === 'rtc') {
            if (message.data.sdp) {
                pc.setRemoteDescription(
                    new RTCSessionDescription(message.data.sdp),
                    function () {
                        // if we received an offer, we need to answer
                        if (pc.remoteDescription.type == 'offer') {
                            peer = message.dest;
                            pc.createAnswer(localDescCreated, logError);
                        }
                    },
                    logError);
            }
            else {
                pc.addIceCandidate(new RTCIceCandidate(message.data.candidate));
            }
        }
    }

    // setConnected(true);
}

function startRTC() {
    pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (evt.candidate) {
            sendMessage(
                {
                    type: "rtc",
                    dest: peer,
                    data: {
                        'candidate': evt.candidate
                    }
                }
            );
        }
    };

    // once remote stream arrives, sho480w it in the remote video element
    pc.onaddstream = function (evt) {
        remoteView.srcObject = evt.stream;
    };

    // get a local stream, show it in a self-view and add it to be sent
    navigator.getUserMedia({
        'audio': true,
        'video': true
    }, function (stream) {
        selfView.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        // pc.addStream(stream);
    }, logError);

}

function offer(dest) {
    peer = dest;
    pc.createOffer(localDescCreated, logError);
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function () {
        // ici en voyé un obj {type: offer, dest: B, data: desc}
        sendMessage(
            {
                type: "rtc",
                dest: peer,
                data: {
                    'sdp': pc.localDescription
                }
            }
        );
    }, logError);
};

function sendMessage(payload) {
    sock.send(JSON.stringify(payload));
}

function disconnect() {
    console.log('disconnect');
    if(sock != null) {
        sock.close();
    }
    setConnected(false);
}
