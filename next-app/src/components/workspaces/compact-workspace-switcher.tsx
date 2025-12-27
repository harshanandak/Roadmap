'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
// cn removed - not currently used
// import { cn } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
  team_id: string;
  teams?: {
    subscription_plan: 'free' | 'pro' | 'enterprise';
  };
}

interface CompactWorkspaceSwitcherProps {
  currentWorkspaceId: string;
  currentWorkspaceName: string;
  teamPlan: 'free' | 'pro' | 'enterprise';
  workspaces: Workspace[];
}

export function CompactWorkspaceSwitcher({
  currentWorkspaceId,
  currentWorkspaceName,
  teamPlan: _teamPlan,
  workspaces,
}: CompactWorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSelectWorkspace = (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) {
      setOpen(false);
      return;
    }

    router.push(`/workspaces/${workspaceId}`);
    setOpen(false);
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] px-1.5 py-0">Enterprise</Badge>;
      case 'pro':
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0">Pro</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-10 gap-2 px-3 hover:bg-slate-100"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-sm font-medium text-white">
            {currentWorkspaceName.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-sm truncate max-w-[150px]">
            {currentWorkspaceName}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => handleSelectWorkspace(workspace.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-600 text-xs font-medium text-white">
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="truncate font-medium text-sm w-full text-left">
                        {workspace.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {getPlanBadge(workspace.teams?.subscription_plan || 'free')}
                      {workspace.id === currentWorkspaceId && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  router.push('/workspaces/new');
                  setOpen(false);
                }}
                className="cursor-pointer text-blue-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Create new workspace</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
