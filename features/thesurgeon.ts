// features/thesurgeon.ts
import { Notice } from "obsidian";
import { IMomePlugin } from "../types";
import { ApiService } from "../services/api-service";
import { API_PATHS } from "../constants";
import { getCanvasContext, getSelectedOrLastTextNode, getCanvasNodeTextAndSelection,} from "../utils/canva-utils";
import { applyGraphUpdates } from "./commons";
import { SurgeonInstructionModal, SurgeonTool } from "../modals/surgeon-instruction-modal";

interface SurgeonCanvasExtra {
    instruction: string;
    node_id: string;
    full_text: string;
    selected_text: string;
    selection_from: { line: number; ch: number };
    selection_to: { line: number; ch: number };
    tool_id?: string | null;          // NEW: which surgeon variant
}

interface SurgeonResponse {
    message?: string;
    updates?: any[];
    [key: string]: any;
}

export const TheSurgeonCanvas = {
    async runOnNode(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) {
            new Notice("TheSurgeon: No active canvas.");
            return;
        }

        const node = getSelectedOrLastTextNode(ctx.canvas);
        if (!node) {
            new Notice("TheSurgeon: No text node selected.");
            return;
        }

        const selInfo = getCanvasNodeTextAndSelection(node);
        if (!selInfo) {
            new Notice("TheSurgeon: cannot detect text selection inside this canvas node.");
            return;
        }

        const { fullText, selectedText, from, to } = selInfo;

        if (!selectedText || selectedText.trim() === "") {
            new Notice("TheSurgeon: No text highlighted in this node.");
            return;
        }

        // --- NEW: Fetch available surgeon tools from API ---
        let tools: SurgeonTool[] = [];
        try {
            const raw = await ApiService.getSurgeonAvailableTools(
                plugin.settings.baseUrl,
                API_PATHS.SURGEON_AVAILABLE_TOOLS,
                ctx
            );

            // normalize the response into SurgeonTool[]
            // You can adapt based on your backend shape
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
            console.error("[TheSurgeonCanvas] Failed to fetch surgeon tools:", e);
            new Notice("TheSurgeon: failed to fetch available tools.");
        }

        // Open instruction modal (now with dropdown)
        new SurgeonInstructionModal(
            plugin.app,
            async (instruction: string, toolId: string | null) => {
                if (!instruction || instruction.trim() === "") {
                    new Notice("TheSurgeon: Instruction is empty, cancelled.");
                    return;
                }

                const extra: SurgeonCanvasExtra = {
                    instruction,
                    node_id: (node as any).id,
                    full_text: fullText,
                    selected_text: selectedText,
                    selection_from: from,
                    selection_to: to,
                    tool_id: toolId ?? undefined
                };

                // new Notice(`Selected text: ${selectedText}`);

                const nodeIds = [(node as any).id];
                const opId = `surgeon-canvas-${Date.now()}`;

                try {
                    plugin.busyIndicator?.start(opId, "TheSurgeon running...");

                    const response: SurgeonResponse = await ApiService.sendGraphContext(
                        plugin.settings.baseUrl,
                        API_PATHS.SURGEON_BASIC,
                        ctx,
                        nodeIds,
                        undefined,
                        { extra }   // surgeon specific
                    );

                    if (Array.isArray(response.updates) && response.updates.length > 0) {
                        const changes = applyGraphUpdates(ctx, response.updates);
                        if (changes > 0) {
                            new Notice(`TheSurgeon: Applied ${changes} changes.`);
                        } else {
                            new Notice("TheSurgeon: No changes applied.");
                        }
                    } else if (response.message) {
                        new Notice(`TheSurgeon: ${response.message}`);
                    } else {
                        new Notice("TheSurgeon: No updates returned.");
                    }
                } catch (e: any) {
                    console.error("[TheSurgeonCanvas] Error:", e);
                    new Notice(`TheSurgeon (canvas) error: ${e?.message || e}`);
                } finally {
                    plugin.busyIndicator?.end(opId);
                }
            },
            "",
            tools
        ).open();
    }
};
