import { App, Modal, setIcon, MarkdownRenderer, Notice, Component, ItemView } from "obsidian";
import { Canvas, CanvasNode } from "obsidian/canvas";
import { IMomePlugin } from "../types";
import { ApiService } from "../services/api-service";
import { API_PATHS } from "../constants";
import { setTextNodeText, getCanvasNodeTextAndSelection, CanvasNodeTextSelection, CanvasContext } from "../utils/canva-utils";
import { applyGraphUpdates } from "../features/commons";
import { SurgeonInstructionModal } from "./surgeon-instruction-modal";

export class FullscreenNodeModal extends Modal {
    private plugin: IMomePlugin;
    private text: string;
    private canvas: Canvas;
    private node: CanvasNode;
    private sourcePath: string;

    private isEditing = false;
    private bodyEl: HTMLElement | null = null;
    private bottomBarEl: HTMLElement | null = null;
    private textareaEl: HTMLTextAreaElement | null = null;

    constructor(app: App, plugin: IMomePlugin, canvas: Canvas, node: CanvasNode, sourcePath: string) {
        super(app);
        this.plugin = plugin;
        this.canvas = canvas;
        this.node = node;
        this.sourcePath = sourcePath;
        this.text = String((node as any).text ?? "");

        this.modalEl.addClass("mome-fullscreen-node-modal");
        this.modalEl.addClass("mod-no-status-bar");
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

        // Surgeon button (only meaningful in edit mode)
        const surgeonBtn = this.bottomBarEl.createEl("button", { text: "TheSurgeon" });
        surgeonBtn.addEventListener("click", async () => {
            if (!this.isEditing) {
                new Notice("Switch to Edit mode to run TheSurgeon.");
                return;
            }
            await this.runSurgeonFromFullscreen();
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
            this.text = String((this.node as any).text ?? this.text ?? "");

            const mdContainer = this.bodyEl.createDiv({ cls: "mome-fullscreen-markdown" });
            const mdParent = new Component();

            await MarkdownRenderer.render(
                this.app,
                this.text,
                mdContainer,
                this.sourcePath,
                mdParent
            );


        }
    }

    private buildCanvasContext(): CanvasContext {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath) as any;

        // Get the canvas view directly from the active leaf
        const view = this.plugin.app.workspace.getActiveViewOfType(ItemView as any);
        // If you want stricter: check view.getViewType() === "canvas"

        return {
            view: view as any,
            canvas: this.canvas,
            file,
            absolutePath: (this.plugin.app.vault.adapter as any).getFullPath(this.sourcePath),
            relativePath: this.sourcePath,
            canvasData: this.canvas.getData()
        };
    }


    // private buildCanvasContext(): CanvasContext {
    //     const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath) as any;
    //     return {
    //         view: (this.plugin.app.workspace.getActiveViewOfType as any)?.("canvas") ?? null,
    //         canvas: this.canvas,
    //         file,
    //         absolutePath: (this.plugin.app.vault.adapter as any).getFullPath(this.sourcePath),
    //         relativePath: this.sourcePath,
    //         canvasData: this.canvas.getData()
    //     };
    // }

    private async runSurgeonFromFullscreen() {
        // 1. Make sure we have the latest text from the textarea
        this.syncFromTextarea();

        // 2. Determine selection
        let fullText = this.text ?? "";
        let selectedText = "";
        let from = { line: 0, ch: 0 };
        let to   = { line: 0, ch: 0 };

        if (this.isEditing && this.textareaEl) {
            // Selection from fullscreen textarea
            const ta = this.textareaEl;
            const start = ta.selectionStart ?? 0;
            const end   = ta.selectionEnd ?? start;

            selectedText = fullText.slice(start, end);

            from = { line: 0, ch: start };
            to   = { line: 0, ch: end };
        } else {
            // Fallback: selection from canvas node editor iframe
            const selInfo = getCanvasNodeTextAndSelection(this.node);
            selectedText = selInfo?.selectedText ?? "";
            from = selInfo?.from ?? { line: 0, ch: 0 };
            to   = selInfo?.to ?? { line: 0, ch: 0 };
        }

        if (!selectedText || selectedText.trim() === "") {
            new Notice("TheSurgeon: No text selected.");
            return;
        }


        if (!selectedText || selectedText.trim() === "") {
            new Notice("TheSurgeon: No text selected in the node editor.");
            return;
        }

        // 3. Fetch surgeon tools, same way as TheSurgeonCanvas
        const ctx = this.buildCanvasContext();
        let tools: SurgeonTool[] = [];
        try {
            const raw = await ApiService.getSurgeonAvailableTools(
                this.plugin.settings.baseUrl,
                API_PATHS.SURGEON_AVAILABLE_TOOLS,
                ctx
            );

            if (Array.isArray(raw)) {
                tools = raw.map((t: any) => ({
                    id: t.id ?? t.name ?? String(t),
                    name: t.name ?? String(t),
                    desc: t.desc ?? t.description ?? ""
                }));
            } else if (raw && Array.isArray(raw.tools)) {
                tools = raw.tools.map((t: any) => ({
                    id: t.id ?? t.name ?? String(t),
                    name: t.name ?? String(t),
                    desc: t.desc ?? t.description ?? ""
                }));
            }
        } catch (e) {
            console.error("[FullscreenNodeModal] Failed to fetch surgeon tools:", e);
            new Notice("TheSurgeon: failed to fetch available tools.");
        }

        // 4. Open the SurgeonInstructionModal from fullscreen
        new SurgeonInstructionModal(
            this.app,
            async (instruction: string, toolId: string | null) => {
                if (!instruction || instruction.trim() === "") {
                    new Notice("TheSurgeon: Instruction is empty, cancelled.");
                    return;
                }

                const extra = {
                    instruction,
                    node_id: (this.node as any).id,
                    full_text: fullText,
                    selected_text: selectedText,
                    selection_from: from,
                    selection_to: to,
                    tool_id: toolId ?? undefined
                };

                const nodeIds = [(this.node as any).id];
                const opId = `surgeon-fullscreen-${Date.now()}`;

                try {
                    this.plugin.busyIndicator?.start(opId, "TheSurgeon running...");

                    const response = await ApiService.sendGraphContext(
                        this.plugin.settings.baseUrl,
                        API_PATHS.SURGEON_BASIC,
                        ctx,
                        nodeIds,
                        undefined,
                        { extra }
                    );

                    if (Array.isArray(response.updates) && response.updates.length > 0) {
                        const changes = applyGraphUpdates(ctx, response.updates);
                        if (changes > 0) {
                            new Notice(`TheSurgeon: Applied ${changes} changes.`);
                            // Re-sync text after updates
                            this.text = String((this.node as any).text ?? this.text ?? "");
                            await this.renderBody();
                        } else {
                            new Notice("TheSurgeon: No changes applied.");
                        }
                    } else if ((response as any).message) {
                        new Notice(`TheSurgeon: ${(response as any).message}`);
                    } else {
                        new Notice("TheSurgeon: No updates returned.");
                    }
                } catch (e: any) {
                    console.error("[FullscreenNodeModal] TheSurgeon error:", e);
                    new Notice(`TheSurgeon (fullscreen) error: ${e?.message || e}`);
                } finally {
                    this.plugin.busyIndicator?.end(opId);
                }
            },
            "",
            tools
        ).open();
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
