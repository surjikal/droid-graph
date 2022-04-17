const VALUE_PARSERS = {
    pot: (value: string) => {
        const [controllerIndex, potIndex] = value
            .replace('P', '')
            .split('.')
            .map(x => parseInt(x));
        return {
            primitive: false,
            type: 'pot',
            value,
            controller: { index: controllerIndex },
            index: potIndex,
        };
    },
    button: (value: string) => {
        const [controller, index] = value
            .replace('B', '')
            .split('.')
            .map(x => parseInt(x));
        return { primitive: false, type: 'button', value, controller: { index: controller }, index };
    },
    led: (value: string) => {
        const [controller, index] = value
            .replace('L', '')
            .split('.')
            .map(x => parseInt(x));
        return { primitive: false, type: 'led', value, controller: { index: controller }, index };
    },
    output: (value: string) => {
        const index = parseInt(value.replace('O', ''));
        return { primitive: false, type: 'output', value, index };
    },
    input: (value: string) => {
        const index = parseInt(value.replace('I', ''));
        return { primitive: false, type: 'input', value, index };
    },
    input_normalized: (value: string) => {
        const index = parseInt(value.replace('N', ''));
        return { primitive: false, type: 'input_normalized', value, index };
    },
    register: (value: string) => {
        const index = parseInt(value.replace('R', ''));
        return { primitive: false, type: 'register', value, index };
    },
    voltage: (value: string) => {
        const index = parseInt(value.replace('V', ''));
        return { primitive: true, type: 'voltage', value, index };
    },
    variable: (value: string) => {
        return { primitive: false, type: 'variable', value };
    },
    number: (value: string) => {
        return { primitive: true, type: 'number', value };
    },
} as const;

function parseParamValue(value: string): PatchParamValue {
    value = value.replace(/[()]/g, '');
    value = value.toUpperCase();
    if (value.includes('*') || value.includes('/') || value.includes('+') || value.includes('-')) {
        const tokens = value.split(/[*/+\-]/);
        const params = tokens.map(parseValue);
        return { primitive: false, type: 'expression', value, params };
    } else {
        return parseValue(value) as any;
    }
}

export type PatchValue<U = keyof typeof VALUE_PARSERS> = U extends 'expression'
    ? { type: 'expression'; primitive: boolean; value: string; params: PatchParamValue<Omit<U, 'expression'>>[] }
    : U extends keyof typeof VALUE_PARSERS
    ? { type: U } & Omit<ReturnType<typeof VALUE_PARSERS[U]>, 'type'>
    : { type: keyof typeof VALUE_PARSERS; primitive: boolean; value: string };

export type PatchParamValue<U = 'expression' | keyof typeof VALUE_PARSERS> = U extends 'expression'
    ? { type: 'expression'; primitive: boolean; value: string; params: PatchValue[] }
    : U extends keyof typeof VALUE_PARSERS
    ? { type: U } & Omit<ReturnType<typeof VALUE_PARSERS[U]>, 'type'>
    : { type: keyof typeof VALUE_PARSERS; primitive: boolean; value: string };

export type PatchParam<U = 'expression' | keyof typeof VALUE_PARSERS> = { name: string; value: PatchParamValue<U> };

function parseValue(value: string): PatchValue {
    return ((): any => {
        if (value.startsWith('P')) return VALUE_PARSERS.pot(value);
        if (value.startsWith('B')) return VALUE_PARSERS.button(value);
        if (value.startsWith('L')) return VALUE_PARSERS.led(value);
        if (value.startsWith('O')) return VALUE_PARSERS.output(value);
        if (value.startsWith('I')) return VALUE_PARSERS.input(value);
        if (value.startsWith('R')) return VALUE_PARSERS.register(value);
        if (value.startsWith('N')) return VALUE_PARSERS.input_normalized(value);
        if (value.match(/^\d+(\.\d+)?V$/)) return VALUE_PARSERS.voltage(value);
        if (value.match(/^\d+/)) return VALUE_PARSERS.number(value);
        return VALUE_PARSERS.variable(value);
    })();
}

function* parseCircuits(circuits: string[][]) {
    for (const circuit of circuits) {
        const name = circuit[0].replace('[', '').replace(']', '');
        const params = circuit.slice(1).flatMap(line => {
            const [name, value] = line.split('=');
            if (!value) return [];
            return [{ name, value: parseParamValue(value) } as PatchParam];
        });
        yield { name, params };
    }
}

export interface DroidExpanderG8 {
    name: string;
    value: { type: 'g8' };
}
export interface DroidExpanderX7 {
    name: string;
    value: { type: 'x7' };
}
export interface DroidController {
    name: string;
    value: { type: 'controller'; index: number; pots: number; buttons: number };
}

const ControllerParser = () => {
    let index = 1;
    const typeMap = { p: 'pots', b: 'buttons' } as const;
    return (line: string): DroidExpanderG8 | DroidExpanderX7 | DroidController => {
        const name = line.replace('[', '').replace(']', '');
        if (name === 'g8') return { name, value: { type: 'g8' } };
        if (name === 'x7') return { name, value: { type: 'x7' } };

        const types: Record<string, number> = {};
        for (const match of name.matchAll(/(\w)(\d+)/gi)) {
            const [, type, count] = [, typeMap[match[1].toLowerCase()], parseInt(match[2])];
            if (type) {
                types[type] = count;
            } else {
                console.error('unknown controller type:', type);
            }
        }

        return {
            name,
            value: {
                type: 'controller',
                index: index++,
                buttons: 0,
                pots: 0,
                ...types,
            },
        };
    };
};

export function parseDroidPatch(patch: string) {
    patch = patch.replace(/#.*/g, '');
    patch = patch.replace(/\/\/.*/g, '');
    patch = patch.replace(/\r/g, '');
    patch = patch.replace(/\n+/g, '\n');
    const lines = patch
        .split('\n')
        .map(x => x.replace(/\s+/g, ''))
        .filter(x => x.length > 0);

    const lineGroups = [];
    let lineGroup: string[];
    for (const line of lines) {
        if (line.startsWith('[')) {
            lineGroups.push([line]);
            continue;
        } else {
            lineGroup = lineGroups[lineGroups.length - 1];
            lineGroup.push(line);
        }
    }

    let controllers: (DroidExpanderG8 | DroidExpanderX7 | DroidController)[] = [];
    const parseController = ControllerParser();
    while (lineGroups[0] && lineGroups[0].length === 1) {
        const line = lineGroups.shift()[0];
        controllers.push(parseController(line));
    }

    console.log('CONTROLLERS:');
    console.log(controllers);

    const circuits = Array.from(parseCircuits(lineGroups));
    return { circuits, controllers };
}
