//src/modals/url-modals.ts

import { App, Modal, Setting, Notice } from "obsidian";
import { NamedApiUrl } from "../types";

type UrlModalSubmit = {
    url: string;
    savedUrls: NamedApiUrl[];
};

export class UrlModal extends Modal {
    result: string;
    savedUrls: NamedApiUrl[];
    onSubmit: (result: UrlModalSubmit) => void;
    private draftName: string;
    private isEditorOpen: boolean;

    constructor(
        app: App,
        currentUrl: string,
        savedUrls: NamedApiUrl[],
        onSubmit: (result: UrlModalSubmit) => void
    ) {
        super(app);
        this.result = currentUrl;
        this.savedUrls = [...savedUrls];
        this.onSubmit = onSubmit;

        const selectedEntry =
            this.savedUrls.find((entry) => entry.url === currentUrl) ?? null;

        this.draftName = selectedEntry?.name ?? "";
        this.isEditorOpen = this.savedUrls.length === 0 || !selectedEntry;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("mome-url-modal");

        contentEl.createEl("h2", { text: "Update API Base URL" });
        contentEl.createEl("p", {
            cls: "mome-url-modal__intro",
            text: "Choose an existing endpoint or expand the form below to add or edit a saved entry."
        });

        const selectedEntry =
            this.savedUrls.find((entry) => entry.url === this.result) ?? null;

        const selectedSection = contentEl.createDiv({
            cls: "mome-url-modal__section mome-url-modal__section--selection"
        });

        selectedSection.createEl("div", {
            cls: "mome-url-modal__section-label",
            text: "Saved endpoints"
        });

        if (this.savedUrls.length > 0) {
            const listEl = selectedSection.createDiv({
                cls: "mome-url-modal__saved-list"
            });

            this.savedUrls.forEach((entry, index) => {
                const isActive = entry.url === this.result;
                const row = listEl.createDiv({
                    cls: `mome-url-modal__saved-card${isActive ? " is-active" : ""}`
                });

                const textWrap = row.createDiv({
                    cls: "mome-url-modal__saved-card-main"
                });

                textWrap.createEl("div", {
                    cls: "mome-url-modal__saved-card-title",
                    text: entry.name
                });

                textWrap.createEl("div", {
                    cls: "mome-url-modal__saved-card-url",
                    text: entry.url
                });

                const actions = row.createDiv({
                    cls: "mome-url-modal__saved-card-actions"
                });

                const useButton = actions.createEl("button", {
                    text: isActive ? "Selected" : "Use",
                    cls: `mome-url-modal__chip${isActive ? " is-active" : ""}`
                });
                useButton.type = "button";
                if (isActive) {
                    useButton.disabled = true;
                } else {
                    useButton.addEventListener("click", () => {
                        this.result = entry.url;
                        this.draftName = entry.name;
                        this.isEditorOpen = false;
                        this.onOpen();
                    });
                }

                const editButton = actions.createEl("button", {
                    text: "Edit",
                    cls: "mome-url-modal__chip"
                });
                editButton.type = "button";
                editButton.addEventListener("click", () => {
                    this.result = entry.url;
                    this.draftName = entry.name;
                    this.isEditorOpen = true;
                    this.onOpen();
                });

                const deleteButton = actions.createEl("button", {
                    cls: "mome-url-modal__icon-btn is-danger",
                    attr: {
                        "aria-label": `Delete ${entry.name}`,
                        title: "Delete"
                    }
                });
                deleteButton.type = "button";
                deleteButton.setText("×");
                deleteButton.addEventListener("click", () => {
                    const deletedWasSelected = this.result === entry.url;
                    this.savedUrls.splice(index, 1);

                    if (deletedWasSelected) {
                        const fallback = this.savedUrls[0] ?? null;
                        this.result = fallback?.url ?? "";
                        this.draftName = fallback?.name ?? "";
                    }

                    this.onOpen();
                });
            });
        } else {
            selectedSection.createDiv({
                cls: "mome-url-modal__empty",
                text: "No saved endpoints yet. Add one below."
            });
        }

        const addSection = contentEl.createDiv({
            cls: "mome-url-modal__section mome-url-modal__section--editor"
        });

        const addToggle = addSection.createEl("button", {
            cls: `mome-url-modal__fold-toggle${this.isEditorOpen ? " is-open" : ""}`
        });
        addToggle.type = "button";

        const addToggleLabel = addToggle.createDiv({
            cls: "mome-url-modal__fold-toggle-main"
        });
        addToggleLabel.createEl("div", {
            cls: "mome-url-modal__section-label",
            text: selectedEntry ? "Add or edit endpoint" : "Add endpoint"
        });
        addToggleLabel.createEl("div", {
            cls: "mome-url-modal__fold-toggle-desc",
            text: this.isEditorOpen
                ? "Collapse the editor form"
                : "Expand to create or update a saved endpoint"
        });

        addToggle.createEl("div", {
            cls: "mome-url-modal__fold-toggle-icon",
            text: this.isEditorOpen ? "−" : "+"
        });

        const addBody = addSection.createDiv({
            cls: `mome-url-modal__fold-body${this.isEditorOpen ? " is-open" : ""}`
        });

        addToggle.addEventListener("click", () => {
            this.isEditorOpen = !this.isEditorOpen;
            this.onOpen();
        });

        new Setting(addBody)
            .setName("Current URL")
            .setDesc("Enter the address of your server")
            .addText((text) =>
                text
                    .setPlaceholder("http://localhost:8000")
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value.trim();
                    }));

        new Setting(addBody)
            .setName("Name")
            .setDesc("Optional label for saving this URL")
            .addText((text) =>
                text
                    .setPlaceholder("Local dev")
                    .setValue(this.draftName)
                    .onChange((value) => {
                        this.draftName = value.trim();
                    }));

        new Setting(addBody)
            .addButton((btn) =>
                btn
                    .setButtonText("Save current")
                    .onClick(() => {
                        const cleanUrl = this.result.trim().replace(/\/$/, "");
                        const cleanName = this.draftName.trim();

                        if (!cleanUrl) {
                            new Notice("Please enter a URL.");
                            return;
                        }

                        if (!cleanName) {
                            new Notice("Please enter a name to save this URL.");
                            return;
                        }

                        const existingIndex = this.savedUrls.findIndex(
                            (entry) => entry.name === cleanName || entry.url === cleanUrl
                        );

                        const nextEntry: NamedApiUrl = { name: cleanName, url: cleanUrl };

                        if (existingIndex >= 0) {
                            this.savedUrls[existingIndex] = nextEntry;
                        } else {
                            this.savedUrls.push(nextEntry);
                        }

                        this.result = cleanUrl;
                        this.draftName = cleanName;
                        this.isEditorOpen = false;
                        new Notice(`Saved API URL: ${cleanName}`);
                        this.onOpen();
                    }))
            .addButton((btn) =>
                btn
                    .setButtonText("Save & Use")
                    .setCta()
                    .onClick(() => {
                        const cleanUrl = this.result.trim().replace(/\/$/, "");

                        if (!cleanUrl) {
                            new Notice("Please enter a URL.");
                            return;
                        }

                        const cleanName = this.draftName.trim();
                        let nextSavedUrls = [...this.savedUrls];

                        if (cleanName) {
                            const existingIndex = nextSavedUrls.findIndex(
                                (entry) => entry.name === cleanName || entry.url === cleanUrl
                            );

                            const nextEntry: NamedApiUrl = { name: cleanName, url: cleanUrl };

                            if (existingIndex >= 0) {
                                nextSavedUrls[existingIndex] = nextEntry;
                            } else {
                                nextSavedUrls.push(nextEntry);
                            }
                        }

                        this.close();
                        this.onSubmit({
                            url: cleanUrl,
                            savedUrls: nextSavedUrls
                        });
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.removeClass("mome-url-modal");
        contentEl.empty();
    }
}