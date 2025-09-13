import { OutlineDocument } from './types.js';

export type SaveResult = { success: boolean; version?: number; error?: any };
export type LoadResult = { success: boolean; document?: OutlineDocument; error?: any };
export type DeleteResult = { success: boolean; error?: any };
export type BackupInfo = { id: string; documentId: string; timestamp: string };
export type BackupResult = { success: boolean; id?: string; error?: any };

export class StorageManager {
  private dbName = 'outliner-db';
  private storeName = 'documents';
  private backupName = 'backups';
  private memory = new Map<string, OutlineDocument>();
  private backups: BackupInfo[] = [];

  private hasIndexedDB(): boolean {
    return typeof (globalThis as any).indexedDB !== 'undefined';
  }

  async save(document: OutlineDocument): Promise<SaveResult> {
    if (!this.hasIndexedDB()) {
      this.memory.set(document.id, { ...document });
      return { success: true, version: document.version };
    }
    try {
      const db = await this.open();
      await this.put(db, this.storeName, document);
      db.close();
      return { success: true, version: document.version };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  async load(documentId: string): Promise<LoadResult> {
    if (!this.hasIndexedDB()) {
      const d = this.memory.get(documentId);
      return d ? { success: true, document: d } : { success: false, error: new Error('not found') };
    }
    try {
      const db = await this.open();
      const d = await this.get(db, this.storeName, documentId);
      db.close();
      return d ? { success: true, document: d } : { success: false, error: new Error('not found') };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  async delete(documentId: string): Promise<DeleteResult> {
    if (!this.hasIndexedDB()) {
      this.memory.delete(documentId);
      return { success: true };
    }
    try {
      const db = await this.open();
      await this.del(db, this.storeName, documentId);
      db.close();
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  async backup(document: OutlineDocument): Promise<BackupResult> {
    const id = `${document.id}-${Date.now()}`;
    const info: BackupInfo = { id, documentId: document.id, timestamp: new Date().toISOString() };
    this.backups.push(info);
    if (this.hasIndexedDB()) {
      try {
        const db = await this.open();
        await this.put(db, this.backupName, { ...document, id });
        db.close();
      } catch (e) {
        return { success: false, error: e };
      }
    } else {
      this.memory.set(id, { ...document, id });
    }
    return { success: true, id };
  }

  async listBackups(documentId: string): Promise<BackupInfo[]> {
    return this.backups.filter(b => b.documentId === documentId);
  }

  // IndexedDB helpers
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = (globalThis as any).indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
        if (!db.objectStoreNames.contains(this.backupName)) db.createObjectStore(this.backupName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private put(db: IDBDatabase, store: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const st = tx.objectStore(store);
      st.put(value, value.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private get(db: IDBDatabase, store: string, key: string): Promise<any | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const st = tx.objectStore(store);
      const req = st.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private del(db: IDBDatabase, store: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const st = tx.objectStore(store);
      st.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

