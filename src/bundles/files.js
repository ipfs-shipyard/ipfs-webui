import { join, dirname } from 'path'
import { createSelector } from 'redux-bundler'
import { getDownloadLink, getShareableLink, filesToStreams } from '../lib/files'
import countDirs from '../lib/count-dirs'
import { sortByName, sortBySize } from '../lib/sort'

const isMac = navigator.userAgent.indexOf('Mac') !== -1

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

export const sorts = {
  BY_NAME: 'name',
  BY_SIZE: 'size'
}

const make = (basename, action) => (...args) => async (args2) => {
  const id = Symbol(basename)
  const { dispatch, getIpfs, store } = args2
  dispatch({ type: `FILES_${basename}_STARTED`, payload: { id } })

  let data

  try {
    data = await action(getIpfs(), ...args, id, args2)
    dispatch({ type: `FILES_${basename}_FINISHED`, payload: { id, ...data } })

    // Rename specific logic
    if (basename === actions.MOVE) {
      const src = args[0][0]
      const dst = args[0][1]

      if (src === store.selectFiles().path) {
        await store.doUpdateHash(`/files${dst}`)
      }
    }

    // Delete specific logic
    if (basename === actions.DELETE) {
      const src = args[0][0]

      let path = src.split('/')
      path.pop()
      path = path.join('/')

      await store.doUpdateHash(`/files${path}`)
    }
  } catch (error) {
    console.log(error)
    dispatch({ type: `FILES_${basename}_FAILED`, payload: { id, error } })
  } finally {
    if (basename !== actions.FETCH) {
      await store.doFilesFetch()
    }
  }

  return data
}

const fetchFiles = make(actions.FETCH, async (ipfs, id, { store }) => {
  const path = store.selectFilesPathFromHash()
  const stats = await ipfs.files.stat(path)

  if (stats.type === 'file') {
    return {
      path: path,
      fetched: Date.now(),
      type: 'file',
      read: () => ipfs.files.read(path),
      name: path.split('/').pop(),
      size: stats.size,
      hash: stats.hash
    }
  }

  // Otherwise get the directory info
  const res = await ipfs.files.ls(path, { l: true }) || []
  const files = []
  const showStats = res.length < 100

  for (const f of res) {
    let file = {
      ...f,
      path: join(path, f.name),
      type: f.type === 0 ? 'file' : 'directory'
    }

    if (showStats && file.type === 'directory') {
      file = {
        ...file,
        ...await ipfs.files.stat(file.path)
      }
    }

    files.push(file)
  }

  const upperPath = dirname(path)
  const upper = path === '/' ? null : await ipfs.files.stat(upperPath)
  if (upper) {
    upper.path = upperPath
  }

  return {
    path: path,
    fetched: Date.now(),
    type: 'directory',
    upper: upper,
    content: files
  }
})

const defaultState = {
  pageContent: null,
  sorting: { // TODO: cache this
    by: sorts.BY_NAME,
    asc: true
  },
  pending: [],
  finished: [],
  failed: []
}

