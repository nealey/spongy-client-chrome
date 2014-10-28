// Functionality dealing with server-level things

var maxScrollback = 500;
var networks = {};

function networkConnect(network, baseURL, authtok) {
  var eventSource;
  var element = getTemplate("server-channels");
  var channels = element.getElementByClassName("channels")[0];
  var roomElement = element.getElementsByClassName("server")[0];
  var rooms = {".": room};
  newRoom(roomElement, element, network, maxScrollback);

  function newRoom(name) {
    var rElement = getTemplate("channel");
    newRoom(rElement, element, name, maxScrollback);
    channels.appendChild(rElement);
    rooms[name] = rElement;
  }

  function handleEventSourceLine(line) {
    var lhs = line.split(" :", 1)[0]
  	var parts = lhs.split(' ')
  	var timestamp = new Date(parts[0] * 1000);
    var fullSender = parts[1];
  	var command = parts[2].toLowerCase();
  	var sender = parts[3];
  	var forum = parts[4];
  	var args = parts.slice(5);
  	var txt = line.substr(lhs.length + 2);

    var room = rooms[forum];
    if (! room) {
      room = newRoom(forum);
    }

    // XXX: Handle differently based on command
    room.addMessage(timestamp, command, sender, txt);
  }

  function handleEventSourceMessage(oEvent) {
    msgs = oEvent.data.split("\n");

    var first = Math.max(0, msgs.length - maxScrollback);
    for (var i = first; i < msgs.length; i += 1) {
      handleEventSourceLine(msgs[i]);
    }
  }

  function handleEventSourceError(oEvent) {
    timestamp = new Date();
    messageHandler(timestamp, null, "ERROR", null, null, [], null);
  }

  element.send = function(target, text) {
    function handleError(oEvent) {
      console.log("XXX: That didn't work out.", target, text)
    }

    var form = new FormData();
    form.append("type", "command");
    form.append("auth", authtok);
    form.append("network", network);
    form.append("target", target);
    form.append("text", text);
    console.log(form);

    var oReq = new XMLHttpRequest();
    oReq.addEventListener("error", handleError);
		oReq.open("POST", baseURL, true);
		oReq.send(form);
  }

  element.close = function() {
    eventSource.close();
    element.parentNode.removeChild(element);
  }


  if (networks[network]) {
    networks[network].close();
  }
  networks[network] = element;

  var pullURL = baseURL + "?network=" + encodeURIComponent(network) + "&auth=" + encodeURIComponent(authtok);
  eventSource = new EventSource(pullURL);
  eventSource.addEventListener("message", handleEventSourceMessage);
  eventSource.addEventListener("error", handleEventSourceError);
}
