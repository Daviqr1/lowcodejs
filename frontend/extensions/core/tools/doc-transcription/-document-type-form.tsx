import { PlusIcon, Trash2Icon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type {
  IDocResponseField,
  IDocumentType,
} from '@/hooks/tanstack-query/use-doc-transcription-config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: IDocumentType | null;
  onSave: (docType: IDocumentType) => void;
  isSaving?: boolean;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const FIELD_TYPES: Array<{ value: IDocResponseField['type']; label: string }> =
  [
    { value: 'string', label: 'Texto' },
    { value: 'date', label: 'Data' },
    { value: 'number', label: 'Número' },
    { value: 'boolean', label: 'Booleano' },
  ];

export function DocumentTypeForm({
  open,
  onOpenChange,
  initial,
  onSave,
  isSaving,
}: Props): React.JSX.Element {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [fields, setFields] = React.useState<Array<IDocResponseField>>([]);

  let id = generateSlug(name);
  if (initial) id = initial.id;

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setFields(initial.responseFields);
    } else {
      setName('');
      setDescription('');
      setFields([]);
    }
  }, [open, initial]);

  function handleNameChange(value: string): void {
    setName(value);
  }

  function addField(): void {
    setFields((prev) => [...prev, { key: '', label: '', type: 'string' }]);
  }

  function updateField(index: number, patch: Partial<IDocResponseField>): void {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i === index) return { ...f, ...patch };
        return f;
      }),
    );
  }

  function removeField(index: number): void {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  let nameError: string | null = null;
  if (name.trim().length === 0) nameError = 'Nome obrigatório';
  let idError: string | null = null;
  if (id.trim().length === 0) idError = 'Digite um nome para gerar o ID';
  let fieldsError: string | null = null;
  if (fields.length === 0) {
    fieldsError = 'Adicione ao menos um campo de resposta';
  }
  const fieldErrors = fields.map((f) => {
    let key: string | null = null;
    if (!f.key.trim()) {
      key = 'Obrigatório';
    } else if (!SLUG_REGEX.test(f.key)) {
      key = 'Slug inválido';
    }
    let label: string | null = null;
    if (!f.label.trim()) label = 'Obrigatório';
    return { key, label };
  });
  const hasFieldErrors = fieldErrors.some((e) => e.key || e.label);

  const canSave =
    !nameError && !idError && !fieldsError && !hasFieldErrors && !isSaving;

  function handleSave(): void {
    if (!canSave) return;
    onSave({
      id: id.trim(),
      name: name.trim(),
      description: description.trim() || null,
      responseFields: fields,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial && 'Editar tipo de documento'}
            {!initial && 'Novo tipo de documento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: CNH, Comprovante de endereço"
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Descrição (opcional)</FieldLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição curta do tipo de documento"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel className="mb-0">Campos de resposta</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
                className="h-7 cursor-pointer"
              >
                <PlusIcon className="size-3 mr-1" />
                Adicionar campo
              </Button>
            </div>

            {fieldsError && fields.length === 0 && (
              <p className="text-sm text-destructive mb-2">{fieldsError}</p>
            )}

            <div className="space-y-2">
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-start"
                >
                  <div>
                    <Input
                      value={f.key}
                      onChange={(e) =>
                        updateField(i, {
                          key: e.target.value.toLowerCase().replace(/\s/g, '_'),
                        })
                      }
                      placeholder="chave_api"
                      className="font-mono text-xs h-8"
                    />
                    {fieldErrors[i]?.key && (
                      <p className="text-xs text-destructive mt-0.5">
                        {fieldErrors[i].key}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      value={f.label}
                      onChange={(e) =>
                        updateField(i, { label: e.target.value })
                      }
                      placeholder="Rótulo"
                      className="text-xs h-8"
                    />
                    {fieldErrors[i]?.label && (
                      <p className="text-xs text-destructive mt-0.5">
                        {fieldErrors[i].label}
                      </p>
                    )}
                  </div>

                  <Select
                    value={f.type}
                    onValueChange={(v) => {
                      const match = FIELD_TYPES.find((ft) => ft.value === v);
                      if (match) updateField(i, { type: match.value });
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem
                          key={ft.value}
                          value={ft.value}
                          className="text-xs"
                        >
                          {ft.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={() => removeField(i)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="cursor-pointer"
          >
            {isSaving && <Spinner className="mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
