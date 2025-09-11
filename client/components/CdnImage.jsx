import React from 'react'
import cdnUrl from '../lib/cdn'

export default function CdnImage({ src, alt = '', className = '', ...rest }) {
  // If src is a string and starts with /images/, map through cdnUrl
  const finalSrc = typeof src === 'string' && src.startsWith('/images/') ? cdnUrl(src) : src
  return <img src={finalSrc} alt={alt} className={className} {...rest} />
}
