var msgRe = /([^ ]+) (<[^>]+>) (.*)/;
var kibozeRe = /[Nn]eal/;
var urlRe = /[a-z]+:\/\/[^ ]*/;

var nick = "Mme. M";

// XXX: get rid of this
var scrollbackLength = 500;
var current;

if (String.prototype.startsWith == null) {
	String.prototype.startsWith = function(needle) {
		return this.lastIndexOf(needle, 0) == 0;
	}
}

function getTemplate(className) {
	return templates.getElementsByClassName(className)[0].cloneNode(true);
}

function isinView(oObject) {
	return (oObject.offsetParent.clientHeight <= oObject.offsetTop);
}

function selectForum(room) {
  if (current) {
    current.classList.remove("selected");
    // XXX: do this with a class, too
    current.messages.style.display = "none";
  }


  current = room;
  room.classList.add("selected");
  room.messages.style.display = "block";

	if (room.messages.lastChild) {
		room.messages.lastChild.scrollIntoView(false);
	}
}

fora = {}
function getForumElement(forum) {
	var fe = fora[forum];

	if (! fe) {
		var room = getTemplate("channel room");
		var content = room.getElementsByClassName("content-item")[0];

		content.textContent = forum;
		rooms.appendChild(room);

		fe = getTemplate("messages");
		fe.room = room;

		room.messages = fe;
		// XXX: split out into non-anon function
		room.addEventListener("click", function() {selectForum(room)});

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

function addMessage(timestamp, fullSender, command, sender, forum, args, msg) {
	var forumElement = getForumElement(forum);
	var msge = getTemplate("message");

	console.log(timestamp, msg);

	msge.getElementsByClassName("timestamp")[0].textContent =  timestamp.toLocaleTimeString();
	var sourcee = msge.getElementsByClassName("source")[0];
	var contente = msge.getElementsByClassName("content")[0];

	sourcee.textContent = sender;
	contente.textContent = msg;

	switch (command) {
	case "PING":
	case "PONG":
	  return;
	case "PRIVMSG":
  case "NOTICE":
		break;
	default:
	  contente.textContent = command + " " + args + " " + msg;
		break;
	}
	while (forumElement.childNodes.length > scrollbackLength) {
		forumElement.removeChild(forumElement.firstChild)
	}

	forumElement.appendChild(msge);
	msge.scrollIntoView(false);
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
		var network = parts[1];
		var url = parts[2];
		var authtok = parts[3];

		connect(network, url, authtok);
    storedConnections[network] = [url, authtok];
    chrome.storage.sync.set({"connections": storedConnections});
	} else {
		oReq.onload = reqListener;
		oReq.open("POST", window.postURL, true);
		oReq.send(new FormData(event.target));
	}

	oEvent.target.value = "";

	return false;
}

var activeNetworks = {};
var storedConnections = {};

function connect(network, url, authtok) {
  var newServer = new Server(network, url, authtok, addMessage);
  var element;

  if (activeNetworks[network]) {
    activeNetworks[network].close();
    element = activeNetworks[network].element;
  } else {
    newServer.element = getTemplate("server-channels");
    rooms.appendChild(newServer.element);
  }

  newServer.room = newServer.element.getElementsByClassName("server room")[0];
  newServer.content = newServer.element.getElementsByClassName("content-item")[0];

  newServer.content.textContent = network;

  activeNetworks[network] = newServer;
}



function restore(items) {
	storedConnections = items["connections"];

	for (var network in storedConnections) {
	  var conn = storedConnections[network];

	  connect(network, conn[0], conn[1]);
	}
}

function init() {
	chrome.storage.sync.get(["connections"], restore);
	document.getElementById("input").addEventListener("change", handleInput);

	templates = document.getElementById("templates");
	rooms = document.getElementById("rooms-container").getElementsByClassName("rooms")[0];
}

window.addEventListener("load", init);
