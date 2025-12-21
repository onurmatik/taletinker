
const API_BASE = '/api';

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
        const res = await fetch(`${API_BASE}/stories/`);
        if (!res.ok) throw new Error('Failed to fetch stories');
        return res.json();
    },

    async getStory(id: string): Promise<StoryData> {
        const res = await fetch(`${API_BASE}/stories/${id}`);
        if (!res.ok) throw new Error('Failed to fetch story');
        return res.json();
    },

    async createStory(data: { title?: string | null; tagline?: string | null; lines: string[] }): Promise<{ id: string; title: string | null; tagline: string | null; success: boolean }> {
        const res = await fetch(`${API_BASE}/stories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create story');
        return res.json();
    },

    async suggestLines(context: string[]): Promise<string[]> {
        const res = await fetch(`${API_BASE}/stories/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
        });
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        return res.json();
    },

    async suggestStoryMeta(context: string[]): Promise<{ title: string; tagline: string }> {
        const res = await fetch(`${API_BASE}/stories/suggest-meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
        });
        if (!res.ok) throw new Error('Failed to fetch story meta');
        return res.json();
    },

    async updateStoryMeta(id: string, data: { title?: string | null; tagline?: string | null }): Promise<{ title: string | null; tagline: string | null }> {
        const res = await fetch(`${API_BASE}/stories/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update story meta');
        return res.json();
    },

    async requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!res.ok) throw new Error('Failed to request magic link');
        return res.json();
    },

    async likeStory(id: string): Promise<{ success: boolean; like_count: number; is_liked: boolean }> {
        const res = await fetch(`${API_BASE}/stories/${id}/like`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to like story');
        return res.json();
    },

    async likeLine(id: string): Promise<{ success: boolean; like_count: number; is_liked: boolean }> {
        const res = await fetch(`${API_BASE}/stories/lines/${id}/like`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to like line');
        return res.json();
    }
};
