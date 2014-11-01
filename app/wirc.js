var msgRe = /([^ ]+) (<[^>]+>) (.*)/;
var kibozeRe = /[Nn]eal/;
var urlRe = /[a-z]+:\/\/[^ ]*/;

var nick = "Mme. M";

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

function addMessagePart(p, className, text) {
	var e = document.createElement("span");
	e.className = className;
	e.appendChild(document.createTextNode(text));
	p.appendChild(e);
	p.appendChild(document.createTextNode(" "));
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

function handleInput(oEvent) {
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
	  visibleRoom.send(txt);
	}

	oEvent.target.value = "";

	return false;
}

function hideChannels(oEvent) {
  var lhs = document.getElementById("rooms-and-nicks");

  if (lhs.classList.contains("hidden")) {
    lhs.classList.remove("hidden");
  } else {
    lhs.classList.add("hidden");
  }
}

function keyPress(oEvent) {
  document.getElementById("input").focus();
}

function restore(items) {
	storedConnections = items["connections"];

	for (var network in storedConnections) {
	  var conn = storedConnections[network];

	  networkConnect(network, conn[0], conn[1]);
	}
}

function init() {
	chrome.storage.sync.get(["connections"], restore);
	document.getElementById("input").addEventListener("change", handleInput);
	document.getElementById("hide-channels").addEventListener("click", hideChannels);
	window.addEventListener("keypress", keyPress);

	templates = document.getElementById("templates");
	rooms = document.getElementById("rooms-container").getElementsByClassName("rooms")[0];
}

window.addEventListener("load", init);
