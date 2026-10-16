import { useState, useRef } from 'react'
import { Image, Video, X, Upload, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Avatar, Modal, Button, Alert } from '@/components/ui'
import { createPost } from '@/services/posts'
import { uploadPostMedia, validateFile } from '@/services/storage'

export default function CreatePostModal({ open, onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const validation = validateFile(f)
    if (!validation.ok) { setError(validation.error); return }
    setError('')
    setFile(f)
    setFileType(validation.type)
    setPreview(URL.createObjectURL(f))
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setFileType(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!content.trim() && !file) {
      setError('Escreva algo ou adicione uma mídia.')
      return
    }
    setUploading(true)
    setError('')
    try {
      let mediaUrl = null
      let mediaType = null

      if (file) {
        const uploaded = await uploadPostMedia(file, user.id)
        mediaUrl = uploaded.url
        mediaType = uploaded.type
      }

      const post = await createPost({
        userId: user.id,
        content: content.trim(),
        mediaUrl,
        mediaType,
      })

      onCreated?.(post)
      handleClose()
    } catch (err) {
      setError(err.message || 'Erro ao publicar. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setContent('')
    clearFile()
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova publicação" className="max-w-xl">
      <div className="space-y-4">
        {/* Header do usuário */}
        <div className="flex items-center gap-3">
          <Avatar profile={profile} size="sm" />
          <span className="font-medium text-brand-text text-sm">@{profile?.username}</span>
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Compartilhe seu treino, refeição, conquista..."
          rows={4}
          maxLength={1000}
          className="input resize-none text-sm"
        />
        <p className="text-xs text-brand-sub text-right">{content.length}/1000</p>

        {/* Preview de mídia */}
        {preview && (
          <div className="relative rounded-xl overflow-hidden bg-brand-card2">
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {fileType === 'video' ? (
              <video src={preview} controls className="w-full max-h-56 object-contain" />
            ) : (
              <img src={preview} alt="Preview" className="w-full max-h-56 object-cover" />
            )}
          </div>
        )}

        <Alert type="error" message={error} />

        {/* Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-border">
          <div className="flex gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-ghost flex items-center gap-1.5 text-xs"
              disabled={uploading}
            >
              <Image className="w-4 h-4 text-brand-sub" />
              Foto
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-ghost flex items-center gap-1.5 text-xs"
              disabled={uploading}
            >
              <Video className="w-4 h-4 text-brand-sub" />
              Vídeo
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleFile}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={uploading} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={uploading} size="sm">
              {uploading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
