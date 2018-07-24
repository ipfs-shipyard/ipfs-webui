import { join, dirname } from 'path'
import ResizeObserver from 'resize-observer-polyfill'
import { getDownloadLink, filesToStreams } from '../lib/files'
import { waitForElement } from '../lib/dom'

export const actions = {
  FETCH: 'FETCH',
  MOVE: 'MOVE',
  COPY: 'COPY',
  DELETE: 'DELETE',
  MAKE_DIR: 'MAKEDIR',
  WRITE: 'WRITE',
  DOWNLOAD_LINK: 'DOWNLOADLINK',
  ADD_BY_PATH: 'ADDBYPATH'
}

const make = (basename, action) => (...args) => async (args2) => {
  const id = Symbol(basename)
  const { dispatch, getIpfs, getState, store } = args2
  dispatch({ type: `FILES_${basename}_STARTED`, payload: { id } })

  let data

  try {
    data = await action(getIpfs(), ...args, id, args2)
    dispatch({ type: `FILES_${basename}_FINISHED`, payload: { id, ...data } })
  } catch (error) {
    dispatch({ type: `FILES_${basename}_FAILED`, payload: { id, error } })
  } finally {
    if (basename !== actions.FETCH) {
      await store.doFilesFetch(getState().files.pageContent.path)
    }
  }

  return data
}

const defaultState = {
  pageContent: null,
  actionBarWidth: '100%',
  pending: [],
  finished: [],
  failed: []
}

export default (opts = {}) => {
  return {
    name: 'files',

    init: async ({ dispatch }) => {
      if (!opts.navbar) {
        return
      }

      const element = await waitForElement(opts.navbar)

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const {width} = entry.contentRect
          dispatch({ type: 'FILES_ACTIONS_WIDTH', payload: `calc(100% - ${width}px)` })
        }
      })

      ro.observe(element)
    },

    reducer: (state = defaultState, action) => {
      if (!action.type.startsWith('FILES_')) {
        return state
      }

      if (action.type === 'FILES_ACTIONS_WIDTH') {
        return {
          ...state,
          actionBarWidth: action.payload
        }
      } else if (action.type === 'FILES_DISMISS_ERRORS') {
        return {
          ...state,
          failed: []
        }
      }

      const [ type, status ] = action.type.split('_').splice(1)
      const { id, ...data } = action.payload

      if (status === 'STARTED') {
        return {
          ...state,
          pending: [
            ...state.pending,
            {
              type: type,
              id: id,
              start: Date.now(),
              data: data
            }
          ]
        }
      } else if (status === 'UPDATED') {
        const action = state.pending.find(a => a.id === id)

        return {
          ...state,
          pending: [
            ...state.pending.filter(a => a.id !== id),
            {
              ...action,
              data: data
            }
          ]
        }
      } else if (status === 'FAILED') {
        const action = state.pending.find(a => a.id === id)

        return {
          ...state,
          pending: state.pending.filter(a => a.id !== id),
          failed: [
            ...state.failed,
            {
              ...action,
              end: Date.now(),
              error: data.error
            }
          ]
        }
      } else if (status === 'FINISHED') {
        const action = state.pending.find(a => a.id === id)
        let additional

        if (type === actions.FETCH) {
          additional = {
            pageContent: data
          }
        }

        return {
          ...state,
          ...additional,
          pending: state.pending.filter(a => a.id !== id),
          finished: [
            ...state.finished,
            {
              ...action,
              data: data,
              end: Date.now()
            }
          ]
        }
      }

      return state
    },

    doFilesFetch: make(actions.FETCH, async (ipfs, path) => {
      const stats = await ipfs.files.stat(path)

      if (stats.type === 'file') {
        stats.name = path

        return {
          path: path,
          type: 'file',
          stats: stats,
          read: () => ipfs.files.read(path)
        }
      }

      // Otherwise get the directory info
      let res = await ipfs.files.ls(path, {l: true})

      if (res) {
        res = res.map(file => {
          // FIX: open PR on js-ipfs-api
          file.type = file.type === 0 ? 'file' : 'directory'
          file.path = join(path, file.name)
          return file
        })
      }

      return {
        path: path,
        type: 'directory',
        content: res
      }
    }),

    doFilesWrite: make(actions.WRITE, async (ipfs, root, rawFiles, id, { dispatch }) => {
      const { streams, totalSize } = await filesToStreams(rawFiles)

      const updateProgress = (progress) => {
        dispatch({ type: 'FILES_WRITE_UPDATED', payload: { id: id, progress } })
      }

      updateProgress(0)

      let sent = 0

      for (const file of streams) {
        const dir = join(root, dirname(file.name))
        await ipfs.files.mkdir(dir, { parents: true })
        let alreadySent = 0

        const res = await ipfs.add(file.content, {
          pin: false,
          // eslint-disable-next-line
          progress: (bytes) => {
            sent = sent + bytes - alreadySent
            alreadySent = bytes
            updateProgress(sent / totalSize * 100)
          }
        })

        const src = `/ipfs/${res[res.length - 1].hash}`
        const dst = join(root, file.name)
        await ipfs.files.cp([src, dst])

        sent = sent - alreadySent + file.size
        updateProgress(sent / totalSize * 100)
      }

      updateProgress(100)
    }),

    doFilesDelete: make(actions.DELETE, (ipfs, files) => {
      const promises = files.map(file => ipfs.files.rm(file, { recursive: true }))
      return Promise.all(promises)
    }),

    doFilesAddPath: make(actions.ADD_BY_PATH, (ipfs, root, src) => {
      const name = src.split('/').pop()
      const dst = join(root, name)
      return ipfs.files.cp([src, dst])
    }),

    doFilesDownloadLink: make(actions.DOWNLOAD_LINK, async (ipfs, files, id, { store }) => {
      const apiUrl = store.selectApiUrl()
      const gatewayUrl = store.selectGatewayUrl()
      return getDownloadLink(files, gatewayUrl, apiUrl, ipfs)
    }),

    doFilesMove: make(actions.MOVE, (ipfs, src, dst) => ipfs.files.mv([src, dst])),

    doFilesCopy: make(actions.COPY, (ipfs, src, dst) => ipfs.files.cp([src, dst])),

    doFilesMakeDir: make(actions.MAKE_DIR, (ipfs, path) => ipfs.files.mkdir(path, { parents: true })),

    doFilesDismissErrors: () => async ({ dispatch }) => dispatch({ type: 'FILES_DISMISS_ERRORS' }),

    selectFiles: (state) => state.files.pageContent,

    selectWriteFilesProgress: (state) => {
      const writes = state.files.pending.filter(s => s.type === actions.WRITE && s.data.progress)

      if (writes.length === 0) {
        return null
      }

      const sum = writes.reduce((acc, s) => s.data.progress + acc, 0)
      return sum / writes.length
    },

    selectFilesHasError: (state) => state.files.failed.length > 0,

    selectFilesErrors: (state) => state.files.failed,

    selectActionBarWidth: (state) => state.files.actionBarWidth
  }
}
