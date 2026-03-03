import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ToolCallCard,
  resolveCategory,
} from '../../../../src/renderer/views/conversation/ToolCallCard';

describe('ToolCallCard', () => {
  it('renders tool name and status', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'ReadFile', status: 'running' }} />);

    expect(screen.getByText('ReadFile')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'WriteFile', status: 'completed', result: 'OK' }}
      />,
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows failed status with error', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'Shell', status: 'failed', error: 'Permission denied' }}
      />,
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'Network', status: 'pending' }} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows denied status with error', () => {
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'Shell',
          status: 'denied',
          error: 'Capability denied by policy',
        }}
      />,
    );

    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(screen.getByText('Capability denied by policy')).toBeInTheDocument();
  });

  it('shows result while still running (live results)', () => {
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'RunCommand',
          status: 'running',
          result: 'partial output here',
        }}
      />,
    );

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('partial output here')).toBeInTheDocument();
  });

  it('shows arguments collapsed by default with toggle', async () => {
    const user = userEvent.setup();
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'ReadFile',
          status: 'running',
          arguments: { path: '/src/main.ts', encoding: 'utf-8' },
        }}
      />,
    );

    // Arguments toggle button should be visible
    const toggle = screen.getByRole('button', { name: /arguments/i });
    expect(toggle).toBeInTheDocument();

    // Arguments content should NOT be visible by default (collapsed)
    expect(screen.queryByText(/\/src\/main.ts/)).not.toBeInTheDocument();

    // Click to expand
    await user.click(toggle);
    expect(screen.getByText(/\/src\/main.ts/)).toBeInTheDocument();
    expect(screen.getByText(/utf-8/)).toBeInTheDocument();

    // Click again to collapse
    await user.click(toggle);
    expect(screen.queryByText(/\/src\/main.ts/)).not.toBeInTheDocument();
  });

  it('does not render arguments toggle when arguments are empty', () => {
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'ReadFile',
          status: 'running',
          arguments: {},
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /arguments/i })).not.toBeInTheDocument();
  });

  it('shows File category badge for file tools', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'ReadFile', status: 'running' }} />);

    expect(screen.getByText('File')).toBeInTheDocument();
  });

  it('shows Shell category badge for RunCommand', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'RunCommand', status: 'running' }} />);

    expect(screen.getByText('Shell')).toBeInTheDocument();
  });

  it('shows Network category badge for network tools', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'HttpRequest', status: 'running' }} />);

    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('shows Agent category badge for toolType="agent"', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'TaskTracker', toolType: 'agent', status: 'completed' }}
      />,
    );

    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('shows Sub-Agent category badge for toolType="sub_agent"', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'SpawnAgent', toolType: 'sub_agent', status: 'running' }}
      />,
    );

    expect(screen.getByText('Sub-Agent')).toBeInTheDocument();
  });

  it('shows Skill category badge for toolType="skill"', () => {
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'Skill_CodeReview',
          toolType: 'skill',
          status: 'running',
        }}
      />,
    );

    expect(screen.getByText('Skill')).toBeInTheDocument();
  });

  it('shows default Tool category badge for unknown tools', () => {
    render(
      <ToolCallCard toolCall={{ id: 'tc-1', toolName: 'SomeUnknownTool', status: 'running' }} />,
    );

    expect(screen.getByText('Tool')).toBeInTheDocument();
  });
});

describe('resolveCategory', () => {
  it('resolves file tools by name', () => {
    expect(resolveCategory('ReadFile').label).toBe('File');
    expect(resolveCategory('WriteFile').label).toBe('File');
    expect(resolveCategory('EditFile').label).toBe('File');
    expect(resolveCategory('GrepFiles').label).toBe('File');
  });

  it('resolves shell tools by name', () => {
    expect(resolveCategory('RunCommand').label).toBe('Shell');
  });

  it('resolves network tools by name', () => {
    expect(resolveCategory('HttpRequest').label).toBe('Network');
    expect(resolveCategory('FetchUrl').label).toBe('Network');
    expect(resolveCategory('WebSearch').label).toBe('Network');
  });

  it('resolves agent tools by name', () => {
    expect(resolveCategory('TaskTracker').label).toBe('Agent');
    expect(resolveCategory('CreatePlan').label).toBe('Agent');
  });

  it('resolves SpawnAgent by name', () => {
    expect(resolveCategory('SpawnAgent').label).toBe('Sub-Agent');
  });

  it('resolves Skill_ prefix by name', () => {
    expect(resolveCategory('Skill_CodeReview').label).toBe('Skill');
    expect(resolveCategory('Skill_Refactor').label).toBe('Skill');
  });

  it('returns default for unknown tools', () => {
    expect(resolveCategory('CustomTool').label).toBe('Tool');
  });

  it('toolType takes precedence over toolName inference', () => {
    // Even though "ReadFile" is a file tool, toolType="agent" wins
    expect(resolveCategory('ReadFile', 'agent').label).toBe('Agent');
    expect(resolveCategory('ReadFile', 'sub_agent').label).toBe('Sub-Agent');
    expect(resolveCategory('ReadFile', 'skill').label).toBe('Skill');
  });

  it('falls back to toolName when toolType is "tool"', () => {
    // toolType="tool" does not match any category, so fall through to name
    expect(resolveCategory('ReadFile', 'tool').label).toBe('File');
    expect(resolveCategory('RunCommand', 'tool').label).toBe('Shell');
  });
});
