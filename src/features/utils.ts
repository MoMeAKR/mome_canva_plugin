import { App, Modal } from "obsidian";

export class PrefixInputModal extends Modal {
    private onConfirm: (prefix: string) => void;
    private defaultPrefix: string;

    constructor(app: App, onConfirm: (prefix: string) => void, defaultPrefix = "Pasted image") {
        super(app);
        this.onConfirm = onConfirm;
        this.defaultPrefix = defaultPrefix;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h3", { text: "Delete local files by prefix" });

        const input = contentEl.createEl("input", { type: "text" });
        input.value = this.defaultPrefix;
        input.placeholder = this.defaultPrefix;
        input.style.width = "100%";
        input.style.marginTop = "8px";

        const buttonRow = contentEl.createEl("div");
        buttonRow.style.marginTop = "12px";
        buttonRow.style.display = "flex";
        buttonRow.style.gap = "8px";

        const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
        cancelBtn.addEventListener("click", () => this.close());

        const deleteBtn = buttonRow.createEl("button", { text: "Delete files" });
        deleteBtn.addEventListener("click", () => {
            const prefix = (input.value || this.defaultPrefix).trim();
            this.onConfirm(prefix);
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
