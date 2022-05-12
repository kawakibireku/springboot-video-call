
const username = document.getElementById('username');
const connectedUser = document.getElementById('connectedUser')
const loginButton = document.getElementById('loginButton')

function connect() {
    const loc = window.location
    const conn = new WebSocket('ws://'+ loc.hostname +':8080/socket');
    conn.onopen = function(e) {
        conn.send(JSON.stringify({
            type: "login",
            data: username.value
        }))
    }
    conn.onclose = function(e) {
        console.log('close', e);
    }

    conn.onerror = function(e) {
        console.log('error', e);
    }

    conn.onmessage = function(e) {
        console.log('message', e.data)
        const content = JSON.parse(e.data)
        switch(content.type){
            case "logged_in":
                let li = document.createElement("li");
                li.innerText = `${content.data} logged in`;
                connectedUser.appendChild(li);
                break;
            default:
                break;
        }
    }
    loginButton.disabled = true;
}