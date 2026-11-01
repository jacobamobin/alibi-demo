import type { Person } from "./roster";
import { validateContact } from "./contacts";
const database = "alibi-local-contacts";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error("This browser cannot save contacts. Try a regular Safari tab.")); return; }
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("people", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Couldn’t open local contacts. Check your browser storage settings."));
    request.onblocked = () => reject(new Error("Close older Alibi tabs and try saving again."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("people", mode);
    const request = action(tx.objectStore("people"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Couldn’t save local contacts. Free some browser storage and try again.")); };
  });
}
export async function readContacts(): Promise<Person[]> {
  const values = await transaction<unknown[]>("readonly", s => s.getAll());
  return values.slice(0, 100).flatMap(p => { try { return [validateContact(p)]; } catch { return []; } });
}
export async function storeContact(person: Person) {
  await transaction("readwrite", s => s.put(validateContact(person)));
}
export async function eraseContact(id: string) {
  await transaction("readwrite", s => s.delete(id));
}
