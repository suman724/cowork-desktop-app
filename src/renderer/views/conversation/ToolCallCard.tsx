import { useState } from 'react';
import {
  FileText,
  Terminal,
  Globe,
  Brain,
  GitFork,
  Sparkles,
  Wrench,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import type { ToolCallInfo, ToolCallType } from '../../../shared/types';

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

const STATUS_VARIANT: Record<
  ToolCallInfo['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
  denied: 'destructive',
};

const STATUS_LABEL: Record<ToolCallInfo['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  denied: 'Denied',
};

/** Tool category with icon, label, and accent color */
interface ToolCategory {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const CATEGORY_FILE: ToolCategory = { label: 'File', icon: FileText, accent: 'border-l-blue-500' };
const CATEGORY_SHELL: ToolCategory = {
  label: 'Shell',
  icon: Terminal,
  accent: 'border-l-amber-500',
};
const CATEGORY_NETWORK: ToolCategory = {
  label: 'Network',
  icon: Globe,
  accent: 'border-l-purple-500',
};
const CATEGORY_AGENT: ToolCategory = {
  label: 'Agent',
  icon: Brain,
  accent: 'border-l-slate-500',
};
const CATEGORY_SUB_AGENT: ToolCategory = {
  label: 'Sub-Agent',
  icon: GitFork,
  accent: 'border-l-indigo-500',
};
const CATEGORY_SKILL: ToolCategory = {
  label: 'Skill',
  icon: Sparkles,
  accent: 'border-l-emerald-500',
};
const CATEGORY_DEFAULT: ToolCategory = {
  label: 'Tool',
  icon: Wrench,
  accent: 'border-l-slate-400',
};

/** File operation tools */
const FILE_TOOLS = new Set([
  'ReadFile',
  'WriteFile',
  'DeleteFile',
  'EditFile',
  'MultiEdit',
  'CreateDirectory',
  'MoveFile',
  'ListDirectory',
  'FindFiles',
  'GrepFiles',
  'ViewImage',
]);

/** Shell tools */
const SHELL_TOOLS = new Set(['RunCommand']);

/** Network tools */
const NETWORK_TOOLS = new Set(['HttpRequest', 'FetchUrl', 'WebSearch']);

/** Agent-internal tools */
const AGENT_TOOLS = new Set(['TaskTracker', 'CreatePlan', 'UpdatePlanStep']);

/**
 * Resolve tool category from toolType (preferred) or toolName (fallback).
 */
export function resolveCategory(toolName: string, toolType?: ToolCallType): ToolCategory {
  // toolType takes precedence
  if (toolType === 'agent') return CATEGORY_AGENT;
  if (toolType === 'sub_agent') return CATEGORY_SUB_AGENT;
  if (toolType === 'skill') return CATEGORY_SKILL;

  // Infer from tool name for backward compat
  if (FILE_TOOLS.has(toolName)) return CATEGORY_FILE;
  if (SHELL_TOOLS.has(toolName)) return CATEGORY_SHELL;
  if (NETWORK_TOOLS.has(toolName)) return CATEGORY_NETWORK;
  if (AGENT_TOOLS.has(toolName)) return CATEGORY_AGENT;
  if (toolName === 'SpawnAgent') return CATEGORY_SUB_AGENT;
  if (toolName.startsWith('Skill_')) return CATEGORY_SKILL;

  return CATEGORY_DEFAULT;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps): React.JSX.Element {
  const [argsExpanded, setArgsExpanded] = useState(false);
  const hasArguments = toolCall.arguments && Object.keys(toolCall.arguments).length > 0;
  const category = resolveCategory(toolCall.toolName, toolCall.toolType);
  const Icon = category.icon;

  return (
    <div
      className={`bg-card overflow-hidden rounded-md border border-l-2 ${category.accent} p-2.5 text-sm`}
    >
      {/* Header row: icon + name + category badge + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono text-xs font-medium">{toolCall.toolName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] font-normal">
            {category.label}
          </Badge>
          <Badge variant={STATUS_VARIANT[toolCall.status]} className="text-[10px]">
            {STATUS_LABEL[toolCall.status]}
          </Badge>
        </div>
      </div>

      {/* Collapsible arguments section */}
      {hasArguments && (
        <div className="mt-1.5">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-[11px]"
            onClick={() => {
              setArgsExpanded((prev) => !prev);
            }}
          >
            {argsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Arguments
          </button>
          {argsExpanded && (
            <pre className="bg-muted text-muted-foreground mt-1 max-h-64 overflow-auto rounded p-1.5 text-[11px] break-words whitespace-pre-wrap">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Error display */}
      {toolCall.error && <p className="text-destructive mt-1.5 text-xs">{toolCall.error}</p>}

      {/* Result display (shown when present, no toggle needed) */}
      {toolCall.result && (
        <pre className="bg-muted text-muted-foreground mt-1.5 max-h-64 overflow-auto rounded p-1.5 text-[11px] break-words whitespace-pre-wrap">
          {toolCall.result}
        </pre>
      )}
    </div>
  );
}
