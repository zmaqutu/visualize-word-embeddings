import './App.css'
import EmbeddingViewer from './pages/EmbeddingViewer'
import { useEffect, useState } from 'react'

const MIN_VIEWPORT_WIDTH = 1024
const MIN_VIEWPORT_HEIGHT = 700

const getCanRenderViewer = () => (
  window.innerWidth >= MIN_VIEWPORT_WIDTH
  && window.innerHeight >= MIN_VIEWPORT_HEIGHT
  && window.innerWidth > window.innerHeight
)

function App() {
  const [canRenderViewer, setCanRenderViewer] = useState(getCanRenderViewer)

  useEffect(() => {
    const handleResize = () => {
      setCanRenderViewer(getCanRenderViewer())
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  if (!canRenderViewer) {
    return (
      <main className="viewport-blocker" aria-label="Unsupported screen size">
        <section>
          <span>Desktop experience</span>
          <h1>Open this on a laptop or desktop.</h1>
          <p>
            This visualization needs a landscape screen for the 3D map, controls, and relationship panels to stay usable.
          </p>
          <small>
            Minimum recommended size: {MIN_VIEWPORT_WIDTH}px wide by {MIN_VIEWPORT_HEIGHT}px tall, in landscape orientation.
          </small>
        </section>
      </main>
    )
  }

  return (
    <>
      <EmbeddingViewer />
    </>
  )
}

export default App
