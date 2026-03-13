import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

let client: AxiosInstance;

function getClient(): AxiosInstance {
    if (!client) {
        client = axios.create({
            baseURL: config.weeek.baseUrl,
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${config.weeek.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }
    return client;
}

// ─── Tasks ───

export interface WeeekTask {
    id: number;
    parentId: number | null;
    title: string;
    description: string;
    date: string | null;
    type: 'action' | 'meet' | 'call';
    priority: number | null; // 0-Low, 1-Medium, 2-High, 3-Hold
    isCompleted: boolean;
    authorId: string;
    userId: string | null;
    boardId: number | null;
    boardColumnId: number | null;
    projectId: number | null;
    tags: number[];
}

export interface CreateTaskData {
    title: string;
    type: 'action' | 'meet' | 'call';
    priority?: number;
    description?: string;
    day?: string; // DD.MM.YYYY
    projectId?: number | null;
    boardId?: number | null;
    boardColumnId?: number | null;
    userId?: string | null;
}

/**
 * Создать задачу в Weeek.
 */
export async function createTask(data: CreateTaskData): Promise<WeeekTask> {
    const c = getClient();
    const body: any = {
        title: data.title,
        type: data.type,
    };
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.description) body.description = data.description;
    if (data.day) body.day = data.day;
    if (data.projectId) body.projectId = data.projectId;
    if (data.boardId) body.boardId = data.boardId;
    if (data.boardColumnId) body.boardColumnId = data.boardColumnId;
    if (data.userId) body.userId = data.userId;

    const resp = await c.post('/tm/tasks', body);
    return resp.data.task;
}

/**
 * Получить задачу по ID.
 */
export async function getTask(taskId: number): Promise<WeeekTask> {
    const c = getClient();
    const resp = await c.get(`/tm/tasks/${taskId}`);
    return resp.data.task;
}

/**
 * Удалить задачу.
 */
export async function deleteTask(taskId: number): Promise<void> {
    const c = getClient();
    await c.delete(`/tm/tasks/${taskId}`);
}

/**
 * Завершить задачу.
 */
export async function completeTask(taskId: number): Promise<void> {
    const c = getClient();
    await c.post(`/tm/tasks/${taskId}/complete`);
}

// ─── Projects ───

export interface WeeekProject {
    id: number;
    title: string;
    description: string | null;
    color: string;
    isPrivate: boolean;
}

export async function getProjects(): Promise<WeeekProject[]> {
    const c = getClient();
    const resp = await c.get('/tm/projects');
    return resp.data.projects;
}

// ─── Boards ───

export interface WeeekBoard {
    id: number;
    name: string;
    projectId: number;
    isPrivate: boolean;
}

export async function getBoards(projectId?: number): Promise<WeeekBoard[]> {
    const c = getClient();
    const params = projectId ? { projectId } : {};
    const resp = await c.get('/tm/boards', { params });
    return resp.data.boards;
}

// ─── Board Columns ───

export interface WeeekBoardColumn {
    id: number;
    name: string;
    boardId: number;
}

export async function getBoardColumns(boardId: number): Promise<WeeekBoardColumn[]> {
    const c = getClient();
    const resp = await c.get('/tm/board-columns', { params: { boardId } });
    return resp.data.boardColumns;
}

// ─── Tags ───

export interface WeeekTag {
    id: number;
    title: string;
    color: string;
}

export async function getTags(): Promise<WeeekTag[]> {
    const c = getClient();
    const resp = await c.get('/ws/tags');
    return resp.data.tags;
}

export async function createTag(title: string): Promise<WeeekTag> {
    const c = getClient();
    const resp = await c.post('/ws/tags', { title });
    return resp.data.tag;
}

// ─── Workspace ───

export async function getWorkspace(): Promise<any> {
    const c = getClient();
    const resp = await c.get('/ws');
    return resp.data.workspace;
}

export async function getMembers(): Promise<any[]> {
    const c = getClient();
    const resp = await c.get('/ws/members');
    return resp.data.members;
}
