
const VALUE_PARSERS = {
    pot: (value: string) => {
        const [controller, index] = value.replace('P', '').split('.').map((x) => parseInt(x));
        return {primitive: false, type:'pot', value, controller:{type:`p2b8`, index: controller}, index};
    },
    button: (value: string) => {
        const [controller, index] = value.replace('B', '').split('.').map((x) => parseInt(x));
        return {primitive: false, type:'button', value, controller:{type:`p2b8`, index: controller}, index};
    },
    led: (value: string) => {
        const [controller, index] = value.replace('L', '').split('.').map((x) => parseInt(x));
        return {primitive: false, type:'led', value, controller:{type:`p2b8`, index: controller}, index};
    },
    output: (value: string) => {
        const index = parseInt(value.replace('O', ''));
        return {primitive: false, type:'output', value, index};
    },
    input: (value: string) => {
        const index = parseInt(value.replace('I', ''));
        return {primitive: false, type:'input', value, index};
    },
    input_normalized: (value: string) => {
        const index = parseInt(value.replace('N', ''));
        return {primitive: false, type:'input_normalized', value, index};
    },
    voltage: (value: string) => {
        const index = parseInt(value.replace('N', ''));
        return {primitive: true, type:'voltage', value, index};
    },
    variable: (value: string) => {
        return {primitive: false, type:'variable', value};
    },
    number: (value: string) => {
        return {primitive: true, type:'number', value};
    }
} as const;


function parseParamValue(value: string): PatchParamValue {
    value = value.replace(/[()]/g, '');
    value = value.toUpperCase();
    if (value.includes('*') || value.includes('/') || value.includes('+') || value.includes('-')) {
        const tokens = value.split(/[*/+\-]/);
        const params = tokens.map(parseValue);
        return {primitive: false, type:'expression', value, params};
    } else {
        return parseValue(value) as any;
    }
}

export type PatchValue<U = keyof typeof VALUE_PARSERS> =
      U extends 'expression' ? {type:'expression', primitive:boolean, value:string, params: PatchParamValue<Omit<U, 'expression'>>[]}
    : U extends keyof typeof VALUE_PARSERS ? {type: U} & Omit<ReturnType<typeof VALUE_PARSERS[U]>, 'type'>
    : {type:keyof typeof VALUE_PARSERS, primitive:boolean, value:string};

export type PatchParamValue<U = ('expression' | keyof typeof VALUE_PARSERS)> =
    U extends 'expression' ? {type:'expression', primitive:boolean, value:string, params: PatchValue[]} :
    U extends keyof typeof VALUE_PARSERS ? {type: U} & Omit<ReturnType<typeof VALUE_PARSERS[U]>, 'type'> :
    {type:keyof typeof VALUE_PARSERS, primitive:boolean, value:string};

export type PatchParam<U = ('expression' | keyof typeof VALUE_PARSERS)> = {name:string, value:PatchParamValue<U>};

function parseValue(value: string): PatchValue {
    return ((): any => {
    if (value.startsWith('P')) return VALUE_PARSERS.pot(value);
    if (value.startsWith('B')) return VALUE_PARSERS.button(value);
    if (value.startsWith('L')) return VALUE_PARSERS.led(value);
    if (value.startsWith('O')) return VALUE_PARSERS.output(value);
    if (value.startsWith('I')) return VALUE_PARSERS.input(value);
    if (value.startsWith('N')) return VALUE_PARSERS.input_normalized(value);
    if (value.match(/^\d+(\.\d+)?V$/)) return VALUE_PARSERS.voltage(value);
    if (value.match(/^\d+/)) return VALUE_PARSERS.number(value);
    return VALUE_PARSERS.variable(value);
    })();
}

function* parseCircuits(circuits: string[][]) {
    for (const circuit of circuits) {
        const name = circuit[0].replace('[', '').replace(']', '');
        const params = circuit.slice(1).map(line => {
            const [name, value] = line.split('=');
            return {name, value: parseParamValue(value)} as PatchParam;
        });
        yield {name, params};
    }
}

export function parseDroidPatch(patch: string) {
    patch = patch.replace(/#.*/g, '');
    patch = patch.replace(/\r/g, '');
    patch = patch.replace(/\n+/g, '\n');
    const lines = patch.split('\n').map(x => x.replace(/\s+/g, '')).filter(x => x.length > 0);

    const lineGroups = [];
    let lineGroup: string[];
    for (const line of lines) {
        if (line.startsWith('[')) {
            lineGroups.push([line]);
            continue;
        } else {
            lineGroup = lineGroups[lineGroups.length-1];
            lineGroup.push(line);
        }
    }

    let controllers: any[] = [];
    let buttons = 1;
    while (lineGroups[0] && lineGroups[0].length === 1) {
        const line = lineGroups.shift()[0];
        const name = line.replace('[', '').replace(']', '');
        const count = parseInt(name.replace('p2b', ''));
        controllers.push({name, value:{type:'controller', value:name, index:buttons++, count}});
    }

    const circuits = Array.from(parseCircuits(lineGroups));
    return {circuits, controllers};
}
