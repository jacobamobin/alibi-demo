import {
  ChevronLeft,
  Ellipsis,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  UserPlus,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { useAlibi } from "../lib/use-alibi";
import { Avatar } from "./avatar";
import { AudioSpectrum } from "./audio-spectrum";
type Props = {
  app: ReturnType<typeof useAlibi>;
  onAdd: () => void;
  onMore: () => void;
};
export function CallScreen({ app, onAdd, onMore }: Props) {
  const cast = [...app.participants, ...app.ringing];
  const first = (name: string) => name.split(" ")[0];
  const title =
    cast.length <= 3
      ? cast.map((p) => first(p.name)).join(", ")
      : `${cast.length} people`;
  const timer = `${Math.floor(app.elapsed / 60)
    .toString()
    .padStart(2, "0")}:${(app.elapsed % 60).toString().padStart(2, "0")}`;
  return (
    <>
      <header className="wa-call-header">
        <div className="wa-call-top">
          <button
            className="icon-button"
            onClick={onMore}
            aria-label="Call information"
          >
            <ChevronLeft size={23} />
          </button>
          <span>Alibi call</span>
          <button
            className="icon-button"
            onClick={onAdd}
            aria-label="Add person"
          >
            <UserPlus size={22} />
          </button>
        </div>
        <h2>{title || "Your call"}</h2>
        <p>
          {app.mode === "preview"
            ? "Silent preview · audio off"
            : app.mode === "connecting"
              ? "Connecting…"
              : `${timer} · ${app.muted ? "Microphone muted" : app.talking ? `${app.speaker || "Someone"} speaking` : "Voice call"}`}
        </p>
      </header>
      <div
        className={`wa-tiles count-${cast.length}`}
        aria-label="Call participants"
      >
        {cast.map((p) => {
          const ringing = app.ringing.some((x) => x.id === p.id);
          const speaking =
            app.mode === "live" && app.talking && app.speakerID === p.id;
          return (
            <div
              key={p.id}
              className={`wa-person-tile ${ringing ? "ringing" : ""} ${speaking ? "speaking" : ""}`}
            >
              <div className="wa-avatar-ring">
                <Avatar person={p} />
              </div>
              <strong>{p.name}</strong>
              <span className="wa-person-status">
                {ringing
                  ? "Calling…"
                  : app.mode === "preview"
                    ? "Fictional contact"
                    : speaking
                      ? "Speaking"
                      : p.pronouns || "In call"}
              </span>
              {app.portraitState[p.id] === "pending" && !ringing && <small className="portrait-pending">Creating photo…</small>}
              {ringing && <Phone className="ring-phone" size={15} />}
            </div>
          );
        })}
        {!cast.length && (
          <div className="empty-call">
            <h2>Room for someone new.</h2>
            <button className="primary" onClick={onAdd}>
              Add a person
            </button>
          </div>
        )}
      </div>
      <div className="wa-call-bottom">
        {app.mode === "preview" ? <p>Preview · no microphone or live audio</p> : <div className="call-spectrum"><AudioSpectrum read={app.readAudio} enabled={app.mode === "live" && app.sound} /></div>}
        <div className="wa-control-tray">
          <button
            className="control"
            onClick={app.toggleSound}
            disabled={app.mode !== "live"}
            aria-label={app.sound ? "Mute sound" : "Enable sound"}
          >
            {app.sound ? <Volume2 /> : <VolumeX />}
            <span>Speaker</span>
          </button>
          <button
            className={`control ${app.muted ? "selected" : ""}`}
            onClick={app.toggleMute}
            disabled={app.mode !== "live"}
            aria-label={app.muted ? "Unmute microphone" : "Mute microphone"}
          >
            {app.muted || app.mode === "preview" ? <MicOff /> : <Mic />}
            <span>{app.muted ? "Unmute" : "Mute"}</span>
          </button>
          <button className="control" onClick={onAdd} aria-label="Add people">
            <UserPlus />
            <span>Add people</span>
          </button>
          <button
            className="control"
            onClick={onMore}
            aria-label="More call options"
          >
            <Ellipsis />
            <span>More</span>
          </button>
          <button
            className="control end-control"
            onClick={() => void app.end()}
            aria-label="End call"
          >
            <Phone className="hangup-icon" fill="currentColor" />
            <span>End</span>
          </button>
        </div>
      </div>
    </>
  );
}
