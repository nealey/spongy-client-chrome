// Functionality dealing with server-level things

var maxScrollback = 500;
var networks = {};

function networkConnect(network, baseURL, authtok) {
  var eventSource;
  var element = getTemplate("server-channels");
  var channels = element.getElementsByClassName("channels")[0];
  var roomElement = element.getElementsByClassName("server")[0];
  var rooms = {".": roomElement};
  newRoom(roomElement, element, network, maxScrollback);

  function makeRoom(name) {
    var rElement = getTemplate("channel");
    newRoom(rElement, element, name, maxScrollback);
    channels.appendChild(rElement);
    rooms[name] = rElement;
    return rElement;
  }

  function handleEventSourceLine(line) {
    var lhs = line.split(" :", 1)[0];
    var parts = lhs.split(' ');

    var timestamp = new Date(parts[0] * 1000);
    var fullSender = parts[1];
    var command = parts[2].toLowerCase();
    var sender = parts[3];
    var forum = parts[4];
    var args = parts.slice(5);
    var txt = line.substr(lhs.length + 2);

    switch (command) {
      case "prevlog":
        // Just ignore this
        return;
    }

    var room = rooms[forum];
    if (! room) {
      room = makeRoom(forum);
    }

    // XXX: Handle differently based on command
    room.addMessage(timestamp, fullSender, command, sender, args, txt);
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
    roomElement.addMessage(timestamp, ".", "fault", ".", [], "Unable to open events feed (permissions problem on server?)");
    console.log(oEvent);
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

  document.getElementsByClassName("rooms")[0].appendChild(element);
}
