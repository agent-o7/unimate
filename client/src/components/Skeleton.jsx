import './Skeleton.css'

function Skeleton({ width, height, borderRadius, variant = 'rect', count = 1, className = '' }) {
    const style = {
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || 'var(--radius-md)',
    }

    return (
        <span className={`skeleton-wrapper ${className}`} aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className={`skeleton skeleton-${variant}`}
                    style={i > 0 ? { ...style, marginTop: '0.5rem' } : style}
                />
            ))}
        </span>
    )
}

function SkeletonPreview() {
    return (
        <div className="skeleton-preview glass fade-in" aria-label="Loading video info">
            <div className="skeleton-preview-thumb">
                <Skeleton height="100%" borderRadius="var(--radius-lg)" />
            </div>
            <div className="skeleton-preview-info">
                <Skeleton height="1.5rem" width="85%" />
                <Skeleton height="1rem" width="50%" />
                <div style={{ marginTop: 'auto' }}>
                    <Skeleton height="1rem" width="30%" />
                    <Skeleton height="3rem" width="100%" borderRadius="var(--radius-lg)" />
                </div>
            </div>
        </div>
    )
}

export { Skeleton, SkeletonPreview }
export default Skeleton
