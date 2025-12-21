
const API_BASE = '/api';

async function fetchJson<T>(url: string, options: RequestInit, errorMessage: string): Promise<T> {
    const res = await fetch(url, { credentials: 'include', ...options });
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

export interface StorySummary {
    id: string;
    uuid: string;
    title: string | null;
    tagline?: string | null;
    preview: string;
    created_at: string;
    length: number;
    author_name: string;
    like_count: number;
    is_liked: boolean;
    root_node_id?: string | null;
    lines: LineData[];
}

export interface LineData {
    id: string;
    text: string;
    is_manual: boolean;
    like_count: number;
    is_liked: boolean;
    alternatives?: string[];
}

export interface StoryData {
    id: string;
    uuid: string;
    title: string | null;
    tagline?: string | null;
    preview: string;
    lines: LineData[];
    created_at: string;
    length: number;
    author_name: string;
    like_count: number;
    is_liked: boolean;
    root_node_id?: string | null;
}

export const api = {
    async listStories(): Promise<StorySummary[]> {
        return fetchJson(`${API_BASE}/stories/`, { method: 'GET' }, 'Failed to fetch stories');
    },

    async getStory(id: string): Promise<StoryData> {
        return fetchJson(`${API_BASE}/stories/${id}`, { method: 'GET' }, 'Failed to fetch story');
    },

    async createStory(data: { title?: string | null; tagline?: string | null; lines: string[] }): Promise<{ id: string; title: string | null; tagline: string | null; success: boolean }> {
        return fetchJson(`${API_BASE}/stories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, 'Failed to create story');
    },

    async suggestLines(context: string[]): Promise<string[]> {
        return fetchJson(`${API_BASE}/stories/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
        }, 'Failed to fetch suggestions');
    },

    async suggestStoryMeta(context: string[]): Promise<{ title: string; tagline: string }> {
        return fetchJson(`${API_BASE}/stories/suggest-meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
        }, 'Failed to fetch story meta');
    },

    async updateStoryMeta(id: string, data: { title?: string | null; tagline?: string | null }): Promise<{ title: string | null; tagline: string | null }> {
        return fetchJson(`${API_BASE}/stories/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, 'Failed to update story meta');
    },

    async requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
        return fetchJson(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        }, 'Failed to request magic link');
    },

    async getMe(): Promise<{ email: string | null; is_authenticated: boolean }> {
        return fetchJson(`${API_BASE}/auth/me`, { method: 'GET' }, 'Failed to fetch user');
    },

    async logout(): Promise<{ success: boolean }> {
        return fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' }, 'Failed to logout');
    },

    async likeStory(id: string): Promise<{ success: boolean; like_count: number; is_liked: boolean }> {
        return fetchJson(`${API_BASE}/stories/${id}/like`, { method: 'POST' }, 'Failed to like story');
    },

    async likeLine(id: string): Promise<{ success: boolean; like_count: number; is_liked: boolean }> {
        return fetchJson(`${API_BASE}/stories/lines/${id}/like`, { method: 'POST' }, 'Failed to like line');
    }
};
