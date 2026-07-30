
export function safeDict<T extends Record<string, any>>(dict: T): T & Record<string, T[keyof T]> {
    return new Proxy(dict, {
        get(target, prop: string) {
            if (prop in target) return target[prop];
            // Fallback for unknown keys to prevent crashes
            return {
                label: prop,
                icon: "help_outline",
                chip: "bg-surface-container-high text-on-surface-variant",
                dot: "bg-outline",
                color: "#83746b",
                prefix: "???",
                code: "???"
            } as any;
        }
    }) as any;
}
