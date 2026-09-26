'use client';

interface Photo {
  id: string;
  imageUrl: string;
  title: string;
  /** Project the image belongs to, shown under the title. */
  caption?: string;
  /** Where the image leads — the project's lookbook. */
  href?: string;
}

export default function PhotoGallery({ photos = [] }: { photos?: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div style={{ width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'rgba(224, 221, 174,0.4)' }}>
          Nothing featured yet.<br />
          <span style={{ fontSize: 9, color: 'rgba(224, 221, 174,0.25)' }}>Make a project Public in Studio → Share and its published references appear here.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {photos.map((photo) => {
        const figure = (
          <figure
            style={{ margin: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', height: '100%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote storage URLs of unknown dimensions */}
            <img
              src={photo.imageUrl}
              alt={photo.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ display: 'block', width: '100%', aspectRatio: '3 / 2', objectFit: 'cover' }}
            />
            <figcaption style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, color: 'var(--fg-dim)' }}>
              {photo.title}
              {photo.caption && photo.caption !== photo.title && <div style={{ fontSize: 9, opacity: 0.7, marginTop: 3 }}>{photo.caption}</div>}
            </figcaption>
          </figure>
        );
        return photo.href
          ? <a key={photo.id} href={photo.href} style={{ textDecoration: 'none', color: 'inherit' }}>{figure}</a>
          : <div key={photo.id}>{figure}</div>;
      })}
    </div>
  );
}
