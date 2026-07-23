import type { IconSvgElement } from "@hugeicons/react";

export type LoginStep = 1 | 2;

export interface SecurityFeature {
  icon:  IconSvgElement;
  title: string;
  desc:  string;
}

export interface InfrastructureBadge {
  icon:  IconSvgElement;
  label: string;
}
