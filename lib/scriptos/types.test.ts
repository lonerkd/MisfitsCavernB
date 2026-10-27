import { describe, it, expect } from 'vitest';
import {
  LineType,
  ScriptLineMeta,
  ScriptLine,
  Scene,
  SceneElements,
  Character,
  ScriptMetadata,
  ScreenplayDocument,
  ParseResult,
  StashItem,
} from './types';

describe('types', () => {
  it('should correctly define LineType union', () => {
    const lineTypes: LineType[] = [
      'slug',
      'action',
      'character',
      'dialogue',
      'parenthetical',
      'transition',
      'shot',
      'text',
      'title',
      'centered',
      'scene',
      'note',
      'lyric',
      'section',
      'synopsis',
      'dual',
      'pagebreak',
      'boneyard',
      'empty',
    ];
    expect(lineTypes.length).toBe(19);
  });

  it('should correctly construct a ScriptLine', () => {
    const line: ScriptLine = {
      id: 'l1',
      index: 0,
      text: 'Hello world',
      type: 'dialogue',
      confidence: 0.95,
    };
    expect(line.id).toBe('l1');
    expect(line.index).toBe(0);
    expect(line.text).toBe('Hello world');
    expect(line.type).toBe('dialogue');
    expect(line.confidence).toBe(0.95);
  });

  it('should correctly construct a Scene', () => {
    const scene: Scene = {
      id: 's1',
      startIndex: 0,
      endIndex: 10,
      heading: 'INT. OFFICE - DAY',
      sceneNumber: '1',
      location: 'Office',
      timeOfDay: 'Day',
      characters: ['Alice', 'Bob'],
      wordCount: 100,
      eighths: 5,
      elements: {
        props: ['laptop'],
        wardrobe: ['suit'],
        vehicles: [],
        sfx: ['keyboard_typing'],
        vfx: [],
      },
    };
    expect(scene.id).toBe('s1');
    expect(scene.startIndex).toBe(0);
    expect(scene.endIndex).toBe(10);
    expect(scene.heading).toBe('INT. OFFICE - DAY');
    expect(scene.sceneNumber).toBe('1');
    expect(scene.location).toBe('Office');
    expect(scene.timeOfDay).toBe('Day');
    expect(scene.characters).toEqual(['Alice', 'Bob']);
    expect(scene.wordCount).toBe(100);
    expect(scene.eighths).toBe(5);
    expect(scene.elements?.props).toEqual(['laptop']);
    expect(scene.elements?.wardrobe).toEqual(['suit']);
    expect(scene.elements?.vehicles).toEqual([]);
    expect(scene.elements?.sfx).toEqual(['keyboard_typing']);
    expect(scene.elements?.vfx).toEqual([]);
  });

  it('should correctly construct a Character', () => {
    const character: Character = {
      name: 'Charlie',
      lines: 5,
      firstLineIndex: 2,
      scenes: [1, 3],
      dialogueCount: 3,
    };
    expect(character.name).toBe('Charlie');
    expect(character.lines).toBe(5);
    expect(character.firstLineIndex).toBe(2);
    expect(character.scenes).toEqual([1, 3]);
    expect(character.dialogueCount).toBe(3);
  });

  it('should correctly construct a ScreenplayDocument', () => {
    const document: ScreenplayDocument = {
      id: 'doc1',
      title: 'My Script',
      content: 'Some script content',
      lines: [
        {
          id: 'l1',
          index: 0,
          text: 'Hello world',
          type: 'dialogue',
          confidence: 0.95,
        },
      ],
      scenes: [
        {
          id: 's1',
          startIndex: 0,
          endIndex: 10,
          heading: 'INT. OFFICE - DAY',
          sceneNumber: '1',
          location: 'Office',
          timeOfDay: 'Day',
          characters: ['Alice', 'Bob'],
          wordCount: 100,
          eighths: 5,
          elements: {
            props: ['laptop'],
            wardrobe: ['suit'],
            vehicles: [],
            sfx: ['keyboard_typing'],
            vfx: [],
          },
        },
      ],
      characters: [
        {
          name: 'Alice',
          lines: 1,
          firstLineIndex: 0,
          scenes: [1],
          dialogueCount: 1,
        }
      ],
      metadata: {
        author: 'Me',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(document.id).toBe('doc1');
    expect(document.title).toBe('My Script');
    expect(document.content).toBe('Some script content');
    expect(document.lines.length).toBe(1);
    expect(document.scenes.length).toBe(1);
    expect(document.characters.length).toBe(1);
    expect(document.metadata?.author).toBe('Me');
    expect(document.createdAt).toBeInstanceOf(Date);
    expect(document.updatedAt).toBeInstanceOf(Date);
  });
});