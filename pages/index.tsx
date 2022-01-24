import dynamic from 'next/dynamic'

const DroidGraphWidget = dynamic(() => import('./_graph'), { ssr: false });

export default function Home() {
  return (<DroidGraphWidget></DroidGraphWidget>)
}
