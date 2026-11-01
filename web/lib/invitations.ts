import { Roster, type Person, type Participant } from "./roster.ts";
type Events = {
  changed: (people: Participant[]) => void;
  calling?: (p: Participant) => void;
  joined?: (p: Participant) => void;
};
const ring = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(done, 2200);
    function done() {
      signal.removeEventListener("abort", cancel);
      resolve();
    }
    function cancel() {
      clearTimeout(timer);
      reject(new DOMException("Invitation cancelled.", "AbortError"));
    }
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
export class Invitations {
  private roster: Roster;
  private events: Events;
  private wait: (signal: AbortSignal) => Promise<void>;
  private controller = new AbortController();
  private pending = new Map<
    string,
    {
      person: Participant;
      promise: Promise<Participant>;
      controller: AbortController;
    }
  >();
  constructor(roster: Roster, events: Events, wait = ring) {
    this.roster = roster;
    this.events = events;
    this.wait = wait;
  }
  private changed() {
    this.events.changed([...this.pending.values()].map((p) => p.person));
  }
  invite(p: Person, callID: string, gender = ""): Promise<Participant> {
    if (this.controller.signal.aborted)
      return Promise.reject(new Error("This call has ended."));
    try {
      const already = this.roster.participants.some((x) => x.id === p.id);
      const person = this.roster.join(p, callID, gender);
      if (already) return Promise.resolve(person);
      this.roster.leave(p.id);
      const existing = this.pending.get(p.id);
      if (existing) return existing.promise;
      const controller = new AbortController();
      const promise = this.wait(controller.signal)
        .then(() => {
          if (this.controller.signal.aborted)
            throw new Error("This call has ended.");
          if (controller.signal.aborted)
            throw new DOMException("Invitation cancelled.", "AbortError");
          const joined = this.roster.join(p, callID, gender);
          this.events.joined?.(joined);
          return joined;
        })
        .finally(() => {
          if (this.pending.get(p.id)?.promise === promise) {
            this.pending.delete(p.id);
            this.changed();
          }
        });
      this.pending.set(p.id, { person, promise, controller });
      this.events.calling?.(person);
      this.changed();
      return promise;
    } catch (e) {
      return Promise.reject(e);
    }
  }
  cancelPerson(id: string) {
    this.pending.get(id)?.controller.abort();
    this.pending.delete(id);
    this.roster.leave(id);
    this.changed();
  }
  cancel() {
    this.controller.abort();
    for (const p of this.pending.values()) p.controller.abort();
    this.pending.clear();
    this.changed();
  }
}
