import { GraphDroid, GraphNodeDroidCircuit } from './graph';
export { GraphNodeDroidCircuit, GraphDroid };

import PatchArpeggio1 from './patches/patch-arpeggio1';
import PatchArpeggio3 from './patches/patch-arpeggio3';

export const graph = new GraphDroid(PatchArpeggio3);
