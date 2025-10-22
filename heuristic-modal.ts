import { App, FuzzySuggestModal, Modal, Setting, Notice } from "obsidian";

// Interface for heuristic functions
interface HeuristicFunction {
    name: string;
    description?: string;
    arguments: HeuristicArgument[];
}

interface HeuristicArgument {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
}

// Step 1: Modal to select heuristic function
export class HeuristicSelectorModal extends FuzzySuggestModal<HeuristicFunction> {
    private heuristics: HeuristicFunction[];
    private onSelect: (heuristic: HeuristicFunction) => void;

    constructor(app: App, heuristics: HeuristicFunction[], onSelect: (heuristic: HeuristicFunction) => void) {
        super(app);
        this.heuristics = heuristics;
        this.onSelect = onSelect;
        this.setPlaceholder("Search for a heuristic function...");
    }

    getItems(): HeuristicFunction[] {
        return this.heuristics;
    }

    getItemText(heuristic: HeuristicFunction): string {
        return heuristic.name + (heuristic.description ? " " + heuristic.description : "");
    }

    onChooseItem(heuristic: HeuristicFunction, evt: MouseEvent | KeyboardEvent): void {
        this.onSelect(heuristic);
    }
}


// // Step 2: Modal to fill in arguments for selected heuristic
export class HeuristicArgumentsModal extends Modal {
    private heuristic: HeuristicFunction;
    private onSubmit: (args: Record<string, any>) => void;
    private argumentValues: Record<string, any> = {};
    private handleEnter: (e: KeyboardEvent) => void; // <-- add this

    constructor(app: App, heuristic: HeuristicFunction, onSubmit: (args: Record<string, any>) => void) {
        super(app);
        this.heuristic = heuristic;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.setTitle(`Configure: ${this.heuristic.name}`);

        // Add description if available
        if (this.heuristic.desc) {
            contentEl.createEl('p', { 
                text: this.heuristic.description,
                cls: 'setting-item-description'
            });
        }

        // Create input fields for each argument
        this.heuristic.arguments.forEach((argObj) => {
            // Each argObj is { user_query: "...desc..." }
            const argName = Object.keys(argObj)[0];
            const argDesc = argObj[argName];

            new Setting(contentEl)
                .setName(argName)
                .setDesc(argDesc)
                .addText((text) => {
                    text.onChange((value) => {
                        this.argumentValues[argName] = value;
                    });
                });
        });

        // The submit logic, extracted for reuse
        const submit = () => {
            const missingRequired = this.heuristic.arguments
                .filter(arg => arg.required && !this.argumentValues[arg.name])
                .map(arg => arg.name);

            if (missingRequired.length > 0) {
                new Notice(`Missing required fields: ${missingRequired.join(', ')}`);
                return;
            }

            this.close();
            this.onSubmit(this.argumentValues);
        };

        // Add submit button
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Execute')
                    .setCta()
                    .onClick(submit))
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    }));

        // --- Add keydown event listener for Enter ---
        this.handleEnter = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                // Only trigger if focus is inside the modal
                if (contentEl.contains(document.activeElement)) {
                    e.preventDefault();
                    submit();
                }
            }
        };
        window.addEventListener("keydown", this.handleEnter);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        // --- Remove the event listener ---
        if (this.handleEnter) {
            window.removeEventListener("keydown", this.handleEnter);
        }
    }
}


// Helper function to fetch heuristics from API
export async function fetchHeuristics(dataPath): Promise<HeuristicFunction[]> {
    try {
        const response = await fetch("http://localhost:8000/LaToile/heuristics_desc", {
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ canvas_path: dataPath })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching heuristics:", error);
        new Notice("Failed to fetch heuristics from API");
        return [];
    }
}

// Main function to orchestrate the two-step modal process
export async function openHeuristicSelector(dataPath: str, app: App, onComplete: (heuristic: HeuristicFunction, args: Record<string, any>) => void) {
    // Fetch heuristics from API
    const heuristics = await fetchHeuristics(dataPath);
    
    if (heuristics.length === 0) {
        new Notice("No heuristics available");
        return;
    }

    // Step 1: Open heuristic selector
    new HeuristicSelectorModal(app, heuristics, (selectedHeuristic) => {
        // Step 2: Open arguments modal for selected heuristic
        if (selectedHeuristic.arguments.length === 0) {
            // If no arguments needed, execute immediately
            onComplete(selectedHeuristic, {});
        } else {
            // Otherwise, open arguments modal
            new HeuristicArgumentsModal(app, selectedHeuristic, (args) => {
                onComplete(selectedHeuristic, args);
            }).open();
        }
    }).open();
}

