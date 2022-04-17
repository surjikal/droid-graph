import _ from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { useDropzone } from 'react-dropzone';
import { GraphDroid, GraphNodeDroidCircuit } from '../lib/graph';

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

    export const Toolbar = styled.div`
        padding: 5px;
        display: flex;
        flex-shrink: 0;
    `;

    export const Button = styled.button`
        background: rgb(60, 60, 60);
        font-size: 14px;
        padding: 5px 10px;
        border: none;
        color: white;
        outline: none;
        cursor: pointer;
        margin: 2px;
        border-radius: 3px;
        &:hover {
            background: rgb(0, 192, 255);
        }
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

const SidebarCircuit = ({ node }: { node: GraphNodeDroidCircuit }) => {
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
            onDragStart={event => event.dataTransfer.setData('storm-diagram-node', JSON.stringify(node.serialize()))}
        >
            {options.name}
        </SidebarCircuit>
    );
};

const Sidebar = ({ graph }: { graph: GraphDroid }) => {
    const Sidebar = styled.div`
        min-width: 200px;
        background: rgb(20, 20, 20);
        flex-grow: 0;
        flex-shrink: 0;
        overflow-y: scroll;
        max-height: 100vh;
    `;
    const circuits = graph.getCircuitNodes();
    const children = circuits.map(c => <SidebarCircuit key={c.getID()} node={c}></SidebarCircuit>);
    return <Sidebar>{children}</Sidebar>;
};

export function FileDropzone({ children, onFile }: React.PropsWithChildren<{ onFile: (contents: string) => any }>) {
    const onDrop = useCallback(
        files => {
            files.forEach(file => {
                const reader = new FileReader();
                reader.onabort = () => console.log('file reading was aborted');
                reader.onerror = () => console.log('file reading has failed');
                reader.onload = () => {
                    // Do whatever you want with the file contents
                    const blob = new Blob([reader.result], { type: 'text/plain; charset=utf-8' });
                    blob.text().then(onFile);
                };
                reader.readAsArrayBuffer(file);
            });
        },
        [onFile],
    );
    const { getRootProps, getInputProps } = useDropzone({ onDrop, multiple: false, noClick: true });
    return (
        <div {...getRootProps()}>
            <input {...getInputProps()} hidden />
            {children}
        </div>
    );
}

function DroidGraphWidget({ patch: initialPatch }: React.PropsWithChildren<{ patch: string }>) {
    const [patch, setPatch] = useState(initialPatch);
    const [graph, setGraph] = useState<GraphDroid>(null);
    const [refreshComponent, setRefreshComponent] = useState(false);

    const onFile = (patch: string) => {
        console.log('file dropped!');
        setPatch(patch);
    };

    useEffect(() => {
        if (!patch) return;
        if (!graph) return setGraph(new GraphDroid({ patch }));
        graph.setPatch(patch);
        const timer = setTimeout(() => {
            graph.redistribute();
            setRefreshComponent(r => !r);
        }, 500);
        return () => clearTimeout(timer);
    }, [graph, patch]);

    if (!graph) {
        return <></>;
    }

    return (
        <S.Body>
            <S.Content>
                {/* <S.Toolbar>
                    <S.Button>Save</S.Button>
                </S.Toolbar>
                <Sidebar graph={graph}></Sidebar> */}
                <S.Layer
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        console.log('dropped!');
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
                >
                    <FileDropzone onFile={onFile}>
                        <CanvasWidget className="graph-canvas" engine={graph.engine} />
                    </FileDropzone>
                </S.Layer>
            </S.Content>
        </S.Body>
    );
}

export default DroidGraphWidget;
