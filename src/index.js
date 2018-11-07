import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'redux-bundler-react'
import './index.css'
import 'react-virtualized/styles.css'
import App from './App'
import getStore from './bundles'
import bundleCache from './lib/bundle-cache'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'

async function render () {
  const initialData = await bundleCache.getAll()
  if (initialData && process.env.NODE_ENV !== 'production') {
    console.log('intialising store with data from cache', initialData)
  }
  const store = getStore(initialData)
  ReactDOM.render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n} >
        <App />
      </I18nextProvider>
    </Provider>,
    document.getElementById('root')
  )
}

render()
