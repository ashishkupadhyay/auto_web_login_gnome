UUID = vit-portal-login@vit.ac.in
DEST = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

all: schemas

schemas:
	glib-compile-schemas schemas/

install: schemas
	mkdir -p $(DEST)
	cp -r metadata.json extension.js prefs.js stylesheet.css schemas icons lib $(DEST)/
	@echo "Enabling extension..."
	gnome-extensions enable $(UUID) || true
	@echo "Extension installed to $(DEST)"

uninstall:
	@echo "Disabling extension..."
	gnome-extensions disable $(UUID) || true
	@echo "Removing $(DEST)..."
	rm -rf $(DEST)
	@echo "Extension uninstalled. Please log out and back in to reload GNOME Shell."

pack: schemas
	gnome-extensions pack --force --extra-source=lib --extra-source=icons --extra-source=stylesheet.css

clean:
	rm -f schemas/gschemas.compiled
	rm -f $(UUID).shell-extension.zip

.PHONY: all schemas install uninstall pack clean
