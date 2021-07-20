import React, { useRef, Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import { findDOMNode } from 'react-dom'
import PropTypes from 'prop-types'
import { connect } from 'redux-bundler-react'
import { Trans, withTranslation } from 'react-i18next'
import classnames from 'classnames'
import { join } from 'path'
import { sorts } from '../../bundles/files'
import { normalizeFiles } from '../../lib/files'
import { List, WindowScroller, AutoSizer } from 'react-virtualized'
// Reac DnD
import { NativeTypes } from 'react-dnd-html5-backend'
import { useDrop } from 'react-dnd'
// Components
import Checkbox from '../../components/checkbox/Checkbox'
import SelectedActions from '../selected-actions/SelectedActions'
import File from '../file/File'
import LoadingAnimation from '../../components/loading-animation/LoadingAnimation'

const addFiles = async (filesPromise, onAddFiles) => {
  const files = await filesPromise
  onAddFiles(normalizeFiles(files))
}

const mergeRemotePinsIntoFiles = (files, remotePins) => {
  const remotePinsCids = remotePins.map(c => c.cid.string)

  return files.map(f => remotePinsCids.includes(f.cid?.string) ? ({
    ...f,
    isRemotePin: true
  }) : f)
}

const getUpperParentCids = (upperDir) => {
  if (!upperDir) return []
  if (upperDir.upper) return [...getUpperParentCids(upperDir.upper), upperDir.cid]
  if (upperDir.cid) return [upperDir.cid]
  return []
}

export const FilesList = ({
  className, files, pins, remotePins, filesSorting, updateSorting, downloadProgress, filesIsFetching, filesPathInfo, showLoadingAnimation, upperDir,
  onShare, onSetPinning, onInspect, onDownload, onRemove, onRename, onNavigate, doCheckIfMultipleArePinned, onAddFiles, onMove, handleContextMenuClick, t
}) => {
  const [selected, setSelected] = useState([])
  const [focused, setFocused] = useState(null)
  const [firstVisibleRow, setFirstVisibleRow] = useState(null)
  const [allFiles, setAllFiles] = useState(mergeRemotePinsIntoFiles(files, remotePins))
  const listRef = useRef()
  const filesRefs = useRef([])

  const [, setParentLocallyPinned] = useState(false)

  useEffect(() => {
    const asyncHandler = async () => {
      const upperCids = getUpperParentCids(upperDir)
      if (await doCheckIfMultipleArePinned(upperCids)) {
        console.log(true)
        setParentLocallyPinned(true)
      }
    }
    asyncHandler()
  }, [upperDir, doCheckIfMultipleArePinned, setParentLocallyPinned])

  const [{ canDrop, isOver, isDragging }, drop] = useDrop({
    accept: NativeTypes.FILE,
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      const { filesPromise } = monitor.getItem()

      addFiles(filesPromise, onAddFiles)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      isDragging: monitor.isDragging
    }),
    canDrop: _ => filesPathInfo.isMfs
  })

  const selectedFiles = useMemo(() =>
    selected
      .map(name => allFiles.find(el => el.name === name))
      .filter(n => n)
      .map(file => ({
        ...file,
        pinned: pins.map(p => p.toString()).includes(file.cid.toString())
      }))
  , [allFiles, pins, selected])

  const keyHandler = (e) => {
    const focusedFile = files.find(el => el.name === focused)

    // Disable keyboard controls if fetching files
    if (filesIsFetching) {
      return
    }

    if (e.key === 'Escape') {
      setSelected([])
      setFocused(null)
      return listRef.current.forceUpdateGrid()
    }

    if (e.key === 'F2' && focused !== null) {
      return onRename([focusedFile])
    }

    if (e.key === 'Delete' && selected.length > 0) {
      return onRemove(selectedFiles)
    }

    if (e.key === ' ' && focused !== null) {
      e.preventDefault()
      return toggleOne(focused, true)
    }

    if ((e.key === 'Enter' || (e.key === 'ArrowRight' && e.metaKey)) && focused !== null) {
      return onNavigate({ path: focusedFile.path, cid: focusedFile.cid })
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      let index = 0

      if (focused !== null) {
        const prev = files.findIndex(el => el.name === focused)
        index = (e.key === 'ArrowDown') ? prev + 1 : prev - 1
      }

      if (index === -1) {
        return
      }

      if (index < files.length) {
        let name = files[index].name

        // If the file we are going to focus is out of view (removed
        // from the DOM by react-virtualized), focus the first visible file
        if (!filesRefs.current[name]) {
          name = files[firstVisibleRow].name
        }

        setFocused(name)
        const domNode = findDOMNode(filesRefs.current[name])
        domNode.scrollIntoView({ behaviour: 'smooth', block: 'center' })
        domNode.querySelector('input[type="checkbox"]').focus()
      }

      listRef.current.forceUpdateGrid()
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', keyHandler)
    return () => document.removeEventListener('keyup', keyHandler)
  }, /* eslint-disable-next-line react-hooks/exhaustive-deps */
  [])

  useEffect(() => {
    setAllFiles(mergeRemotePinsIntoFiles(files, remotePins))
  }, [files, remotePins, filesSorting])

  useEffect(() => {
    const selectedFiles = selected.filter(name => files.find(el => el.name === name))

    if (selectedFiles.length !== selected.length) {
      setSelected(selected)
    }
  }, [files, selected])

  const toggleAll = (checked) => {
    let selected = []

    if (checked) {
      selected = files.map(file => file.name)
    }

    setSelected(selected)
    listRef.current.forceUpdateGrid()
  }

  const toggleOne = useCallback((name, check) => {
    const index = selected.indexOf(name)

    if (check && index < 0) {
      setSelected([...selected, name].sort())
    } else if (index >= 0) {
      setSelected(selected.filter(selected => selected !== name).sort())
    }

    listRef.current.forceUpdateGrid()
  }, [selected])

  const move = (src, dst) => {
    if (selectedFiles.length > 0) {
      const parts = dst.split('/')
      parts.pop()
      let basepath = parts.join('/')

      if (basepath === '') {
        basepath = '/'
      }

      const toMove = selectedFiles.map(({ name, path }) => ([
        path,
        join(basepath, name)
      ]))

      const res = toMove.find(a => a[0] === src)
      if (!res) {
        toMove.push([src, dst])
      }

      toggleAll(false)
      toMove.forEach(op => onMove(...op))
    } else {
      onMove(src, dst)
    }
  }

  const sortByIcon = (order) => {
    if (filesSorting.by === order) {
      return filesSorting.asc ? '↑' : '↓'
    }

    return null
  }

  const changeSort = (order) => () => {
    if (order === filesSorting.by) {
      updateSorting(order, !filesSorting.asc)
    } else {
      updateSorting(order, true)
    }

    listRef.current.forceUpdateGrid()
  }

  const emptyRowsRenderer = () => (
    <Trans i18nKey='filesList.noFiles' t={t}>
      <div className='pv3 b--light-gray bt tc gray f6'>
            There are no available files. Add some!
      </div>
    </Trans>
  )

  const rowRenderer = ({ index, key, style }) => {
    const pinsString = pins.map(p => p.toString())
    const listItem = allFiles[index]
    const onNavigateHandler = () => {
      if (listItem.type === 'unknown') return onInspect(listItem.cid)
      return onNavigate({ path: listItem.path, cid: listItem.cid })
    }

    return (
      <div key={key} style={style} ref={r => { filesRefs.current[allFiles[index].name] = r }}>
        <File
          {...listItem}
          pinned={pinsString.includes(listItem.cid.toString())}
          isMfs={filesPathInfo.isMfs}
          name={listItem.name}
          onSelect={toggleOne}
          onNavigate={onNavigateHandler}
          onAddFiles={onAddFiles}
          onMove={move}
          focused={focused === listItem.name}
          selected={selected.indexOf(listItem.name) !== -1}
          handleContextMenuClick={handleContextMenuClick}
          translucent={isDragging || (isOver && canDrop)} />
      </div>
    )
  }

  const onRowsRendered = ({ startIndex }) => setFirstVisibleRow(startIndex)

  const allSelected = selected.length !== 0 && selected.length === allFiles.length
  const rowCount = allFiles.length
  const checkBoxCls = classnames({
    'o-1': allSelected,
    'o-70': !allSelected
  }, ['pl2 w2 glow'])

  return (
    <section ref={drop} className={classnames('FilesList no-select sans-serif border-box w-100 flex flex-column', className)}>
      { showLoadingAnimation
        ? <LoadingAnimation />
        : <Fragment>
          <header className='gray pv3 flex items-center flex-none' style={{ paddingRight: '1px', paddingLeft: '1px' }}>
            <div className={checkBoxCls}>
              <Checkbox checked={allSelected} onChange={toggleAll} aria-label={t('selectAllEntries')}/>
            </div>
            <div className='ph2 f6 flex-auto'>
              <button aria-label={ t('sortBy', { name: t('app:terms.name') })} onClick={changeSort(sorts.BY_NAME)}>
                {t('app:terms.name')} {sortByIcon(sorts.BY_NAME)}
              </button>
            </div>
            <div className='pl2 pr1 tr f6 flex-none dn db-l mw4'>
              <span>
                {t('app:terms.pinStatus')}
              </span>
            </div>
            <div className='pl2 pr4 tr f6 flex-none dn db-l mw4 w-10'>
              <button aria-label={ t('sortBy', { name: t('size') })} onClick={changeSort(sorts.BY_SIZE)}>
                {t('app:terms.size')} {sortByIcon(sorts.BY_SIZE)}
              </button>
            </div>
            <div className='pa2' style={{ width: '2.5rem' }} />
          </header>
          <WindowScroller>
            {({ height, isScrolling, onChildScroll, scrollTop }) => (
              <div className='flex-auto'>
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <List
                      ref={listRef}
                      autoHeight
                      width={width}
                      height={height}
                      className='outline-0'
                      aria-label={ t('filesListLabel')}
                      rowCount={rowCount}
                      rowHeight={55}
                      rowRenderer={rowRenderer}
                      noRowsRenderer={emptyRowsRenderer}
                      onRowsRendered={onRowsRendered}
                      isScrolling={isScrolling}
                      onScroll={onChildScroll}
                      scrollTop={scrollTop}/>
                  )}
                </AutoSizer>
              </div>
            )}
          </WindowScroller>
          { selectedFiles.length !== 0 && <SelectedActions
            className={'fixed bottom-0 right-0'}
            style={{
              zIndex: 20
            }}
            animateOnStart={selectedFiles.length === 1}
            unselect={() => toggleAll(false)}
            remove={() => onRemove(selectedFiles)}
            rename={() => onRename(selectedFiles)}
            share={() => onShare(selectedFiles)}
            setPinning={() => onSetPinning(selectedFiles)}
            download={() => onDownload(selectedFiles)}
            inspect={() => onInspect(selectedFiles[0].cid)}
            count={selectedFiles.length}
            isMfs={filesPathInfo.isMfs}
            downloadProgress={downloadProgress}
            size={selectedFiles.reduce((a, b) => a + (b.size || 0), 0)} />
          }
        </Fragment> }
    </section>
  )
}

FilesList.propTypes = {
  className: PropTypes.string,
  files: PropTypes.array.isRequired,
  remotePins: PropTypes.array,
  filesSorting: PropTypes.shape({
    by: PropTypes.string.isRequired,
    asc: PropTypes.bool.isRequired
  }),
  updateSorting: PropTypes.func.isRequired,
  downloadProgress: PropTypes.number,
  filesIsFetching: PropTypes.bool,
  filesPathInfo: PropTypes.object,
  // Actions
  onShare: PropTypes.func.isRequired,
  onSetPinning: PropTypes.func.isRequired,
  onInspect: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onAddFiles: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  handleContextMenuClick: PropTypes.func.isRequired,
  // From i18next
  t: PropTypes.func.isRequired,
  tReady: PropTypes.bool
}

FileList.defaultProps = {
  className: '',
  remotePins: []
}

export default connect(
  'selectPins',
  'selectFilesIsFetching',
  'selectFilesSorting',
  'selectFilesPathInfo',
  'selectShowLoadingAnimation',
  'doCheckIfMultipleArePinned',
  withTranslation('files')(FilesList)
)
