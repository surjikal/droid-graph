import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GraphDroid } from './graph';

export function FileDropzone({ children, onFile }: React.PropsWithChildren<{onFile: (contents: string) => any }>) {
    const onDrop = useCallback(files => {
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
    }, []);
    const { getRootProps, getInputProps } = useDropzone({ onDrop, multiple: false, noClick: true });
    return (
        <div {...getRootProps()}>
            <input {...getInputProps()} hidden />
            {children}
        </div>
    );
}

export function DroidPatchDropzone(props: React.PropsWithChildren<{graph:GraphDroid}>) {
    const onFile = (patch: string) => {
        props.graph.setPatch(patch);
        // FIXME
        setTimeout(() => {
            props.graph.redistribute()
        }, 1000);
    }
    return (
        <FileDropzone onFile={onFile}>{props.children}</FileDropzone>
    )
}
