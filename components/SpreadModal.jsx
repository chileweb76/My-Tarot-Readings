'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createSpreadAction, uploadSpreadBlobAction } from '../lib/actions'

// Vercel Blob utility functions
const extractBlobUrl = (uploadResponse) => {
  if (!uploadResponse) return null
  return uploadResponse.url || uploadResponse.image || uploadResponse.spread?.image
}

const prepareBlobUpload = (formData, options = {}) => {
  if (options.filename) formData.append('filename', options.filename)
  if (options.contentType) formData.append('contentType', options.contentType)
  if (options.cacheControl) formData.append('cacheControl', options.cacheControl)
  return formData
}

export default function SpreadModal({ show, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState(3)
  // Keep a string form of the number input so the user can clear the field while typing
  // without it immediately snapping back to 1. Sync to `number` only when input is a valid integer.
  const [numberStr, setNumberStr] = useState(String(3))
  const [cards, setCards] = useState([])
  const [meanings, setMeanings] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (show) {
      setName('')
      setNumber(3)
      setNumberStr(String(3))
      setCards([])
      setMeanings([])
      setError(null)
      setImageFile(null)
      setImagePreview(null)
      setUploading(false)
    }
  }, [show])

  useEffect(() => {
    // ensure arrays match number
    // Use nullish coalescing so empty string values are preserved (allow clearing)
    setCards(prev => {
      const next = Array.from({ length: number }, (_, i) => (prev[i] ?? ''))
      return next
    })
  }, [number])

  const handleCardNameChange = (idx, val) => {
    setCards(prev => {
      const copy = [...prev]
      copy[idx] = val
      return copy
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      // Create the spread first
      const payload = { 
        spread: name, 
        cards, 
        numberofCards: number, 
        image: imageFile ? '/images/spreads/custom.png' : '/images/spreads/custom.png' // Will be updated after upload
      }
      
      const result = await createSpreadAction(payload)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create spread')
      }
      const data = result.data

      // Upload image if provided
      if (imageFile && data._id) {
        setUploading(true)
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('spreadId', data._id)
        
        // Add Vercel Blob metadata for spread image
        prepareBlobUpload(formData, {
          filename: `spread-${data._id}-${Date.now()}.${imageFile.type.split('/')[1] || 'jpg'}`,
          contentType: imageFile.type
        })
        
        const uploadResult = await uploadSpreadBlobAction(formData)
        
        if (uploadResult.success) {
          // Handle Vercel Blob response format using utility
          const blobUrl = extractBlobUrl(uploadResult.data)
          data.image = blobUrl
        }
      }

      // notify other components
      try { window.dispatchEvent(new CustomEvent('spreadsUpdated', { detail: data })) } catch (e) {}
      if (onCreated) onCreated(data)
      onClose()
    } catch (e) {
      setError(e.message || 'Error')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (!show) return null

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Custom Spread</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="mb-3">
              <label className="form-label">Spread name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Number of cards</label>
              <input
                type="number"
                className="form-control"
                value={numberStr}
                min={1}
                max={20}
                onChange={(e) => {
                  const v = e.target.value
                  // allow the user to clear the field while typing (empty string)
                  if (v === '') {
                    setNumberStr('')
                    return
                  }
                  // only accept digits
                  if (!/^\d+$/.test(v)) return
                  // keep the string in sync
                  setNumberStr(v)
                  // parse and enforce bounds
                  const parsed = parseInt(v, 10)
                  const bounded = Math.max(1, Math.min(20, parsed || 1))
                  setNumber(bounded)
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Card names</label>
              {cards.map((c, i) => (
                <input
                  key={i}
                  className="form-control mb-2"
                  value={c}
                  placeholder={`Card ${i+1}`}
                  onChange={(e) => handleCardNameChange(i, e.target.value)}
                />
              ))}
            </div>

            <div className="mb-3">
              <label className="form-label">Spread Image (optional)</label>
              <input 
                type="file" 
                className="form-control mb-2" 
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="mt-2">
                  {/* Responsive preview: container can be styled via CSS; using a max-width and aspect ratio here */}
                  <div className="img-thumbnail spread-preview spread-preview--thumbnail">
                    <Image
                      src={imagePreview}
                      alt="Spread preview"
                      fill
                      style={{ objectFit: 'contain' }}
                      sizes="(max-width: 600px) 90vw, 400px"
                      priority={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving || uploading}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving || uploading || !name}>
              {saving ? 'Creating...' : uploading ? 'Uploading Image...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
