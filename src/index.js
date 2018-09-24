import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'redux-bundler-react'
import './index.css'
import 'react-virtualized/styles.css'
import App from './App'
import getStore from './bundles'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'

ReactDOM.render(
  <Provider store={getStore()}>
    <I18nextProvider i18n={i18n} >
      <App />
    </I18nextProvider>
  </Provider>, document.getElementById('root'))
