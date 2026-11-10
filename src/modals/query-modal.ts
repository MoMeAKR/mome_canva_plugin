import { App, Modal, Setting } from "obsidian";

export class QueryModal extends Modal {
    query: string;
    onSubmit: (query: string) => void;

    constructor(app: App, onSubmit: (query: string) => void, initialQuery: string = "") {
        super(app);
        this.query = initialQuery;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Enter Query for CodeArtist" });

        let inputEl: HTMLInputElement | null = null;

        new Setting(contentEl)
            .setName("Query")
            .setDesc("Enter your query to send to the backend")
            .addText((text) => {
                text
                    .setValue(this.query)
                    .onChange((value) => {
                        this.query = value;
                    });
                inputEl = text.inputEl;
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Send")
                    .setCta()
                    .onClick(() => {
                        this.submit();
                    }));

        // Allow Enter to submit
        contentEl.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter" && !evt.isComposing) {
                evt.preventDefault();
                this.submit();
            }
        });

        // Focus the input for convenience
        setTimeout(() => inputEl?.focus(), 0);
    }

    submit() {
        this.close();
        this.onSubmit(this.query);
    }

    onClose() {
        this.contentEl.empty();
    }
}
