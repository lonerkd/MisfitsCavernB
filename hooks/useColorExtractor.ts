import { useState, useEffect } from 'react';
import { FastAverageColor } from 'fast-average-color';

export function useColorExtractor(imageUrl: string | null) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }

    const fac = new FastAverageColor();
    fac.getColorAsync(imageUrl)
      .then(result => {
        setColor(result.hex);
      })
      .catch(e => {
        console.error('Failed to extract color:', e);
        setColor(null);
      });

    return () => {
      fac.destroy();
    };
  }, [imageUrl]);

  return color;
}
