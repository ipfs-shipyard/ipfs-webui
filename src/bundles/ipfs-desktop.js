let bundle = {
  name: 'ipfsDesktop',
  reducer: (state = {}) => state,
  selectIsIpfsDesktop: () => !!window.ipfsDesktop
}

if (window.ipfsDesktop) {
  bundle = {
    ...bundle,
    reducer: (state = {}, action) => {
      if (!action.type.startsWith('DESKTOP_')) {
        return state
      }

      if (action.type === 'DESKTOP_SETTINGS_CHANGED') {
        return action.payload
      }

      return state
    },

    selectDesktopSettings: state => state.ipfsDesktop,

    selectDesktopVersion: () => window.ipfsDesktop.version,

    doDesktopStartListening: () => async ({ dispatch }) => {
      window.ipfsDesktop.onConfigChanged(config => {
        dispatch({
          type: 'DESKTOP_SETTINGS_CHANGED',
          payload: config
        })
      })
    },

    doDesktopSettingsToggle: (setting) => () => {
      window.ipfsDesktop.toggleSetting(setting)
    },

    doDesktopIpfsConfigChanged: () => () => {
      window.ipfsDesktop.configHasChanged()
    },

    doDesktopSelectDirectory: () => () => {
      return window.ipfsDesktop.selectDirectory()
    },

    init: store => {
      store.doDesktopStartListening()
    }
  }
}

export default bundle
