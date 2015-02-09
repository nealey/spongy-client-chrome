ICONS += icon-16.png
ICONS += icon-32.png
ICONS += icon-48.png
ICONS += icon-128.png
ICONS += icon-256.png

all: icons

icons: $(ICONS)

icon-%.png: icon.svg
	inkscape --export-png=$@ --export-width=$* $<

package: icons
	git ls-files | zip -ru -@ /tmp/spongy-client-chrome.zip

clean:
	rm -f $(ICONS)
