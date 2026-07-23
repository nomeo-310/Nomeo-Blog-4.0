"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Globe02Icon, BubbleChatIcon, FileEditIcon, Shield01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import Modal from "@/components/ui/modal";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLounge } from "../use-lounge-mutations";

const MAX_RULES = 15;
const MAX_RULE_LENGTH = 200;

export function CreateLoungeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleInput, setRuleInput] = useState("");
  const [rules, setRules] = useState<string[]>([]);

  const reset = () => { setName(""); setDescription(""); setRuleInput(""); setRules([]); };
  const handleClose = () => { reset(); onClose(); };

  const create = useCreateLounge(handleClose);

  const canAddRule = ruleInput.trim().length > 0 && rules.length < MAX_RULES;

  const addRule = () => {
    if (!canAddRule) return;
    setRules((prev) => [...prev, ruleInput.trim()]);
    setRuleInput("");
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRuleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRule();
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      rules,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title="Create a platform lounge"
      primaryAction={{ label: "Create lounge", onClick: handleSubmit, disabled: !name.trim(), loading: create.isPending }}
      secondaryAction={{ label: "Cancel", onClick: handleClose, disabled: create.isPending }}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon icon={Globe02Icon} className="h-4 w-4 text-primary" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Open to everyone.</span>{" "}
            This is a Nomeo-owned space any authenticated user can join — not a creator&apos;s lounge.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lounge-name">
              <HugeiconsIcon icon={BubbleChatIcon} className="h-3.5 w-3.5" />
              Name
            </Label>
            <span className="text-[11px] text-muted-foreground">{name.length}/100</span>
          </div>
          <Input
            id="lounge-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Commons"
            maxLength={100}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lounge-description">
              <HugeiconsIcon icon={FileEditIcon} className="h-3.5 w-3.5" />
              Description
            </Label>
            <span className="text-[11px] text-muted-foreground">{description.length}/500</span>
          </div>
          <Textarea
            id="lounge-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this space for?"
            className="min-h-16 text-sm"
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lounge-rules">
              <HugeiconsIcon icon={Shield01Icon} className="h-3.5 w-3.5" />
              Rules
            </Label>
            <span className="text-[11px] text-muted-foreground">{rules.length}/{MAX_RULES}</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              id="lounge-rules"
              value={ruleInput}
              onChange={(e) => setRuleInput(e.target.value)}
              onKeyDown={handleRuleKeyDown}
              placeholder="e.g. Be kind and respectful."
              maxLength={MAX_RULE_LENGTH}
              disabled={rules.length >= MAX_RULES}
            />
            <Button
              type="button" size="sm" variant="outline" className={'rounded-md'}
              onClick={addRule}
              disabled={!canAddRule}
            >
              Add
            </Button>
          </div>

          {rules.length > 0 && (
            <ol className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 leading-relaxed text-muted-foreground">{rule}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive"
                    aria-label={`Remove rule ${i + 1}`}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  );
}
