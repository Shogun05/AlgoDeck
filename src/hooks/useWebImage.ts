import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { loadWebImage } from '../db/webStorage';

export function useWebImage(path?: string | null) {
    const [uri, setUri] = useState<string | null>(null);

    useEffect(() => {
        if (!path) {
            setUri(null);
            return;
        }

        if (Platform.OS === 'web' && path.startsWith('web://img/')) {
            let active = true;
            loadWebImage(path).then(res => {
                if (active) setUri(res);
            });
            return () => { active = false; };
        } else {
            setUri(path);
        }
    }, [path]);

    return uri;
}
