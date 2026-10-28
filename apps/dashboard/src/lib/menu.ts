import type { Component } from 'svelte';

export type MenuItem = {
  id: string;
  label: string;
  /** Current value shown at the right of the row. */
  value?: string;
  icon?: Component;
  checked?: boolean;
  disabled?: boolean;
  href?: string;
  danger?: boolean;
  separatorBefore?: boolean;
  children?: MenuItem[];
  onselect?: () => void;
};
