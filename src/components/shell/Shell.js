import React from 'react'
import classNames from 'classnames'

const Shell = ({
  title = 'Shell',
  children,
  className,
  Icon,
  iconProps
}) => {
  return (
    <div className={classNames('br1 overflow-hidden', className)}>
      <div className='f7 mb0 sans-serif ttu tracked charcoal pv1 pl2 bg-black-20 flex items-center' style={{ height: 30 }}>
        { Icon && <Icon { ...iconProps } />}
        <span>{ title }</span>
      </div>
      <div className='bg-black-70 snow pa2 f7 lh-copy monospace nowrap overflow-x-auto'>
        {children}
      </div>
    </div>
  )
}

export default Shell
