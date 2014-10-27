ICONS += app/icon-16.png
ICONS += app/icon-32.png
ICONS += app/icon-48.png
ICONS += app/icon-128.png
ICONS += app/icon-256.png

all: icons serverside

serverside:
	GOPATH=$(CURDIR) go build -v all

icons: $(ICONS)

app/icon-%.png: chat.svg
	inkscape --export-png=$@ --export-width=$* $<

package: icons
	cd app && zip -ru ../package.zip .
