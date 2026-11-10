import { App, Modal, Setting, Notice } from "obsidian";
import { IMomePlugin } from "./types";
import { ApiService } from "./services/api-service";
import { API_PATHS } from "./constants";
import { CanvasContext } from "./utils/canva-utils";

export interface HeuristicFunction {
    name: string;
    desc: string;
    arguments: { name: string; type: string }[];
}

// Helper function to fetch heuristics from API using ApiService
export async function fetchHeuristics(plugin: IMomePlugin, ctx: CanvasContext): Promise<HeuristicFunction[]> {
    console.log("[HeuristicModal] Fetching heuristics...");
    try {
        // Use the API Service to abstract the path/content logic
        const data = await ApiService.getHeuristicsDesc(
            plugin.settings.baseUrl, 
            API_PATHS.HEURISTICS_DESC, 
            ctx
        );
        
        console.log("[HeuristicModal] Received heuristics:", data);
        
        if (!Array.isArray(data)) {
            console.error("[HeuristicModal] Invalid response format. Expected array.", data);
            return [];
        }

        return data;
    } catch (error) {
        console.error("[HeuristicModal] Error fetching heuristics:", error);
        new Notice("Failed to fetch heuristics. Check console.");
        return [];
    }
}

export function extractArgNames(argDefs: any[]): string[] {
    if (!Array.isArray(argDefs)) return [];
    const names: string[] = [];

    for (const def of argDefs) {
        if (typeof def === "string") {
            names.push(def);
        } else if (def && typeof def === "object") {
            // Format A: { name: string, type?, desc? }
            if ("name" in def && typeof def.name === "string") {
                names.push(def.name);
            } else {
                // Format B: { argName: "description" } (single key)
                const keys = Object.keys(def);
                if (keys.length === 1) names.push(keys[0]);
            }
        }
    }
    return names;
}


// Main function to orchestrate the two-step modal process
export async function openHeuristicSelector(
    plugin: IMomePlugin, 
    ctx: CanvasContext, 
    onComplete: (heuristic: HeuristicFunction, args: Record<string, any>) => void
) {
    console.log("[HeuristicModal] Opening Selector...");
    
    // 1. Fetch
    const heuristics = await fetchHeuristics(plugin, ctx);
    
    if (!heuristics || heuristics.length === 0) {
        console.warn("[HeuristicModal] No heuristics returned or empty list.");
        new Notice("No heuristics available or API failed.");
        return;
    }

    // 2. Open Selector Modal
    new HeuristicSelectorModal(plugin.app, heuristics, (selectedHeuristic) => {
        console.log("[HeuristicModal] Selected:", selectedHeuristic.name);
        
        // 3. Check Arguments
        if (!selectedHeuristic.arguments || selectedHeuristic.arguments.length === 0) {
            // If no arguments needed, execute immediately
            onComplete(selectedHeuristic, {});
        } else {
            // Otherwise, open arguments modal
            new HeuristicArgumentsModal(plugin.app, selectedHeuristic, (args) => {
                onComplete(selectedHeuristic, args);
            }).open();
        }
    }).open();
}

// --- Modals ---

class HeuristicSelectorModal extends Modal {
    private heuristics: HeuristicFunction[];
    private onSelect: (item: HeuristicFunction) => void;

    constructor(app: App, heuristics: HeuristicFunction[], onSelect: (item: HeuristicFunction) => void) {
        super(app);
        this.heuristics = heuristics;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Select Heuristic" });

        const container = contentEl.createDiv();
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";

        this.heuristics.forEach((heuristic) => {
            const itemDiv = container.createDiv();
            itemDiv.style.padding = "10px";
            itemDiv.style.border = "1px solid var(--background-modifier-border)";
            itemDiv.style.borderRadius = "5px";
            itemDiv.style.cursor = "pointer";
            itemDiv.addClass("heuristic-item"); // For styling if needed

            // Title
            itemDiv.createEl("strong", { text: heuristic.name, cls: "heuristic-name" });
            
            // Description
            if (heuristic.desc) {
                itemDiv.createEl("div", { text: heuristic.desc, cls: "heuristic-desc" });
            }

            itemDiv.onclick = () => {
                this.close();
                this.onSelect(heuristic);
            };
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}


class HeuristicArgumentsModal extends Modal {
    private heuristic: HeuristicFunction;
    private onSubmit: (args: Record<string, any>) => void;
    private args: Record<string, any> = {};

    constructor(app: App, heuristic: HeuristicFunction, onSubmit: (args: Record<string, any>) => void) {
        super(app);
        this.heuristic = heuristic;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        console.log(this.heuristic);

        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: `Arguments for ${this.heuristic.name}` });

        const argsContainer = contentEl.createDiv();

        // Normalize arguments into a common structure
        const defs: { name: string; desc?: string; type?: string }[] = [];
        for (const argObj of this.heuristic.arguments || []) {
            if (argObj && typeof argObj === "object" && ("name" in argObj || "type" in argObj)) {
                // Format: { name: string, type?: string, desc?: string }
                const a = argObj as any;
                defs.push({ name: a.name ?? "arg", desc: a.desc ?? "", type: a.type ?? "str" });
            } else if (argObj && typeof argObj === "object") {
                // Format: { argName: "description" } (as logged)
                for (const [key, val] of Object.entries(argObj)) {
                    defs.push({ name: key, desc: typeof val === "string" ? val : "" });
                }
            } else if (typeof argObj === "string") {
                // Fallback: raw name
                defs.push({ name: argObj, desc: "" });
            }
        }

        if (defs.length === 0) {
            contentEl.createEl("div", { text: "No arguments required." });
        } else {
            defs.forEach(def => {
                // Initialize default empty value
                if (this.args[def.name] === undefined) this.args[def.name] = "";

                new Setting(argsContainer)
                    .setName(def.name)
                    .setDesc(def.desc ? `Type: ${def.type ?? "str"} — ${def.desc}` : `Type: ${def.type ?? "str"}`)
                    .addText(text => {
                        if (def.desc) text.setPlaceholder(def.desc);
                        text.onChange(value => {
                            this.args[def.name] = value;
                        });
                    });
            });
        }

        new Setting(contentEl)
            .addButton(btn =>
                btn
                    .setButtonText("Execute")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.args);
                    })
            );
    }

    onClose() {
        this.contentEl.empty();
    }
}

