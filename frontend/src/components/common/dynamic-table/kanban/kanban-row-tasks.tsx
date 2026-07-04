import { CheckIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { normalizeRowValue } from '@/lib/kanban-helpers';

export function KanbanRowTasksSection({
  tasks,
  taskTitle,
  onTaskTitleChange,
  onTaskToggle,
  onTaskDelete,
  editingTaskIndex,
  editingTaskTitle,
  onTaskEditStart,
  onTaskEditChange,
  onTaskEditCancel,
  onTaskEditSave,
  onTaskAdd,
}: {
  // tarefas são dados dinâmicos de row (valor por slug é any no low-code).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: Array<Record<string, any>>;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  onTaskToggle: (index: number) => void;
  onTaskDelete: (index: number) => void;
  editingTaskIndex: number | null;
  editingTaskTitle: string;
  onTaskEditStart: (index: number, title: string) => void;
  onTaskEditChange: (value: string) => void;
  onTaskEditCancel: () => void;
  onTaskEditSave: (index: number) => void;
  onTaskAdd: () => void;
}): React.JSX.Element {
  return (
    <section
      data-slot="kanban-row-tasks"
      data-test-id="kanban-row-tasks"
      className="mt-6 space-y-3"
    >
      <h3 className="text-sm font-semibold">Tarefas</h3>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg border bg-background p-2"
          >
            <Checkbox
              checked={normalizeRowValue(task.realizado).includes('sim')}
              onCheckedChange={() => onTaskToggle(index)}
            />
            {((): React.ReactNode => {
              if (editingTaskIndex === index) {
                return (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingTaskTitle}
                      onChange={(event) => onTaskEditChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onTaskEditSave(index);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          onTaskEditCancel();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => onTaskEditSave(index)}
                      aria-label="Salvar tarefa"
                    >
                      <CheckIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={onTaskEditCancel}
                      aria-label="Cancelar edição"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  className="text-sm flex-1 text-left cursor-pointer"
                  onDoubleClick={() =>
                    onTaskEditStart(index, String(task.titulo || ''))
                  }
                >
                  {task.titulo || '-'}
                </button>
              );
            })()}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
              onClick={() => onTaskDelete(index)}
              aria-label="Excluir tarefa"
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={taskTitle}
          onChange={(event) => onTaskTitleChange(event.target.value)}
          placeholder="Nova tarefa"
        />
        <Button
          type="button"
          onClick={onTaskAdd}
          className="cursor-pointer"
        >
          <PlusIcon className="size-4" />
          <span>Adicionar</span>
        </Button>
      </div>
    </section>
  );
}
