var msgRe = /([^ ]+) (<[^>]+>) (.*)/;
var kibozeRe = /[Nn]eal/;
var urlRe = /[a-z]+:\/\/[^ ]*/;

var nick = "Mme. M";

function isinView(oObject) {
	return (oObject.offsetParent.clientHeight <= oObject.offsetTop);
}

function selectForum(fe) {
	var kids = document.getElementById("foraText").childNodes;
	
	for (i = 0; i < kids.length; i += 1) {
		e = kids[i];
		console.log(i, e);
		if (e == fe) {
			e.style.display = "block";
		} else {
			e.style.display = "none";
			if (e.button.className == "current") {
				e.button.className = "";
			}
		}
	}
	
	fe.button.className = "current";
	if (fe.lastChild) {
		fe.lastChild.scrollIntoView(false);
	}
	document.getElementById("target").value = fe.forum;
}	

function getForumElement(forum) {
	var id = "a:" + forum;
	var fe = document.getElementById(id);
	
	if (! fe) {
		var button = document.createElement("button");
		button.appendChild(document.createTextNode(forum));
		button.onclick = function() { selectForum(fe); }
		document.getElementById("foraButtons").appendChild(button);
		
		fe = document.createElement("div");
		fe.id = id
		fe.forum = forum
		fe.button = button
		document.getElementById("foraText").appendChild(fe);
	}
	
	if (fe.button.className != "current") {
		fe.button.className = "active";
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
		k.insertBefore(p2, k.firstChild);
		p2.onclick = function() { focus(p); }
		
		// Setting title makes the tab flash sorta
		document.title = document.title;
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
	forumElement.appendChild(p);
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
	oReq.open("POST", "irc.cgi", true);
	oReq.send(new FormData(event.target));
	
	event.target.reset();

	return false;
}

function init() {
	var authtok = prompt("Auth token", "");
	document.getElementById("authtok").value = authtok;

	var source = new EventSource("irc.cgi?auth=" + authtok);
	source.onmessage = newmsg;
	
	document.getElementById("command").onsubmit = handleCommand;
}

window.onload = init;
