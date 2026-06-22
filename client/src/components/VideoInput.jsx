import { useState, useCallback, useRef, useEffect } from 'react'
import './VideoInput.css'

function VideoInput({ onSubmit, loading, onClear, value, onValueChange }) {
    const [url, setUrl] = useState(value || '')
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
        if (value !== undefined && value !== url) {
            setUrl(value)
        }
    }, [value])

    const detectPlatform = useCallback((url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
        if (url.includes('tiktok.com')) return 'tiktok'
        return null
    }, [])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (url.trim()) {
            onSubmit(url.trim())
        }
    }

    const handleClear = () => {
        setUrl('')
        onValueChange?.('')
        onClear?.()
    }

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                setUrl(text)
                onValueChange?.(text)
                if (detectPlatform(text)) {
                    onSubmit(text)
                }
            }
        } catch {
            // clipboard access denied, user can manually paste
        }
    }, [onSubmit, onValueChange, detectPlatform])

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        const text = e.dataTransfer.getData('text')
        if (text) {
            setUrl(text)
            onValueChange?.(text)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleClear()
        }
    }

    const platform = detectPlatform(url)

    return (
        <form
            className="video-input"
            onSubmit={handleSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={`input-container glass ${isDragging ? 'drag-over' : ''}`}>
                {isDragging && <div className="drop-overlay"><span>Drop URL here</span></div>}

                <div className={`platform-icon ${platform || 'empty'}`}>
                    {platform === 'youtube' && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                        </svg>
                    )}
                    {platform === 'tiktok' && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.6 6.7c-1.6-.3-2.8-1.4-3.2-2.9-.1-.3-.1-.6-.1-.9h-3.3v13.5c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1 1.4-3.1 3.1-3.1c.3 0 .6 0 .9.1v-3.4c-.3 0-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5V9.3c1.2.8 2.7 1.3 4.2 1.3V7.3c0 0-.7-.3-1-.6z" />
                        </svg>
                    )}
                    {!platform && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value)
                        onValueChange?.(e.target.value)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste YouTube or TikTok URL here..."
                    className="url-input"
                    disabled={loading}
                />

                {url && (
                    <button type="button" className="clear-btn" onClick={handleClear} disabled={loading}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                )}

                <button type="button" className="paste-btn" onClick={handlePaste} title="Paste from clipboard">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" />
                    </svg>
                </button>

                <button type="submit" className="submit-btn" disabled={!url.trim() || loading}>
                    {loading ? (
                        <span className="loading-spinner"></span>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                            <span>Get Video</span>
                        </>
                    )}
                </button>
            </div>

            <div className="supported-platforms">
                <span className="platform-badge youtube">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                    </svg>
                    YouTube
                </span>
                <span className="platform-badge tiktok">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M19.6 6.7c-1.6-.3-2.8-1.4-3.2-2.9-.1-.3-.1-.6-.1-.9h-3.3v13.5c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1 1.4-3.1 3.1-3.1c.3 0 .6 0 .9.1v-3.4c-.3 0-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5V9.3c1.2.8 2.7 1.3 4.2 1.3V7.3c0 0-.7-.3-1-.6z" />
                    </svg>
                    TikTok
                </span>
                <span className="hint-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    Drag & drop or paste URL
                </span>
            </div>
        </form>
    )
}

export default VideoInput
