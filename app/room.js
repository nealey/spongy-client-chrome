function djbhash(a) {
  var r = 5381;

  for (var i = 0; i < a.length; i += 1) {
    r = (((r << 5) + r) + a.charCodeAt(i)) & 0xffff;
  }
  return r;
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

var visibleRoom;

function newRoom(element, network, name, maxSize) {
  var messages = getTemplate("messages");
  var lastmsg;
  if (! maxSize) {
    maxSize = 500;
  }


  element.addMessage = function(timestamp, command, source, content) {
    var message = getTemplate("message");

    var eTimestamp = message.getElementsByClassName("timestamp")[0];
    var eSource = message.getElementsByClassName("source")[0];
    var eContent = message.getElementsByClassName("content")[0];

    message.classList.add("update");
    message.classList.add(command);
    if (source == ".") {
      message.classList.add("self");
    }

    eTimestamp.textContent = timestamp.toLocaleTimeString();
    eSource.textContent = source;
    eSource.setAttribute("colornumber", djbhash(source) % 31);
    eContent.textContent = content;

    messages.appendChild(message);

    while (messages.childNodes.length > maxSize) {
      messages.removeChild(element.firstChild);
    }

    lastmsg = message;

    if (visibleRoom == element) {
      lastmsg.scrollIntoView(false);
    }
  }

  element.hide = function() {
    element.classList.remove("selected");
    messages.style.display = "none";
  }

  element.show = function() {
    if (visibleRoom) {
      visibleRoom.hide()
    }
    element.classList.add("selected");
    messages.style.display = null;
    lastmsg.scrollIntoView(false);
    visibleRoom = element;
  }

  element.send = function(text) {
    network.send(name, text);
  }

  function clicked() {
    element.show();
  }

  // start hidden
  element.hide();
  element.addEventListener("click", clicked);
  element.getElementsByClassName("content-item")[0].textContent = name;

  document.getElementById("messages-container").appendChild(messages);

  return element;
}