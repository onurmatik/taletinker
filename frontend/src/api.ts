
const API_BASE = '/api';

export interface StorySummary {
    id: string;
    uuid: string;
    title: string;
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
    title: string;
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
