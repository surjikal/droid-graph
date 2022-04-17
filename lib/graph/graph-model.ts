import _ from 'lodash';
import { DefaultLinkModel, DefaultNodeModel, DiagramModel } from '@projectstorm/react-diagrams';
import { DroidController, parseDroidPatch, PatchParam } from './patch-parser';
import {
    GraphNodeDroidCircuit,
    GraphNodeDroidValueVariable,
    GraphNodeDroidMaster,
    GraphNodeDroidControllerButton,
    GraphDroidNodeValueExpression,
    GraphNodeDroidValuePrimitive,
} from './graph';

export function createDroidModel(src: string) {
    const patch = parseDroidPatch(src);

    const master = new GraphNodeDroidMaster();

    const model = new DiagramModel();
    model.addNode(master);

    const controllers = [];

    for (const controller of patch.controllers) {
        if (controller.value.type === 'controller') {
            const node = new GraphNodeDroidControllerButton(controller as DroidController);
            controllers[controller.value.index] = node;
            model.addNode(node);
        }
    }

    let circuits: GraphNodeDroidCircuit[] = [];
    for (const circuit of patch.circuits) {
        const circuitNode = new GraphNodeDroidCircuit({
            name: circuit.name,
            color: '#FF0000',
        });
        circuits.push(circuitNode);
        model.addNode(circuitNode);
    }

    const variables: Record<string, GraphNodeDroidValueVariable> = {};
    function addVariable(variable) {
        if (variable.value in variables) return variables[variable.value];
        const node = new GraphNodeDroidValueVariable(variable.value);
        model.addNode(node);
        variables[variable.value] = node;
        return node;
    }

    let circuitIndex = 0;
    for (const circuit of patch.circuits) {
        let circuitNode = circuits[circuitIndex++];

        function addParamNode(param: PatchParam, parentNode: DefaultNodeModel) {
            if (param.value.type === 'expression') {
                const node = new GraphDroidNodeValueExpression(param.value as any);
                model.addNode(node);

                for (const sub of param.value.params) {
                    if (sub.primitive) continue;
                    addParamNode({ name: sub.value, value: sub }, node);
                }

                const input = parentNode.getInPorts().find(x => x.getName() === param.name);
                const output = parentNode.getOutPorts().find(x => x.getName() === param.name);
                if (input) {
                    const link = new DefaultLinkModel();
                    link.setTargetPort(input);
                    link.setSourcePort(node.getOutPorts()[0]);
                    model.addLink(link);
                }
                if (output) {
                    const link = new DefaultLinkModel();
                    link.setSourcePort(output);
                    link.setTargetPort(node.getInPorts()[0]);
                    model.addLink(link);
                }
            }

            if (param.value.type === 'variable') {
                const node = addVariable(param.value);
                let input = parentNode.getInPorts().find(x => x.getName() === param.name);
                let output = parentNode.getOutPorts().find(x => x.getName() === param.name);
                const link = new DefaultLinkModel({ color: '#00FFFF' });
                if (input) {
                    link.setSourcePort(node.getOutputPort());
                    link.setTargetPort(input);
                    model.addLink(link);
                }
                if (output) {
                    link.setSourcePort(output);
                    link.setTargetPort(node.getInputPort());
                    model.addLink(link);
                }
            }

            if (param.value.type === 'number' || param.value.type === 'voltage') {
                const node = new GraphNodeDroidValuePrimitive(param.value.value);
                model.addNode(node);
                const input = parentNode.getInPorts().find(x => x.getName() === param.name);
                const output = parentNode.getOutPorts().find(x => x.getName() === param.name);
                const link = new DefaultLinkModel({ color: '#FF0000' });
                if (input) {
                    link.setTargetPort(input);
                    link.setSourcePort(node.getOutPorts()[0]);
                    model.addLink(link);
                }
                if (output) {
                    link.setSourcePort(output);
                    link.setTargetPort(node.getInPorts()[0]);
                    model.addLink(link);
                }
            }

            if (param.value.type === 'input' || param.value.type === 'input_normalized') {
                const parentPort = parentNode.getOutPorts().find(x => x.getName() === param.name);
                const masterPort =
                    param.value.type === 'input_normalized'
                        ? master.getPorts()[`${param.value.value}-in`]
                        : master.getPorts()[`${param.value.value}`];
                if (masterPort && parentPort) {
                    const link = new DefaultLinkModel();
                    link.setSourcePort(parentPort);
                    link.setTargetPort(masterPort);
                    model.addLink(link);
                }
            }
            if (param.value.type === 'input' || param.value.type === 'input_normalized') {
                const parentPort = parentNode.getInPorts().find(x => x.getName() === param.name);
                const masterPort =
                    param.value.type === 'input_normalized'
                        ? master.getPorts()[`${param.value.value}-out`]
                        : master.getPorts()[`${param.value.value}`];
                if (masterPort && parentPort) {
                    const link = new DefaultLinkModel();
                    link.setSourcePort(masterPort);
                    link.setTargetPort(parentPort);
                    model.addLink(link);
                }
            }

            if (param.value.type === 'pot' || param.value.type === 'button') {
                const { value, controller } = param.value;
                const controllerNode: GraphNodeDroidControllerButton = controllers[controller.index];
                if (controllerNode) {
                    const controllerPort =
                        param.value.type === 'pot'
                            ? controllerNode.getPotPort(param.value.index)
                            : controllerNode.getButtonPort(param.value.index);
                    const parentPort = parentNode.getPorts()[param.name];
                    if (controllerPort && parentPort) {
                        const link = new DefaultLinkModel();
                        link.setSourcePort(controllerPort);
                        link.setTargetPort(parentPort);
                        model.addLink(link);
                    } else {
                        console.error('missing');
                        console.log('parentPort:', parentPort);
                        console.log('controllerPort:', controllerPort);
                        console.log('param:', param);
                    }
                } else {
                    console.error('Missing expected controller node:', value, controller);
                }
            }

            if (param.value.type === 'led') {
                const { controller } = param.value;
                const controllerNode: GraphNodeDroidControllerButton = controllers[controller.index];
                if (controllerNode) {
                    const controllerPort = controllerNode.getLedPort(param.value.index);
                    const parentPort = parentNode.getPorts()[param.name];
                    if (parentPort && controllerPort) {
                        const link = new DefaultLinkModel();
                        link.setSourcePort(parentPort);
                        link.setTargetPort(controllerPort);
                        model.addLink(link);
                    }
                }
            }

            if (param.value.type === 'output') {
                const parentPort = parentNode.getPorts()[param.name];
                if (parentPort) {
                    const link = new DefaultLinkModel();
                    link.setSourcePort(parentPort);
                    link.setTargetPort(master.getPorts()[param.value.value]);
                    model.addLink(link);
                }
            }
        }

        for (const param of circuit.params) {
            addParamNode(param, circuitNode);
        }
    }

    return model;
}
