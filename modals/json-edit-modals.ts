// src/modals/json-edit-modals.ts

import { App, Modal, Setting } from "obsidian";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | Record<string, any> | any[];

export class JsonEditModal extends Modal {
    values: Record<string, JsonValue>;
    onSubmit: (updated: Record<string, JsonValue>) => void;
    private isNested: boolean;
    private originalIsArray: boolean;

    constructor(
        app: App,
        initial: Record<string, JsonValue>,
        onSubmit: (updated: Record<string, JsonValue>) => void,
        isNested: boolean = false,
        originalIsArray: boolean = false
    ) {
        super(app);
        this.values = { ...initial };
        this.onSubmit = onSubmit;
        this.isNested = isNested;
        this.originalIsArray = originalIsArray;
    }

    private inferDefaultNewArrayItem(arr: any[]): JsonValue {
        if (arr.length === 0) return ""; // choose default; could be null or {}
        const counts = new Map<string, number>();
        for (const el of arr) {
            const t = Array.isArray(el) ? "array" : (el === null ? "null" : typeof el);
            counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        let best: string | null = null;
        let max = -1;
        for (const [t, c] of counts) {
            if (c > max) { max = c; best = t; }
        }
        switch (best) {
            case "string": return "";
            case "number": return 0;
            case "boolean": return false;
            case "null": return null;
            case "object": return {};
            case "array": return [];
            default: return "";
        }
    }

    private defaultValueForType(type: "string" | "number" | "boolean" | "null" | "object" | "array"): JsonValue {
        switch (type) {
            case "string": return "";
            case "number": return 0;
            case "boolean": return false;
            case "null": return null;
            case "object": return {};
            case "array": return [];
            default: return "";
        }
    }

    private makeUniqueKey(base: string): string {
        let key = base.trim();
        if (!key) key = "key";
        if (!Object.prototype.hasOwnProperty.call(this.values, key)) return key;
        let i = 1;
        while (Object.prototype.hasOwnProperty.call(this.values, `${key}_${i}`)) i++;
        return `${key}_${i}`;
    }

    private reindexArrayValues() {
        const ordered = Object.keys(this.values)
            .map((k) => Number(k))
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b)
            .map((n) => this.values[String(n)]);
        this.values = Object.fromEntries(ordered.map((v, i) => [String(i), v]));
    }

