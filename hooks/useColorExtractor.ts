import { useState, useEffect } from 'react';
import { FastAverageColor } from 'fast-average-color';

export function useColorExtractor(imageUrl: string | null) {
  // The colour found, tagged with the image it was found in.
  const [found, setFound] = useState<{ url: string; color: string | null } | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const fac = new FastAverageColor();
    fac.getColorAsync(imageUrl)
      .then(result => {
        setFound({ url: imageUrl, color: result.hex });
      })
      .catch(e => {
        console.error('Failed to extract color:', e);
        setFound({ url: imageUrl, color: null });
      });

    return () => {
      fac.destroy();
    };
  }, [imageUrl]);

  return imageUrl && found?.url === imageUrl ? found.color : null;
}
