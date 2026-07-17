/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Check, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NodeFormData = {
  id: string;
  label: string;
  selectable: boolean;
};

type AddNodeFormProps = {
  type: 'root' | 'child';
  parentNodeLabel?: string;
  onSave: (data: NodeFormData) => void;
  onCancel: () => void;
  generateId: () => string;
};

export const AddNodeForm: React.FC<AddNodeFormProps> = ({
  type,
  parentNodeLabel,
  onSave,
  onCancel,
  generateId,
}) => {
  const [label, setLabel] = useState('');
  const [selectable, setSelectable] = useState(true);

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({
      id: generateId(),
      label: label.trim(),
      selectable,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  let formTitle = `Adicionar em "${parentNodeLabel}"`;
  if (type === 'root') {
    formTitle = 'Novo item';
  }

  return (
    <div
      data-slot="add-node-form"
      data-test-id="tree-add-node-form"
      className="rounded-md border bg-muted/20 p-3 space-y-3"
    >
      <div className="text-xs font-medium text-muted-foreground">
        {formTitle}
      </div>

      <div className="space-y-2">
        <Input
          data-test-id="tree-add-node-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome do item..."
          className="h-8 text-sm"
          autoFocus
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="node-selectable"
            checked={selectable}
            onCheckedChange={(checked) => setSelectable(!!checked)}
            className="h-3 w-3"
          />
          <Label
            htmlFor="node-selectable"
            className="text-xs cursor-pointer"
          >
            Selecionável
          </Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          data-test-id="tree-add-node-submit-btn"
          type="button"
          onClick={handleSave}
          disabled={!label.trim()}
          size="sm"
          className="h-7 flex-1 text-xs"
        >
          <Check className="w-3 h-3 mr-1" />
          Salvar
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
};