export default (opts = {}) => {
  opts.baseUrl = opts.baseUrl || '/files'

  return {
    name: 'files',

    reducer: (state = defaultState, action) => {
      if (!action.type.startsWith('FILES_')) {
        return state
      }

      if (action.type === 'FILES_DISMISS_ERRORS') {
        return {
          ...state,
          failed: []
        }
      }

      if (action.type === 'FILES_UPDATE_SORT') {
        return {
          ...state,
          sorting: action.payload
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
        const pendingAction = state.pending.find(a => a.id === id)

        return {
          ...state,
          pending: [
            ...state.pending.filter(a => a.id !== id),
            {
              ...pendingAction,
              data: data
            }
          ]
        }
      } else if (status === 'FAILED') {
        const pendingAction = state.pending.find(a => a.id === id)
        return {
          ...state,
          pending: state.pending.filter(a => a.id !== id),
          failed: [
            ...state.failed,
            {
              ...pendingAction,
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

    doFilesFetch: () => async ({ store, ...args }) => {
      const isReady = store.selectIpfsReady()
      const isConnected = store.selectIpfsConnected()
      const isFetching = store.selectFilesIsFetching()
      const path = store.selectFilesPathFromHash()

      if (isReady && isConnected && !isFetching && path) {
        fetchFiles()({ store, ...args })
      }
    },

    doFilesWrite: make(actions.WRITE, async (ipfs, root, filesOrPromise, id, { dispatch }) => {
      let files = await filesOrPromise
      const { streams, totalSize } = await filesToStreams(files)

      // Normalise all paths to be relative. Dropped files come as absolute,
      // those added by the file input come as relative paths, so normalise them.
      streams.forEach(s => {
        if (s.path[0] === '/') {
          s.path = s.path.slice(1)
        }
      })

      const updateProgress = (sent) => {
        dispatch({ type: 'FILES_WRITE_UPDATED', payload: { id: id, progress: sent / totalSize * 100 } })
      }

      updateProgress(0)

      let res = null
      try {
        res = await ipfs.add(streams, {
          pin: false,
          wrapWithDirectory: false,
          progress: updateProgress
        })
      } catch (error) {
        console.error(error)
        throw error
      }

      const numberOfFiles = streams.length
      const numberOfDirs = countDirs(streams)
      const expectedResponseCount = numberOfFiles + numberOfDirs

      if (res.length !== expectedResponseCount) {
        // See https://github.com/ipfs/js-ipfs-api/issues/797
        throw Object.assign(new Error(`API returned a partial response.`), { code: 'ERR_API_RESPONSE' })
      }

      for (const { path, hash } of res) {
        // Only go for direct children
        if (path.indexOf('/') === -1 && path !== '') {
          const src = `/ipfs/${hash}`
          const dst = join(root, path)

          try {
            await ipfs.files.cp([src, dst])
          } catch (err) {
            console.log(err, { root, path, src, dst })
            throw Object.assign(new Error(`Folder already exists.`), { code: 'ERR_FOLDER_EXISTS' })
          }
        }
      }

      updateProgress(totalSize)
    }),

    doFilesDelete: make(actions.DELETE, (ipfs, files) => {
      const promises = files.map(file => ipfs.files.rm(file, { recursive: true }))
      return Promise.all(promises)
    }),

    doFilesAddPath: make(actions.ADD_BY_PATH, (ipfs, root, src) => {
      const name = src.split('/').pop()
      const dst = join(root, name)
      const srcPath = src.startsWith('/') ? src : `/ipfs/${name}`
      return ipfs.files.cp([srcPath, dst])
    }),

    doFilesDownloadLink: make(actions.DOWNLOAD_LINK, async (ipfs, files, id, { store }) => {
      const apiUrl = store.selectApiUrl()
      const gatewayUrl = store.selectGatewayUrl()
      return getDownloadLink(files, gatewayUrl, apiUrl, ipfs)
    }),

    doFilesShareLink: make(actions.SHARE_LINK, async (ipfs, files) => getShareableLink(files, ipfs)),

    doFilesMove: make(actions.MOVE, (ipfs, src, dst) => ipfs.files.mv([src, dst])),

    doFilesCopy: make(actions.COPY, (ipfs, src, dst) => ipfs.files.cp([src, dst])),

    doFilesMakeDir: make(actions.MAKE_DIR, (ipfs, path) => ipfs.files.mkdir(path, { parents: true })),

    doFilesDismissErrors: () => async ({ dispatch }) => dispatch({ type: 'FILES_DISMISS_ERRORS' }),

    doFilesNavigateTo: (path) => async ({ store }) => {
      const link = path.split('/').map(p => encodeURIComponent(p)).join('/')
      const files = store.selectFiles()

      if (files.path === link) {
        store.doFilesFetch()
      } else {
        store.doUpdateHash(`${opts.baseUrl}${link}`)
      }
    },

    doFilesUpdateSorting: (by, asc) => async ({ dispatch }) => {
      dispatch({ type: 'FILES_UPDATE_SORT', payload: { by, asc } })
    },

    selectFiles: (state) => {
      const { pageContent, sorting } = state.files
      const sortDir = sorting.asc ? 1 : -1
      const nameSort = sortByName(sortDir)
      const sizeSort = sortBySize(sortDir)

      if (pageContent === null || pageContent.type === 'file') {
        return pageContent
      }

      return {
        ...pageContent,
        content: pageContent.content.sort((a, b) => {
          if (a.type === b.type || isMac) {
            if (sorting.by === sorts.BY_NAME) {
              return nameSort(a.name, b.name)
            } else {
              return sizeSort(a.cumulativeSize || a.size, b.cumulativeSize || b.size)
            }
          }

          if (a.type === 'directory') {
            return -1
          } else {
            return 1
          }
        })
      }
    },

    selectFilesIsFetching: (state) => state.files.pending.some(a => a.type === actions.FETCH),

    selectShowLoadingAnimation: (state) => {
      const pending = state.files.pending.find(a => a.type === actions.FETCH)
      return pending ? (Date.now() - pending.start) > 1000 : false
    },

    selectFilesSorting: (state) => state.files.sorting,

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

    selectFilesPathFromHash: createSelector(
      'selectRouteInfo',
      (routeInfo) => {
        if (!routeInfo.url.startsWith(opts.baseUrl)) return
        if (!routeInfo.params.path) return
        return decodeURIComponent(routeInfo.params.path)
      }
    )
  }
}
