all: irc.cgi irc

%: %.go
	go build $<

irc.cgi: irc.cgi.go
	go build irc.cgi.go
	chmod +s irc.cgi
