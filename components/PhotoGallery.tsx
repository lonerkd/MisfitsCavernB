'use client';

interface Photo {
  id: string;
  imageUrl: string;
  title: string;
}

export default function PhotoGallery({ photos = [] }: { photos?: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div style={{ width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'rgba(224, 221, 174,0.4)' }}>
          No gallery images yet.<br />
          <span style={{ fontSize: 9, color: 'rgba(224, 221, 174,0.25)' }}>Add concept art in Studio to populate this gallery.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {photos.map((photo) => (
        <figure
          key={photo.id}
          style={{ margin: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote storage URLs of unknown dimensions */}
          <img
            src={photo.imageUrl}
            alt={photo.title}
            loading="lazy"
            style={{ display: 'block', width: '100%', aspectRatio: '3 / 2', objectFit: 'cover' }}
          />
          <figcaption style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, color: 'var(--fg-dim)' }}>
            {photo.title}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
