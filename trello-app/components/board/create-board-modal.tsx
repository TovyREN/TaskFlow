'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBoardSchema, type CreateBoardInput } from '@/lib/validations/board';
import { createBoard } from '@/actions/board-actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BACKGROUND_OPTIONS = [
  { name: 'Bleu', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Vert', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { name: 'Orange', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Rose', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Violet', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: 'Rouge', value: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' },
];

export function CreateBoardModal({ isOpen, onClose }: CreateBoardModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: {

      background: BACKGROUND_OPTIONS[0].value,
    },
  });

  const selectedBackground = watch('background');

  const onSubmit = async (data: CreateBoardInput) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 Création du board:', data);

      const board = await createBoard(data);

      console.log('✅ Board créé:', board);

      reset();
      onClose();
      router.push(`/boards/${board.id}`);
      router.refresh();
    } catch (err) {
      console.error('💥 Erreur création board:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du board');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer un nouveau board">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Preview */}
        <div
          className="h-32 rounded-lg"
          style={{ background: selectedBackground }}
        >
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl font-bold text-white drop-shadow-lg">
              {watch('name') || 'Nom du board'}
            </p>
          </div>
        </div>

        {/* Name Input */}
        <Input
          label="Nom du board"
          placeholder="Mon projet génial"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Description Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Description (optionnel)
          </label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Décrivez votre board..."
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Background Selection */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Arrière-plan
          </label>
          <div className="grid grid-cols-3 gap-3">
            {BACKGROUND_OPTIONS.map((bg) => (
              <button
                key={bg.name}
                type="button"
                onClick={() => setValue('background', bg.value)}
                className={`h-16 rounded-lg transition-all ${
                  selectedBackground === bg.value
                    ? 'ring-4 ring-blue-600 ring-offset-2'
                    : 'hover:ring-2 hover:ring-gray-300'
                }`}
                style={{ background: bg.value }}
              >
                <span className="sr-only">{bg.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">
            Créer le board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
