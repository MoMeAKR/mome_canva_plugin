import { App, Modal, Setting } from "obsidian";

export class UrlModal extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, currentUrl: string, onSubmit: (result: string) => void) {
        super(app);
        this.result = currentUrl;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Update API Base URL" });

        new Setting(contentEl)
            .setName("Base URL")
            .setDesc("Enter the address of your local python server (e.g., http://localhost:8000)")
            .addText((text) =>
                text
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value;
                    }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Save")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}


