import dynamic from 'next/dynamic'
const DroidGraphWidget = dynamic(() => import('../lib/graph-viewer'), { ssr: false });
import PATCH from '../patches/drumsequencer.ini'

export default function Home() {
  return (<DroidGraphWidget patch={PATCH}></DroidGraphWidget>)
}
