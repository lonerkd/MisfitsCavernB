import { updateScript } from '@/lib/supabase/scripts';

export interface AutoSaveState {
  scriptId: string;
  content: string;
  lastSaved: Date;
  isSaving: boolean;
  saveCount: number;
  unsavedChanges: boolean;
}

export class AutoSaveManager {
  private saveInterval = 30000; // 30 seconds
  private timeoutId: NodeJS.Timeout | null = null;
  private state: AutoSaveState;
  private onStateChange: (state: AutoSaveState) => void;

  constructor(scriptId: string, onStateChange: (state: AutoSaveState) => void) {
    this.state = {
      scriptId,
      content: '',
      lastSaved: new Date(),
      isSaving: false,
      saveCount: 0,
      unsavedChanges: false
    };
    this.onStateChange = onStateChange;
  }

  async updateContent(content: string, userId: string) {
    this.state.content = content;
    this.state.unsavedChanges = true;
    this.onStateChange(this.state);

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Schedule auto-save
    this.timeoutId = setTimeout(async () => {
      await this.save(userId);
    }, this.saveInterval);
  }

  async save(userId: string) {
    if (this.state.isSaving || !this.state.unsavedChanges) return;

    this.state.isSaving = true;
    this.onStateChange(this.state);

    try {
      await updateScript(this.state.scriptId, this.state.content, userId);
      
      this.state.lastSaved = new Date();
      this.state.saveCount += 1;
      this.state.unsavedChanges = false;
      this.state.isSaving = false;
      
      this.onStateChange(this.state);
      
      return { success: true };
    } catch (error) {
      this.state.isSaving = false;
      this.onStateChange(this.state);
      
      console.error('Auto-save failed:', error);
      return { success: false, error };
    }
  }

  getState(): AutoSaveState {
    return { ...this.state };
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

// Manual save trigger
export async function manualSave(scriptId: string, content: string, userId: string) {
  try {
    await updateScript(scriptId, content, userId);
    return { success: true, timestamp: new Date() };
  } catch (error) {
    console.error('Manual save failed:', error);
    return { success: false, error };
  }
}
