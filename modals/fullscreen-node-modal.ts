import { App, Modal, setIcon, MarkdownRenderer } from "obsidian";
import { Canvas, CanvasNode } from "obsidian/canvas";
import { setTextNodeText } from "../utils/canva-utils";

export class FullscreenNodeModal extends Modal {
    private text: string;
    private canvas: Canvas;
    private node: CanvasNode;

    private isEditing = false;
    private bodyEl: HTMLElement | null = null;
    private bottomBarEl: HTMLElement | null = null;
    private textareaEl: HTMLTextAreaElement | null = null;

    constructor(app: App, canvas: Canvas, node: CanvasNode) {
        super(app);
        this.canvas = canvas;
        this.node = node;
        this.text = String((node as any).text ?? "");

        this.modalEl.addClass("mome-fullscreen-node-modal");
        this.modalEl.addClass("mod-no-status-bar"); // hides status bar on mobile
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const wrapper = contentEl.createDiv({ cls: "mome-fullscreen-wrapper" });

        // Top-left close button
        const closeBtn = wrapper.createDiv({ cls: "mome-fullscreen-close" });
        setIcon(closeBtn, "x");
        closeBtn.onclick = () => this.close();

        // Scrollable body
        this.bodyEl = wrapper.createDiv({ cls: "mome-fullscreen-body markdown-rendered" });

        // Bottom bar
        this.bottomBarEl = wrapper.createDiv({ cls: "mome-fullscreen-bottom-bar" });
        this.bottomBarEl.style.position = "absolute";
        this.bottomBarEl.style.bottom = "12px";
        this.bottomBarEl.style.right = "16px";
        this.bottomBarEl.style.display = "flex";
        this.bottomBarEl.style.gap = "8px";

        // Edit toggle button
        const toggleEditBtn = this.bottomBarEl.createEl("button", { text: "Edit" });
        toggleEditBtn.addEventListener("click", async () => {
            if (this.isEditing) {
                // Leaving edit mode → save contents
                this.syncFromTextarea();
                this.applyToNode();
            }
            this.isEditing = !this.isEditing;
            toggleEditBtn.textContent = this.isEditing ? "View" : "Edit";
            await this.renderBody();
        });

        // Close button (explicit)
        const closeBottomBtn = this.bottomBarEl.createEl("button", { text: "Close" });
        closeBottomBtn.addEventListener("click", () => this.close());

        // Initial: view mode
        this.isEditing = false;
        await this.renderBody();
    }

    /**
     * Copy current textarea value into this.text
     */
    private syncFromTextarea() {
        if (this.textareaEl) {
            this.text = this.textareaEl.value;
        }
    }

    /**
     * Apply this.text to the underlying canvas node
     */
    private applyToNode() {
        setTextNodeText(this.canvas, this.node, this.text);
    }

    private async renderBody() {
        if (!this.bodyEl) return;
        this.bodyEl.empty();

        if (this.isEditing) {
            // EDIT MODE
            this.bodyEl.removeClass("markdown-rendered");

            const textarea = this.bodyEl.createEl("textarea");
            textarea.value = this.text;
            textarea.style.width = "100%";
            textarea.style.height = "100%";
            textarea.style.resize = "none";
            textarea.style.boxSizing = "border-box";
            textarea.addClass("mome-fullscreen-textarea");
            this.textareaEl = textarea;

            // Keep this.text in sync as you type
            textarea.addEventListener("input", () => {
                this.text = textarea.value;
            });

            // Ctrl/Cmd+Enter: save + stay in edit (or switch to view if you prefer)
            textarea.addEventListener("keydown", (evt) => {
                if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
                    evt.preventDefault();
                    this.syncFromTextarea();
                    this.applyToNode();
                }
            });

            setTimeout(() => textarea.focus(), 0);
        } else {
            // VIEW MODE: always render latest node text
            this.bodyEl.addClass("markdown-rendered");
            // Re-read from node, in case something else changed it
            this.text = String((this.node as any).text ?? this.text ?? "");

            const mdContainer = this.bodyEl.createDiv({ cls: "mome-fullscreen-markdown" });
            await MarkdownRenderer.renderMarkdown(
                this.text,
                mdContainer,
                this.node?.file?.path ?? "",
                this
            );
        }
    }

    onClose() {
        // If we are closing while in edit mode, also save
        if (this.isEditing) {
            this.syncFromTextarea();
            this.applyToNode();
        }
        this.contentEl.empty();
    }
}