    private moveArrayItem(index: number, delta: number) {
        const ordered = Object.keys(this.values)
            .map((k) => Number(k))
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b)
            .map((n) => this.values[String(n)]);
        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= ordered.length) return;
        const [item] = ordered.splice(index, 1);
        ordered.splice(newIndex, 0, item);
        this.values = Object.fromEntries(ordered.map((v, i) => [String(i), v]));
    }

    private addObjectItemControls(setting: Setting, key: string) {
        if (this.originalIsArray) return; // Only for dict/object editing contexts

        // Rename key
        setting.addExtraButton((btn) =>
            btn
                .setIcon("pencil")
                .setTooltip("Rename key")
                .onClick(() => {
                    const current = key;
                    const input = window.prompt("Rename key", current);
                    if (input == null) return; // cancelled
                    const newName = input.trim();
                    if (!newName) return;

                    const finalKey = Object.prototype.hasOwnProperty.call(this.values, newName)
                        ? this.makeUniqueKey(newName)
                        : newName;

                    if (finalKey === current) return;

                    const val = this.values[current];
                    delete this.values[current];
                    this.values[finalKey] = val;

                    this.onClose();
                    this.onOpen();
                })
        );

        // Delete key
        setting.addExtraButton((btn) =>
            btn
                .setIcon("trash")
                .setTooltip("Delete key")
                .onClick(() => {
                    delete this.values[key];
                    this.onClose();
                    this.onOpen();
                })
        );
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const title = this.isNested
            ? (this.originalIsArray ? "Edit Array" : "Edit Object")
            : "Edit JSON Fields";
        contentEl.createEl("h2", { text: title });

        // Add controls for adding new entries depending on context
        if (this.originalIsArray) {
            // Nested array editor: add item
            const addSetting = new Setting(contentEl).setName("Add item");
            addSetting.addButton((btn) =>
                btn
                    .setButtonText("Add")
                    .setCta()
                    .onClick(() => {
                        const numericKeys = Object.keys(this.values)
                            .map((k) => Number(k))
                            .filter((n) => !isNaN(n));
                        const nextIndex = numericKeys.length ? Math.max(...numericKeys) + 1 : 0;

                        const currentValues = numericKeys
                            .sort((a, b) => a - b)
                            .map((n) => this.values[String(n)]);
                        const newItem = this.inferDefaultNewArrayItem(currentValues);

                        this.values[String(nextIndex)] = newItem;
                        this.onClose();
                        this.onOpen();
                    })
            );
        } else {
            // Dict/object editor (including root): add property with key and type
            let newPropKey = "";
            let newPropType: "string" | "number" | "boolean" | "null" | "object" | "array" = "string";

            const addPropSetting = new Setting(contentEl).setName("Add property");
            addPropSetting.addText((t) => {
                t.setPlaceholder("key");
                t.onChange((v) => (newPropKey = v));
            });
            addPropSetting.addDropdown((dd) => {
                dd.addOption("string", "string");
                dd.addOption("number", "number");
                dd.addOption("boolean", "boolean");
                dd.addOption("null", "null");
                dd.addOption("object", "object");
                dd.addOption("array", "array");
                dd.setValue("string");
                dd.onChange((v) => {
                    // Narrow to known types
                    if (v === "string" || v === "number" || v === "boolean" || v === "null" || v === "object" || v === "array") {
                        newPropType = v;
                    }
                });
            });
            addPropSetting.addButton((btn) =>
                btn
                    .setButtonText("Add")
                    .setCta()
                    .onClick(() => {
                        const base = newPropKey.trim();
                        const finalKey = this.makeUniqueKey(base || "key");
                        this.values[finalKey] = this.defaultValueForType(newPropType);
                        this.onClose();
                        this.onOpen();
                    })
            );
        }

        // Render entries (sorted if editing an array of numeric keys)
        const entries = Object.entries(this.values);
        const sortedEntries = this.originalIsArray
            ? entries.sort((a, b) => Number(a[0]) - Number(b[0]))
            : entries;

        sortedEntries.forEach(([key, value]) => {
            const label = this.originalIsArray ? `Index ${key}` : key;

            // --- Handle Primitive Types ---
            if (typeof value === "boolean") {
                const s = new Setting(contentEl).setName(label);
                s.addToggle((t) => {
                    t.setValue(value);
                    t.onChange((v) => (this.values[key] = v));
                });

                if (this.originalIsArray) {
                    this.addArrayItemControls(s, Number(key));
                } else {
                    this.addObjectItemControls(s, key);
                }
            } else if (typeof value === "number") {
                const s = new Setting(contentEl).setName(label);
                s.addText((t) => {
                    t.setValue(String(value));
                    t.onChange((v) => {
                        const num = Number(v);
                        this.values[key] = isNaN(num) ? v : num;
                    });
                });

                if (this.originalIsArray) {
                    this.addArrayItemControls(s, Number(key));
                } else {
                    this.addObjectItemControls(s, key);
                }
            } else if (typeof value === "string" || value === null) {
                const s = new Setting(contentEl).setName(label);
                s.addText((t) => {
                    t.setValue(value === null ? "" : String(value));
                    t.onChange((v) => (this.values[key] = v));
                });

                if (this.originalIsArray) {
                    this.addArrayItemControls(s, Number(key));
                } else {
                    this.addObjectItemControls(s, key);
                }
            }
            // --- Handle Objects and Arrays (Nested Structures) ---
            else if (typeof value === "object" && value !== null) {
                const isArray = Array.isArray(value);
                const s = new Setting(contentEl)
                    .setName(label)
                    .setDesc(isArray ? "Click to edit array elements" : "Click to edit object properties");

                // Open nested editor
                s.addButton((btn) =>
                    btn
                        .setButtonText(isArray ? "Edit Array" : "Edit Object")
                        .setCta()
                        .onClick(() => {
                            const initialNested = isArray
                                ? Object.fromEntries((value as any[]).map((v, i) => [String(i), v]))
                                : (value as Record<string, JsonValue>);

                            new JsonEditModal(
                                this.app,
                                initialNested,
                                (updatedNested) => {
                                    this.values[key] = isArray
                                        ? Object.keys(updatedNested)
                                            .sort((a, b) => Number(a) - Number(b))
                                            .map((k) => updatedNested[k])
                                        : updatedNested;

                                    this.onClose();
                                    this.onOpen();
                                },
                                true,
                                isArray
                            ).open();
                        })
                );

                // Quick-add for arrays at the parent level
                if (isArray) {
                    s.addExtraButton((btn) =>
                        btn
                            .setIcon("plus")
                            .setTooltip("Add new item")
                            .onClick(() => {
                                const arr = (this.values[key] as any[]) ?? [];
                                const newItem = this.inferDefaultNewArrayItem(arr);
                                arr.push(newItem);
                                this.values[key] = arr;
                                this.onClose();
                                this.onOpen();
                            })
                    );
                } else {
                    // Quick-add for dicts at the parent level: prompt for key, default to empty string
                    s.addExtraButton((btn) =>
                        btn
                            .setIcon("plus")
                            .setTooltip("Add property")
                            .onClick(() => {
                                const input = window.prompt("New property key", "");
                                if (input == null) return;
                                const finalKey = this.makeUniqueKey(input.trim() || "key");
                                const obj = (this.values[key] as Record<string, JsonValue>) ?? {};
                                obj[finalKey] = "";
                                this.values[key] = obj;
                                this.onClose();
                                this.onOpen();
                            })
                    );
                }

                if (this.originalIsArray) {
                    this.addArrayItemControls(s, Number(key));
                } else {
                    this.addObjectItemControls(s, key);
                }
            }
        });

        // --- Save Button for the current modal ---
        new Setting(contentEl).addButton((btn) =>
            btn
                .setButtonText("Save")
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.values);
                })
        );
    }

    private addArrayItemControls(setting: Setting, index: number) {
        if (!this.originalIsArray || isNaN(index)) return;

        setting.addExtraButton((btn) =>
            btn
                .setIcon("chevron-up")
                .setTooltip("Move up")
                .onClick(() => {
                    this.moveArrayItem(index, -1);
                    this.onClose();
                    this.onOpen();
                })
        );

        setting.addExtraButton((btn) =>
            btn
                .setIcon("chevron-down")
                .setTooltip("Move down")
                .onClick(() => {
                    this.moveArrayItem(index, +1);
                    this.onClose();
                    this.onOpen();
                })
        );

        setting.addExtraButton((btn) =>
            btn
                .setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    delete this.values[String(index)];
                    this.reindexArrayValues();
                    this.onClose();
                    this.onOpen();
                })
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}
