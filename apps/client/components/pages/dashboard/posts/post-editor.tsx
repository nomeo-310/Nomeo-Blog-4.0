"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useRef, useCallback, useEffect } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Link2Off, Image as ImageIcon,
  Highlighter, Undo, Redo, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * PostEditor — Tiptap-powered rich text editor for blog posts.
 *
 * Features:
 *   • Full text formatting: bold, italic, underline, strike, highlight
 *   • Headings (H1 / H2 / H3)
 *   • Lists (bullet + ordered)
 *   • Blockquote, code block, horizontal rule
 *   • Text alignment (left, center, right)
 *   • Links (set / unset via bubble menu)
 *   • Inline image upload → Cloudinary unsigned upload → inserted in place
 *   • Character count
 *   • Placeholder text
 *   • Bubble menu on text selection (bold, italic, link)
 *
 * Usage:
 *   <PostEditor
 *     value={content}
 *     onChange={setContent}
 *     cloudPreset="nomeo_blogs_content"
 *     cloudName="dsopfgo7c"
 *   />
 */

const CLOUD_NAME    = "dsopfgo7c";
const UPLOAD_PRESET = "nomeo_blogs_cover"; // reuse existing unsigned preset

interface PostEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function PostEditor({ value, onChange, placeholder = "Tell your story…", className }: PostEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: {},
        codeBlock: {},
        blockquote: {},
        horizontalRule: {},
        bulletList: {},
        orderedList: {},
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-xl border border-border max-w-full my-4" },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer" } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none min-h-[400px] px-5 py-5 focus:outline-none prose-headings:font-heading prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl prose-img:border prose-img:border-border prose-blockquote:border-l-primary prose-code:bg-muted prose-code:rounded prose-code:px-1",
      },
    },
  });

  // Sync external value changes (e.g. on reset).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  // Upload image to Cloudinary and insert into editor.
  const uploadImage = useCallback(async (file: File) => {
    if (!editor || uploadingRef.current) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB."); return; }

    uploadingRef.current = true;
    const toastId = toast.loading("Uploading image…");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("cloud_name", CLOUD_NAME);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url: string = data.secure_url;

      editor.chain().focus().setImage({ src: url, alt: "" }).run();
      toast.success("Image added.", { id: toastId });
    } catch {
      toast.error("Couldn't upload image. Try again.", { id: toastId });
    } finally {
      uploadingRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL", prev);
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const wordCount  = editor.storage.characterCount?.words?.() ?? 0;
  const charCount  = editor.storage.characterCount?.characters?.() ?? 0;
  const readingMin = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-3 py-2">

        {/* History */}
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="h-4 w-4" /></ToolBtn>
        </ToolGroup>

        <Divider />

        {/* Headings */}
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3"><Heading3 className="h-4 w-4" /></ToolBtn>
        </ToolGroup>

        <Divider />

        {/* Inline formatting */}
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight"><Highlighter className="h-4 w-4" /></ToolBtn>
        </ToolGroup>

        <Divider />

        {/* Alignment */}
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight className="h-4 w-4" /></ToolBtn>
        </ToolGroup>

        <Divider />

        {/* Lists + blocks */}
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code"><Code className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-4 w-4" /></ToolBtn>
        </ToolGroup>

        <Divider />

        {/* Link + image */}
        <ToolGroup>
          <ToolBtn onClick={setLink} active={editor.isActive("link")} title={editor.isActive("link") ? "Edit link" : "Add link"}>
            {editor.isActive("link") ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </ToolBtn>
          <ToolBtn
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
          >
            {uploadingRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </ToolBtn>
        </ToolGroup>
      </div>

      {/* ── Editor area ────────────────────────────────────────────────── */}
      <EditorContent editor={editor} className="min-h-[400px]" />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
        }}
      />

      {/* ── Footer: word count ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"} · {charCount.toLocaleString()} characters</span>
        <span>~{readingMin} min read</span>
      </div>
    </div>
  );
}

/* ── Toolbar primitives ─────────────────────────────────────────────────── */

function ToolBtn({ onClick, children, active, disabled, title }: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}