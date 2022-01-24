
import _ from 'lodash';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { graph, GraphNodeDroidCircuit, GraphDroid } from '../lib/graph'
import { DroidPatchDropzone } from '../lib/patch-dropzone';

namespace S {
    export const Body = styled.div`
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
    `;

    export const Header = styled.div`
        display: flex;
        background: rgb(30, 30, 30);
        flex-grow: 0;
        flex-shrink: 0;
        color: white;
        font-family: Helvetica, Arial, sans-serif;
        padding: 10px;
        align-items: center;
    `;

    export const Content = styled.div`
        display: flex;
        flex-grow: 1;
    `;

    export const Layer = styled.div`
        position: relative;
        flex-grow: 1;
    `;

}

const SidebarCircuit = ({node}: {node: GraphNodeDroidCircuit}) => {
    const options = node.getOptions();
    const SidebarCircuit = styled.div`
        color: ${options.color};
        border: 0.5px solid ${options.color};
        border-left: 0;
        border-right: 0.5px solid #444;
        padding: 1em;
        min-width: 200px;
        background: rgb(20, 20, 20);
        flex-grow: 0;
        flex-shrink: 0;
        cursor: pointer;
        &:hover {
            background: ${options.color};
            color: black;
        }
    `;
    return (
    <SidebarCircuit
        color={options.color}
        draggable={true}
        onDragStart={(event) => event.dataTransfer.setData('storm-diagram-node', JSON.stringify(node.serialize()))}
    >{options.name}</SidebarCircuit>
    );
}


const Sidebar = ({graph}: {graph:GraphDroid}) => {
    const Sidebar = styled.div`
        min-width: 200px;
        background: rgb(20, 20, 20);
        flex-grow: 0;
        flex-shrink: 0;
        overflow-y: scroll;
        max-height: 100vh;
    `;
    const circuits = graph.getCircuitNodes();
    const children = circuits.map(c => (<SidebarCircuit key={c.getID()} node={c}></SidebarCircuit>));
    return <Sidebar>{children}</Sidebar>;
}


function DroidGraphWidget({graph}: {graph:GraphDroid}) {
    const [refreshComponent, setRefreshComponent] = useState(false);
    useEffect(() => graph.redistribute());
    return (
        <S.Body>
            <S.Content>
                {/* <Sidebar graph={graph}></Sidebar> */}
                <S.Layer
                    onDrop={(event) => {
                        const el = event.dataTransfer.getData('storm-diagram-node');
                        if (!el) {
                            setRefreshComponent(!refreshComponent);
                            return true;
                        } else {
                            const data = JSON.parse(el);
                            const node = new GraphNodeDroidCircuit(data);
                            var point = graph.engine.getRelativeMousePoint(event);
                            node.setPosition(point);
                            graph.engine.getModel().addNode(node);
                            setRefreshComponent(!refreshComponent);
                        }
                    }}
                    onDragOver={(event) => event.preventDefault()}>
                    <DroidPatchDropzone graph={graph}>
                        <CanvasWidget className="graph-canvas" engine={graph.engine} />
                    </DroidPatchDropzone>
                </S.Layer>
            </S.Content>
        </S.Body>
    );
}

export default DroidGraphWidget.bind(null, {graph})
