import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App.tsx'
import './index.css'
import './styles/imageWithFallback.css'
import { store } from './store/index.ts'
import { NDKContextProvider } from 'contexts/NDKContext.tsx'
import { ServerProvider } from 'contexts/ServerContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <NDKContextProvider>
        <ServerProvider>
          <App />
        </ServerProvider>
      </NDKContextProvider>
      <ToastContainer />
    </Provider>
  </React.StrictMode>
)
