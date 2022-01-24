import _ from 'lodash';
import createEngine, { DiagramModel, DefaultNodeModel, DagreEngine, DefaultPortModel, DiagramEngine } from '@projectstorm/react-diagrams';
import DroidCircuitData from './data/circuits.json';
import { createDroidModel } from './graph-model';

type Droid = typeof DroidCircuitData;
type DroidCircuit = Droid['circuits'][keyof Droid['circuits']];
type DroidCircuitInput = DroidCircuit['inputs'][number];

function* visitInput(input: DroidCircuitInput) {
    if ('count' in input) {
        let index = input.start_at-1;
        while (index++ < input.count) {
            const name = `${input.prefix}${index}`;
            const port = new DefaultPortModel({in: true, name:name, label:name});
            yield port;
        }
    } else {
        const port = new DefaultPortModel({in: true, name:input.name, label:input.name});
        yield port;
    }
}

export class GraphDroidNodeValueExpression extends DefaultNodeModel {
    constructor({value, params}:{value:string, params: any[]}) {
        super({name:value, id:value});
        this.addPort(new DefaultPortModel({in: false, id:'get', name:'get', label:''}));
        for (const p of params) {
            if (p.primitive) continue;
            this.addPort(new DefaultPortModel({in: true, name:p.value}));
        }
    }
}

export class GraphNodeDroidValuePrimitive extends DefaultNodeModel {
    constructor(name: string) {
        super({name:'', id:name, color:"#440000"});
        this.addPort(new DefaultPortModel({in: false, id:`${name}-get`, name:'get', label:name}));
    }
}

export class GraphNodeDroidValueVariable extends DefaultNodeModel {
    constructor(name: string) {
        super({name, id:name});
        this.addPort(new DefaultPortModel({in: true, id:`${name}-set`, name:'set'}));
        this.addPort(new DefaultPortModel({in: false, id:`${name}-get`, name:'get'}));
    }
    getInputPort() {
        return this.getPorts().set
    }
    getOutputPort() {
        return this.getPorts().get
    }
}

export class GraphNodeDroidValueValue extends DefaultNodeModel {
    public readonly port = new DefaultPortModel({in: false, name:''});
    constructor(name: string) {
        super({name, id:name});
        this.addPort(this.port);
    }
}

export class GraphNodeDroidMaster extends DefaultNodeModel {
    constructor() {
        super({name:"DROID Master", color:"#FF00FF"});
        for (const normal of _.range(8)) {
            const name = `N${normal+1}`;
            const port = new DefaultPortModel({in: true, id: `${name}-in`, name: `${name}-in`, label:name});
            this.addPort(port);
        }
        for (const normal of _.range(8)) {
            const name = `N${normal+1}`;
            const port = new DefaultPortModel({in: false, id: `${name}-out`, name: `${name}-out`, label:name});
            this.addPort(port);
        }
        for (const input of _.range(8)) {
            const name = `I${input+1}`;
            const port = new DefaultPortModel({in: false, id: name, name, label:name});
            this.addPort(port);
        }
        for (const output of _.range(8)) {
            const name = `O${output+1}`;
            const port = new DefaultPortModel({in: true, id: name, name, label:name});
            this.addPort(port);
        }
    }
}
export class GraphNodeDroidControllerButton extends DefaultNodeModel {
    constructor({index, count}: {index:number, count: number}) {
        const name = `p2b${count}.${index}`;
        super({id:name, name, color:"#0000FF", extras:{index, count}});
        for (const i of _.range(count)) {
            const led = `L${index}.${i+1}`;
            this.addPort(new DefaultPortModel({in: true, name:led, label:led}));
        }
        for (const i of _.range(count)) {
            const btn = `B${index}.${i+1}`;
            this.addPort(new DefaultPortModel({in: false, name:btn, label:btn}));
        }
        for (const i of _.range(2)) {
            const pot = `P${index}.${i+1}`;
            this.addPort(new DefaultPortModel({in: false, name:pot, label:pot}));
        }
    }
    getButtonPort(index: number) {
        const options = this.getOptions();
        return this.getOutPorts().find(p => p.getName() === `B${options.extras.index}.${index}`);
    }
    getPotPort(index: number) {
        const options = this.getOptions();
        return this.getOutPorts().find(p => p.getName() === `P${options.extras.index}.${index}`);
    }
    getLedPort(index: number) {
        const options = this.getOptions();
        return this.getInPorts().find(p => p.getName() === `L${options.extras.index}.${index}`);
    }
}
export class GraphNodeDroidP2B8 extends GraphNodeDroidControllerButton {
    constructor({index}: {index:number}) {
        super({index, count:8});
    }
}

class GraphNodePortDroidCircuitIO extends DefaultPortModel {
}

let types = new Set();
function* visitOutput(input: DroidCircuitInput) {
    if ('count' in input) {
        let index = input.start_at-1;
        while (index++ < input.count) {
            const name = `${input.prefix}${index}`;
            const port = new GraphNodePortDroidCircuitIO({in: false, id:name, name:name, label:name});
            yield port;
        }
    } else {
        const port = new GraphNodePortDroidCircuitIO({in: false, id:input.name, name:input.name, label:input.name, type:input.type});
        yield port;
    }
}

function* visitCircuits(droid: Droid) {
    let index = 0;
	for (const [name,] of Object.entries(droid.circuits)) {
        if (name.includes('midi')) continue;
        yield new GraphNodeDroidCircuit({name, color:`hsl(${31*index++}, 30%, 50%)`});
	}
 }


export class GraphNodeDroidCircuit extends DefaultNodeModel {
    public circuit: DroidCircuit;
    public params: Record<string, any>;
    constructor({name, color}: {name: string, color?: string}) {
        super(name, color);
        this.circuit = DroidCircuitData.circuits[name];
        if (!this.circuit) return;
        for (const input of this.circuit.inputs) {
            for (const port of visitInput(input)) this.addPort(port);
        }
        for (const output of this.circuit.outputs) {
            for (const port of visitOutput(output)) this.addPort(port);
        }
    }
}

export class GraphDroid {
    public readonly dagre: DagreEngine;
    public readonly engine: DiagramEngine;

    constructor(src: string) {
        const model = createDroidModel(src);
        const dagre = new DagreEngine({
            graph: {rankdir: 'LR', ranker:'tight-tree', marginx: 100, marginy: 100, },
            includeLinks: false
        });
        this.dagre = dagre;
        this.engine = createEngine();
        this.engine.setModel(model);
    }

    getCircuitNodes(): GraphNodeDroidCircuit[] {
        return Array.from(visitCircuits(DroidCircuitData));
    }

    redistribute() {
        const model = this.engine.getModel();
        this.dagre.redistribute(model);
        this.engine.setModel(model);
    }
}
