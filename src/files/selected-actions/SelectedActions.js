import React from 'react'
import PropTypes from 'prop-types'
import filesize from 'filesize'
import GlyphSmallCancel from '../../icons/GlyphSmallCancel'
import StrokeShare from '../../icons/StrokeShare'
import StrokePencil from '../../icons/StrokePencil'
import StrokeIpld from '../../icons/StrokeIpld'
import StrokeTrash from '../../icons/StrokeTrash'
import StrokeDownload from '../../icons/StrokeDownload'
import './SelectedActions.css'

const SelectedActions = ({count, size, unselect, remove, share, download, rename, inspect, className, ...props}) => {
  const text = (count > 1) ? 'Files selected' : 'File selected'

  let singleFileAction = 'disabled o-50'
  let singleFileTooltip = {
    title: 'Only available for individual files'
  }

  if (count === 1) {
    singleFileAction = 'pointer'
    singleFileTooltip = {}
  }

  return (
    <div className={`SelectedActions sans-serif bt w-100 pa3 ${className}`}{...props}>
      <div className='flex items-center justify-between'>
        <div className='w5'>
          <div className='flex items-center'>
            <div className='SelectedCount mr3 relative f3 fw6 w2 h2 dib br-100'>
              <span className='absolute'>{count}</span>
            </div>
            <div>
              <p className='ma0'>{text}</p>
              <p className='Size ma0 mt1 f6'>Total size: {filesize(size)}</p>
            </div>
          </div>
        </div>
        <div className='flex'>
          <div className='pointer tc mh2' onClick={share}>
            <StrokeShare className='w3' fill='#A4BFCC' />
            <p className='ma0 f6'>Share</p>
          </div>
          <div className='pointer tc mh2' onClick={download}>
            <StrokeDownload className='w3' fill='#A4BFCC' />
            <p className='ma0 f6'>Download</p>
          </div>
          <div className='pointer tc mh2' onClick={remove}>
            <StrokeTrash className='w3' fill='#A4BFCC' />
            <p className='ma0 f6'>Delete</p>
          </div>
          <div className={`tc mh2 ${singleFileAction}`} onClick={inspect} {...singleFileTooltip}>
            <StrokeIpld className='w3' fill='#A4BFCC' />
            <p className='ma0 f6'>Inspect IPLD</p>
          </div>
          <div className={`tc mh2 ${singleFileAction}`} onClick={rename} {...singleFileTooltip}>
            <StrokePencil className='w3' fill='#A4BFCC' />
            <p className='ma0 f6'>Rename</p>
          </div>
        </div>
        <div className='w5'>
          <span onClick={unselect} className='pointer flex items-center justify-end'>
            <span className='mr2'>Deselect all</span>
            <GlyphSmallCancel onClick={unselect} className='w1' fill='#F26148' viewBox='37 40 27 27' />
          </span>
        </div>
      </div>
    </div>
  )
}

SelectedActions.propTypes = {
  count: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  unselect: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  share: PropTypes.func.isRequired,
  download: PropTypes.func.isRequired,
  rename: PropTypes.func.isRequired,
  inspect: PropTypes.func.isRequired
}

SelectedActions.defaultActions = {
  className: ''
}

export default SelectedActions
