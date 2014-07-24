var msgRe = /([^ ]+) (<[^>]+>) (.*)/;
var kibozeRe = "neal";

function addMessagePart(p, className, text) {
	var e = document.createElement("span");
	e.className = className;
	e.appendChild(document.createTextNode(text));
	p.appendChild(e);
	p.appendChild(document.createTextNode(" "));
}
	

function addMessage(txt) {
	var lhs = txt.split(" :", 1)[0]
	var parts = lhs.split(' ')
	var ts = new Date(parts[0] * 1000);
	var fullSender = parts[1];
	var command = parts[2];
	var sender = parts[3];
	var forum = parts[4];
	var args = parts.slice(5);
	var msg = txt.substr(lhs.length + 2)
	
	var a = document.getElementById("a");
	var p = document.createElement("p");
	
	addMessagePart(p, "timestamp", ts.toLocaleTimeString());
	
	switch (command) {
	case "PING":
	case "PONG":
		return;
		break;
	case "PRIVMSG":
		addMessagePart(p, "forum", forum);
		addMessagePart(p, "sender", sender);
		addMessagePart(p, "text", msg);
		if (-1 != msg.search(kibozeRe)) {
			var k = document.getElementById("kiboze");
			var p2 = p.cloneNode(true);
			k.insertBefore(p2, k.firstChild);
		}
		break;
	default:
		addMessagePart(p, "forum", forum);
		addMessagePart(p, "sender", sender);
		addMessagePart(p, "raw", command + " " + args + " " + msg);
		break;
	}
	a.appendChild(p);
	p.scrollIntoView(false);
}

function newmsg(event) {
	msgs = event.data.split("\n");
	
	for (var i = 0; i < msgs.length; i += 1) {
		addMessage(msgs[i]);
	}
}
		
function handleCommand(event) {
	window.evt = event;
	var oReq = new XMLHttpRequest();
	function reqListener() {
	}
	oReq.onload = reqListener;
	oReq.open("POST", "chunktail.cgi?post=1", true);
	oReq.send(new FormData(event.target));
	
	event.target.reset();

	return false;
}

function init() {
	var source = new EventSource("chunktail.cgi");
	source.onmessage = newmsg;
	
	document.getElementById("command").onsubmit = handleCommand;
}

window.onload = init;
