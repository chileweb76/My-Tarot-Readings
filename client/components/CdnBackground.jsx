import React from 'react'
import cdnUrl from '../lib/cdn'

export default function CdnBackground({ src, className = '', style = {}, children, ...rest }) {
  const final = typeof src === 'string' && src.startsWith('/images/') ? cdnUrl(src) : src
  const merged = Object.assign({}, style, { backgroundImage: `url('${final}')` })
  return (
    <div className={className} style={merged} {...rest}>
      {children}
    </div>
  )
}
