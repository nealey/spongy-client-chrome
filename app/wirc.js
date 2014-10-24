var msgRe = /([^ ]+) (<[^>]+>) (.*)/;
var kibozeRe = /[Nn]eal/;
var urlRe = /[a-z]+:\/\/[^ ]*/;

var nick = "Mme. M";

var scrollbackLength = 500;

if (String.prototype.startsWith == null) {
	String.prototype.startsWith = function(needle) {
		return this.lastIndexOf(needle, 0) == 0;
	}
}

function getTemplate(className) {
	return document.templates.getElementsByClassName(className)[0].cloneNode(true);
}

function isinView(oObject) {
	return (oObject.offsetParent.clientHeight <= oObject.offsetTop);
}

function selectForum(room) {
	var kids = document.rooms_list.childNodes;

	for (i = 0; i < kids.length; i += 1) {
		e = kids[i];
		if (e == room) {
			e.className = "room selected";
			e.messages.display = "block";
		} else {
			e.className = "room";
			e.messages.display = "none";
		}
	}

	if (room.lastChild) {
		room.lastChild.scrollIntoView(false);
	}
}

fora = {}
function getForumElement(forum) {
	var fe = fora[forum];

	if (! fe) {
		var room = getTemplate("channel room");
		room.textContent = forum;
		document.rooms_list.appendChild(room);

		fe = getTemplate("messages");
		fe.room = room;

		room.messages = fe;
		// XXX: split out into non-anon function
		room.addEventListener("click", function() {selectForum(fe)});

		fora[forum] = fe;
		document.getElementById("messages-container").appendChild(fe);
	}

	return fe;
}

function addMessagePart(p, className, text) {
	var e = document.createElement("span");
	e.className = className;
	e.appendChild(document.createTextNode(text));
	p.appendChild(e);
	p.appendChild(document.createTextNode(" "));
}

function addText(p, text, kiboze) {
	// Look for a URL
	var txtElement = document.createElement("span");
	txtElement.className = "text";
	var rhs = text;
	var match;

	while ((match = urlRe.exec(rhs)) != null) {
		var before = rhs.substr(0, match.index);
		var a = document.createElement("a");
		var href = match[0];

		if (href.indexOf("hxx") == 0) {
			href = "htt" + href.substr(3);
		}
		a.href = href
		a.target = "_blank";
		a.appendChild(document.createTextNode(match[0]));
		txtElement.appendChild(document.createTextNode(before));
		txtElement.appendChild(a);
		rhs = rhs.substr(match.index + match[0].length);
	}
	txtElement.appendChild(document.createTextNode(rhs));
	p.appendChild(txtElement);

	if ((kiboze) || (-1 != text.search(kibozeRe))) {
		var k = document.getElementById("kiboze");
		var p2 = p.cloneNode(true);

		if (k) {
			k.insertBefore(p2, k.firstChild);
			p2.onclick = function() { focus(p); }

			// Setting title makes the tab flash sorta
			document.title = document.title;
		}
	}
}

function focus(e) {
	var pct = 1;
	var timeout;

	selectForum(e.parentNode);
	e.scrollIntoView(false);
	e.style.backgroundColor = "yellow";

	timeout = setInterval(function() {
		pct = pct - 0.1;
		e.style.backgroundColor = "rgba(255, 255, 0, " + pct + ")";
		if (pct <= 0) {
			e.style.backgroundColor = "inherit";
			clearInterval(timeout);
		}
	}, 50)
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

	var forumElement = getForumElement(forum);
	var p = getTemplate("message");

	addMessagePart(p, "timestamp", ts.toLocaleTimeString());

	switch (command) {
	case "PING":
	case "PONG":
		return;
		break;
	case "PRIVMSG":
		addMessagePart(p, "forum", forum);
		addMessagePart(p, "sender", sender);
		addText(p, msg, (sender == forum));
		break;
	case "NOTICE":
		addMessagePart(p, "forum", forum);
		addMessagePart(p, "sender notice", sender);
		addText(p, msg, (sender == forum));
		break;
	default:
		addMessagePart(p, "forum", forum);
		addMessagePart(p, "sender", sender);
		addMessagePart(p, "raw", command + " " + args + " " + msg);
		break;
	}
	while (forumElement.childNodes.length > scrollbackLength) {
		forumElement.removeChild(forumElement.firstChild)
	}
	forumElement.appendChild(p);
	p.scrollIntoView(false);
}

function newmsg(oEvent) {
	msgs = oEvent.data.split("\n");

	var first = Math.max(0, msgs.length - scrollbackLength);
	for (var i = first; i < msgs.length; i += 1) {
		addMessage(msgs[i]);
	}
}

function handleInput(oEvent) {
	console.log(oEvent);
	var oReq = new XMLHttpRequest();
	function reqListener() {
	}

	var txt = oEvent.target.value;
	if (txt.startsWith("/connect ")) {
		// XXX: should allow tokens with spaces
		var parts = txt.split(" ");

		connect(parts[1], parts[2], parts[3]);
	} else {
		oReq.onload = reqListener;
		oReq.open("POST", window.postURL, true);
		oReq.send(new FormData(event.target));
	}

	oEvent.target.value = "";

	return false;
}

function connect(url, server, authtok) {
	document.postURL = url;
	var pullURL = url + "?server=" + server + "&auth=" + authtok

	if (document.source != null) {
		document.source.close();
	}
	document.source = new EventSource(pullURL);
	document.source.onmessage = newmsg;

	chrome.storage.sync.set({"connections": [[url, server, authtok]]});
}

function restore(items) {
	var connections = items["connections"];

	for (var k = 0; k < connections.length; k += 1) {
		var conn = connections[k];

		connect(conn[0], conn[1], conn[2]);
	}
}

function init() {
	chrome.storage.sync.get("connections", restore);
	document.getElementById("input").addEventListener("change", handleInput);

	document.templates = document.getElementById("templates");
	document.rooms_list = document.getElementById("rooms-container").getElementsByClassName("rooms")[0];
}

window.addEventListener("load", init);
