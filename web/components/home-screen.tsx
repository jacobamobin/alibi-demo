import {
  Mic,
  MicOff,
  Phone,
  Settings,
  ChevronRight,
  Users,
  UserPlus,
} from "lucide-react";
import type { useAlibi } from "../lib/use-alibi";
import type { useSceneMicrophone } from "../lib/use-scene-microphone";
import type { Person } from "../lib/roster";
import { Avatar } from "./avatar";
type Props = {
  app: ReturnType<typeof useAlibi>;
  capture: ReturnType<typeof useSceneMicrophone>;
  onMic: () => void;
  onDemoMute: () => void;
  onCall: () => void;
  onSettings: () => void;
  onProfile: (p: Person) => void;
  onPeople: () => void;
  onNewContact: () => void;
  onContext: () => void;
};
export function HomeScreen({
  app,
  capture,
  onMic,
  onDemoMute,
  onCall,
  onSettings,
  onProfile,
  onPeople,
  onNewContact,
  onContext,
}: Props) {
  const listening = capture.status === "listening";
  const connecting = capture.status === "connecting";
  return (
    <>
      <header className="wa-home-header">
        <h1>Alibi</h1>
        <button
          className="icon-button"
          onClick={onSettings}
          aria-label="Settings"
        >
          <Settings size={21} />
        </button>
      </header>
      <div className="wa-home-scroll">
        <section className="scene-capture">
          <div className="capture-heading">
            <h2>Set the scene</h2>
          </div>
          <div className="capture-actions">
            <div className="capture-primary">
              <button
                className={`capture-mic ${listening ? "listening" : ""}`}
                aria-label={
                  listening || connecting
                    ? "Stop scene microphone"
                    : "Turn on scene microphone"
                }
                onClick={onMic}
              >
                {app.muted ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
              <strong className="capture-status">
                {app.muted
                  ? "Microphone muted"
                  : listening
                    ? "Listening"
                    : connecting
                      ? "Connecting…"
                      : "Turn on mic"}
              </strong>
            </div>
            <button
              className={`demo-mute ${app.muted ? "is-muted" : ""}`}
              onClick={onDemoMute}
              aria-pressed={app.muted}
            >
              <span className="demo-mute-circle">
                <MicOff size={24} />
              </span>
              <span>{app.muted ? "Demo muted" : "Demo mute"}</span>
            </button>
          </div>
          <p className="capture-help">
            {app.muted
              ? "Context stays paused while you explain the demo."
              : listening
                ? "Talk naturally. Your next call will pick up the story."
                : "Let Alibi hear the scene before you make the call."}
          </p>
          <textarea
            aria-label="Scene for your next call"
            value={app.scene}
            onChange={(e) => capture.replace(e.target.value)}
            maxLength={4000}
            placeholder="Your scene appears here as you speak…"
            rows={3}
          />
          <span className="capture-caption">
            {listening
              ? "Updating from your microphone"
              : "Context for your next call"}
          </span>
          {capture.error && (
            <p className="capture-error" role="alert">
              {capture.error}
            </p>
          )}
        </section>
        <div className="wa-people-heading">
          <h2>People</h2>
          <button onClick={onNewContact}><UserPlus size={15} /> Add contact</button>
          <button onClick={onPeople}>
            See all <ChevronRight size={14} />
          </button>
        </div>
        <div className="wa-contact-list">
          {app.people.map((p) => (
            <button
              key={p.id}
              className="wa-contact"
              onClick={() => onProfile(p)}
            >
              <Avatar person={p} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.personality.split(".")[0]}</small>
              </span>
              <Phone size={19} />
            </button>
          ))}
        </div>
      </div>
      <div className="wa-home-actions">
        <button
          className="primary start-call"
          onClick={onCall}
          disabled={app.preparing || connecting}
        >
          <Phone size={21} fill="currentColor" />
          New call
        </button>
        <div className="wa-home-secondary">
          <button
            onClick={() => {
              capture.stop();
              app.preview();
            }}
          >
            Silent preview
          </button>
          <button onClick={onContext}>
            <Users size={14} />
            Context
          </button>
        </div>
      </div>
    </>
  );
}
