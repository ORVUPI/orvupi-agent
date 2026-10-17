import { useEffect, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { Button, Input } from "../ui/kit";
import { parseSlides, serializeSlides, type SlidesFile } from "./model";

export function SlidesScreen() {
  const workspace = useWorkspace();
  const decks = workspace.files.filter((file) => file.deletedAt === null && file.kind === "slide");
  const [file, setFile] = useState<SlidesFile | null>(null);
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const [status, setStatus] = useState<"saved" | "pending">("saved");

  useEffect(() => {
    if (!workspace.openSlideId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openSlideId;
    let cancel = false;
    workspace.storage.loadFile(id).then((loaded) => {
      if (cancel || loaded.integrity === "mismatch") return;
      setFile(parseSlides(loaded.bytes));
      setIndex(0);
      setStatus("saved");
    }).catch(workspace.reportError);
    return () => {
      cancel = true;
    };
  }, [workspace.openSlideId, workspace.storage, workspace.reportError]);

  useEffect(() => {
    if (!file || !workspace.storage || status !== "pending") return;
    const timer = window.setTimeout(() => {
      void workspace.storage?.saveFile({
        id: file.id,
        name: file.title,
        kind: "slide",
        mime: "application/vnd.orvupi.slides+json",
        bytes: serializeSlides(file),
      }).then(() => workspace.refreshFiles()).then(() => setStatus("saved")).catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  if (!workspace.openSlideId) {
    return (
      <div className="ow-page" data-tool="slides">
        <h1>{workspace.t("navSlides")}</h1>
        <p>{workspace.t("slideHint")}</p>
        <Button variant="primary" onClick={() => void workspace.createSlides(null)}>{workspace.t("newSlides")}</Button>
        <div className="ow-list">
          {decks.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openSlide(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (!file) return <p>{workspace.t("preparing")}</p>;
  const slide = file.slides[index] ?? file.slides[0];
  if (!slide) return null;

  function update(next: SlidesFile) {
    setFile(next);
    setStatus("pending");
  }

  if (present) {
    return (
      <section className="ow-stage" aria-label={file.title}>
        <p>{index + 1} / {file.slides.length}</p>
        <h1>{slide.title || file.title}</h1>
        <p>{slide.body}</p>
        <div className="ow-row">
          <Button onClick={() => setIndex((value) => Math.max(0, value - 1))}>{workspace.t("slidePrev")}</Button>
          <Button onClick={() => setIndex((value) => Math.min(file.slides.length - 1, value + 1))}>{workspace.t("slideNext")}</Button>
          <Button onClick={() => setPresent(false)}>{workspace.t("slideExit")}</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="ow-page" data-tool="slides">
      <div className="ow-row">
        <h1>{file.title}</h1>
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
      </div>
      <div className="ow-row">
        {file.slides.map((item, itemIndex) => (
          <button key={itemIndex} type="button" className="ow-button" aria-pressed={itemIndex === index} onClick={() => setIndex(itemIndex)}>
            {itemIndex + 1}. {item.title || workspace.t("slideTitle")}
          </button>
        ))}
        <Button
          onClick={() => {
            if (file.slides.length >= 30) return;
            update({ ...file, slides: [...file.slides, { title: "", body: "" }] });
            setIndex(file.slides.length);
          }}
        >
          {workspace.t("slideAdd")}
        </Button>
        <Button variant="primary" onClick={() => setPresent(true)}>{workspace.t("slidePresent")}</Button>
      </div>
      <Input
        label={workspace.t("slideTitle")}
        value={slide.title}
        onChange={(event) => {
          const slides = file.slides.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item));
          update({ ...file, slides });
        }}
      />
      <label className="ow-field">
        {workspace.t("slideBody")}
        <textarea
          value={slide.body}
          onChange={(event) => {
            const slides = file.slides.map((item, itemIndex) => (itemIndex === index ? { ...item, body: event.target.value } : item));
            update({ ...file, slides });
          }}
        />
      </label>
    </div>
  );
}
