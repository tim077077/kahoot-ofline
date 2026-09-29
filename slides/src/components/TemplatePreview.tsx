import type { Template } from "@/lib/templates";

// A CSS mock of a template's first slide for the gallery. The real slides are
// drawn on canvas in the editor.
export function TemplatePreview({ template }: { template: Template }) {
  const text = template.example.slides[0];
  switch (template.theme) {
    case "caption":
      return (
        <div className="flex aspect-[9/16] items-center justify-center bg-gradient-to-br from-slate-700 to-slate-400 p-4">
          <p className="text-center text-sm font-bold leading-7">
            <span className="box-decoration-clone rounded-md bg-white px-1.5 py-0.5 text-black">{text}</span>
          </p>
        </div>
      );
    case "bold":
      return (
        <div className="flex aspect-[9/16] items-center justify-center bg-gradient-to-br from-zinc-950 to-violet-950 p-4">
          <p className="text-center text-base font-extrabold leading-tight text-white [text-shadow:0_0_2px_#000,0_0_2px_#000]">
            {text}
          </p>
        </div>
      );
    case "notes":
      return (
        <div className="aspect-[9/16] bg-white p-3 text-left">
          <div className="flex justify-between text-[10px] text-amber-500">
            <span>‹ Notes</span>
            <span>Done</span>
          </div>
          <p className="mt-4 text-sm font-bold leading-snug text-zinc-900">{text}</p>
        </div>
      );
    case "minimal":
      return (
        <div className="aspect-[9/16] bg-[#f4efe6] p-4 text-left">
          <p className="text-[10px] text-[#8a7f72]">01 / {String(template.slides).padStart(2, "0")}</p>
          <p className="font-display mt-6 text-lg font-semibold leading-tight text-[#1f1a17]">{text}</p>
        </div>
      );
  }
}
