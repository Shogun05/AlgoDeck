export const formatDate = (date: string | null): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export const formatRelativeDate = (date: string | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(date);
};

export const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const getNow = (): string => {
    return new Date().toISOString();
};

export const generateFilename = (prefix: string, ext: string): string => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${ts}.${ext}`;
};

export const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
};

export const truncate = (str: string, len: number): string => {
    if (str.length <= len) return str;
    return str.substring(0, len - 3) + '...';
};

export const parseTags = (tags: string): string[] => {
    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const difficultyColor = (difficulty: string): string => {
    switch (difficulty) {
        case 'Easy': return '#3FB950';
        case 'Medium': return '#D29922';
        case 'Hard': return '#F85149';
        default: return '#8B949E';
    }
};
