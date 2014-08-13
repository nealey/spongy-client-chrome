all: wirc.cgi wirc

export GOPATH = $(CURDIR)

%:
	go build $@

wirc.cgi:
	go build $@
