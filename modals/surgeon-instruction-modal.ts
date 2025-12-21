import { App, Modal, Setting } from "obsidian";


export interface SurgeonTool {
    id: string;          // or some internal key
    name: string;        // human label
    desc?: string;
}
export class SurgeonInstructionModal extends Modal {
    instruction: string;
    onSubmit: (instruction: string, toolId: string | null) => void;

    private tools: SurgeonTool[];
    private selectedToolId: string | null;

    constructor(
        app: App,
        onSubmit: (instruction: string, toolId: string | null) => void,
        initialInstruction = "",
        tools: SurgeonTool[] = [],
        initialToolId: string | null = null
    ) {
        super(app);
        this.instruction = initialInstruction;
        this.onSubmit = onSubmit;
        this.tools = tools;
        this.selectedToolId = initialToolId ?? (tools[0]?.id ?? null);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.addClass("the-surgeon-modal-root");

        contentEl.createEl("h2", { text: "TheSurgeon instruction" });

        if (this.tools.length > 0) {
    // Optional: keep the heading, or remove if you don't want it
    // contentEl.createEl("h3", { text: "Surgeon type" });

    // Container for dropdown + description in the top-right area
    const container = contentEl.createDiv();
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-end";   // right-align contents
    container.style.justifyContent = "flex-start";
    container.style.gap = "4px";
    container.style.width = "100%";           // allow alignment within full width

    // Label
    const labelEl = container.createDiv();
    labelEl.addClass("setting-item-description");
    labelEl.style.textAlign = "right";

    // Row for select + description
    const row = container.createDiv();
    row.style.display = "flex";
    row.style.flexDirection = "column";       // stacked, still right-aligned
    row.style.alignItems = "flex-end";
    row.style.gap = "4px";

    // Dropdown
    const selectEl = row.createEl("select");
    selectEl.style.maxWidth = "260px";

    this.tools.forEach((tool) => {
        const opt = selectEl.createEl("option");
        opt.value = tool.id;
        opt.textContent = tool.name;
    });

    const initialId =
        this.selectedToolId && this.tools.some(t => t.id === this.selectedToolId)
            ? this.selectedToolId
            : this.tools[0].id;

    selectEl.value = initialId;
    this.selectedToolId = initialId;

    // Description for the selected tool
    const descEl = row.createDiv();
    descEl.addClass("setting-item-description");
    descEl.style.textAlign = "right";

    const updateDesc = () => {
        const tool = this.tools.find(t => t.id === this.selectedToolId);
        descEl.textContent = tool?.desc || "";
    };

    selectEl.addEventListener("change", () => {
        this.selectedToolId = selectEl.value;
        updateDesc();
    });

    updateDesc();
}




        // Label + description above the textarea, full width
        const labelEl = contentEl.createEl("div", {
            cls: "the-surgeon-label"
        });
        labelEl.createEl("div", {
            text: "Instruction",
            cls: "setting-item-name"
        });
        
        labelEl.style.marginBottom = "0.5em";

        const textareaContainer = contentEl.createDiv({
            cls: "the-surgeon-textarea-container"
        });

        const inputEl = textareaContainer.createEl("textarea");
        inputEl.style.width = "100%";
        inputEl.style.height = "120px";
        inputEl.value = this.instruction;
        inputEl.addEventListener("input", (evt) => {
            this.instruction = (evt.target as HTMLTextAreaElement).value;
        });

        new Setting(contentEl)
            .addButton(btn =>
                btn
                    .setButtonText("Run TheSurgeon")
                    .setCta()
                    .onClick(() => {
                        this.submit();
                    })
            );

        contentEl.addEventListener("keydown", (evt) => {
            if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter" && !evt.isComposing) {
                evt.preventDefault();
                this.submit();
            }
        });

        setTimeout(() => inputEl.focus(), 0);
    }

    submit() {
        this.close();
        this.onSubmit(this.instruction, this.selectedToolId ?? null);
    }

    onClose() {
        this.contentEl.empty();
    }
}



