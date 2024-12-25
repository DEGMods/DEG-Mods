import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { routerWithNdkContext } from 'routes'
import { useNDKContext } from 'hooks'
import './styles/styles.css'

function App() {
  const ndkContext = useNDKContext()

  useEffect(() => {
    // Find the element with id 'root'
    const rootElement = document.getElementById('root')

    if (rootElement) {
      // Add the class to the element
      rootElement.classList.add('bodyMain')
    }

    // Cleanup function (optional): Remove the class when the component unmounts
    return () => {
      if (rootElement) {
        rootElement.classList.remove('bodyMain')
      }
    }
  }, [])

  return <RouterProvider router={routerWithNdkContext(ndkContext)} />
}

export default App
