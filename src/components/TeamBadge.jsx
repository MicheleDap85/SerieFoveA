import React from 'react'

export default function TeamBadge({ name, logoUrl, size = 26, className = '' }) {
  const [error, setError] = React.useState(false)
  const initials = React.useMemo(() => {
    if (!name) return '?'
    return name
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [name])

  return (
    <span className={`team ${className}`} style={{ minWidth: 0 }}>
      {logoUrl && !error ? (
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            background: '#1b1b22',
            border: '1px solid #2a2a33',
            fontSize: 12,
            color: '#c9c9d1',
            display: 'inline-grid',
            placeItems: 'center',
            fontWeight: 700
          }}
          title={name}
        >
          {initials}
        </span>
      )}
      <span className="name" title={name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </span>
  )
}
