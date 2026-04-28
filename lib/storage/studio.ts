const STUDIO_KEY = 'misfits_cavern_studio';

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

export function getAllBoards(): Board[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STUDIO_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading boards:', error);
    return [];
  }
}

export function getBoard(id: string): Board | null {
  const boards = getAllBoards();
  return boards.find(b => b.id === id) || null;
}

export function createBoard(name: string, description: string = ''): Board {
  const newBoard: Board = {
    id: generateId(),
    name,
    description,
    assets: [],
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#0a0a0a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const boards = getAllBoards();
  boards.push(newBoard);
  localStorage.setItem(STUDIO_KEY, JSON.stringify(boards));

  return newBoard;
}

export function updateBoard(id: string, updates: Partial<Board>): Board {
  const boards = getAllBoards();
  const index = boards.findIndex(b => b.id === id);

  if (index === -1) throw new Error('Board not found');

  const updated = {
    ...boards[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  boards[index] = updated;
  localStorage.setItem(STUDIO_KEY, JSON.stringify(boards));

  return updated;
}

export function deleteBoard(id: string): boolean {
  const boards = getAllBoards();
  const filtered = boards.filter(b => b.id !== id);

  if (filtered.length === boards.length) return false;

  localStorage.setItem(STUDIO_KEY, JSON.stringify(filtered));
  return true;
}

export function addAsset(boardId: string, url: string, type: Asset['type'], title: string = ''): Asset {
  const board = getBoard(boardId);
  if (!board) throw new Error('Board not found');

  const asset: Asset = {
    id: generateId(),
    url,
    type,
    boardId,
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    title,
    notes: '',
    createdAt: new Date().toISOString()
  };

  board.assets.push(asset);
  updateBoard(boardId, { assets: board.assets });

  return asset;
}

export function updateAsset(boardId: string, assetId: string, updates: Partial<Asset>): Asset {
  const board = getBoard(boardId);
  if (!board) throw new Error('Board not found');

  const asset = board.assets.find(a => a.id === assetId);
  if (!asset) throw new Error('Asset not found');

  const updated = { ...asset, ...updates };
  board.assets = board.assets.map(a => (a.id === assetId ? updated : a));
  updateBoard(boardId, { assets: board.assets });

  return updated;
}

export function deleteAsset(boardId: string, assetId: string): void {
  const board = getBoard(boardId);
  if (!board) throw new Error('Board not found');

  board.assets = board.assets.filter(a => a.id !== assetId);
  updateBoard(boardId, { assets: board.assets });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
