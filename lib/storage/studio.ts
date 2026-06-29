'use client';

import { supabase } from '@/lib/supabase/client';
import {
  getStudioBoards,
  createStudioBoard as sbCreateBoard,
  getStudioAssets,
  addStudioAsset as sbAddAsset,
  updateStudioAsset as sbUpdateAsset,
  deleteStudioAsset as sbDeleteAsset,
} from '@/lib/supabase/studio';

export interface Asset {
  id: string;
  url: string;
  type: 'image' | 'color' | 'typography';
  boardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  notes: string;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  assets: Asset[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function getAllBoards(): Promise<Board[]> {
  try {
    const userId = await getCurrentUserId();
    const sbBoards = await getStudioBoards(userId);

    return Promise.all(
      sbBoards.map(async (sbBoard) => {
        const sbAssets = await getStudioAssets(sbBoard.id);

        return {
          id: sbBoard.id,
          name: sbBoard.name,
          description: sbBoard.description,
          assets: (sbAssets || []).map((a) => ({
            id: a.id,
            url: a.url,
            type: a.type as 'image' | 'color' | 'typography',
            boardId: a.board_id,
            x: a.x,
            y: a.y,
            width: a.width,
            height: a.height,
            title: a.title,
            notes: a.notes,
            createdAt: a.created_at,
          })),
          canvasWidth: sbBoard.canvas_width,
          canvasHeight: sbBoard.canvas_height,
          backgroundColor: sbBoard.background_color,
          createdAt: sbBoard.created_at,
          updatedAt: sbBoard.updated_at,
        };
      })
    );
  } catch (error) {
    console.error('Error loading boards:', error);
    return [];
  }
}

export async function getBoard(id: string): Promise<Board | null> {
  try {
    const allBoards = await getAllBoards();
    return allBoards.find((b) => b.id === id) || null;
  } catch (error) {
    console.error('Error loading board:', error);
    return null;
  }
}

export async function createBoard(name: string, description: string = ''): Promise<Board> {
  try {
    const userId = await getCurrentUserId();
    const sbBoard = await sbCreateBoard({
      user_id: userId,
      name,
      description,
      canvas_width: 1920,
      canvas_height: 1080,
      background_color: '#0a0a0a',
    });

    return {
      id: sbBoard.id,
      name: sbBoard.name,
      description: sbBoard.description,
      assets: [],
      canvasWidth: sbBoard.canvas_width,
      canvasHeight: sbBoard.canvas_height,
      backgroundColor: sbBoard.background_color,
      createdAt: sbBoard.created_at,
      updatedAt: sbBoard.updated_at,
    };
  } catch (error) {
    console.error('Error creating board:', error);
    throw error;
  }
}

export async function updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
  try {
    const userId = await getCurrentUserId();
    const board = await getBoard(id);
    if (!board) throw new Error('Board not found');

    const sbUpdates: any = {};
    if (updates.name) sbUpdates.name = updates.name;
    if (updates.description) sbUpdates.description = updates.description;
    if (updates.canvasWidth) sbUpdates.canvas_width = updates.canvasWidth;
    if (updates.canvasHeight) sbUpdates.canvas_height = updates.canvasHeight;
    if (updates.backgroundColor) sbUpdates.background_color = updates.backgroundColor;

    // For now, we don't update assets through this method
    // Assets are managed separately via addAsset/updateAsset/deleteAsset

    const allBoards = await getStudioBoards(userId);
    const sbBoard = allBoards.find((b) => b.id === id);
    if (!sbBoard) throw new Error('Board not found');

    // Update the board properties via direct Supabase update
    const { error } = await supabase
      .from('studio_boards')
      .update(sbUpdates)
      .eq('id', id);

    if (error) throw error;

    // Return updated board
    return getBoard(id) as Promise<Board>;
  } catch (error) {
    console.error('Error updating board:', error);
    throw error;
  }
}

export async function deleteBoard(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('studio_boards').delete().eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting board:', error);
    return false;
  }
}

export async function addAsset(
  boardId: string,
  url: string,
  type: Asset['type'],
  title: string = ''
): Promise<Asset> {
  try {
    const userId = await getCurrentUserId();
    const sbAsset = await sbAddAsset({
      user_id: userId,
      board_id: boardId,
      url,
      type,
      title,
      notes: '',
      x: 0,
      y: 0,
      width: 300,
      height: 300,
    });

    return {
      id: sbAsset.id,
      url: sbAsset.url,
      type: sbAsset.type,
      boardId: sbAsset.board_id,
      x: sbAsset.x,
      y: sbAsset.y,
      width: sbAsset.width,
      height: sbAsset.height,
      title: sbAsset.title,
      notes: sbAsset.notes,
      createdAt: sbAsset.created_at,
    };
  } catch (error) {
    console.error('Error adding asset:', error);
    throw error;
  }
}

export async function updateAsset(
  boardId: string,
  assetId: string,
  updates: Partial<Asset>
): Promise<Asset> {
  try {
    const sbUpdates: any = {};
    if (updates.url) sbUpdates.url = updates.url;
    if (updates.type) sbUpdates.type = updates.type;
    if (updates.title) sbUpdates.title = updates.title;
    if (updates.notes) sbUpdates.notes = updates.notes;
    if (updates.x !== undefined) sbUpdates.x = updates.x;
    if (updates.y !== undefined) sbUpdates.y = updates.y;
    if (updates.width !== undefined) sbUpdates.width = updates.width;
    if (updates.height !== undefined) sbUpdates.height = updates.height;

    const sbAsset = await sbUpdateAsset(assetId, sbUpdates);

    return {
      id: sbAsset.id,
      url: sbAsset.url,
      type: sbAsset.type,
      boardId: sbAsset.board_id,
      x: sbAsset.x,
      y: sbAsset.y,
      width: sbAsset.width,
      height: sbAsset.height,
      title: sbAsset.title,
      notes: sbAsset.notes,
      createdAt: sbAsset.created_at,
    };
  } catch (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
}

export async function deleteAsset(boardId: string, assetId: string): Promise<void> {
  try {
    await sbDeleteAsset(assetId);
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}
