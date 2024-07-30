import { useState, useEffect, useLayoutEffect } from 'react';
import { debounce } from 'lodash';
import { isMobile } from 'react-device-detect';

export default function useWindowDimensions() {

  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);

  useLayoutEffect(() => {
    function updateSize() {
      if(!isMobile)
        setSize([window.innerWidth, window.innerHeight]);
    }

    const debouncedUpdateSize = debounce(updateSize, 200); 

    window.addEventListener('resize', debouncedUpdateSize);
    updateSize();
    return () => window.removeEventListener('resize', debouncedUpdateSize);
  }, []);

  return {width: size[0], height: size[1]};
}